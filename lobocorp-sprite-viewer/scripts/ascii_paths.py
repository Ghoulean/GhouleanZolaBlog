import json
import re
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "viewer" / "data"
SAFE = re.compile(r"[A-Za-z0-9._-]+")

INITIALS = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"]
VOWELS = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"]
FINALS = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"]
LINKED = ["", "g", "kk", "ks", "n", "nj", "n", "d", "r", "lg", "lm", "lb", "ls", "lt", "lp", "r", "m", "b", "ps", "s", "ss", "ng", "j", "ch", "k", "t", "p", ""]
JAMO_NAMES = {
    "ㄱ": "giyeok", "ㄲ": "ssanggiyeok", "ㄴ": "nieun", "ㄷ": "digeut", "ㄸ": "ssangdigeut", "ㄹ": "rieul",
    "ㅁ": "mieum", "ㅂ": "bieup", "ㅃ": "ssangbieup", "ㅅ": "siot", "ㅆ": "ssangsiot", "ㅇ": "ieung",
    "ㅈ": "jieut", "ㅉ": "ssangjieut", "ㅊ": "chieut", "ㅋ": "kieuk", "ㅌ": "tieut", "ㅍ": "pieup", "ㅎ": "hieut",
}
SILENT_INITIAL = 11
RIEUL_FINAL = 8
RIEUL_INITIAL = 5


def syllable(ch):
    n = ord(ch) - 0xAC00
    return (n // 588, n % 588 // 28, n % 28) if 0 <= n < 11172 else None


def romanize(text):
    out = []
    chars = list(text)
    for i, ch in enumerate(chars):
        s = syllable(ch)
        if s is None:
            out.append(JAMO_NAMES.get(ch, ch))
            continue
        ini, vow, fin = s
        nxt = syllable(chars[i + 1]) if i + 1 < len(chars) else None
        prev = syllable(chars[i - 1]) if i > 0 else None
        if prev and prev[2] and ini == SILENT_INITIAL and LINKED[prev[2]]:
            head = ""
        elif prev and prev[2] == RIEUL_FINAL and ini == RIEUL_INITIAL:
            head = "l"
        else:
            head = INITIALS[ini]
        if fin and nxt and nxt[0] == SILENT_INITIAL and LINKED[fin]:
            tail = LINKED[fin]
        else:
            tail = FINALS[fin]
        out.append(head + VOWELS[vow] + tail)
    return "".join(out)


def ascii_name(name):
    name = romanize(name).replace(" ", "_")
    return re.sub(r"[^A-Za-z0-9._-]", "_", name)


def rename_paths(root):
    paths = sorted((p for p in root.rglob("*") if not SAFE.fullmatch(p.name)), key=lambda p: len(p.parts), reverse=True)
    targets = {}
    for p in paths:
        new = p.with_name(ascii_name(p.name))
        if new.exists() or new in targets.values():
            sys.exit(f"renamed path would clash: {p} -> {new.name}")
        targets[p] = new
    for p, new in targets.items():
        p.rename(new)
    return {str(p.relative_to(root)): str(new.relative_to(root)) for p, new in targets.items()}


def unsafe_paths(obj, out):
    if isinstance(obj, dict):
        for v in obj.values():
            unsafe_paths(v, out)
    elif isinstance(obj, list):
        for v in obj:
            unsafe_paths(v, out)
    elif isinstance(obj, str) and obj.endswith(".png") and not all(SAFE.fullmatch(part) for part in obj.split("/")):
        out.add(obj)
    return out


def fix_json(path):
    text = path.read_text(encoding="utf-8")
    olds = unsafe_paths(json.loads(text), set())
    if not olds:
        return False
    for old in olds:
        new = json.dumps("/".join(ascii_name(part) for part in old.split("/")))
        for literal in {json.dumps(old), json.dumps(old, ensure_ascii=False)}:
            text = text.replace(literal, new)
    left = unsafe_paths(json.loads(text), set())
    if left:
        sys.exit(f"{path}: could not rewrite {sorted(left)[:5]}")
    path.write_text(text, encoding="utf-8")
    return True


def main():
    renamed = rename_paths(DATA)
    fixed = [p for p in DATA.rglob("*.json") if fix_json(p)]
    print(f"renamed {len(renamed)} paths, rewrote {len(fixed)} JSON files")


if __name__ == "__main__":
    main()
