import glob
import json
import os
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VIEWER = ROOT / "viewer"
RUINA = Path(os.environ.get("RUINA_DIR", Path.home() / "Documents/code/Ruina"))
LOR_LOCALIZE = RUINA / "rust/ruina/ruina_reparser/BaseMod/Localize"
LOBO_LOCALIZE = RUINA / "rust/lobocorp/lobocorp_reparser/data/Language/Localize"
OVERRIDES = Path(__file__).resolve().parent / "i18n_overrides.json"

LANGS = {"kr": "kr", "jp": "jp", "cn": "cn", "trcn": "cn_tr"}
LANG_INDEX = {lang: i for i, lang in enumerate(LANGS)}

PAGE_SUFFIX = {
    "en": [r"'s Page$", r"' Page$", r"'s page$", r"'s… Page\?$", r"'s\.\.\. Page\?$"],
    "kr": [r"(?:의 | )?책장\s*(\d*)$"],
    "jp": [r"のページ\s*(\d*)$"],
    "cn": [r"之页\s*(\d*)$"],
    "trcn": [r"之頁\s*(\d*)$"],
}

TOKENS = {
    "Librarian": ("사서", "司書", "司书", "司書"),
    "Distortion": ("뒤틀림", "ねじれ", "扭曲", "扭曲"),
    "Reverberation": ("잔향악단", "残響楽団", "残响乐团", "殘響樂團"),
    "Burning": ("화상", "火傷", "烧伤", "燒傷"),
    "Alt": ("변형", "別版", "变体", "變體"),
    "Masked": ("가면", "仮面", "面具", "面具"),
    "Circus": ("서커스", "サーカス", "马戏团", "馬戲團"),
    "Reason": ("이성", "理性", "理性", "理性"),
    "Serpent": ("뱀", "蛇", "蛇", "蛇"),
    "Broken": ("파손", "破損", "破损", "破損"),
    "Fallen": ("타락", "堕落", "堕落", "墮落"),
    "Transformed": ("변신", "変身", "变身", "變身"),
    "Stealth": ("은신", "隠密", "潜行", "潛行"),
    "Attack": ("공격", "攻撃", "攻击", "攻擊"),
    "Active": ("활동", "活動", "活动", "活動"),
    "Eaten": ("포식", "捕食", "吞食", "吞食"),
    "Monster": ("괴물", "怪物", "怪物", "怪物"),
    "Super": ("강화", "強化", "强化", "強化"),
    "Final": ("최종", "最終", "最终", "最終"),
    "Blessing": ("축복", "祝福", "祝福", "祝福"),
    "Fatal": ("치명", "致命", "致命", "致命"),
    "Child": ("아이", "子供", "孩子", "孩子"),
    "Children": ("아이들", "子供たち", "孩子们", "孩子們"),
    "Brother": ("오빠", "兄", "哥哥", "哥哥"),
    "Cowering": ("겁먹음", "怯え", "畏缩", "畏縮"),
    "Servant": ("종자", "従者", "仆从", "僕從"),
    "Hokma Stage": ("호크마 층", "ホクマー階", "侯克玛层", "侯克瑪層"),
    "Noah Down": ("노아 쓰러짐", "ノア気絶", "诺亚倒下", "諾亞倒下"),
    "Union": ("연합", "連合", "联合", "聯合"),
    "Fury": ("분노", "憤怒", "愤怒", "憤怒"),
    "Protection": ("보호", "保護", "保护", "保護"),
    "Despair": ("절망", "絶望", "绝望", "絕望"),
    "Greed": ("탐욕", "強欲", "贪婪", "貪婪"),
    "Hatred": ("증오", "憎悪", "憎恨", "憎恨"),
    "Wrath": ("분노", "憤怒", "暴怒", "暴怒"),
    "Orange": ("주황", "オレンジ", "橙", "橙"),
    "Yellow": ("노랑", "黄", "黄", "黃"),
    "Slash": ("참격", "斬撃", "斩击架势", "斬擊架勢"),
    "Pierce": ("관통", "貫通", "突刺架势", "突刺架勢"),
    "Blunt": ("타격", "打撃", "打击架势", "打擊架勢"),
    "Guard": ("방어", "防御", "防御架势", "防禦架勢"),
    "Feral Knives": ("광폭한 칼날", "狂暴な刃", "狂暴血刃", "狂暴血刃"),
}

