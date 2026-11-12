import { loadJSON } from "./assets.js";
import { CATEGORIES, CATEGORY_OVERRIDES, DEFAULT_RANK, HIDDEN_SKINS, OTHER, RANKS, SUBGROUPS } from "./config.js";
import { $, el } from "./dom.js";
import { LANGUAGES } from "./lang.js";
import { setPanel } from "./main.js";
import { selectSkin } from "./selection.js";
import { state, store } from "./state.js";

export function prettyName(id, prefix) {
  let s = id.startsWith(prefix) ? id.slice(prefix.length) : id;
  return s.split("_").filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
}

export const localJSON = f => fetch(f).then(r => r.ok ? r.json() : null).catch(() => null);
export const langInfo = () => LANGUAGES.find(l => l.key === state.lang) || LANGUAGES[0];

export async function loadIndex() {
  const lang = langInfo();
  const [idx, names, local, enemyPages, groups] = await Promise.all([
    loadJSON("index.json"),
    localJSON("names.json"),
    lang.key === "en" ? null : localJSON(`names.${lang.key}.json`),
    localJSON("enemy_pages.json"),
    localJSON("groups.json"),
  ]);
  const enemy = new Set(enemyPages || []);
  state.localNames = local || {};
  state.enNames = names || {};
  const cats = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));
  const collator = new Intl.Collator(lang.tag);
  state.index = Object.entries(idx)
    .filter(([key, v]) => cats[v.category] && !HIDDEN_SKINS.has(key.split("/").pop()))
    .map(([key, v]) => {
      const id = key.split("/").pop();
      const category = CATEGORY_OVERRIDES[id] || (v.category === "new" && enemy.has(id) ? "enemy" : v.category);
      const nameEn = (names && names[id]) || prettyName(id, cats[category].prefix);
      const name = (local && local[id]) || nameEn;
      const g = groups?.[id];
      const sub = typeof g === "number" ? RANKS[g - 1] || DEFAULT_RANK : g || (category === "new" || category === "enemy" ? DEFAULT_RANK : OTHER);
      return { key, id, name, category, sub, motions: v.motions, hay: [name, nameEn, id].join(" ").toLowerCase() };
    })
    .sort((a, b) => collator.compare(a.name, b.name));
  $("#list").lang = lang.tag;
  $("#skin-title").lang = lang.tag;
  renderList();
}

export function highlight(text, q) {
  const frag = document.createDocumentFragment();
  if (!q) { frag.append(text); return frag; }
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) { frag.append(text); return frag; }
  frag.append(text.slice(0, i), el("mark", { textContent: text.slice(i, i + q.length) }), text.slice(i + q.length));
  return frag;
}

export function collapsibleGroup(key, label, count, className, open) {
  const group = el("div", { className: className + (state.collapsed.has(key) && !open ? " collapsed" : "") });
  const head = el("button", { className: className + "-head" },
    el("span", { className: "caret", textContent: "▾" }), label, el("span", { className: "n", textContent: count }));
  head.onclick = () => {
    group.classList.toggle("collapsed");
    state.collapsed[group.classList.contains("collapsed") ? "add" : "delete"](key);
    store.set("collapsed", [...state.collapsed]);
  };
  const items = el("div", { className: className + "-items" });
  group.append(head, items);
  return [group, items];
}

export function renderList() {
  const q = state.filter.text.trim().toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);
  const list = $("#list");
  list.textContent = "";
  for (const c of CATEGORIES) {
    const rows = state.index.filter(e => e.category === c.key && terms.every(t => e.hay.includes(t)));
    if (!rows.length) continue;
    const [group, items] = collapsibleGroup(c.key, c.label, rows.length, "group", q);
    for (const sub of SUBGROUPS[c.key]) {
      const subRows = rows.filter(e => e.sub === sub);
      if (!subRows.length) continue;
      const [subgroup, subItems] = collapsibleGroup(`${c.key}:${sub}`, sub, subRows.length, "subgroup", q);
      for (const e of subRows) {
        const b = el("button", { className: "item" + (e.key === state.skinKey ? " active" : "") },
          el("span", { className: "nm" }, highlight(e.name, terms[0])));
        b.dataset.key = e.key;
        b.onclick = () => { selectSkin(e.key); if (matchMedia("(max-width: 860px)").matches) setPanel("left", false); };
        subItems.append(b);
      }
      items.append(subgroup);
    }
    list.append(group);
  }
}
