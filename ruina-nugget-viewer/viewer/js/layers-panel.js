import { dataUrl } from "./assets.js";
import { $, el } from "./dom.js";
import { state } from "./state.js";
import { draw } from "./view.js";

export function renderLayers() {
    const layers = state.scene?.layers || [];
    $("#layers-toggle").textContent = `Layers (${layers.length})`;
    $("#layers-count").textContent = layers.length ? `(${layers.length})` : "";
    const list = $("#layers-list");
    list.textContent = "";
    for (const l of [...layers].reverse()) {
        const box = el("input", {
            type: "checkbox",
            checked: !state.hiddenLayers.has(l.key),
            disabled: l.missing,
        });
        box.onchange = () => {
            if (box.checked) state.hiddenLayers.delete(l.key);
            else state.hiddenLayers.add(l.key);
            syncLayersAll();
            draw();
        };
        const thumb = l.missing
            ? el("span", { className: "lp-thumb" })
            : el("img", {
                  className: "lp-thumb",
                  src: dataUrl(l.file),
                  loading: "lazy",
                  alt: "",
              });
        list.append(
            el(
                "li",
                {},
                el(
                    "label",
                    { className: "lp-row" + (l.missing ? " missing" : "") },
                    box,
                    thumb,
                    el("span", {
                        className: "lp-order mono",
                        textContent: +l.order.toFixed(2),
                    })
                )
            )
        );
    }
    syncLayersAll();
}

const toggleableLayers = () =>
    (state.scene?.layers || []).filter((l) => !l.missing);

function syncLayersAll() {
    const all = $("#layers-all");
    const layers = toggleableLayers();
    const hidden = layers.filter((l) => state.hiddenLayers.has(l.key)).length;
    all.disabled = !layers.length;
    all.checked = hidden === 0;
    all.indeterminate = hidden > 0 && hidden < layers.length;
}

export function toggleAllLayers() {
    const layers = toggleableLayers();
    const allVisible = layers.every((l) => !state.hiddenLayers.has(l.key));
    for (const l of layers) {
        if (allVisible) state.hiddenLayers.add(l.key);
        else state.hiddenLayers.delete(l.key);
    }
    renderLayers();
    draw();
}

function setLayersPopoverOpen(open) {
    $("#layers-popover").hidden = !open;
    $("#layers-toggle").setAttribute("aria-expanded", open);
}

export function initLayersPanel() {
    $("#layers-toggle").onclick = () =>
        setLayersPopoverOpen($("#layers-popover").hidden);
    $("#layers-all").onchange = toggleAllLayers;
}
