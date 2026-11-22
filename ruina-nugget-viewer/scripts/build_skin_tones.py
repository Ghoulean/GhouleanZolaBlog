import json
from collections import defaultdict
from pathlib import Path

from PIL import Image

from remove_path_spaces import fix_json

VIEWER = Path(__file__).resolve().parent.parent / "viewer"
DATA = VIEWER / "data"
CATEGORIES = ("new", "egos", "creatureskin")
SCALE = 0.5
CANVAS = 1200
MARK = (255, 0, 255, 255)


def placed(layer, img):
    s = layer["sprite"]
    k = SCALE * 100 / s["ppu"]
    w, h = img.size
    sx, sy = layer["scaleX"] * k, layer["scaleY"] * k
    px, py = s["pivot"]
    if layer["flipX"] ^ (sx < 0):
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
        px = w - px
    if layer["flipY"] ^ (sy < 0):
        img = img.transpose(Image.FLIP_TOP_BOTTOM)
        py = h - py
    sx, sy = abs(sx), abs(sy)
    img = img.resize((max(1, round(w * sx)), max(1, round(h * sy))), Image.NEAREST)
    pivx, pivy = px * sx, (h - py) * sy
    if abs(layer["rotation"]) > 0.01:
        W, H = img.size
        cx, cy = max(pivx, W - pivx), max(pivy, H - pivy)
        canvas = Image.new("RGBA", (int(2 * cx) + 2, int(2 * cy) + 2))
        canvas.paste(img, (int(cx - pivx), int(cy - pivy)))
        img = canvas.rotate(layer["rotation"], resample=Image.NEAREST, expand=True)
        pivx, pivy = img.size[0] / 2, img.size[1] / 2
    x = layer["x"] * 100 * SCALE - pivx + CANVAS / 2
    y = -layer["y"] * 100 * SCALE - pivy + CANVAS * 3 / 4
    return img, (int(round(x)), int(round(y)))


def marked(img):
    alpha = img.getchannel("A").point(lambda a: 255 if a > 200 else 0)
    out = Image.new("RGBA", img.size, MARK)
    out.putalpha(alpha)
    return out


def composite(layers, images, skin_mode):
    out = Image.new("RGBA", (CANVAS, CANVAS))
    for l in layers:
        img = images[l["sprite"]["file"]]
        if l["type"] == "Skin":
            if skin_mode == "hide":
                continue
            if skin_mode == "mark":
                img = marked(img)
        tile, pos = placed(l, img)
        out.alpha_composite(tile, pos)
    return out


def dominant(pixels):
    bins = defaultdict(list)
    for p in pixels:
        if p[3] == 255 and sum(p[:3]) >= 90:
            bins[(p[0] >> 3, p[1] >> 3, p[2] >> 3)].append(p)
    if not bins:
        return None
    best = max(bins.values(), key=len)
    return [round(sum(p[i] for p in best) / len(best) / 255, 4) for i in range(3)]


def motion_tones(motion):
    layers = sorted(
        (l for l in motion["layers"] if l["visible"] and (l.get("sprite") or {}).get("size")),
        key=lambda l: l["order"],
    )
    if not any(l["type"] == "Skin" for l in layers):
        return None
    images = {f: Image.open(DATA / f).convert("RGBA") for f in {l["sprite"]["file"] for l in layers}}
    mask = composite(layers, images, "mark")
    bare = composite(layers, images, "hide")
    shown = composite(layers, images, "show")
    where = [i for i, p in enumerate(mask.get_flattened_data()) if p == MARK]
    if not where:
        return None
    bare_px, shown_px = list(bare.get_flattened_data()), list(shown.get_flattened_data())
    out = {"skin": dominant(shown_px[i] for i in where), "bare": dominant(bare_px[i] for i in where)}
    return out if out["skin"] and out["bare"] else None


def tones(app):
    motions = app["motions"]
    for name in sorted(motions, key=lambda n: n != "Default"):
        t = motion_tones(motions[name])
        if t:
            return t
    return None


def main():
    index = json.load(open(DATA / "index.json", encoding="utf-8"))
    out = {}
    for key, entry in sorted(index.items()):
        if entry["category"] not in CATEGORIES:
            continue
        app = json.load(open(DATA / key / "appearance.json", encoding="utf-8"))
        if not app.get("customizable"):
            continue
        t = tones(app)
        if t:
            out[key] = "#" + "".join(
                f"{round(min(1, b / s) * 255):02x}" for b, s in zip(t["bare"], t["skin"])
            )
    with open(VIEWER / "skin_tones.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=0)
    fix_json(VIEWER / "skin_tones.json")
    print(len(out), "appearances with a skin tint")


if __name__ == "__main__":
    main()
