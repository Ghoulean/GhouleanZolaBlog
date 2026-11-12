import json
import sys
from pathlib import Path

import UnityPy
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "lor-extractor/out"
BUNDLES = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "StreamingAssets/AssetBundles/char"
FIRST_BUNDLE = 657
COUNT = 9


def material_textures(mat):
    found = {}
    for name, env in mat.m_SavedProperties.m_TexEnvs:
        if env.m_Texture.path_id:
            found[name] = env.m_Texture.read()
    return found.get("_Main"), found.get("_Mask")


def weapon_materials(env):
    mats = []
    for o in env.objects:
        if o.type.name != "ParticleSystemRenderer":
            continue
        r = o.read()
        if r.m_GameObject.read().m_Name != "MainWeapon":
            continue
        for m in r.m_Materials:
            if m.path_id:
                mat = m.read()
                if "MistRolrang_Weapon" in mat.m_Name and mat.m_Name not in [x.m_Name for x in mats]:
                    mats.append(mat)
    return mats


def compose(color, mask):
    rgb = color.image.convert("RGB")
    alpha = mask.image.convert("L") if mask else Image.new("L", rgb.size, 255)
    img = rgb.copy()
    img.putalpha(alpha.resize(rgb.size))
    return img


def layer(name, file, size, order):
    w, h = size
    return {
        "name": name, "type": "Body", "order": order, "visible": True,
        "x": 0.0, "y": 0.0, "rotation": 0.0, "scaleX": 1.0, "scaleY": 1.0,
        "flipX": False, "flipY": False, "color": [1.0, 1.0, 1.0, 1.0],
        "sprite": {
            "name": name, "file": file, "ppu": 100.0,
            "rect": [float(w), float(h)], "pivot": [w / 2, h / 2], "size": [w, h],
        },
        "externalSprite": None,
    }


def main():
    index_path = OUT / "index.json"
    index = json.loads(index_path.read_text(encoding="utf-8"))
    for i in range(COUNT):
        skin = f"appearance_blacksilence4_weapon{i + 1}"
        skin_dir = OUT / "new" / skin
        app_path = skin_dir / "appearance.json"
        app = json.loads(app_path.read_text(encoding="utf-8"))
        env = UnityPy.load(str(BUNDLES / f"char_{FIRST_BUNDLE + i}.pres"))
        sprite_dir = skin_dir / "sprites"
        motions = {}
        for n, mat in enumerate(weapon_materials(env)):
            color, mask = material_textures(mat)
            if color is None:
                continue
            name = color.m_Name.removeprefix("FX_Tex_Mon_MistRolrang_")
            img = compose(color, mask)
            sprite_dir.mkdir(parents=True, exist_ok=True)
            img.save(sprite_dir / f"{name}.png")
            key = "Default" if n == 0 else f"Default#{n + 1}"
            motions[key] = {
                "action": "Default", "direction": "Front", "object": name, "headPivot": None,
                "layers": [layer(name, f"new/{skin}/sprites/{name}.png", img.size, 0)],
            }
        if not motions:
            print(f"{skin}: no weapon textures found, left unchanged")
            continue
        app["motions"] = motions
        app_path.write_text(json.dumps(app, indent=1), encoding="utf-8")
        index[f"new/{skin}"]["motions"] = list(motions)
        print(f"{skin}: {', '.join(m['object'] for m in motions.values())}")
    index_path.write_text(json.dumps(index, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
