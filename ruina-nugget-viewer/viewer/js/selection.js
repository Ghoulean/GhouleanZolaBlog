import { DATA_ROOT, POSE_ORDER } from "./config.js";
import { $ } from "./dom.js";
import { updateExportInfo } from "./export.js";
import { syncHeadPanel } from "./head-panel.js";
import { buildItems, loadAppearance } from "./layering.js";
import { renderLayers } from "./layers-panel.js";
import { markPose, poseList, renderPoses } from "./poses.js";
import { cancelPreload, markLoaded, restartPreload } from "./preload.js";
import { buildScene } from "./scene.js";
import { state, store } from "./state.js";
import { updateUrl } from "./url.js";
import { centerView, draw } from "./view.js";

let renderToken = 0;
let busyTimer = null;
function setBusy(on) {
    clearTimeout(busyTimer);
    if (on)
        busyTimer = setTimeout(() => {
            $("#busy").hidden = false;
        }, 150);
    else $("#busy").hidden = true;
}

export async function selectSkin(key, pose) {
    const entry = state.index.find((e) => e.key === key);
    if (!entry) return;
    const first = state.skinKey !== key;
    state.skinKey = key;
    store.set("skin", key);
    if (first) state.hiddenLayers.clear();
    document
        .querySelectorAll(".item.active")
        .forEach((n) => n.classList.remove("active"));
    document
        .querySelector(`.item[data-key="${CSS.escape(key)}"]`)
        ?.classList.add("active");
    $("#skin-title").textContent = entry.name;
    $("#empty").hidden = true;
    cancelPreload();
    const token = ++renderToken;
    setBusy(true);
    let app;
    try {
        app = await loadAppearance(key);
    } catch (err) {
        if (token === renderToken) showError(err);
        return;
    }
    if (token !== renderToken) return;
    state.app = app;
    const poses = sortPoses(Object.keys(app.motions));
    if (pose) state.chosenPose = pose;
    state.pose = pickPose(app, poses);
    renderPoses(poses);
    syncHeadPanel();
    await rerender();
}

export function pickPose(app, poses = sortPoses(Object.keys(app.motions))) {
    const want = state.chosenPose ?? state.pose;
    return app.motions[want]
        ? want
        : app.motions.Default
          ? "Default"
          : poses[0];
}

export function sortPoses(names) {
    const rank = (n) => {
        const i = POSE_ORDER.indexOf(n);
        return i < 0 ? POSE_ORDER.length : i;
    };
    return names.sort(
        (a, b) =>
            rank(a) - rank(b) ||
            a.localeCompare(b, undefined, { numeric: true })
    );
}

export function stepSkin(d) {
    const items = [...document.querySelectorAll("#list .item")].filter(
        (n) => n.offsetParent
    );
    if (!items.length) return;
    const i = items.findIndex((n) => n.dataset.key === state.skinKey);
    const next =
        items[
            i < 0
                ? d > 0
                    ? 0
                    : items.length - 1
                : Math.min(items.length - 1, Math.max(0, i + d))
        ];
    if (next.dataset.key === state.skinKey) return;
    selectSkin(next.dataset.key);
    next.scrollIntoView({ block: "nearest" });
}

export function selectPose(p) {
    if (!state.app?.motions[p]) return;
    state.pose = p;
    state.chosenPose = p;
    markPose();
    rerender();
}

export function stepPose(d) {
    if (!state.app) return;
    const poses = poseList();
    const i = poses.indexOf(state.pose);
    selectPose(poses[(i + d + poses.length) % poses.length]);
}

let viewCentered = false;

export async function rerender() {
    if (!state.app) return;
    cancelPreload();
    const token = ++renderToken;
    setBusy(true);
    try {
        const key = state.skinKey,
            pose = state.pose;
        const items = await buildItems(state.app, state.app.motions[pose]);
        const scene = await buildScene(items);
        if (scene && !scene.layers.some((l) => l.missing))
            markLoaded(key, pose);
        if (token !== renderToken) return;
        state.scene = scene;
        renderLayers();
        $("#empty").hidden = !!scene;
        if (!scene)
            $("#empty").textContent = "This pose has no visible sprites.";
        if (scene && !viewCentered) {
            viewCentered = true;
            centerView();
        } else draw();
        updateUrl();
        updateExportInfo();
        restartPreload();
    } catch (err) {
        if (token === renderToken) showError(err);
    } finally {
        if (token === renderToken) setBusy(false);
    }
}

export function showError(err) {
    console.error(err);
    setBusy(false);
    state.scene = null;
    renderLayers();
    draw();
    const e = $("#empty");
    e.hidden = false;
    e.textContent = `Could not load data (${err.message}). Is the data folder at ${DATA_ROOT}?`;
}
