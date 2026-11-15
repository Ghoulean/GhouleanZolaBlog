import { loadImage, tinted } from "./assets.js";

export async function buildScene(items) {
    const imgs = await Promise.all(
        items.map((it) => loadImage(it.sprite.file).catch(() => null))
    );
    const parts = [];
    const layers = [];
    const seen = new Map();
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
    items.forEach((it, i) => {
        const img = imgs[i];
        const kind = it.layerKind || it.type || "?";
        const name = it.layerName ?? it.name ?? it.sprite.name;
        const base = kind + "|" + name;
        const n = seen.get(base) || 0;
        seen.set(base, n + 1);
        const key = base + "|" + n;
        layers.push({
            key,
            kind,
            name,
            order: it.order,
            file: it.sprite.file,
            missing: !img,
        });
        if (!img) return;
        const s = it.sprite;
        const k = 100 / s.ppu;
        const w = img.naturalWidth,
            h = img.naturalHeight;
        const m = new DOMMatrix()
            .translate(it.x * 100, -it.y * 100)
            .rotate(-it.rotation)
            .scale(
                it.scaleX * k * (it.flipX ? -1 : 1),
                it.scaleY * k * (it.flipY ? -1 : 1)
            )
            .translate(-s.pivot[0], -(h - s.pivot[1]));
        for (const [cx, cy] of [
            [0, 0],
            [w, 0],
            [0, h],
            [w, h],
        ]) {
            const p = m.transformPoint({ x: cx, y: cy });
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        }
        const color = it.color || [1, 1, 1, 1];
        const plain = color[0] === 1 && color[1] === 1 && color[2] === 1;
        parts.push({
            key,
            m,
            src: plain ? img : tinted(img, s.file, color),
            alpha: color[3] ?? 1,
        });
    });
    if (!parts.length) return null;
    return {
        parts,
        layers,
        bounds: { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY },
    };
}

export function drawScene(ctx, scene, base, hidden = null) {
    for (const p of scene.parts) {
        if (hidden?.has(p.key)) continue;
        const t = base.multiply(p.m);
        t.e = Math.round(t.e);
        t.f = Math.round(t.f);
        ctx.setTransform(t);
        ctx.globalAlpha = p.alpha;
        ctx.drawImage(p.src, 0, 0);
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
}
