import json
import math
import os
import re
import shutil
import sys
from collections import Counter

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
LCX = os.path.join(ROOT, "lc-extractor")
OUT = os.path.join(ROOT, "viewer", "data")
NAME_OVERRIDES = {
    100010: "Queen of Hatred (Legacy)*",
    100033: "Big and Will Be Bad Wolf",
    200001: "The Dawn of Green",
    200002: "The Noon of Green",
    200003: "The Dusk of Green",
    200004: "The Midnight of Green",
    200005: "The Dawn of Crimson",
    200006: "The Noon of Crimson",
    200007: "The Dusk of Crimson",
    200009: "The Dawn of Violet",
    200010: "The Noon of Violet",
    2000121: "The Midnight of Violet (Red Altar)*",
    2000122: "The Midnight of Violet (White Altar)*",
    2000123: "The Midnight of Violet (Black Altar)*",
    2000124: "The Midnight of Violet (Pale Altar)*",
    200013: "The Dawn of Amber",
    200015: "The Dusk of Amber",
    200016: "The Midnight of Amber",
    200018: "The Noon of Indigo",
    200021: "Red Fixer",
    200022: "White Fixer",
    200023: "Black Fixer",
    200024: "Pale Fixer",
    200025: "The Claw",
}
IDLE_OVERRIDES = {
    200013: "Move",
    200015: "Move",
}
SCENE_ENTITIES = {100033, 200018, 300109}
PART_NAMES = {
    6116: "Piano*",
    5721: "Creature*",
    6117: "Breaching*",
    5627: "Brothers*",
    5572: "Sister*",
    5797: "Slime*",
    6043: "Minion*",
    5537: "Minion*",
    6078: "Scythe Apostle*",
    5594: "Spear Apostle*",
    5857: "Staff Apostle*",
    6064: "Laetitia",
    5791: "Friend*",
    5616: "Army in Pink",
    5561: "Army in Black",
}
SCENE_CHILD_PARTS = {
    100015: [("DeathAngelApostle", "Legacy Apostle*")],
    100062: [("YggdrasilSapling", "Sapling*")],
}
EXTRA_SCENES = [
    {"id": "abno-advent-clock", "num": 100014, "code": "AdventClock", "name": "Advent Clock", "risk": None,
     "group": "other", "src": "advent_clock"},
]
HIDDEN_BY_DEFAULT = {
    100001: ["MatchGirl/Center/Mark"],
    100033: ["BigBadWolf/ChangeFilter", "BigBadWolf/BigBadWolf", "BigBadWolf/Moon"],
    100013: ["BeautyBeast/TransformEffect"],
    100022: ["LadyLookingAtWall/Hand"],
}
ANIM_SPEED = {
    (100035, "Judgement"): 5.5 / 5.0,
}
CALCULATED_STATES = {
    "abno-advent-clock": ["Advent"],
}
KIT_BOB = {
    300001: "DesireHeartAnim/Center/DesireHeart",
    300002: "ResearcherNoteAnim/Center/ResearcherNote",
    300005: "BigTreeSapAnim/Center/BigTreeSap",
    300106: "HealthBraceletAnim/Center/HealthBracelet",
    300107: "JusticeReceiverAnim/Center/JusticeReceiver",
    300109: "YangAnim/Center/Yang",
}
MERGED_SCENES = {
    100026: "QueenBeeWorker",
}
SCENE_PARTS = {
    "DeathAngelApostle": {
        "DeathAngelApostle/AdventLight/Center/DeathAngelApostleAnim": {"rank": 0},
    },
    100026: {
        "QueenBeeAnim/Queen_bee": {"rank": 0},
        "QueenBeeWorkerAnim/Workbee": {"rank": 1, "label": "Worker Bee", "hide": ["QueenBeeAnim"]},
    },
    100033: {
        "BigBadWolf/BigBadWolfAnim": {"rank": 0},
        "BigBadWolf/BigBadWolf": {"rank": 1, "hide": ["BigBadWolf/BigBadWolfAnim"]},
        "BigBadWolf/Moon": {"rank": 2, "hide": ["BigBadWolf/BigBadWolfAnim"]},
    },
    100013: {
        "BeautyBeast/Center/Anim/Global": {"rank": 0, "label": "Default*"},
        "BeautyBeast/TransformEffect/BeautyBeastTransformEffect": {"rank": 1, "label": "Eye*", "hide": ["BeautyBeast/Center"]},
    },
    100022: {
        "LadyLookingAtWall/Lady_looking_wall": {"rank": 0},
        "LadyLookingAtWall/Hand": {"rank": 1, "hide": ["LadyLookingAtWall/Lady_looking_wall", "LadyLookingAtWall/Shader"]},
    },
    100005: {
        "Nothing/Lv1": {"rank": 0, "hide": ["Nothing/Lv2Center", "Nothing/Spear"]},
        "Nothing/NothingEgg": {"rank": 1, "label": "Lv2*", "only": ["Nothing/NothingEgg", "Nothing/NothingEgg/nothing there_egg_eye1",
                                                                    "Nothing/NothingEgg/nothing there_egg_eye2",
                                                                    "Nothing/NothingEgg/nothing there_egg_eye3"]},
        "Nothing/Lv2Center/Lv2": {"rank": 2, "label": "Lv3*", "hide": ["Nothing/Lv1", "Nothing/Spear"]},
    },
    100012: {
        "SpiderMom/Center/SpiderMomBody": {"rank": 0, "hide": ["SpiderMom/Center/TentacleVertical", "SpiderMom/Center/Cocoon"]},
        "SpiderMom/Center/TentacleVertical": {"rank": 1, "hide": ["SpiderMom/Center/Cocoon"]},
        **{f"SpiderMom/Center/T_Hor/TentacleHorizontal{s}": {"rank": 2 + i, "hide": ["SpiderMom/Center/TentacleVertical", "SpiderMom/Center/Cocoon"]}
           for i, s in enumerate([""] + [f" ({k})" for k in range(1, 5)])},
        **{f"SpiderMom/Center/Childs/SpiderChild{s}": {"rank": 7 + i, "hide": ["SpiderMom/Center/TentacleVertical", "SpiderMom/Center/Cocoon"]}
           for i, s in enumerate([""] + [f" ({k})" for k in range(1, 8)])},
        **{f"SpiderMom/Center/Cocoon/Coccoon{s}": {"rank": 15 + i, "hide": ["SpiderMom/Center/TentacleVertical"] + [f"SpiderMom/Center/Cocoon/Coccoon{o}" for o in [""] + [f" ({k})" for k in range(1, 5)] if o != s]}
           for i, s in enumerate([""] + [f" ({k})" for k in range(1, 5)])},
    },
}
STRAY_MIN_ALPHA = 8
WEAPON_SPILL = {
    "Mace_Set_01_3": "Mace_Set_01_4",
}
CLEAN_WEAPON_ID = 10_000_000
SPRITE_SKINS = {
    4000016: {"src": "GeburahHeads", "skins": {"head 1": "Phase 1*", "head 2": "Phase 2*", "head 3": "Phase 3*", "head 4": "Phase 4*"},
              "default": "Phase 1*",
              "by_anim": [("Phase_01", "Phase 1*"), ("Phase_02", "Phase 2*"), ("Phase_03", "Phase 3*"), ("Phase_04", "Phase 4*")]},
}
PD_RENDERERS = {
    "WING_1": ["Wing_back_1", "Wing_front_1"],
    "WING_2": ["Wing_back_2", "Wing_front_2"],
    "WING_3": ["Wing_back_3", "Wing_front_3"],
    "WING_4": ["Wing_back_4", "Wing_front_4"],
    "HAT": ["Hat_back", "Hat_shadow", "Hat"],
    "COAT": ["Coat_back", "Coat", "Fur"],
    "HEAD_BEAK": ["head", "eye2", "beak", "eye1"],
    "RING": ["Baby_ring"],
    "ANGEL": ["Baby", "Baby_necklas", "Baby_eye_closed"],
    "NEVER": ["Baby_eye_open", "Baby_eye_open_2"],
}
PD_REGIONS = {
    "wing": ("3e3b41", ["Wing_back_1", "Wing_back_2", "Wing_back_3", "Wing_back_4",
                        "Wing_front_1", "Wing_front_2", "Wing_front_3", "Wing_front_4",
                        "Wing_default_back_4", "Wing_default_back_3", "Wing_default_back_2", "Wing_default_back_f_1",
                        "Wing_default_front_1_3", "Wing_default_front_1_2", "Wing_default_front_1_1",
                        "Wing_default_front_0_4", "Wing_default_front_0_3", "Wing_default_front_0_2", "Wing_default_front_0_1"]),
    "hat_coat": ("1f1c34", ["Coat_back", "Coat", "Hat_back", "Hat_shadow", "Hat"]),
    "head_beak": ("272538", ["head", "beak"]),
}


