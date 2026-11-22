import { DEFAULT_CUSTOM } from "./config.js";

export const state = {
    index: [],
    filter: { text: "" },
    collapsed: new Set(),
    skinKey: null,
    app: null,
    poses: [],
    pose: null,
    chosenPose: null,
    headMode: "stored",
    custom: { ...DEFAULT_CUSTOM },
    fixedHead: "customized_roland",
    fixedSkinColor: null,
    localNames: {},
    enNames: {},
    storedHeads: [],
    gifts: {},
    hiddenLayers: new Set(),
    view: { zoom: 1, camX: 0, camY: 0, flip: false },
    scene: null,
};

export const store = {
    get(k, d) {
        try {
            const v = localStorage.getItem("ruina-viewer:" + k);
            return v == null ? d : JSON.parse(v);
        } catch {
            return d;
        }
    },
    set(k, v) {
        try {
            localStorage.setItem("ruina-viewer:" + k, JSON.stringify(v));
        } catch {}
    },
};
