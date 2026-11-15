import json
import re
import sys
from pathlib import Path

VIEWER = Path(__file__).resolve().parent.parent / "viewer"
DATA = VIEWER / "data"
ID_OR_PATH = re.compile(r"^(new|egos|creatureskin|defaultmotion|customize)/|^(appearance|ego|creature|defaultmotion|customized)_|\.png$")


def no_spaces(s):
    return s.replace(" ", "_")


def rename_paths(root):
    paths = sorted((p for p in root.rglob("*") if " " in p.name), key=lambda p: len(p.parts), reverse=True)
    clashes = [p for p in paths if p.with_name(no_spaces(p.name)).exists()]
    if clashes:
        sys.exit("renamed paths would clash:\n" + "\n".join(map(str, clashes)))
    for p in paths:
        p.rename(p.with_name(no_spaces(p.name)))
    return {str(p.relative_to(root)): str(p.with_name(no_spaces(p.name)).relative_to(root)) for p in paths}


def strings_to_fix(obj, out):
    if isinstance(obj, dict):
        for k, v in obj.items():
            strings_to_fix(k, out)
            strings_to_fix(v, out)
    elif isinstance(obj, list):
        for v in obj:
            strings_to_fix(v, out)
    elif isinstance(obj, str) and " " in obj and ID_OR_PATH.search(obj):
        out.add(obj)
    return out


def fix_json(path):
    text = path.read_text(encoding="utf-8")
    olds = strings_to_fix(json.loads(text), set())
    if not olds:
        return False
    for old in olds:
        new = json.dumps(no_spaces(old), ensure_ascii=False)
        for literal in {json.dumps(old), json.dumps(old, ensure_ascii=False)}:
            text = text.replace(literal, new)
    left = strings_to_fix(json.loads(text), set())
    if left:
        sys.exit(f"{path}: could not rewrite {sorted(left)[:5]}")
    path.write_text(text, encoding="utf-8")
    return True


def main():
    renamed = rename_paths(DATA) if DATA.exists() else {}
    jsons = [*DATA.rglob("*.json"), *VIEWER.glob("*.json")]
    fixed = [p for p in jsons if fix_json(p)]
    print(f"renamed {len(renamed)} paths, rewrote {len(fixed)} JSON files")
    return renamed


if __name__ == "__main__":
    main()
