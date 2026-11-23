import { initCanvasControls } from "./canvas-controls.js";
import { initColorEditor } from "./color-editor.js";
import { DEFAULT_CUSTOM, DEFAULT_SKIN, IS_LOCAL } from "./config.js";
import { $ } from "./dom.js";
import {
    doCopy,
    doExport,
    doExportAll,
    initExportScale,
    updateExportInfo,
} from "./export.js";
import {
    headChanged,
    pickFirstFixedHead,
    randomize,
    randomizeGifts,
    renderFixedHeads,
} from "./head-panel.js";
import { LANGUAGES, initLangMenu, renderLangGroup } from "./lang.js";
import { initLayersPanel } from "./layers-panel.js";
import { initPanels } from "./layout.js";
import { loadIndex, renderList } from "./list.js";
import { initPoses } from "./poses.js";
import { initPreloadSetting, updateLoadedCount } from "./preload.js";
import { selectSkin, showError, stepPose, stepSkin } from "./selection.js";
import { state, store } from "./state.js";
import { initTheme } from "./theme.js";
import { parseUrl, readHeadParams } from "./url.js";
import { fitView, resizeCanvas, setFlip, stepZoom, wrap } from "./view.js";

if (!IS_LOCAL && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(() => {});
}

function init() {
    const saved = store.get("head", null);
    if (saved) {
        state.headMode = saved.headMode || state.headMode;
        state.custom = { ...DEFAULT_CUSTOM, ...saved.custom };
        state.fixedHead = saved.fixedHead || state.fixedHead;
        state.fixedSkinColor = saved.fixedSkinColor || null;
        state.gifts = saved.gifts || {};
    }
    state.collapsed = new Set(store.get("collapsed", []));
    initPanels();
    $("#search").addEventListener("input", (e) => {
        state.filter.text = e.target.value;
        renderList();
    });
    $("#search").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            document.querySelector("#list .item")?.click();
        }
        if (e.key === "Escape") {
            e.target.value = "";
            state.filter.text = "";
            renderList();
            e.target.blur();
        }
    });
    const fhs = $("#fixed-head-search");
    fhs.addEventListener("input", renderFixedHeads);
    fhs.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            pickFirstFixedHead();
        }
        if (e.key === "Escape") {
            fhs.value = "";
            renderFixedHeads();
            fhs.blur();
        }
    });
    initLayersPanel();
    initCanvasControls();
    initPoses();
    initTheme();

    document.querySelectorAll("#head-mode button").forEach((b) => {
        b.onclick = () => {
            state.headMode = b.dataset.mode;
            headChanged();
        };
    });
    initColorEditor();
    $("#randomize").onclick = randomize;
    $("#randomize-gifts").onclick = randomizeGifts;
    $("#reset-custom").onclick = () => {
        state.custom = { ...DEFAULT_CUSTOM };
        headChanged();
    };
    $("#clear-gifts").onclick = () => {
        state.gifts = {};
        headChanged();
    };

    for (const id of [
        "exp-format",
        "exp-bg",
        "exp-bg-color",
        "exp-pad",
        "exp-quality",
        "exp-flip",
    ]) {
        $("#" + id).addEventListener("input", updateExportInfo);
    }
    initExportScale();
    $("#export").onclick = doExport;
    $("#copy").onclick = doCopy;
    $("#export-all").onclick = doExportAll;
    initPreloadSetting();

    window.addEventListener("keydown", (e) => {
        const t = e.target;
        if (
            t.matches("input, select, textarea") &&
            t.type !== "range" &&
            t.type !== "checkbox"
        ) {
            return;
        }
        if (e.ctrlKey || e.metaKey || e.altKey) {
            return;
        }
        if (e.key === "f" || e.key === "F") {
            setFlip(!state.view.flip);
        } else if (e.key === "0") {
            fitView();
        } else if (e.key === "+" || e.key === "=") {
            stepZoom(1);
        } else if (e.key === "-") {
            stepZoom(-1);
        } else if (
            e.key.startsWith("Arrow") &&
            !e.defaultPrevented &&
            t.type !== "range"
        ) {
            e.preventDefault();
            if (e.key === "ArrowRight") {
                stepPose(1);
            } else if (e.key === "ArrowLeft") {
                stepPose(-1);
            } else {
                stepSkin(e.key === "ArrowDown" ? 1 : -1);
            }
        }
    });

    new ResizeObserver(resizeCanvas).observe(wrap);
    resizeCanvas();
    updateExportInfo();
    state.lang = LANGUAGES.some((l) => l.key === store.get("lang"))
        ? store.get("lang")
        : "en";
    renderLangGroup();
    initLangMenu();

    loadIndex()
        .then(async () => {
            updateLoadedCount();
            const q = new URLSearchParams(location.search);
            if (q.has("keypage")) {
                await readHeadParams(q);
            }
            const h = parseUrl();
            const has = (k) => state.index.some((e) => e.key === k);
            const savedSkin = store.get("skin", null);
            const key = h
                ? h.key
                : has(savedSkin)
                  ? savedSkin
                  : has(DEFAULT_SKIN)
                    ? DEFAULT_SKIN
                    : state.index[0]?.key;
            if (key) {
                selectSkin(key, h?.pose);
            }
            document
                .querySelector(".item.active")
                ?.scrollIntoView({ block: "center" });
        })
        .catch(showError);
}

init();
