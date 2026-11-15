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

SEPHIROT = ["Malkuth", "Yesod", "Hod", "Netzach", "Tiphereth", "Gebura", "Chesed", "Binah", "Hokma", "Keter"]
FILE_CHAPTER = re.compile(r"_ch(\d)")
GENDER_SUFFIX = re.compile(r"_[fmn]$")

ALIASES = {
    "appearance_deerunit2": "appearance_deerunit1", "appearance_deerunit3": "appearance_deerunit1",
    "appearance_rabbitunit2": "appearance_rabbitunit1", "appearance_rabbitunit3": "appearance_rabbitunit1",
    "appearance_rhinounit2": "appearance_rhinounit1", "appearance_rhinounit3": "appearance_rhinounit1",
    **{f"appearance_thepurpletear{v}_{g}": f"appearance_thepurpletear_{g}" for v in "ghjz" for g in "fn"},
    "appearance_philipegofury": "appearance_philipego", "appearance_philipegoprotection": "appearance_philipego",
    "appearance_xiaoego": "appearance_xiaodistort",
    "appearance_yan_union": "appearance_yan_distort",
    "appearance_gearsunit_librarian": "appearance_gearsunit",
    "appearance_blue_philip_burn": "appearance_blue_philip",
    "appearance_myo2 1": "appearance_myo2",
}
RANK_OVERRIDES = {
    "appearance_theredmist": 6,
    "appearance_argalia": 7, "appearance_argalia2": 7, "appearance_twistedargalia": 7,
    "appearance_elena": 7, "appearance_tanya": 7, "appearance_orangecross": 7,
    "appearance_binah": None,
}
SEPHIRAH_OVERRIDES = {
    "Yesod": ["creature_butterfly_super", "ego_freischutz"],
    "Tiphereth": [
        "creature_despairfinal_blesssword", "creature_despairfinal_fatalsword",
        "creature_knightofdespair_blesssword", "creature_knightofdespair_fatalsword",
        "creature_nihil_despairlibrarian", "creature_nihil_greedlibrarian",
        "creature_nihil_hatredlibrarian", "creature_nihil_wrathlibrarian",
        "creature_queenofhatred_snake", "creature_servantofwrath_servant", "ego_hatred_snake",
        "ego_nihil_despairphase", "ego_nihil_greedphase", "ego_nihil_hatredphase", "ego_nihil_wrathphase",
    ],
    "Gebura": ["creature_bigbadwolfeaten", "creature_bigbadwolftrans", "creature_nosferatu_monster", "ego_wolfpolymorph"],
    "Chesed": [
        "creature_lumberjack_atk", "creature_waybackhome_break", "creature_waybackhome_cowardlion_coward",
        "creature_wizard_crystalchild", "ego_lumberjack_break", "ego_waybackhome_break",
    ],
    "Hokma": ["creature_hokmafirst", "creature_hokmafirstchild", "ego_plaguedoctor2", "ego_plaguedoctor3", "ego_whitenight_fall"],
}


def parse(path):
    text = re.sub(r"<\?xml[^>]*\?>", "", open(path, encoding="utf-8-sig").read())
    return ET.fromstring(text)


def main():
    chapters = defaultdict(set)
    sephirah = {}
    for path in sorted(glob.glob(str(STATIC / "EquipPage/*.xml"))):
        stem = Path(path).stem
        m = FILE_CHAPTER.search(stem)
        for book in parse(path).iter("Book"):
            skin = (book.findtext("CharacterSkin") or "").strip().lower()
            if not skin:
                continue
            ch = book.findtext("Chapter")
            ch = int(ch) if ch else (int(m.group(1)) if m else None)
            if ch:
                chapters[skin].add(ch)
            bid = int(book.get("ID"))
            if "creature" in stem and 9000000 <= bid < 9200000:
                sephirah.setdefault(skin, SEPHIROT[(bid // 10000) % 100 - 1])

    card_skin = {}
    for card in parse(STATIC / "Card/CardInfo_ego.xml").iter("Card"):
        skin = card.findtext("SkinChange")
        if skin:
            card_skin[card.get("ID")] = skin.strip().lower()
    for ego in parse(STATIC / "EmotionEgo/EmotionEgo.xml").iter("EmotionEgo"):
        skin = card_skin.get(ego.findtext("Card"))
        if skin:
            sephirah[skin] = ego.findtext("Sephirah")

    index = json.load(open(INDEX, encoding="utf-8"))
    out, missing = {}, []
    for key, entry in index.items():
        iid = key.split("/")[-1]
        cat = entry["category"]
        if cat == "new":
            skin = iid.removeprefix("appearance_")
            chs = chapters.get(skin) or chapters.get(GENDER_SUFFIX.sub("", skin))
            if chs:
                out[iid] = min(chs)
            else:
                missing.append(iid)
        elif cat in ("egos", "creatureskin"):
            if iid in sephirah:
                out[iid] = sephirah[iid]
            else:
                missing.append(iid)

    for iid, src in ALIASES.items():
        if iid in missing and src in out:
            out[iid] = out[src]
            missing.remove(iid)
    for iid, rank in RANK_OVERRIDES.items():
        if rank is None:
            out.pop(iid, None)
        else:
            out[iid] = rank
        if iid in missing:
            missing.remove(iid)
    for seph, ids in SEPHIRAH_OVERRIDES.items():
        for iid in ids:
            out[iid] = seph
            if iid in missing:
                missing.remove(iid)

    with open(VIEWER / "groups.json", "w", encoding="utf-8") as f:
        json.dump(dict(sorted(out.items())), f, indent=1, ensure_ascii=False)
    fix_json(VIEWER / "groups.json")
    print(f"{len(out)} grouped, {len(missing)} missing:")
    for m in sorted(missing):
        print(" ", m)


if __name__ == "__main__":
    main()
