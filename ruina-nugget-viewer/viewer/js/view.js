import { $ } from "./dom.js";
import { updateExportInfo } from "./export.js";
import { drawScene } from "./scene.js";
import { state } from "./state.js";

const canvas = $("#canvas");
const ctx = canvas.getContext("2d");
export const wrap = $("#canvas-wrap");
let dpr = 1;

export function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    const r = wrap.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(r.width * dpr));
    canvas.height = Math.max(1, Math.floor(r.height * dpr));
    canvas.style.width = canvas.width / dpr + "px";
    canvas.style.height = canvas.height / dpr + "px";
    draw();
}

function viewMatrix() {
    const v = state.view;
    return new DOMMatrix()
        .translate(canvas.width / 2, canvas.height / 2)
        .scale(v.zoom * dpr)
        .translate(-v.camX, -v.camY)
        .scale(v.flip ? -1 : 1, 1);
}

let drawQueued = false;
export function draw() {
    for (const zl of document.querySelectorAll(".zoom-label"))
        if (document.activeElement !== zl) zl.value = zoomPct() + "%";
    if (drawQueued) return;
    drawQueued = true;
    requestAnimationFrame(() => {
        drawQueued = false;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!state.scene) return;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        drawScene(ctx, state.scene, viewMatrix(), state.hiddenLayers);
    });
}

export function centerView() {
    if (!state.scene) return;
    const b = state.scene.bounds;
    const v = state.view;
    const cx = (b.minX + b.maxX) / 2;
    v.camX = v.flip ? -cx : cx;
    v.camY = (b.minY + b.maxY) / 2;
    draw();
}

export function fitView() {
    if (!state.scene) return;
    const b = state.scene.bounds;
    const cw = canvas.width / dpr,
        ch = canvas.height / dpr;
    state.view.zoom = clampZoom(Math.min(cw / b.w, ch / b.h) * 0.86);
    centerView();
}

const ZOOM_MIN_PCT = 10,
    ZOOM_MAX_PCT = 990;
const clampZoom = (z) =>
    Math.min(ZOOM_MAX_PCT / 100, Math.max(ZOOM_MIN_PCT / 100, z));
export const zoomPct = () => Math.round(state.view.zoom * 100);

export function setZoomPct(pct, sx, sy) {
    const p = Math.min(ZOOM_MAX_PCT, Math.max(ZOOM_MIN_PCT, Math.round(pct)));
    zoomAt(p / 100 / state.view.zoom, sx, sy);
}

export const stepZoom = (dir, sx, sy) =>
    setZoomPct(zoomPct() + (dir > 0 ? 10 : -10), sx, sy);

export function resetView() {
    if (!state.scene) return;
    state.view.zoom = 1;
    centerView();
}

function zoomAt(factor, sx, sy) {
    const v = state.view;
    const nz = clampZoom(v.zoom * factor);
    if (sx == null) {
        sx = canvas.width / dpr / 2;
        sy = canvas.height / dpr / 2;
    }
    const ox = sx - canvas.width / dpr / 2,
        oy = sy - canvas.height / dpr / 2;
    v.camX += ox / v.zoom - ox / nz;
    v.camY += oy / v.zoom - oy / nz;
    v.zoom = nz;
    draw();
}

export function setFlip(on) {
    if (state.view.flip === on) return;
    state.view.flip = on;
    state.view.camX = -state.view.camX;
    document
        .querySelectorAll('[data-act="flip"]')
        .forEach((b) => b.setAttribute("aria-pressed", on));
    draw();
    updateExportInfo();
}

const pointers = new Map();
let pinch = null;
canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.classList.add("dragging");
    if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) };
    }
});
canvas.addEventListener("pointermove", (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    const v = state.view;
    if (pointers.size === 1) {
        v.camX -= (cur.x - prev.x) / v.zoom;
        v.camY -= (cur.y - prev.y) / v.zoom;
        pointers.set(e.pointerId, cur);
        draw();
    } else if (pointers.size === 2 && pinch) {
        pointers.set(e.pointerId, cur);
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const r = canvas.getBoundingClientRect();
        v.camX -= (cur.x - prev.x) / 2 / v.zoom;
        v.camY -= (cur.y - prev.y) / 2 / v.zoom;
        zoomAt(
            dist / pinch.dist,
            (a.x + b.x) / 2 - r.left,
            (a.y + b.y) / 2 - r.top
        );
        pinch.dist = dist;
    }
});
const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!pointers.size) canvas.classList.remove("dragging");
};
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);
const WHEEL_NOTCH = 40,
    WHEEL_SMOOTH_STEP = 100;
let wheelAcc = 0;
canvas.addEventListener(
    "wheel",
    (e) => {
        e.preventDefault();
        const r = canvas.getBoundingClientRect();
        const delta =
            e.deltaMode === 1
                ? e.deltaY * 16
                : e.deltaMode === 2
                  ? e.deltaY * 100
                  : e.deltaY;
        let dir = 0;
        if (Math.abs(delta) >= WHEEL_NOTCH) {
            wheelAcc = 0;
            dir = -Math.sign(delta);
        } else {
            wheelAcc += delta;
            if (Math.abs(wheelAcc) >= WHEEL_SMOOTH_STEP) {
                dir = -Math.sign(wheelAcc);
                wheelAcc = 0;
            }
        }
        if (dir) stepZoom(dir, e.clientX - r.left, e.clientY - r.top);
    },
    { passive: false }
);
