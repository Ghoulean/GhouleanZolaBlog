import { loadJSON } from "./assets.js";
import {
    ATK_FACE,
    GIFT_ORDER_FROM_FACE,
    GIFT_ORDER_FROM_HAIR,
    HIDDEN_WHEN_CUSTOM,
    ROLE_KIND,
    SLASH_ALIASES,
    STORED_HEAD_ANCHORS,
    STORED_HEAD_EXTRA_LAYERS,
    STORED_HEAD_TYPES,
} from "./config.js";
import { state } from "./state.js";

function compose(p, c) {
    const a = (p.rotation * Math.PI) / 180;
    const lx = c.x * p.scaleX,
        ly = c.y * p.scaleY;
    return {
        x: p.x + lx * Math.cos(a) - ly * Math.sin(a),
        y: p.y + lx * Math.sin(a) + ly * Math.cos(a),
        rotation: p.rotation + c.rotation,
        scaleX: p.scaleX * c.scaleX,
        scaleY: p.scaleY * c.scaleY,
    };
}

export const hasSprite = (s) => s && s.size;

function headRoot(motion, scaleFactor) {
    const head = motion.layers.find((l) => l.type === "Head");
    if (!head) return null;
    const parent = motion.headPivot || head;
    return compose(parent, {
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: scaleFactor,
        scaleY: scaleFactor,
    });
}

function invCompose(p, w) {
    const a = (p.rotation * Math.PI) / 180;
    const dx = w.x - p.x,
        dy = w.y - p.y;
    return {
        x: (dx * Math.cos(a) + dy * Math.sin(a)) / p.scaleX,
        y: (dy * Math.cos(a) - dx * Math.sin(a)) / p.scaleY,
        rotation: w.rotation - p.rotation,
        scaleX: w.scaleX / p.scaleX,
        scaleY: w.scaleY / p.scaleY,
    };
}

function storedHead(app) {
    const sf = app.customHeadScaleFactor || 1;
    const extra = STORED_HEAD_EXTRA_LAYERS[app.id];
    const heads = [];
    for (const m of Object.values(app.motions)) {
        const layers = m.layers.filter(
            (l) =>
                (STORED_HEAD_TYPES.has(l.type) || extra?.has(l.name)) &&
                l.visible &&
                hasSprite(l.sprite)
        );
        const root = headRoot(m, sf);
        if (!root || !layers.some((l) => l.type === "Head")) continue;
        const minOf = (type) =>
            Math.min(
                ...layers.filter((l) => l.type === type).map((l) => l.order)
            );
        const anchors = Object.entries(STORED_HEAD_ANCHORS)
            .map(([type, role]) => ({ role, order: minOf(type) }))
            .filter((a) => isFinite(a.order))
            .sort((a, b) => b.order - a.order);
        const rear = { role: "rearHair", order: minOf("RearHair") };
        const renderers = layers.map((l) => {
            const anchor =
                l.type === "RearHair"
                    ? rear
                    : anchors.find((a) => a.order <= l.order) ||
                      anchors[anchors.length - 1];
            return {
                ...l,
                ...invCompose(root, l),
                role: anchor.role,
                orderOffset: (l.order - anchor.order) / 100,
                additional: false,
            };
        });
        heads.push({ action: m.action, direction: m.direction, renderers });
    }
    heads.sort((a, b) => (b.action === "Default") - (a.action === "Default"));
    return { heads, skinColor: [1, 1, 1, 1], keepSourceOrder: true };
}

const appearanceCache = new Map();
export function loadAppearance(key, low = false) {
    if (!appearanceCache.has(key)) {
        appearanceCache.set(
            key,
            loadJSON(key + "/appearance.json", low)
                .then((app) => {
                    const scaled = structuredClone(app);
                    for (const m of Object.values(scaled.motions))
                        for (const l of m.layers) l.order *= 10;
                    return scaled;
                })
                .catch((err) => {
                    appearanceCache.delete(key);
                    throw err;
                })
        );
    }
    return appearanceCache.get(key);
}

const storedHeadCache = new Map();
function loadStoredHead(key) {
    if (!storedHeadCache.has(key))
        storedHeadCache.set(key, loadAppearance(key).then(storedHead));
    return storedHeadCache.get(key);
}

function minOrders(motion, skipBlr = false) {
    const o = { FrontHair: 1000, RearHair: 1000, Face: 1000, Head: 1000 };
    for (const l of motion.layers) {
        if (l.type in o && !(skipBlr && l.type === "Face" && l.name === "blr"))
            o[l.type] = Math.min(o[l.type], l.order);
    }
    return o;
}

