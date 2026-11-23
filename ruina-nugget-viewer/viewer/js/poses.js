import { POSE_LABELS } from "./config.js";
import { $, el } from "./dom.js";
import { selectPose } from "./selection.js";
import { state } from "./state.js";

export const poseList = () => state.poses;

export function renderPoses(poses) {
    state.poses = poses;
    const bar = $("#poses");
    bar.textContent = "";
    for (const p of poses) {
        const b = el("button", {
            type: "button",
            className: "pose-btn",
            textContent: POSE_LABELS[p] ?? p,
        });
        b.dataset.pose = p;
        bar.append(b);
    }
    bar.hidden = !poses.length;
    const list = $("#pose-list");
    list.textContent = "";
    for (const p of poses) {
        const b = el(
            "button",
            { type: "button", className: "item" },
            el("span", { className: "nm", textContent: POSE_LABELS[p] ?? p })
        );
        b.dataset.pose = p;
        list.append(b);
    }
    markPose();
}

function revealInBar(bar, item) {
    const b = bar.getBoundingClientRect(),
        r = item.getBoundingClientRect();
    if (r.left < b.left) {
        bar.scrollLeft -= b.left - r.left;
    } else if (r.right > b.right) {
        bar.scrollLeft += r.right - b.right;
    }
}

export function markPose() {
    for (const b of document.querySelectorAll("[data-pose]")) {
        b.setAttribute("aria-pressed", b.dataset.pose === state.pose);
    }
    const bar = $("#poses");
    const on = bar.querySelector('[aria-pressed="true"]');
    if (on) {
        revealInBar(bar, on);
    }
}

function onPoseClick(e) {
    const b = e.target.closest("[data-pose]");
    if (!b) {
        return;
    }
    selectPose(b.dataset.pose);
    b.blur();
}

export function initPoses() {
    const bar = $("#poses");
    bar.onclick = onPoseClick;
    $("#pose-list").onclick = onPoseClick;
    bar.addEventListener(
        "wheel",
        (e) => {
            if (
                !e.deltaY ||
                Math.abs(e.deltaX) > Math.abs(e.deltaY) ||
                bar.scrollWidth <= bar.clientWidth
            ) {
                return;
            }
            bar.scrollLeft += e.deltaY;
            e.preventDefault();
        },
        { passive: false }
    );
}
