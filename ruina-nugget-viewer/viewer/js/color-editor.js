import { $, el } from "./dom.js";
import { saveHead } from "./head-panel.js";
import { rerender } from "./selection.js";
import { state } from "./state.js";

const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbToHex = (rgb) =>
    "#" + rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");

function rgbToHsv([r, g, b]) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
        d = max - Math.min(r, g, b);
    let h = 0;
    if (d)
        h =
            60 *
            (max === r
                ? ((g - b) / d + 6) % 6
                : max === g
                  ? (b - r) / d + 2
                  : (r - g) / d + 4);
    return [h, max ? (d / max) * 100 : 0, max * 100];
}

function hsvToRgb([h, s, v]) {
    s /= 100;
    v /= 100;
    const f = (n) => {
        const k = (n + h / 60) % 6;
        return (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255;
    };
    return [f(5), f(3), f(1)];
}

const CE_CHANNELS = {
    rgb: [
        { label: "R", max: 255 },
        { label: "G", max: 255 },
        { label: "B", max: 255 },
    ],
    hsv: [
        { label: "H", max: 360 },
        { label: "S", max: 100 },
        { label: "V", max: 100 },
    ],
};

export const colorEdit = { key: null, hsv: [0, 0, 0] };

export function colorHex() {
    return state.custom[colorEdit.key + "Color"];
}

export function setHsvFromHex(hex) {
    const [h, s, v] = rgbToHsv(hexToRgb(hex));
    const old = colorEdit.hsv;
    colorEdit.hsv = [s && v ? h : old[0], v ? s : old[1], v];
}

function ceValues(mode) {
    return mode === "rgb" ? hexToRgb(colorHex()) : colorEdit.hsv;
}

function ceGradient(mode, i) {
    const css = (rgb) => `rgb(${rgb.map(Math.round).join(",")})`;
    if (mode === "rgb") {
        const rgb = hexToRgb(colorHex());
        const at = (c) => css(rgb.map((x, j) => (j === i ? c : x)));
        return `linear-gradient(to right, ${at(0)}, ${at(255)})`;
    }
    const [h, s, v] = colorEdit.hsv;
    if (i === 0)
        return `linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360].map((x) => css(hsvToRgb([x, s, v]))).join(", ")})`;
    if (i === 1)
        return `linear-gradient(to right, ${css(hsvToRgb([h, 0, v]))}, ${css(hsvToRgb([h, 100, v]))})`;
    return `linear-gradient(to right, ${css(hsvToRgb([h, s, 0]))}, ${css(hsvToRgb([h, s, 100]))})`;
}

function buildColorRows() {
    const box = $("#ce-rows");
    box.textContent = "";
    for (const mode of ["rgb", "hsv"]) {
        box.append(
            el("div", {
                className: "ce-group",
                textContent: mode.toUpperCase(),
            })
        );
        CE_CHANNELS[mode].forEach((ch, i) => {
            const range = el("input", {
                type: "range",
                className: "ce-track",
                min: 0,
                max: ch.max,
                step: 1,
            });
            const num = el("input", {
                type: "number",
                min: 0,
                max: ch.max,
                step: 1,
            });
            range.setAttribute("aria-label", ch.label);
            num.setAttribute("aria-label", ch.label);
            const commit = (raw) => {
                const n = Math.min(
                    ch.max,
                    Math.max(0, Math.round(Number(raw)))
                );
                if (!Number.isFinite(n)) return;
                if (mode === "rgb") {
                    const rgb = hexToRgb(colorHex());
                    rgb[i] = n;
                    applyEditorColor(rgbToHex(rgb), false);
                } else {
                    colorEdit.hsv[i] = n;
                    applyEditorColor(rgbToHex(hsvToRgb(colorEdit.hsv)), true);
                }
            };
            range.addEventListener("input", () => commit(range.value));
            num.addEventListener("input", () => {
                if (num.value !== "") commit(num.value);
            });
            num.addEventListener("blur", () => syncColorEditor());
            const row = el(
                "div",
                { className: "ce-row" },
                el("span", { textContent: ch.label }),
                range,
                num
            );
            row.dataset.mode = mode;
            row.dataset.i = i;
            box.append(row);
        });
    }
}

function applyEditorColor(hex, keepHsv) {
    state.custom[colorEdit.key + "Color"] = hex;
    if (!keepHsv) setHsvFromHex(hex);
    saveHead();
    syncColorSwatches();
    syncColorEditor();
    rerender();
}

export function syncColorSwatches() {
    for (const b of document.querySelectorAll(".color-item")) {
        b.querySelector(".color-fill").style.background =
            state.custom[b.dataset.color + "Color"];
        b.setAttribute("aria-pressed", b.dataset.color === colorEdit.key);
    }
}

export function syncColorEditor() {
    const ed = $("#color-editor");
    ed.hidden = !colorEdit.key;
    if (!colorEdit.key) return;
    const hexIn = $("#ce-hex");
    if (document.activeElement !== hexIn) {
        hexIn.value = colorHex().toUpperCase();
        hexIn.classList.remove("invalid");
    }
    const vals = { rgb: ceValues("rgb"), hsv: ceValues("hsv") };
    for (const row of $("#ce-rows").querySelectorAll(".ce-row")) {
        const { mode } = row.dataset,
            i = Number(row.dataset.i);
        const [range, num] = row.querySelectorAll("input");
        const v = Math.round(vals[mode][i]);
        range.value = v;
        range.style.background = ceGradient(mode, i);
        if (document.activeElement !== num) num.value = v;
    }
}

function openColorEditor(key) {
    colorEdit.key = colorEdit.key === key ? null : key;
    if (colorEdit.key) setHsvFromHex(colorHex());
    syncColorSwatches();
    syncColorEditor();
}

export function initColorEditor() {
    for (const b of document.querySelectorAll(".color-item"))
        b.onclick = () => openColorEditor(b.dataset.color);
    const hexIn = $("#ce-hex");
    hexIn.addEventListener("input", () => {
        let s = hexIn.value.trim();
        if (!s.startsWith("#")) s = "#" + s;
        if (/^#[0-9a-f]{3}$/i.test(s))
            s = "#" + [...s.slice(1)].map((c) => c + c).join("");
        const ok = /^#[0-9a-f]{6}$/i.test(s);
        hexIn.classList.toggle("invalid", !ok);
        if (ok) applyEditorColor(s.toLowerCase(), false);
    });
    hexIn.addEventListener("blur", () => syncColorEditor());
    hexIn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === "Escape") hexIn.blur();
    });
    buildColorRows();
}
