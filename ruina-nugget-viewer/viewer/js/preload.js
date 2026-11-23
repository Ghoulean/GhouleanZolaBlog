import { hasImage, loadImage } from "./assets.js";
import { $ } from "./dom.js";
import { buildItems, headSnapshot, loadAppearance } from "./layering.js";
import { listOrder } from "./list.js";
import { pickPose, sortPoses } from "./selection.js";
import { state, store } from "./state.js";

let enabled = true;
let gen = 0;
let limit = 1;
let active = 0;
const waiters = [];
const loaded = new Set();

export function updateLoadedCount() {
    if (!enabled && $("#preload-count").textContent) {
        return;
    }
    const total = state.index?.reduce((n, e) => n + e.motions.length, 0) ?? 0;
    $("#preload-count").textContent =
        `${loaded.size} / ${total} sprites loaded`;
}

const isLoaded = (key, pose) => loaded.has(key + "|" + pose);

export function markLoaded(key, pose) {
    const id = key + "|" + pose;
    if (loaded.has(id)) {
        return;
    }
    loaded.add(id);
    updateLoadedCount();
}

function pump() {
    while (waiters.length && active < limit) {
        active++;
        waiters.shift()();
    }
}

const acquire = () =>
    new Promise((r) => {
        waiters.push(r);
        pump();
    });

function release() {
    active--;
    pump();
}

export function initPreloadSetting() {
    enabled = store.get("preload", true) !== false;
    limit = Math.min(
        20,
        Math.max(1, Math.round(Number(store.get("preloadParallel", 6))) || 6)
    );
    const sel = $("#preload");
    const range = $("#preload-parallel");
    const out = $("#preload-parallel-value");
    const field = $("#preload-parallel-field");
    const sync = () => {
        range.disabled = !enabled;
        field.classList.toggle("disabled-block", !enabled);
        $("#preload-count").classList.toggle("disabled-block", !enabled);
    };
    sel.checked = enabled;
    range.value = limit;
    out.textContent = limit;
    sync();
    sel.onchange = () => {
        enabled = sel.checked;
        store.set("preload", enabled);
        sync();
        updateLoadedCount();
        if (enabled) {
            restartPreload();
        } else {
            cancelPreload();
        }
    };
    range.oninput = () => {
        limit = Number(range.value);
        out.textContent = limit;
        pump();
    };
    range.onchange = () => store.set("preloadParallel", limit);
}

export function cancelPreload() {
    gen++;
}

export function restartPreload() {
    const g = ++gen;
    if (enabled && state.app) {
        run(g, state.skinKey, state.pose, headSnapshot());
    }
}

const idle = () =>
    new Promise((r) =>
        (window.requestIdleCallback || ((f) => setTimeout(f, 50)))(() => r(), {
            timeout: 2000,
        })
    );

function neighbors(key) {
    const order = listOrder();
    const i = order.findIndex((e) => e.key === key);
    if (i < 0) {
        return [];
    }
    const out = [];
    for (let d = 1; d < order.length; d++) {
        if (order[i + d]) {
            out.push(order[i + d].key);
        }
        if (order[i - d]) {
            out.push(order[i - d].key);
        }
    }
    return out;
}

async function* jobs(key, pose) {
    const app = await loadAppearance(key, true);
    yield [
        key,
        app,
        sortPoses(Object.keys(app.motions)).filter((p) => p !== pose),
    ];
    const near = neighbors(key);
    for (const k of near) {
        yield [k, null, "picked"];
    }
    for (const k of near) {
        yield [k, null, "rest"];
    }
}

async function queueFiles(files, live) {
    const pending = [];
    for (const file of files) {
        if (hasImage(file)) {
            pending.push(
                loadImage(file).then(
                    () => true,
                    () => false
                )
            );
            continue;
        }
        await acquire();
        if (!live()) {
            release();
            return null;
        }
        pending.push(
            idle()
                .then(() => live() && loadImage(file, true).then(() => true))
                .catch(() => false)
                .finally(release)
        );
    }
    return pending;
}

async function preloadHeads(app, head, live) {
    const files = new Set();
    for (const p of sortPoses(Object.keys(app.motions))) {
        if (!live()) {
            return false;
        }
        let items;
        try {
            items = await buildItems(app, app.motions[p], head);
        } catch {
            continue;
        }
        for (const it of items) {
            if (it.headPart) {
                files.add(it.sprite.file);
            }
        }
    }
    return live() && (await queueFiles(files, live)) !== null;
}

async function run(g, key, pose, head) {
    const live = () => g === gen;
    try {
        if (
            !(await preloadHeads(await loadAppearance(key, true), head, live))
        ) {
            return;
        }
        for await (let [k, app, poses] of jobs(key, pose)) {
            if (!live()) {
                return;
            }
            if (!app) {
                await idle();
                if (!live()) {
                    return;
                }
                try {
                    app = await loadAppearance(k, true);
                } catch {
                    continue;
                }
                const picked = pickPose(app);
                poses =
                    poses === "picked"
                        ? [picked]
                        : sortPoses(Object.keys(app.motions)).filter(
                              (p) => p !== picked
                          );
            }
            for (const p of poses) {
                if (!live()) {
                    return;
                }
                if (isLoaded(k, p)) {
                    continue;
                }
                let items;
                try {
                    items = await buildItems(app, app.motions[p], head);
                } catch {
                    continue;
                }
                const pending = await queueFiles(
                    items.map((it) => it.sprite.file),
                    live
                );
                if (!pending) {
                    return;
                }
                Promise.all(pending).then((ok) => {
                    if (ok.every(Boolean)) {
                        markLoaded(k, p);
                    }
                });
            }
        }
    } catch {}
}
