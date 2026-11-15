import json
from pathlib import Path

from remove_path_spaces import fix_json

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "lor-extractor/out"
VIEWER = ROOT / "viewer"
CATEGORIES = {"new", "egos", "creatureskin"}


def has_head(motion):
    return any(l["type"] == "Head" and l["visible"] and (l.get("sprite") or {}).get("size") for l in motion["layers"])


def main():
    index = json.load(open(OUT / "index.json", encoding="utf-8"))
    heads = []
    for key, entry in sorted(index.items()):
        if entry["category"] not in CATEGORIES:
            continue
        app = json.load(open(OUT / key / "appearance.json", encoding="utf-8"))
        motions = list(app["motions"].values())
        default = app["motions"].get("Default")
        if default and has_head(default) and sum(map(has_head, motions)) * 2 >= len(motions):
            heads.append(key)
    with open(VIEWER / "stored_heads.json", "w", encoding="utf-8") as f:
        json.dump(heads, f, indent=0)
    fix_json(VIEWER / "stored_heads.json")
    print(len(heads), "appearances with a usable head")


if __name__ == "__main__":
    main()