PD_EYE1 = {"name": "16_Angel_EyeHalf1Follower", "bone": "bone136", "slot": "Baby_eye_open", "attachment": "Baby_eye_open",
           "x": -0.9, "y": 7.7, "rotation": -62.75, "after": "Baby_eye_open"}


def plague_doctor_eye_anims(anims):
    base = next(a for a in anims if a["name"] == "0_Default_")
    eye1 = {**base, "name": "0_Default_eye1*", "clip": "0_Default_", "follow": [PD_EYE1]}
    eye2 = {**eye1, "name": "0_Default_eye2*", "show": ["Baby_eye_open_2"]}
    at = anims.index(base) + 1
    return anims[:at] + [eye1, eye2] + anims[at:]


def plague_doctor_steps(part):
    off = {"WING_1", "WING_2", "WING_3", "WING_4", "RING", "ANGEL", "NEVER"}
    white = set()
    steps = []
    for n in range(12):
        if n in (1, 2, 3, 4):
            off.discard(f"WING_{n}")
        elif n == 6:
            white |= {"Coat_back", "Coat", "Hat_back", "Hat_shadow", "Hat"}
        elif n == 7:
            white |= set(PD_REGIONS["wing"][1])
        elif n == 8:
            white |= {"head", "beak"}
        elif n == 10:
            off |= {"HAT"}
            off.discard("RING")
        elif n == 11:
            off |= {"HEAD_BEAK", "COAT"}
            off.discard("ANGEL")
        tint = {s: color for color, slots in PD_REGIONS.values() for s in slots if s not in white}
        step = {"name": f"{n} Apostle{'' if n == 1 else 's'}*",
                "hide": sorted(s for r in off for s in PD_RENDERERS[r]), "tint": tint}
        if n == 11:
            step["anims"] = plague_doctor_eye_anims(part["anims"])
        steps.append(step)
    return steps