FIXED_HEADS = {
    "customized_malkuth": "1", "customized_yesod": "2", "customized_hod": "3", "customized_netzach": "4",
    "customized_tiphereth": "5", "customized_gebura": "6", "customized_chesed": "7", "customized_binah": "8",
    "customized_hokma": "9", "customized_roland": "10", "customized_angela": "40",
}

PHASE = {"kr": "{}단계", "jp": "第{}段階", "cn": "第{}阶段", "trcn": "第{}階段"}


def parse(path):
    text = re.sub(r"<\?xml[^>]*\?>", "", open(path, encoding="utf-8-sig").read())
    return ET.fromstring(text)


def norm(s):
    return s.replace("’", "'").replace("‘", "'").strip()


def page_base(lang, s):
    s = norm(s)
    if lang == "en":
        s = re.sub(r"^(A|An) ", "", s)
    for pattern in PAGE_SUFFIX[lang]:
        s = re.sub(pattern, lambda m: (" " + m[1]) if m.groups() and m[1] else "", s)
    return s.strip()


def load_tables(lang):
    chars, books, equip = {}, {}, {}
    for path in glob.glob(str(LOR_LOCALIZE / lang / "CharactersName/*.xml")):
        for n in parse(path).iter("Name"):
            chars.setdefault(n.get("ID"), norm(n.text or ""))
    for path in glob.glob(str(LOR_LOCALIZE / lang / "Books/*.xml")):
        for d in parse(path).iter("BookDesc"):
            name = d.findtext("BookName")
            if name:
                books[d.get("BookID")] = page_base(lang, name)
    lobo_lang = "en" if lang == "en" else LANGS[lang]
    for path in glob.glob(str(LOBO_LOCALIZE / lobo_lang / "Equipment_*.xml")):
        for t in parse(path).iter("text"):
            if (t.get("id") or "").endswith("_weapon_name"):
                equip[t.get("id")] = norm(t.text or "")
    return {"char": chars, "book": books, "equip": equip}


TABLES = {lang: load_tables(lang) for lang in ["en", *LANGS]}

EN_INDEX = {}
for kind in ["equip", "char", "book"]:
    for key, text in TABLES["en"][kind].items():
        if text:
            EN_INDEX.setdefault(text, (kind, key))


def lookup(base, lang):
    hit = EN_INDEX.get(norm(base))
    if not hit:
        return None
    return TABLES[lang][hit[0]].get(hit[1]) or None


def token(t, lang):
    if t in TOKENS:
        return TOKENS[t][LANG_INDEX[lang]]
    m = re.fullmatch(r"Phase (\d+)", t)
    if m:
        return PHASE[lang].format(m[1])
    m = re.fullmatch(r"Lv\. (\d+)", t)
    if m:
        return f"Lv.{m[1]}"
    if re.fullmatch(r"[A-Z0-9]|\d+|EGO", t):
        return t
    m = re.fullmatch(r"Final, (\w+)", t)
    if m:
        return token("Final", lang) + ", " + token(m[1], lang)
    return lookup(t, lang)


def translate(name, lang):
    found = lookup(name, lang)
    if found:
        return found
    m = re.fullmatch(r"Distorted (.+)", name)
    if m:
        base = translate(m[1], lang)
        return f"{base} ({token('Distortion', lang)})" if base else None
    m = re.fullmatch(r"(.+) \((.+)\)", name)
    if m:
        base = translate(m[1], lang)
        parts = [token(m[2], lang)] if m[2] in TOKENS else [token(p, lang) for p in m[2].split(", ")]
        return f"{base} ({', '.join(parts)})" if base and all(parts) else None
    m = re.fullmatch(r"(.+) (\d+)", name)
    if m:
        base = translate(m[1], lang)
        return f"{base} {m[2]}" if base else None
    return None


def main():
    names = json.load(open(VIEWER / "names.json", encoding="utf-8"))
    overrides = json.load(open(OVERRIDES, encoding="utf-8"))
    for lang in LANGS:
        out, missing = {}, []
        for iid, en in names.items():
            o = overrides.get(iid, {})
            value = o.get(lang) or (translate(o["en"], lang) if "en" in o else None) or translate(en, lang)
            if value:
                out[iid] = value
            else:
                missing.append(f"  {iid}: {en}")
        for iid, char_id in FIXED_HEADS.items():
            out[iid] = TABLES[lang]["char"][char_id]
        with open(VIEWER / f"names.{lang}.json", "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=1, sort_keys=True)
        print(f"{lang}: {len(out)} named, {len(missing)} left in English")
        if missing:
            print("\n".join(missing))


if __name__ == "__main__":
    main()
