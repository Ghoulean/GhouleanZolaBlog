import { $, el } from "./dom.js";
import { buildItems, headCapable, headSnapshot } from "./layering.js";
import { buildScene, drawScene } from "./scene.js";
import { poseList } from "./selection.js";
import { state } from "./state.js";
import { makeZip } from "./zip.js";

const exportOpts = () => ({
    type: $("#exp-format").value,
    scale: exportScalePct / 100,
    bg:
        $("#exp-bg").value === "color" ||
        $("#exp-format").value === "image/jpeg"
            ? $("#exp-bg-color").value
            : null,
    pad: Math.max(0, +$("#exp-pad").value || 0),
    quality: +$("#exp-quality").value,
    flip: $("#exp-flip").checked && state.view.flip,
});

const EXPORT_SCALE_MIN = 10,
    EXPORT_SCALE_MAX = 990;
let exportScalePct = 100;

function setExportScale(pct) {
    exportScalePct = Math.min(
        EXPORT_SCALE_MAX,
        Math.max(EXPORT_SCALE_MIN, Math.round(pct))
    );
    $("#exp-scale-range").value = exportScalePct;
    $("#exp-scale").value = exportScalePct + "%";
    updateExportInfo();
}

export function initExportScale() {
    const range = $("#exp-scale-range"),
        txt = $("#exp-scale");
    range.addEventListener("input", () => setExportScale(+range.value));
    txt.addEventListener("focus", () => txt.select());
    txt.addEventListener("change", () => {
        const n = parseFloat(txt.value.replace(/[^\d.]/g, ""));
        setExportScale(Number.isFinite(n) ? n : exportScalePct);
    });
    txt.addEventListener("keydown", (e) => {
        if (e.key === "Enter") txt.blur();
        if (e.key === "Escape") {
            txt.value = exportScalePct + "%";
            txt.blur();
        }
    });
    txt.addEventListener("blur", () => {
        txt.value = exportScalePct + "%";
    });
}

const MAX_DIM = 8192;
function exportSize(o, scene = state.scene) {
    const b = scene.bounds;
    let s = o.scale;
    const w = b.w * s + o.pad * 2,
        h = b.h * s + o.pad * 2;
    const k = Math.min(1, MAX_DIM / w, MAX_DIM / h);
    s *= k;
    return {
        s,
        pad: o.pad * k,
        w: Math.ceil(b.w * s + o.pad * 2 * k),
        h: Math.ceil(b.h * s + o.pad * 2 * k),
        clamped: k < 1,
    };
}

export function updateExportInfo() {
    const isJpeg = $("#exp-format").value === "image/jpeg";
    const solid = $("#exp-bg").value === "color" || isJpeg;
    $("#exp-bg").disabled = isJpeg;
    if (isJpeg) $("#exp-bg").value = "color";
    $("#exp-bg-color-field").classList.toggle("disabled-block", !solid);
    $("#exp-quality-field").classList.toggle(
        "disabled-block",
        $("#exp-format").value === "image/png"
    );
    const btns = [$("#export"), $("#copy")];
    btns.forEach((b) => (b.disabled = !state.scene));
    if (!exportAllBusy) $("#export-all").disabled = !state.app;
    if (!state.scene) {
        $("#exp-info").textContent = "";
        return;
    }
    const sz = exportSize(exportOpts());
    $("#exp-info").textContent =
        `${sz.w} x ${sz.h} px${sz.clamped ? " (capped)" : ""}`;
}

function renderExport(scene = state.scene, o = exportOpts()) {
    const sz = exportSize(o, scene);
    const c = document.createElement("canvas");
    c.width = sz.w;
    c.height = sz.h;
    const g = c.getContext("2d");
    if (o.bg) {
        g.fillStyle = o.bg;
        g.fillRect(0, 0, c.width, c.height);
    }
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    const b = scene.bounds;
    let base = new DOMMatrix().translate(sz.pad, sz.pad).scale(sz.s);
    base = o.flip
        ? base.translate(b.w, 0).scale(-1, 1).translate(-b.minX, -b.minY)
        : base.translate(-b.minX, -b.minY);
    drawScene(g, scene, base);
    return { c, o };
}

function exportName(
    ext,
    pose = state.pose,
    ctx = {
        skinKey: state.skinKey,
        app: state.app,
        headMode: state.headMode,
        flip: exportOpts().flip,
    }
) {
    const id = ctx.skinKey.split("/").pop();
    const head =
        headCapable(ctx.app) && ctx.headMode !== "stored"
            ? "_" + ctx.headMode
            : "";
    return `${id}${pose == null ? "" : "_" + pose}${head}${ctx.flip ? "_flipped" : ""}.${ext}`.replace(
        /[^\w.-]+/g,
        "_"
    );
}

export function doExport() {
    if (!state.scene) return;
    const { c, o } = renderExport();
    const ext = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/webp": "webp",
    }[o.type];
    c.toBlob(
        (blob) => {
            if (!blob) return;
            if (blob.type !== o.type)
                alert(
                    `This browser can't encode ${ext.toUpperCase()}; saved as ${blob.type} instead.`
                );
            const a = el("a", {
                href: URL.createObjectURL(blob),
                download: exportName(
                    blob.type.split("/")[1].replace("jpeg", "jpg")
                ),
            });
            document.body.append(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        },
        o.type,
        o.quality
    );
}

function saveBlob(blob, name) {
    const a = el("a", { href: URL.createObjectURL(blob), download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

let exportAllBusy = false;
export async function doExportAll() {
    if (!state.app || exportAllBusy) return;
    exportAllBusy = true;
    const btn = $("#export-all"),
        status = $("#export-all-status");
    btn.disabled = true;
    const app = state.app;
    const head = headSnapshot();
    const opts = exportOpts();
    const ctx = {
        skinKey: state.skinKey,
        app,
        headMode: head.headMode,
        flip: opts.flip,
    };
    const poses = poseList();
    const files = [],
        skipped = [];
    try {
        for (const [i, pose] of poses.entries()) {
            status.textContent = `Rendering ${i + 1} / ${poses.length}: ${pose}`;
            const scene = await buildScene(
                await buildItems(app, app.motions[pose], head)
            );
            if (!scene) {
                skipped.push(pose);
                continue;
            }
            const { c } = renderExport(scene, opts);
            const blob = await new Promise((r) =>
                c.toBlob(r, opts.type, opts.quality)
            );
            if (!blob) {
                skipped.push(pose);
                continue;
            }
            const ext = blob.type.split("/")[1].replace("jpeg", "jpg");
            files.push({
                name: exportName(ext, pose, ctx),
                data: new Uint8Array(await blob.arrayBuffer()),
            });
        }
        if (files.length)
            saveBlob(makeZip(files), exportName("zip", null, ctx));
        status.textContent =
            `Saved ${files.length} image${files.length === 1 ? "" : "s"}` +
            (skipped.length
                ? `; skipped ${skipped.join(", ")} (nothing to draw)`
                : "");
    } catch (err) {
        console.error(err);
        status.textContent = `Failed: ${err.message}`;
    } finally {
        exportAllBusy = false;
        btn.disabled = !state.app;
    }
}

export async function doCopy() {
    if (!state.scene) return;
    const btn = $("#copy");
    try {
        const { c } = renderExport();
        const blob = await new Promise((r) => c.toBlob(r, "image/png"));
        await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
        ]);
        btn.textContent = "Copied";
    } catch (err) {
        console.error(err);
        btn.textContent = "Copy failed";
    }
    setTimeout(() => {
        btn.textContent = "Copy to clipboard";
    }, 1400);
}