function specialItems(motion, special, scaleFactor, giftHidden) {
    const heads = special.heads;
    const act = SLASH_ALIASES.has(motion.action) ? "Slash" : motion.action;
    const d = motion.direction;
    let s =
        heads.find((h) => h.action === motion.action && h.direction === d) ||
        heads.find((h) => h.action === act);
    if (!s) {
        s = heads.find((h) => h.direction === d) || heads[0];
    } else if (s.direction !== d) {
        if (s.replaceHead)
            s = heads.find((h) => h.object === s.replaceHead) || s;
        else s = heads.find((h) => h.direction === d) || heads[0];
    }
    const o = minOrders(motion, true);
    const rhO = o.RearHair === 1000 ? -2 : o.RearHair;
    const faceO = o.Face >= 1000 ? o.Head + 10 : o.Face;
    const fhO = o.FrontHair >= 1000 ? faceO + 10 : o.FrontHair;
    const roleOrder = {
        head: o.Head,
        face: faceO,
        frontHair: fhO,
        rearHair: rhO,
    };
    const root = headRoot(motion, scaleFactor);
    if (!root) return { items: [], root: null };
    const items = [];
    for (const r of s.renderers) {
        if (!r.visible || !hasSprite(r.sprite)) continue;
        if (giftHidden.has(r.role) && !r.additional) continue;
        items.push({
            ...r,
            ...compose(root, r),
            order: (roleOrder[r.role] ?? r.order) + (r.orderOffset || 0),
            color: r.color || [1, 1, 1, 1],
            layerKind: ROLE_KIND[r.role] || "Head",
            layerName: r.name,
        });
    }
    if (special.keepSourceOrder) {
        let prev = -Infinity;
        for (const it of items) {
            if (it.role === "rearHair") continue;
            if (it.order < prev) it.order = prev + 0.01;
            prev = it.order;
        }
    }
    return { items, root };
}

function giftItems(motion, gift, prefab, root) {
    const front = motion.direction === "Front";
    const o = minOrders(motion);
    const rhO = o.RearHair >= 100 ? 0 : o.RearHair;
    const pos = gift.position;
    let order = o.FrontHair;
    if (pos in GIFT_ORDER_FROM_FACE) order = o.Face + GIFT_ORDER_FROM_FACE[pos];
    else if (pos === "Ear") order = o.FrontHair + 2;
    else if (pos in GIFT_ORDER_FROM_HAIR)
        order =
            (o.FrontHair <= o.Face ? o.Face : o.FrontHair) +
            GIFT_ORDER_FROM_HAIR[pos];
    if (gift.id === 85) order = o.Head + 1;
    const show = { front, frontBack: front, side: !front, sideBack: !front };
    const orders = {
        front: order,
        side: order,
        frontBack: rhO - 1,
        sideBack: rhO - 1,
    };
    const items = [];
    for (const r of prefab.renderers) {
        const base = r.role.replace("Child", "");
        if (!r.visible || !hasSprite(r.sprite)) continue;
        if (base in show && !show[base]) continue;
        items.push({
            ...r,
            ...compose(root, r),
            order: r.role in orders ? orders[r.role] : r.order,
            layerKind: "Gift (" + pos + ")",
            layerName: `${gift.prefab} ${r.role}`,
        });
    }
    return items;
}

function giftHiddenParts(gifts) {
    const pos = new Set(gifts.map((g) => g.position));
    const hidden = new Set();
    if (pos.has("Helmet"))
        ["head", "frontHair", "rearHair"].forEach((x) => hidden.add(x));
    if (pos.has("Hood")) hidden.add("rearHair");
    return hidden;
}

