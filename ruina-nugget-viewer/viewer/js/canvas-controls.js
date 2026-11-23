import { $, el } from "./dom.js";
import { state, store } from "./state.js";
import {
    draw,
    fitView,
    resetView,
    setFlip,
    setZoomPct,
    stepZoom,
    wrap,
    zoomPct,
} from "./view.js";

export function setBg(bg) {
    wrap.classList.remove("bg-checker", "bg-dark", "bg-light");
    wrap.classList.add("bg-" + bg);
    document
        .querySelectorAll(".bg-group [data-bg]")
        .forEach((b) => b.setAttribute("aria-pressed", b.dataset.bg === bg));
    store.set("bg", bg);
}

function initZoomLabel(zl) {
    zl.addEventListener("focus", () => zl.select());
    zl.addEventListener("change", () => {
        const n = parseFloat(zl.value.replace(/[^\d.]/g, ""));
        zl.blur();
        if (Number.isFinite(n)) {
            setZoomPct(n);
        } else {
            draw();
        }
    });
    zl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            zl.blur();
        }
        if (e.key === "Escape") {
            zl.value = zoomPct() + "%";
            zl.blur();
        }
    });
    zl.addEventListener("blur", () => {
        zl.value = zoomPct() + "%";
    });
}

const ACTIONS = {
    "zoom-in": () => stepZoom(1),
    "zoom-out": () => stepZoom(-1),
    reset: resetView,
    fit: fitView,
    flip: () => setFlip(!state.view.flip),
};

function wire(root) {
    for (const b of root.querySelectorAll("[data-act]")) {
        b.onclick = ACTIONS[b.dataset.act];
    }
    for (const b of root.querySelectorAll("[data-bg]")) {
        b.onclick = () => setBg(b.dataset.bg);
    }
    initZoomLabel(root.querySelector(".zoom-label"));
}

export function initCanvasControls() {
    const controls = $("#canvas-controls");
    const copy = el(
        "div",
        { id: "bar-canvas-controls" },
        controls.querySelector(".zoom-label").parentElement.cloneNode(true)
    );
    $("#toolbar").append(copy);
    wire(controls);
    wire(copy);
    setBg(store.get("bg", "checker"));
}
