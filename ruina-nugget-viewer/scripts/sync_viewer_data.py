import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "lor-extractor/out"
DST = ROOT / "viewer/data"
TRANSLATIONS = json.loads((ROOT / "scripts/ascii_filenames.json").read_text(encoding="utf-8"))

NON_ASCII = re.compile(r"[^\x00-\x7f]")
SPLIT = re.compile(r"^(.*?)(_[0-9a-f]{8})?(\.png)$")
QUOTED_PNG = re.compile(r'"([^"\\]*\.png)"')


def ascii_name(name):
    m = SPLIT.match(name)
    if not m or m.group(1) not in TRANSLATIONS:
        return None
    return TRANSLATIONS[m.group(1)] + (m.group(2) or "") + m.group(3)


if DST.exists():
    shutil.rmtree(DST)
shutil.copytree(SRC, DST, ignore=shutil.ignore_patterns("preview"))

renames = {}
missing = set()
for path in DST.rglob("*"):
    if not path.is_file() or not NON_ASCII.search(path.name):
        continue
    new = ascii_name(path.name)
    if new is None:
        missing.add(path.name)
        continue
    renames[path] = path.with_name(new)

if missing:
    sys.exit("no translation in ascii_filenames.json for:\n" + "\n".join(sorted(missing)))

targets = list(renames.values())
clashes = {t for t in targets if targets.count(t) > 1 or (t.exists() and t not in renames)}
if clashes:
    sys.exit("translated names clash:\n" + "\n".join(str(c) for c in sorted(clashes)))

for old, new in renames.items():
    old.rename(new)

by_rel = {str(old.relative_to(DST)): str(new.relative_to(DST)) for old, new in renames.items()}
for path in DST.rglob("*.json"):
    text = path.read_text(encoding="utf-8")
    if not NON_ASCII.search(text):
        continue
    out = QUOTED_PNG.sub(lambda m: '"' + by_rel.get(m.group(1), m.group(1)) + '"', text)
    if out != text:
        path.write_text(out, encoding="utf-8")

leftover = [p for p in DST.rglob("*") if NON_ASCII.search(str(p.relative_to(DST)))]
if leftover:
    sys.exit("non-ASCII paths remain:\n" + "\n".join(map(str, leftover)))
print(f"copied {SRC} -> {DST}, renamed {len(renames)} files to ASCII")
