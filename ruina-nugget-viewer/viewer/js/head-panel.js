import { dataUrl, loadJSON } from "./assets.js";
import {
    colorEdit,
    colorHex,
    setHsvFromHex,
    syncColorEditor,
    syncColorSwatches,
} from "./color-editor.js";
import { CATEGORIES, GIFT_POSITIONS, PARTS } from "./config.js";
import { $, el } from "./dom.js";
import { fixedHeadSkinColor, hasSprite, headCapable } from "./layering.js";
import {
    collapsibleGroup,
    highlight,
    langInfo,
    localJSON,
    prettyName,
} from "./list.js";
import { rerender, showError } from "./selection.js";
import { state, store } from "./state.js";
import { updateUrl } from "./url.js";

let headDataLoaded = false;
async function ensureHeadData() {
    if (headDataLoaded) return;
    headDataLoaded = true;
    const [cust, special, gifts, stored] = await Promise.all([
        loadJSON("customize/customize.json"),
        loadJSON("customize/special_heads.json"),
        loadJSON("customize/gifts.json"),
        localJSON("stored_heads.json"),
    ]);
    state.storedHeads = stored || [];
    buildParts(cust);
    buildFixedHeads(special);
    buildGifts(gifts);
    if (!state.fixedSkinColor) {
        state.fixedSkinColor = await fixedHeadSkinColor(state.fixedHead);
        headChanged();
    }
}

export function syncHeadPanel() {
    const capable = state.app && headCapable(state.app);
    const body = $("#head-section .fold-body");
    body.inert = !capable;
    body.classList.toggle("disabled-block", !capable);
    ensureHeadData().catch(showError);
    document
        .querySelectorAll("#head-mode button")
        .forEach((b) =>
            b.setAttribute("aria-pressed", b.dataset.mode === state.headMode)
        );
    $("#custom-controls").hidden = state.headMode !== "custom";
    $("#fixed-controls").hidden = state.headMode !== "fixed";
    const gifts = $("#gift-controls");
    gifts.inert = !capable;
    gifts.classList.toggle(
        "disabled-block",
        !capable || state.headMode === "stored"
    );
    if (colorEdit.key) setHsvFromHex(colorHex());
    syncColorSwatches();
    syncColorEditor();
    for (const p of PARTS) syncPart(p.key);
    syncFixedHeads();
    for (const sel of document.querySelectorAll("#gifts select"))
        sel.value = state.gifts[sel.dataset.pos] ?? "";
    const n = Object.values(state.gifts).filter((v) => v != null).length;
    $("#gift-count").textContent = n ? `(${n})` : "";
}

export function saveHead() {
    store.set("head", {
        headMode: state.headMode,
        custom: state.custom,
        fixedHead: state.fixedHead,
        fixedSkinColor: state.fixedSkinColor,
        gifts: state.gifts,
    });
    updateUrl();
}

export function headChanged() {
    saveHead();
    syncHeadPanel();
    rerender();
}

const partCounts = {};
function buildParts(cust) {
    const box = $("#parts");
    box.textContent = "";
    for (const p of PARTS) {
        const list = cust[p.key];
        partCounts[p.key] = list.length;
        const val = el("span", { className: "val muted small" });
        const thumbs = el("div", { className: "thumbs" });
        const det = el(
            "details",
            {},
            el("summary", {}, p.label, val),
            el("div", { className: "part-body" }, thumbs)
        );
        det.dataset.part = p.key;
        const set = (i) => {
            state.custom[p.key] = i;
            headChanged();
        };
        det.addEventListener("toggle", () => {
            if (!det.open || thumbs.childElementCount) return;
            list.forEach((part, i) => {
                const spr = p.thumb(part);
                const t = el(
                    "button",
                    { className: "thumb", ariaLabel: `${p.label} ${i + 1}` },
                    el("span", { className: "n", textContent: i + 1 })
                );
                if (hasSprite(spr))
                    t.append(
                        el("img", {
                            src: dataUrl(spr.file),
                            loading: "lazy",
                            alt: "",
                        })
                    );
                t.dataset.i = i;
                t.onclick = () => set(i);
                thumbs.append(t);
            });
            syncPart(p.key);
        });
        box.append(det);
    }
}

function syncPart(key) {
    const det = document.querySelector(`#parts details[data-part="${key}"]`);
    if (!det) return;
    const i = Math.min(state.custom[key], partCounts[key] - 1);
    det.querySelector(".val").textContent = String(i + 1);
    det.querySelectorAll(".thumb").forEach((t) =>
        t.setAttribute("aria-pressed", +t.dataset.i === i)
    );
}

const SPECIAL_HEAD_CATEGORY = {
    customized_ozmapumpkin: "creatureskin",
    customized_plutopuppet: "enemy",
};