PART_STATES = {
    100014: plague_doctor_steps,
}
SHOWN_BY_DEFAULT = {
    200018: ["ScavengerNoon/center/Spine Mecanim GameObject (cleaner)/2/GameObject (1)"],
}


def spider_skitter(doc, node, seed=12, length=30.0, dt=0.02):
    nodes = doc["nodes"]
    lo, hi = (-2.1, -2.0), (2.4, -1.6)
    sx = sy = 1.0
    p = nodes[node]["parent"]
    while p >= 0:
        sx *= nodes[p]["scale"][0]
        sy *= nodes[p]["scale"][1]
        p = nodes[p]["parent"]
    rng = np.random.default_rng(seed)
    tracks = []
    duration = 0.0
    kids = [i for i, n in enumerate(nodes) if n["parent"] == node]
    for k in kids:
        home = nodes[k]["pos"]
        pos = list(home[:2])
        times, values = [0.0], [list(home)]
        t = 0.0
        start = list(pos)
        target = [rng.uniform(lo[0], hi[0]), rng.uniform(lo[1], hi[1])]
        going_home = False
        while True:
            dx, dy = target[0] - start[0], target[1] - start[1]
            m = math.hypot(dx, dy) or 1.0
            pos[0] += dx / m * dt / sx
            pos[1] += dy / m * dt / sy
            t += dt
            if abs(pos[0] - target[0]) <= 0.05 and abs(pos[1] - target[1]) <= 0.05:
                if going_home:
                    times.append(round(t, 4))
                    values.append(list(home))
                    break
                times.append(round(t, 4))
                values.append([round(pos[0], 5), round(pos[1], 5), home[2]])
                start = list(pos)
                if t >= length:
                    target, going_home = list(home[:2]), True
                else:
                    target = [rng.uniform(lo[0], hi[0]), rng.uniform(lo[1], hi[1])]
        duration = max(duration, t)
        tracks.append({"node": k, "target": "node", "prop": "position", "step": False, "times": times, "values": values})
    for tr in tracks:
        if tr["times"][-1] < duration:
            tr["times"].append(round(duration, 4))
            tr["values"].append(tr["values"][-1])
    return {"duration": round(duration, 4), "sample_rate": 50.0, "loop": True, "tracks": tracks}


COCOON_SPRITES = ["10556", "13474", "13762", "14039"]
COCOON_SUFFIXES = [""] + [f" ({k})" for k in range(1, 5)]
ISOLATED_PARTS = {
    100012: [
        {"src": "SpiderMom/Center/SpiderMomBody", "label": "SpiderMomBody Isolated*"},
        {"node": "SpiderMom/Center/Childs", "after": "SpiderMom/Center/Childs/SpiderChild (7)",
         "label": "SpiderChildSwarm Isolated*", "anim": "Skitter*", "make": spider_skitter},
        *[{"src": f"SpiderMom/Center/Cocoon/Coccoon{s}", "label": f"Cocoon{s} Isolated*",
           "sprite_node": "spline_GRP_1/spline_Ctrl_GRP_3/spline_Ctrl_3/AgentSprite", "sprites": COCOON_SPRITES}
          for s in COCOON_SUFFIXES],
    ],
}