function customItems(motion, cust, opt, scaleFactor, giftHidden) {
    const front = motion.direction === "Front";
    let faceO = 1000,
        fhO = 1000,
        rhO = 1000,
        headO = 1000,
        hood = null;
    for (const l of motion.layers) {
        const o = l.order;
        if (l.type === "FrontHair") fhO = Math.min(fhO, o);
        else if (l.type === "RearHair") rhO = Math.min(rhO, o);
        else if (l.type === "Face") faceO = Math.min(faceO, o);
        else if (l.type === "Head") headO = Math.min(headO, o);
        else if (l.type === "Hood" && (!hood || o > hood.order)) hood = l;
    }
    if (hood && fhO > hood.order) fhO = hood.order - 5;
    if (faceO >= 1000) faceO = headO + 10;
    if (fhO >= 1000) fhO = faceO + 10;
    if (rhO === 1000) rhO = -2;
    const root = headRoot(motion, scaleFactor);
    if (!root) return { items: [], root: null };

    const act = motion.action;
    const expr =
        act === "Damaged" ? "hit" : ATK_FACE.has(act) ? "atk" : "normal";
    const pick = (k) => cust[k][Math.min(opt[k], cust[k].length - 1)];
    const eye = pick("eyes"),
        brow = pick("brows"),
        mouth = pick("mouths"),
        fh = pick("frontHair"),
        rh = pick("rearHair");
    const white = [1, 1, 1, 1];
    const sfx = front ? "" : "_SideView";
    const fx = front ? expr : "side";
    const parts = [
        [
            "Customized_Head" + sfx,
            cust.heads[front ? "front" : "side"],
            headO,
            opt.skinColor,
            "head",
        ],
        ["Customized_Face" + sfx, eye[fx], faceO, opt.eyeColor, "face"],
        ["Customized_Brow" + sfx, brow[fx], faceO, white, "face"],
        ["Customized_Mouth" + sfx, mouth[fx], faceO, white, "face"],
        [
            "Customized_FrontHair" + sfx,
            fh[front ? "front" : "side"],
            fhO,
            opt.hairColor,
            "frontHair",
        ],
    ];
    if (!hood) {
        if (front) {
            parts.push([
                "Customized_BackHair",
                rh.front,
                rhO,
                opt.hairColor,
                "rearHair",
            ]);
        } else {
            parts.push([
                "Customized_BackHair_SideView",
                rh.sideBack,
                rhO,
                opt.hairColor,
                "rearHair",
            ]);
            parts.push([
                "Customized_BackHair_SideView_Front",
                rh.sideFront,
                fhO + 1,
                opt.hairColor,
                null,
            ]);
        }
    }
    const identity = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
    const items = [];
    for (const [rigName, spr, order, color, role] of parts) {
        if (!hasSprite(spr) || giftHidden.has(role)) continue;
        const rig = cust.rig[rigName] || identity;
        items.push({
            sprite: spr,
            ...compose(root, rig),
            flipX: false,
            flipY: false,
            color,
            order,
            layerKind: ROLE_KIND[role] || "RearHair",
            layerName: rigName,
        });
    }
    return { items, root };
}

function hexColor(s) {
    s = s.replace("#", "");
    return [0, 2, 4]
        .map((i) => parseInt(s.slice(i, i + 2), 16) / 255)
        .concat(1);
}

export function headCapable(app) {
    return (
        app.customizable &&
        Object.values(app.motions).some((m) =>
            m.layers.some((l) => l.type === "Head")
        )
    );
}

export const headSnapshot = () => ({
    headMode: state.headMode,
    custom: { ...state.custom },
    fixedHead: state.fixedHead,
    gifts: { ...state.gifts },
});

export async function buildItems(app, motion, head = headSnapshot()) {
    const capable = headCapable(app);
    const mode = capable ? head.headMode : "stored";
    const custom = mode !== "stored";
    let skinColor = hexColor(head.custom.skinColor);
    let special = null,
        cust = null,
        gifts = [];
    if (custom) {
        cust = await loadJSON("customize/customize.json");
        if (mode === "fixed") {
            special = head.fixedHead.includes("/")
                ? await loadStoredHead(head.fixedHead)
                : (await loadJSON("customize/special_heads.json"))[
                      head.fixedHead
                  ];
            if (special) skinColor = special.skinColor;
        }
        const giftIds = Object.values(head.gifts).filter((v) => v != null);
        if (giftIds.length) {
            const g = await loadJSON("customize/gifts.json");
            gifts = giftIds
                .map((id) => g.gifts.find((x) => x.id === id))
                .filter((info) => info && g.prefabs[info.prefab])
                .map((info) => [info, g.prefabs[info.prefab]]);
        }
    }
    const items = [];
    for (let l of motion.layers) {
        if (!(l.visible && hasSprite(l.sprite))) continue;
        if (custom) {
            if (HIDDEN_WHEN_CUSTOM.has(l.type)) continue;
            if (l.type === "Skin") l = { ...l, color: skinColor };
        }
        items.push(l);
    }
    const skinLayerCount = items.length;
    if (custom) {
        const sf = app.customHeadScaleFactor || 1;
        const hidden = giftHiddenParts(gifts.map((g) => g[0]));
        const opt = {
            ...head.custom,
            hairColor: hexColor(head.custom.hairColor),
            eyeColor: hexColor(head.custom.eyeColor),
            skinColor,
        };
        const { items: headItems, root } = special
            ? specialItems(motion, special, sf, hidden)
            : customItems(motion, cust, opt, sf, hidden);
        items.push(...headItems);
        if (root)
            for (const [g, prefab] of gifts)
                items.push(...giftItems(motion, g, prefab, root));
        for (let i = skinLayerCount; i < items.length; i++)
            items[i].headPart = true;
    }
    const isHeadPart = (i) => i >= skinLayerCount;
    return items
        .map((it, i) => ({ it, i }))
        .sort(
            (a, b) =>
                a.it.order - b.it.order ||
                isHeadPart(b.i) - isHeadPart(a.i) ||
                a.i - b.i
        )
        .map((x) => x.it);
}
