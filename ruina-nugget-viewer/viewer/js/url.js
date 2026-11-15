import { loadJSON } from "./assets.js";
import { DEFAULT_CUSTOM } from "./config.js";
import { state } from "./state.js";

const URL_HEAD_MODES = ["fixed", "custom"];
const URL_PARTS = {
    frontHair: "fronthair",
    rearHair: "rearhair",
    eyes: "eyes",
    brows: "brows",
    mouths: "mouth",
};
const URL_COLORS = {
    hairColor: "haircolor",
    eyeColor: "eyecolor",
    skinColor: "skincolor",
};
const URL_HEAD_KEYS = [
    "head",
    "fixedhead",
    "gifts",
    ...Object.values(URL_PARTS),
    ...Object.values(URL_COLORS),
];

function writeHeadParams(q) {
    for (const k of URL_HEAD_KEYS) q.delete(k);
    if (!URL_HEAD_MODES.includes(state.headMode)) return;
    q.set("head", state.headMode);
    if (state.headMode === "fixed") {
        q.set("fixedhead", state.fixedHead.split("/").pop());
    } else {
        for (const [k, name] of Object.entries(URL_PARTS)) {
            if (state.custom[k] !== DEFAULT_CUSTOM[k])
                q.set(name, state.custom[k] + 1);
        }
        for (const [k, name] of Object.entries(URL_COLORS)) {
            if (state.custom[k] !== DEFAULT_CUSTOM[k])
                q.set(name, state.custom[k].replace("#", ""));
        }
    }
    const gifts = Object.values(state.gifts)
        .filter((v) => v != null)
        .sort((a, b) => a - b);
    if (gifts.length) q.set("gifts", gifts.join(","));
}

export async function readHeadParams(q) {
    const mode = q.get("head");
    state.headMode = URL_HEAD_MODES.includes(mode) ? mode : "stored";
    state.custom = { ...DEFAULT_CUSTOM };
    for (const [k, name] of Object.entries(URL_PARTS)) {
        const n = parseInt(q.get(name), 10);
        if (n >= 1) state.custom[k] = n - 1;
    }
    for (const [k, name] of Object.entries(URL_COLORS)) {
        const c = q.get(name);
        if (/^[0-9a-f]{6}$/i.test(c || ""))
            state.custom[k] = "#" + c.toLowerCase();
    }
    const fixed = q.get("fixedhead")?.replace(/ /g, "_");
    if (fixed) {
        const entry = state.index.find((e) => e.id === fixed);
        state.fixedHead = entry ? entry.key : fixed;
    }
    state.gifts = {};
    const ids = (q.get("gifts") || "")
        .split(",")
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length) {
        const data = await loadJSON("customize/gifts.json");
        for (const id of ids) {
            const g = data.gifts.find((x) => x.id === id);
            if (g && !g.noAppear && g.prefab && data.prefabs[g.prefab])
                state.gifts[g.position] = id;
        }
    }
}

export function updateUrl() {
    if (!state.skinKey) return;
    const q = new URLSearchParams(location.search);
    q.set("keypage", state.skinKey.split("/")[1]);
    const pose = state.chosenPose ?? state.pose;
    if (pose) q.set("pose", pose);
    else q.delete("pose");
    writeHeadParams(q);
    const url = "?" + q.toString().replace(/%2F/g, "/").replace(/%2C/g, ",");
    if (location.search !== url || location.hash)
        history.replaceState(null, "", url);
}

export function parseUrl() {
    const q = new URLSearchParams(location.search);
    const name = q.get("keypage")?.replace(/ /g, "_");
    const entry = name && state.index.find((e) => e.key.split("/")[1] === name);
    return entry ? { key: entry.key, pose: q.get("pose") || undefined } : null;
}