def touched_paths(doc, clips):
    nodes = doc["nodes"]
    hit = {tr["node"] for c in clips for tr in doc["clips"][c]["tracks"]}

    def under(n):
        while n >= 0:
            if n in hit:
                return True
            n = nodes[n]["parent"]
        return False

    keep = set()
    for r in doc["renderers"]:
        check = [r["node"]] + (doc["meshes"][r["mesh"]].get("bones", []) if r["kind"] == "skinned" else [])
        if any(under(n) for n in check if n >= 0):
            keep.add(nodes[r["node"]]["path"])
    return sorted(keep)


def add_isolated_parts(doc, eid):
    idx = {n["path"]: i for i, n in enumerate(doc["nodes"])}
    by_node = {a["node"]: i for i, a in enumerate(doc["animators"])}
    for spec in ISOLATED_PARTS.get(eid, []):
        if "src" in spec:
            ai = by_node[idx[spec["src"]]]
            src = doc["animators"][ai]
            states = [dict(s) for s in src["states"] if s["clip"]]
            if "sprites" in spec:
                sprite_node = idx[spec["src"] + "/" + spec["sprite_node"]]
                grouped = []
                for s in states:
                    grouped.append(s)
                    for v, sprite in enumerate(spec["sprites"][1:], 1):
                        clip = dict(doc["clips"][s["clip"]])
                        clip["tracks"] = clip["tracks"] + [{"node": sprite_node, "target": "sprite", "prop": "sprite",
                                                            "step": True, "times": [0.0], "values": [sprite]}]
                        clip["synthetic"] = True
                        key = f"{s['clip']}~{v}"
                        doc["clips"][key] = clip
                        grouped.append({**s, "name": f"{s['name']}_{v}*", "clip": key})
                states = grouped
            clips = [s["clip"] for s in src["states"] if s["clip"]]
            a = {"node": src["node"], "enabled": True, "controller": src["controller"], "default": None,
                 "states": states, "part_rank": src.get("part_rank", 0) + 0.5, "replaces": ai}
        else:
            node = idx[spec["node"]]
            key = spec["anim"]
            doc["clips"][key] = {**spec["make"](doc, node), "synthetic": True}
            clips = [key]
            after = doc["animators"][by_node[idx[spec["after"]]]]
            a = {"node": node, "enabled": True, "controller": None, "default": None,
                 "states": [{"name": key, "clip": key, "loop": True, "speed": 1.0}],
                 "part_rank": after.get("part_rank", 0) + 0.5}
        a.update(label=spec["label"], only=touched_paths(doc, clips), synthetic=True)
        doc["animators"].append(a)