export function buildFixedHeads(special) {
    const collator = new Intl.Collator(langInfo().tag);
    const groups = Object.fromEntries(CATEGORIES.map((c) => [c.key, []]));
    const duplicates = new Set();
    for (const k of Object.keys(special)) {
        const cat = SPECIAL_HEAD_CATEGORY[k] || "new";
        const name =
            state.localNames[k] ||
            state.enNames[k] ||
            prettyName(k, "customized_");
        groups[cat].push({
            value: k,
            name,
            hay: [name, state.enNames[k] || "", k].join(" ").toLowerCase(),
        });
        if (!SPECIAL_HEAD_CATEGORY[k])
            duplicates.add("new/appearance_" + k.replace("customized_", ""));
    }
    const stored = new Set(state.storedHeads);
    for (const e of state.index) {
        if (stored.has(e.key) && !duplicates.has(e.key))
            groups[e.category].push({ value: e.key, name: e.name, hay: e.hay });
    }
    state.fixedHeadGroups = CATEGORIES.filter((c) => groups[c.key].length).map(
        (c) => [
            c,
            groups[c.key].sort((x, y) => collator.compare(x.name, y.name)),
        ]
    );
    if (duplicates.has(state.fixedHead)) {
        state.fixedHead = state.fixedHead.replace(
            "new/appearance_",
            "customized_"
        );
        headChanged();
    }
    $("#fixed-head-list").lang = langInfo().tag;
    renderFixedHeads();
}

export function renderFixedHeads() {
    const list = $("#fixed-head-list");
    const q = $("#fixed-head-search").value.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    list.textContent = "";
    for (const [c, options] of state.fixedHeadGroups || []) {
        const shown = options.filter((o) =>
            terms.every((t) => o.hay.includes(t))
        );
        if (!shown.length) continue;
        const [group, items] = collapsibleGroup(
            "head:" + c.key,
            c.label,
            "group",
            q
        );
        for (const o of shown) {
            const b = el(
                "button",
                {
                    className:
                        "item" + (o.value === state.fixedHead ? " active" : ""),
                },
                el("span", { className: "nm" }, highlight(o.name, terms[0]))
            );
            b.dataset.value = o.value;
            b.onclick = async () => {
                state.fixedHead = o.value;
                const color = await fixedHeadSkinColor(o.value);
                if (state.fixedHead !== o.value) return;
                state.fixedSkinColor = color;
                headChanged();
            };
            items.append(b);
        }
        list.append(group);
    }
    if (!list.childElementCount)
        list.append(
            el("div", {
                className: "muted small empty-note",
                textContent: "No matches",
            })
        );
    scrollFixedHeadIntoView();
}

function syncFixedHeads() {
    for (const b of document.querySelectorAll("#fixed-head-list .item"))
        b.classList.toggle("active", b.dataset.value === state.fixedHead);
    scrollFixedHeadIntoView();
}

function scrollFixedHeadIntoView() {
    const list = $("#fixed-head-list");
    const active = list.querySelector(".item.active");
    if (!active || !active.offsetParent) return;
    const top =
        active.getBoundingClientRect().top -
        list.getBoundingClientRect().top +
        list.scrollTop;
    if (
        top < list.scrollTop ||
        top + active.offsetHeight > list.scrollTop + list.clientHeight
    )
        list.scrollTop = top - list.clientHeight / 2;
}

export function pickFirstFixedHead() {
    [...document.querySelectorAll("#fixed-head-list .item")]
        .find((b) => b.offsetParent)
        ?.click();
}

function buildGifts(data) {
    const box = $("#gifts");
    box.textContent = "";
    const usable = data.gifts.filter(
        (g) => !g.noAppear && g.prefab && data.prefabs[g.prefab]
    );
    for (const pos of GIFT_POSITIONS) {
        const opts = usable
            .filter((g) => g.position === pos)
            .map((g) => ({
                id: g.id,
                name:
                    (`${g.prefix} ${g.postfix}`.trim() ||
                        `Battle Symbol ${g.id}`) +
                    (data.prefabs[g.prefab].aura ? "*" : ""),
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
        if (!opts.length) continue;
        const sel = el(
            "select",
            {},
            el("option", { value: "", textContent: "None" })
        );
        for (const o of opts)
            sel.append(el("option", { value: o.id, textContent: o.name }));
        sel.dataset.pos = pos;
        sel.value = state.gifts[pos] ?? "";
        sel.onchange = () => {
            state.gifts[pos] = sel.value === "" ? null : +sel.value;
            headChanged();
        };
        box.append(
            el(
                "label",
                { className: "field" },
                pos.replace(/([a-z])([A-Z])/g, "$1 $2"),
                sel
            )
        );
    }
}

export function randomize() {
    const r = (n) => Math.floor(Math.random() * n);
    for (const p of PARTS)
        if (partCounts[p.key]) state.custom[p.key] = r(partCounts[p.key]);
    const hsl = (h, s, l) => {
        const c = document.createElement("canvas").getContext("2d");
        c.fillStyle = `hsl(${h} ${s}% ${l}%)`;
        return c.fillStyle;
    };
    state.custom.hairColor = hsl(r(360), 15 + r(60), 15 + r(70));
    state.custom.eyeColor = hsl(r(360), 30 + r(60), 25 + r(45));
    state.custom.skinColor = hsl(15 + r(20), 30 + r(50), 55 + r(38));
    headChanged();
}

export function randomizeGifts() {
    state.gifts = {};
    for (const sel of document.querySelectorAll("#gifts select")) {
        if (Math.random() < 0.5) continue;
        const opts = [...sel.options].filter((o) => o.value !== "");
        if (opts.length)
            state.gifts[sel.dataset.pos] =
                +opts[Math.floor(Math.random() * opts.length)].value;
    }
    headChanged();
}
