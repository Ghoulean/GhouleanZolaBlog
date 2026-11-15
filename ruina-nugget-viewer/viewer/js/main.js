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
import { setLayersOpen, toggleAllLayers } from "./layers-panel.js";
import { loadIndex, renderList } from "./list.js";
import { initPreloadSetting, updateLoadedCount } from "./preload.js";
import {
    selectPose,
    selectSkin,
    showError,
    stepPose,
    stepSkin,
} from "./selection.js";
import { state, store } from "./state.js";
import { parseUrl, readHeadParams } from "./url.js";
import {
    draw,
    fitView,
    resetView,
    resizeCanvas,
    setFlip,
    setZoomPct,
    stepZoom,
    wrap,
    zoomPct,
} from "./view.js";

if (!IS_LOCAL && "serviceWorker" in navigator)
    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(() => {});

export function setPanel(side, open) {
    const app = $("#app");
    app.classList.toggle(side + "-open", open);
    if (!matchMedia("(max-width: 860px)").matches)
        store.set("panel-" + side, open);
    setTimeout(resizeCanvas, 200);
}

function init() {
    const saved = store.get("head", null);
    if (saved) {
        state.headMode = saved.headMode || state.headMode;
        state.custom = { ...DEFAULT_CUSTOM, ...saved.custom };
        state.fixedHead = saved.fixedHead || state.fixedHead;
        state.gifts = saved.gifts || {};
    }
    state.collapsed = new Set(store.get("collapsed", []));
    const mobile = matchMedia("(max-width: 860px)").matches;
    for (const side of ["left", "right"])
        $("#app").classList.toggle(
            side + "-open",
            mobile ? false : store.get("panel-" + side, true)
        );
    setBg(store.get("bg", "checker"));

    document.querySelectorAll("[data-toggle]").forEach((b) => {
        b.onclick = () =>
            setPanel(
                b.dataset.toggle,
                !$("#app").classList.contains(b.dataset.toggle + "-open")
            );
    });
    $("#search").addEventListener("input", (e) => {
        state.filter.text = e.target.value;
        renderList();
    });
    $("#search").addEventListener("keydown", (e) => {
        if (e.key === "Enter") document.querySelector("#list .item")?.click();
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
        if (e.key === "Enter") pickFirstFixedHead();
        if (e.key === "Escape") {
            fhs.value = "";
            renderFixedHeads();
            fhs.blur();
        }
    });
    $("#layers-toggle").onclick = () =>
        setLayersOpen($("#layers-panel").hidden);
    $("#layers-all").onchange = toggleAllLayers;
    $("#zoom-in").onclick = () => stepZoom(1);
    $("#zoom-out").onclick = () => stepZoom(-1);
    const zl = $("#zoom-label");
    zl.addEventListener("focus", () => zl.select());
    zl.addEventListener("change", () => {
        const n = parseFloat(zl.value.replace(/[^\d.]/g, ""));
        zl.blur();
        if (Number.isFinite(n)) setZoomPct(n);
        else draw();
    });
    zl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") zl.blur();
        if (e.key === "Escape") {
            zl.value = zoomPct() + "%";
            zl.blur();
        }
    });
    zl.addEventListener("blur", () => {
        zl.value = zoomPct() + "%";
    });
    $("#reset-view").onclick = resetView;
    const poseBar = $("#poses");
    poseBar.onclick = (e) => {
        const b = e.target.closest(".pose-btn");
        if (b) {
            selectPose(b.dataset.pose);
            b.blur();
        }
    };
    poseBar.addEventListener(
        "wheel",
        (e) => {
            if (
                !e.deltaY ||
                Math.abs(e.deltaX) > Math.abs(e.deltaY) ||
                poseBar.scrollWidth <= poseBar.clientWidth
            )
                return;
            poseBar.scrollLeft += e.deltaY;
            e.preventDefault();
        },
        { passive: false }
    );
    $("#fit").onclick = fitView;
    $("#flip").onclick = () => setFlip(!state.view.flip);
    document.querySelectorAll("#bg-group [data-bg]").forEach((b) => {
        b.onclick = () => setBg(b.dataset.bg);
    });
    $("#theme-toggle").onclick = () =>
        setTheme(
            document.documentElement.dataset.theme === "light"
                ? "dark"
                : "light"
        );
    setTheme(
        document.documentElement.dataset.theme === "light" ? "light" : "dark",
        false
    );

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
        )
            return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === "f" || e.key === "F") setFlip(!state.view.flip);
        else if (e.key === "0") fitView();
        else if (e.key === "+" || e.key === "=") stepZoom(1);
        else if (e.key === "-") stepZoom(-1);
        else if (
            e.key.startsWith("Arrow") &&
            !e.defaultPrevented &&
            t.type !== "range"
        ) {
            e.preventDefault();
            if (e.key === "ArrowRight") stepPose(1);
            else if (e.key === "ArrowLeft") stepPose(-1);
            else stepSkin(e.key === "ArrowDown" ? 1 : -1);
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
            if (q.has("keypage")) await readHeadParams(q);
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
            if (key) selectSkin(key, h?.pose);
            document
                .querySelector(".item.active")
                ?.scrollIntoView({ block: "center" });
        })
        .catch(showError);
}

const THEME_ICONS = {
    dark: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/></svg>`,
    light:
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none"/>` +
        [0, 45, 90, 135, 180, 225, 270, 315]
            .map(
                (a) => `<path d="M12 2.5v2.5" transform="rotate(${a} 12 12)"/>`
            )
            .join("") +
        `</svg>`,
};

function setTheme(theme, save = true) {
    document.documentElement.dataset.theme = theme;
    if (save) store.set("theme", theme);
    const b = $("#theme-toggle");
    const other = theme === "dark" ? "light" : "dark";
    b.innerHTML = THEME_ICONS[theme];
    b.setAttribute("aria-label", `Switch to ${other} mode`);
}

function setBg(bg) {
    wrap.classList.remove("bg-checker", "bg-dark", "bg-light");
    wrap.classList.add("bg-" + bg);
    document
        .querySelectorAll("#bg-group [data-bg]")
        .forEach((b) => b.setAttribute("aria-pressed", b.dataset.bg === bg));
    store.set("bg", bg);
}

init();