def merge_gift_rules(kit_path):
    src = os.path.join(LCX, "scratch", "gift", "kit", "kit.json")
    kit = json.load(open(kit_path, encoding="utf8"))
    if "gifts" in kit["rules"]:
        return
    gk = json.load(open(src, encoding="utf8"))
    kit["rules"]["gifts"] = gk["rules"]["gifts"]
    kit["gift_sheets"] = gk["gift_sheets"]
    kit["equipment"]["gifts"] = gk["equipment"]["gifts"]
    json.dump(kit, open(kit_path, "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))


def merge_symbol_rules(kit_path):
    src_dir = os.path.join(LCX, "scratch", "symbol", "kit")
    kit = json.load(open(kit_path, encoding="utf8"))
    sk = json.load(open(os.path.join(src_dir, "kit.json"), encoding="utf8"))
    kit["rules"]["symbol"] = sk["rules"]["symbol"]
    kit["symbol_sheets"] = sk["symbol_sheets"]
    copy_tree(os.path.join(src_dir, "sprites", "symbol"), os.path.join(os.path.dirname(kit_path), "sprites", "symbol"))
    json.dump(kit, open(kit_path, "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))


def alpha_components(mask):
    h, w = mask.shape
    lab = np.zeros((h, w), int)
    n = 0
    for y0, x0 in zip(*np.nonzero(mask)):
        if lab[y0, x0]:
            continue
        n += 1
        lab[y0, x0] = n
        stack = [(y0, x0)]
        while stack:
            y, x = stack.pop()
            for yy in range(max(0, y - 1), min(h, y + 2)):
                for xx in range(max(0, x - 1), min(w, x + 2)):
                    if mask[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = n
                        stack.append((yy, xx))
    return lab, n


def stray_mask(alpha):
    lab, n = alpha_components(alpha > 0)
    if n < 2:
        return None
    main = 1 + int(np.argmax([alpha[lab == c].sum() for c in range(1, n + 1)]))
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0, main}
    if not any(alpha[lab == c].max() >= STRAY_MIN_ALPHA for c in edge):
        return None
    return np.isin(lab, list(edge))


def clean_weapons(kit_dir):
    kit_path = os.path.join(kit_dir, "kit.json")
    kit = json.load(open(kit_path, encoding="utf8"))
    weapons = kit["equipment"]["weapons"]
    if any((w["name"] or "").endswith("*") for w in weapons):
        return
    load = lambda sp: np.asarray(Image.open(os.path.join(kit_dir, sp["file"])).convert("RGBA")).copy()
    renamed = {}
    for sheet in kit["weapon_sheets"]:
        sprites = list(sheet["sprites"])
        by_name = {sp["name"]: sp for sp in sprites}
        cleaned = {}
        for sp in sprites:
            img = load(sp)
            mask = stray_mask(img[..., 3])
            spill = WEAPON_SPILL.get(sp["name"])
            if mask is None and not spill:
                continue
            if mask is not None:
                img[mask] = 0
            if spill:
                src = load(by_name[spill])
                m = stray_mask(src[..., 3])
                rows = src.shape[0] - int(np.nonzero(m)[0].min())
                top = np.where(m[..., None], src, 0)[-rows:].astype(np.uint8)
                img = np.concatenate([top, img, np.zeros_like(top)])
            cleaned[sp["name"]] = img

        def add(sp, img):
            file = sp["file"].replace(".png", "_clean.png")
            Image.fromarray(img).save(os.path.join(kit_dir, file))
            sheet["sprites"].append({**sp, "file": file, "name": sp["name"] + "*", "size": [img.shape[1], img.shape[0]]})
            print(f"cleaned weapon sprite {sp['name']} -> {file}")

        if sheet["class"] == "fist":
            for i in range(0, len(sprites) - 1, 2):
                pair = sprites[i:i + 2]
                if any(sp["name"] in cleaned for sp in pair):
                    renamed[("fist", str(i // 2))] = str(len(sheet["sprites"]) // 2)
                    for sp in pair:
                        add(sp, cleaned.get(sp["name"], load(sp)))
        else:
            for sp in sprites:
                if sp["name"] in cleaned:
                    add(sp, cleaned[sp["name"]])
                    renamed[(sheet["class"], sp["name"])] = sp["name"] + "*"
    for w in list(weapons):
        new = renamed.get((w["class"], w["sprite"]))
        if new and w["name"]:
            weapons.append({**w, "id": CLEAN_WEAPON_ID + w["id"], "name": w["name"] + "*", "sprite": new})
            print(f"added weapon {w['name']}*")
    json.dump(kit, open(kit_path, "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))


def group_of(eid):
    if 100000 <= eid < 200000:
        return "abno"
    if 200000 <= eid < 300000 or 2000000 <= eid < 3000000:
        return "ordeal"
    if 300000 <= eid < 400000:
        return "tool"
    if 4000010 <= eid < 4000020:
        return "core"
    return "other"


def spaced(code):
    s = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", code).replace("_", " ")
    return s[:1].upper() + s[1:]


def part_label(path, i, n):
    last = path.rsplit("/", 1)[-1].strip()
    if n == 1:
        return "Main*"
    m = re.match(r"^SkeletonGraphic \((.+)\)$", last)
    if m:
        return m.group(1)
    if not last or last.startswith("Spine Mecanim GameObject"):
        return f"Part {i + 1}*"
    return last


def add_sprite_skins(pd, cfg):
    src = os.path.join(LCX, "out", cfg["src"])
    doc = json.load(open(os.path.join(src, "heads.json"), encoding="utf8"))
    imgs = [Image.open(os.path.join(src, h["file"])).convert("RGBA") for h in doc["heads"]]
    w, h = sum(i.width for i in imgs) + 2 * (len(imgs) - 1), max(i.height for i in imgs)
    page = Image.new("RGBA", (w, h))
    lines = ["", "sprites.png", f"size: {w},{h}", "format: RGBA8888", "filter: Linear,Linear", "repeat: none"]
    x = 0
    for head, img in zip(doc["heads"], imgs):
        page.paste(img, (x, 0))
        lines += [head["sprite"], "  rotate: false", f"  xy: {x}, 0", f"  size: {img.width}, {img.height}",
                  f"  orig: {img.width}, {img.height}", "  offset: 0, 0", "  index: -1"]
        x += img.width + 2
    a = np.asarray(page).astype(np.float32)
    a[..., :3] *= a[..., 3:] / 255
    Image.fromarray(a.round().astype(np.uint8), "RGBA").save(os.path.join(pd, "sprites.png"))
    with open(os.path.join(pd, "skeleton.atlas"), "a", encoding="utf8") as f:
        f.write("\n".join(lines) + "\n")
    sp = os.path.join(pd, "skeleton.json")
    skel = json.load(open(sp, encoding="utf-8-sig"))
    att = next(iter(skel["skins"]["default"][doc["slot"]]))
    for head in doc["heads"]:
        skel["skins"][cfg["skins"][head["sprite"]]] = {doc["slot"]: {att: {
            "path": head["sprite"], **{k: head[k] for k in ("x", "y", "rotation", "width", "height")}}}}
    json.dump(skel, open(sp, "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))


def copy_tree(src, dst):
    if os.path.exists(dst):
        shutil.rmtree(dst)
    shutil.copytree(src, dst)


def spine_anims(part):
    states = (part.get("controller") or {}).get("states") or []
    loop_of = {}
    for s in states:
        if s.get("clip") and s["clip"] not in loop_of:
            loop_of[s["clip"]] = (bool(s["loop"]), float(s.get("speed") or 1.0))
    out = []
    for a in part.get("animations") or []:
        loop, speed = loop_of.get(a, (True, 1.0))
        out.append({"name": a, "loop": loop, "speed": speed})
    return out


def has_nan(v):
    if isinstance(v, list):
        return any(has_nan(x) for x in v)
    return isinstance(v, float) and v != v


def speed_up_spine(path, anims):
    sk = json.loads(open(path, "rb").read().decode("utf-8-sig"))

    def scale(o, k):
        if isinstance(o, dict):
            for key, v in o.items():
                if key == "time" and isinstance(v, (int, float)):
                    o[key] = round(v / k, 5)
                else:
                    scale(v, k)
        elif isinstance(o, list):
            for v in o:
                scale(v, k)

    for name, k in anims.items():
        copy = json.loads(json.dumps(sk["animations"][name]))
        scale(copy, k)
        sk["animations"][name + "*"] = copy
    json.dump(sk, open(path, "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))


def add_kit_bob(doc, body_path):
    body = next(i for i, n in enumerate(doc["nodes"]) if n["path"] == body_path)
    x, y, z = doc["nodes"][body]["pos"]
    steps = 64
    period = 2 * math.pi
    times = [round(period * k / steps, 5) for k in range(steps + 1)]
    values = [[x, round(y + math.sin(t) / 2, 5), z] for t in times]
    doc["clips"]["Static"] = {"duration": 0.0, "sample_rate": 60, "loop": True, "tracks": []}
    doc["clips"]["Bob"] = {"duration": round(period, 5), "sample_rate": 60, "loop": True,
                           "tracks": [{"node": body, "target": "node", "prop": "position", "step": False,
                                       "times": times, "values": values}]}
    doc["animators"].insert(0, {"node": 0, "enabled": True, "controller": None, "default": "Static*",
                                "states": [{"name": "Static*", "clip": "Static", "loop": True, "speed": 1.0},
                                           {"name": "Bob*", "clip": "Bob", "loop": True, "speed": 1.0}]})


def add_static_state(path, label=None):
    doc = json.load(open(path, encoding="utf8"))
    if any(st.get("clip") for a in doc["animators"] for st in a["states"]):
        return
    doc["clips"]["Static"] = {"duration": 0.0, "sample_rate": 60, "loop": True, "tracks": []}
    anim = {"node": 0, "enabled": True, "controller": None, "default": "Static*",
            "states": [{"name": "Static*", "clip": "Static", "loop": True, "speed": 1.0}]}
    if label:
        anim["label"] = label
    doc["animators"].insert(0, anim)
    json.dump(doc, open(path, "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))


def merge_scene(dst, src_name):
    src = os.path.join(LCX, "out", src_name)
    shutil.copytree(os.path.join(src, "sprites"), os.path.join(dst, "sprites"), dirs_exist_ok=True)
    path = os.path.join(dst, "scene.json")
    doc = json.load(open(path, encoding="utf8"))
    add = json.load(open(os.path.join(src, "scene.json"), encoding="utf8"))
    off = len(doc["nodes"])
    for n in add["nodes"]:
        n["parent"] = n["parent"] + off if n["parent"] >= 0 else -1
        if n["parent"] < 0:
            n["active"] = False
        doc["nodes"].append(n)
    mesh_key = {k: f"{src_name}:{k}" for k in add["meshes"]}
    for k, m in add["meshes"].items():
        m["bones"] = [b + off if b >= 0 else -1 for b in m["bones"]]
        doc["meshes"][mesh_key[k]] = m
    for r in add["renderers"]:
        r["node"] += off
        if "mesh" in r:
            r["mesh"] = mesh_key[r["mesh"]]
        doc["renderers"].append(r)
    doc["sprites"].update(add["sprites"])
    doc["spine"].update(add["spine"])
    for a in add["animators"]:
        a["node"] += off
        doc["animators"].append(a)
    for name, c in add["clips"].items():
        assert name not in doc["clips"], name
        for t in c["tracks"]:
            t["node"] += off
        doc["clips"][name] = c
    doc["notes"] = sorted(set(doc["notes"]) | set(add["notes"]))
    json.dump(doc, open(path, "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))


def clean_scene(path, eid):
    doc = json.load(open(path, encoding="utf8"))
    if eid in KIT_BOB:
        add_kit_bob(doc, KIT_BOB[eid])
    doc["animators"] = [a for a in doc["animators"] if not a.get("synthetic")]
    doc["clips"] = {k: c for k, c in doc["clips"].items() if not c.get("synthetic")}
    if eid in SCENE_PARTS:
        for a in doc["animators"]:
            spec = SCENE_PARTS[eid].get(doc["nodes"][a["node"]]["path"])
            if spec:
                a["part_rank"] = spec["rank"]
                for k in ("label", "hide", "only"):
                    if k in spec:
                        a[k] = spec[k]
            else:
                a["part"] = False
    add_isolated_parts(doc, eid)
    calculated = set(CALCULATED_STATES.get(eid, []))
    for a in doc["animators"]:
        for st in a["states"]:
            if st["name"] in calculated:
                st["name"] += "*"
    hidden = set(HIDDEN_BY_DEFAULT.get(eid, []))
    shown = set(SHOWN_BY_DEFAULT.get(eid, []))
    for n in doc["nodes"]:
        if n["path"] in hidden:
            n["active"] = False
        if n["path"] in shown:
            n["active"] = True
    dropped = 0
    for clip in doc["clips"].values():
        kept = []
        for tr in clip["tracks"]:
            keys = [(t, v) for t, v in zip(tr["times"], tr["values"]) if not has_nan(v)]
            dropped += len(tr["times"]) - len(keys)
            if keys:
                tr["times"], tr["values"] = [k[0] for k in keys], [k[1] for k in keys]
                kept.append(tr)
        clip["tracks"] = kept
    drawable = sum(1 for r in doc["renderers"] if r["kind"] in ("sprite", "skinned"))
    json.dump(doc, open(path, "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    return dropped, drawable


def main():
    cat = json.load(open(os.path.join(LCX, "cache", "catalog.json"), encoding="utf8"))["entities"]
    os.makedirs(OUT, exist_ok=True)
    abno_out = os.path.join(OUT, "abno")
    if os.path.exists(abno_out):
        shutil.rmtree(abno_out)
    os.makedirs(abno_out)

    scene_dirs = {}
    for d in os.listdir(os.path.join(LCX, "out")):
        m = re.match(r"^(\d+)_", d)
        if m and os.path.exists(os.path.join(LCX, "out", d, "scene.json")):
            scene_dirs[int(m.group(1))] = os.path.join(LCX, "out", d)

    name_count = Counter(e["name"] for e in cat if e["name"])
    entries, skipped, renamed, missing_parts = [], [], [], []
    for e in cat:
        eid = e["id"]
        name = e["name"]
        if not name or group_of(eid) == "ordeal" or name_count[name] > 1 or re.search(r"[^\x00-\x7f’…ü]", name):
            renamed.append((eid, e["codename"], name))
            name = spaced(e["codename"])
        name = NAME_OVERRIDES.get(eid, name)
        rec = {"id": f"abno-{eid}", "num": eid, "code": e["codename"], "name": name, "risk": e.get("risk"),
               "group": group_of(eid)}
        dst = os.path.join(abno_out, str(eid))
        if e["kind"] == "spine" and eid not in SCENE_ENTITIES:
            seen = {}
            for p in e["parts"]:
                if p["type"] != "spine":
                    continue
                pid = p["json_pid"]
                n_states = len((p.get("controller") or {}).get("states") or [])
                if pid not in seen or n_states > seen[pid][1]:
                    seen[pid] = (p, n_states)
            sparts = sorted((v[0] for v in seen.values()), key=lambda p: not p.get("active", True))
            parts = []
            for i, p in enumerate(sparts):
                src = os.path.join(LCX, "cache", "spine", str(p["json_pid"]))
                if not os.path.isdir(src):
                    missing_parts.append((eid, e["codename"], p["path"]))
                    continue
                pd = os.path.join(dst, str(p["json_pid"]))
                os.makedirs(pd, exist_ok=True)
                for f in os.listdir(src):
                    if f != "meta.json":
                        shutil.copyfile(os.path.join(src, f), os.path.join(pd, f))
                speeds = {a: k for (i, a), k in ANIM_SPEED.items() if i == eid and a in p["animations"]}
                anims = spine_anims(p)
                if speeds:
                    speed_up_spine(os.path.join(pd, "skeleton.json"), speeds)
                    for a in list(anims):
                        if a["name"] in speeds:
                            anims.insert(anims.index(a) + 1, {**a, "name": a["name"] + "*"})
                part = {"name": PART_NAMES.get(p["json_pid"]) or part_label(p["path"], i, len(sparts)), "dir": f"abno/{eid}/{p['json_pid']}",
                        "scale": p.get("scale") or 0.01, "skin": p.get("skin") or "default",
                        "idle": IDLE_OVERRIDES.get(eid) if IDLE_OVERRIDES.get(eid) in p["animations"] else p.get("idle"),
                        "anims": anims}
                if eid in SPRITE_SKINS:
                    cfg = SPRITE_SKINS[eid]
                    add_sprite_skins(pd, cfg)
                    part.update(skin=cfg["default"], animSkins=cfg["by_anim"])
                if eid in PART_STATES and i == 0:
                    parts += [{**part, **s} for s in PART_STATES[eid](part)]
                parts.append(part)
            for src_name, label in SCENE_CHILD_PARTS.get(eid, []):
                pd = os.path.join(dst, src_name)
                copy_tree(os.path.join(LCX, "out", src_name), pd)
                clean_scene(os.path.join(pd, "scene.json"), src_name)
                add_static_state(os.path.join(pd, "scene.json"))
                parts.append({"name": label, "dir": f"abno/{eid}/{src_name}", "scene": True})
            if not parts:
                skipped.append((eid, e["codename"], "no cached spine data"))
                continue
            rec.update(kind="spine", parts=parts)
        elif eid in scene_dirs:
            copy_tree(scene_dirs[eid], dst)
            if eid in MERGED_SCENES:
                merge_scene(dst, MERGED_SCENES[eid])
            dropped, drawable = clean_scene(os.path.join(dst, "scene.json"), eid)
            if dropped:
                print(f"{eid} {e['codename']}: dropped {dropped} NaN keys")
            if not drawable:
                shutil.rmtree(dst)
                skipped.append((eid, e["codename"], "bundle has nothing to draw"))
                continue
            add_static_state(os.path.join(dst, "scene.json"), "Default*")
            rec.update(kind="scene", dir=f"abno/{eid}")
        else:
            skipped.append((eid, e["codename"], "no exported bundle"))
            continue
        entries.append(rec)

    for x in EXTRA_SCENES:
        rec = {k: v for k, v in x.items() if k != "src"}
        dst = os.path.join(abno_out, x["src"])
        copy_tree(os.path.join(LCX, "out", x["src"]), dst)
        clean_scene(os.path.join(dst, "scene.json"), x["id"])
        rec.update(kind="scene", dir=f"abno/{x['src']}")
        entries.append(rec)

    kit_src = os.path.join(LCX, "out", "employee_kit")
    copy_tree(kit_src, os.path.join(OUT, "employee"))
    merge_gift_rules(os.path.join(OUT, "employee", "kit.json"))
    merge_symbol_rules(os.path.join(OUT, "employee", "kit.json"))
    clean_weapons(os.path.join(OUT, "employee"))

    json.dump({"format": "lobo-viewer/1", "entities": entries},
              open(os.path.join(OUT, "index.json"), "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))

    print(f"{len(entries)} entities written to {OUT}")
    for s in skipped:
        print("skipped:", *s)
    for m in missing_parts:
        print("missing part:", *m)
    for r in renamed:
        print("renamed from codename:", *r)


if __name__ == "__main__":
    sys.exit(main())
