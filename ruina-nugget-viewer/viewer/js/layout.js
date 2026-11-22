import { $ } from "./dom.js";
import { store } from "./state.js";
import { resizeCanvas } from "./view.js";

const MOBILE_QUERY = matchMedia("(max-width: 860px)");
export const isMobile = () => MOBILE_QUERY.matches;

const TABS = ["appearance", "canvas", "options"];
const MOBILE_SLOTS = [
    ["#canvas-controls", "#slot-canvas-controls"],
    ["#layers-panel", "#slot-layers"],
    ["#app-controls", "#slot-app-controls"],
    ["#options-body", "#slot-options"],
];
const homes = new Map();
let tab = TABS.includes(store.get("mobile-tab")) ? store.get("mobile-tab") : TABS[0];

export const isPanelOpen = (side) =>
    $("#app").classList.contains(side + "-open");

export function setPanel(side, open) {
    $("#app").classList.toggle(side + "-open", open);
    if (!isMobile()) store.set("panel-" + side, open);
    setTimeout(resizeCanvas, 200);
}

function restorePanels() {
    for (const side of ["left", "right"])
        $("#app").classList.toggle(
            side + "-open",
            isMobile() ? false : store.get("panel-" + side, true)
        );
}

function placeControls() {
    for (const [sel, slot] of MOBILE_SLOTS) {
        const node = $(sel);
        if (!homes.has(node)) {
            const mark = document.createComment(sel);
            node.before(mark);
            homes.set(node, mark);
        }
        if (isMobile()) $(slot).append(node);
        else homes.get(node).after(node);
    }
}

export function setTab(next) {
    tab = next;
    store.set("mobile-tab", tab);
    applyTab();
}

function applyTab() {
    const mobile = isMobile();
    const shown = mobile ? tab : "appearance";
    $("#left .tab-bar").hidden = !mobile;
    for (const pane of document.querySelectorAll("#left .tab-pane"))
        pane.hidden = pane.dataset.tab !== shown;
    for (const b of document.querySelectorAll("#left .tab-bar [data-tab]"))
        b.setAttribute("aria-selected", b.dataset.tab === tab);
}

function applyLayout() {
    restorePanels();
    placeControls();
    applyTab();
}

export function initPanels() {
    document.querySelectorAll("[data-toggle]").forEach((b) => {
        b.onclick = () =>
            setPanel(b.dataset.toggle, !isPanelOpen(b.dataset.toggle));
    });
    document.querySelectorAll("#left .tab-bar [data-tab]").forEach((b) => {
        b.onclick = () => setTab(b.dataset.tab);
    });
    $("#scrim").onclick = () => setPanel("left", false);
    MOBILE_QUERY.addEventListener("change", applyLayout);
    applyLayout();
}
