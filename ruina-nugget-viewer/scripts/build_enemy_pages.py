import glob
import json
import os
import re
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

from remove_path_spaces import fix_json

ROOT = Path(__file__).resolve().parent.parent
VIEWER = ROOT / "viewer"
INDEX = ROOT / "lor-extractor/out/index.json"
RUINA = Path(os.environ.get("RUINA_DIR", Path.home() / "Documents/code/Ruina"))
STATIC = RUINA / "rust/ruina/ruina_reparser/BaseMod/StaticInfo"

ALWAYS_OBTAINABLE = {
    "appearance_gearsunit_librarian",
    "appearance_thepurpletearg_f", "appearance_thepurpletearg_n",
    "appearance_thepurpletearh_f", "appearance_thepurpletearh_n",
    "appearance_thepurpletearj_f", "appearance_thepurpletearj_n",
    "appearance_thepurpletearz_f", "appearance_thepurpletearz_n",
    "appearance_xiaoego",
    "appearance_myo2",
    "appearance_blue_philip_burn",
    "appearance_theredmist",
}
ALWAYS_ENEMY = {
    "appearance_gearsunit",
}
GENDER_SUFFIX = re.compile(r"_[fmn]$")


def parse(path):
    text = re.sub(r"<\?xml[^>]*\?>", "", open(path, encoding="utf-8-sig").read())
    return ET.fromstring(text)


def main():
    dropped = set()
    for path in glob.glob(str(STATIC / "DropBook/*.xml")):
        for item in parse(path).iter("DropItem"):
            if item.get("Type") == "Equip":
                dropped.add(item.text.strip())

    for path in glob.glob(str(STATIC / "StageInfo/*.xml")):
        for item in parse(path).iter("RewardItems"):
            if item.get("Type") == "Equip":
                dropped.add(item.text.strip())

    obtainable_skins = defaultdict(bool)
    for path in glob.glob(str(STATIC / "EquipPage/*.xml")):
        source = Path(path).stem.removeprefix("EquipPage_")
        for book in parse(path).iter("Book"):
            skin = book.findtext("CharacterSkin")
            if skin:
                obtainable_skins[skin.lower()] |= source == "basic" or book.get("ID") in dropped

    index = json.load(open(INDEX, encoding="utf-8"))
    enemy = []
    for key, entry in index.items():
        if entry["category"] != "new":
            continue
        iid = key.split("/")[-1]
        skin = iid.removeprefix("appearance_")
        if iid not in ALWAYS_ENEMY and (iid in ALWAYS_OBTAINABLE or obtainable_skins[skin] or obtainable_skins[GENDER_SUFFIX.sub("", skin)]):
            continue
        enemy.append(iid)

    with open(VIEWER / "enemy_pages.json", "w", encoding="utf-8") as f:
        json.dump(sorted(enemy), f, indent=1)
    fix_json(VIEWER / "enemy_pages.json")
    print(f"{len(enemy)} enemy pages")


if __name__ == "__main__":
    main()
