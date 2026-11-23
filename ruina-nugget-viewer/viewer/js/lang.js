import { loadJSON } from "./assets.js";
import { $, el } from "./dom.js";
import { buildFixedHeads } from "./head-panel.js";
import { langInfo, loadIndex } from "./list.js";
import { state, store } from "./state.js";

export const LANGUAGES = [
    { key: "en", tag: "en", name: "English" },
    { key: "kr", tag: "ko", name: "한국어" },
    { key: "jp", tag: "ja", name: "日本語" },
    { key: "cn", tag: "zh-Hans", name: "简体中文" },
    { key: "trcn", tag: "zh-Hant", name: "繁體中文" },
];

function starPath(cx, cy, outer, inner, points = 5, rot = -90) {
    const pts = [];
    for (let i = 0; i < points * 2; i++) {
        const r = i % 2 ? inner : outer,
            a = ((rot + (i * 180) / points) * Math.PI) / 180;
        pts.push(
            `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
        );
    }
    return `M${pts.join("L")}Z`;
}

const trigram = (x, y, angle) =>
    `<g transform="translate(${x} ${y}) rotate(${angle})" fill="#000">` +
    [-4, 0, 4]
        .map((dy) => `<rect x="-6" y="${dy - 1.2}" width="12" height="2.4"/>`)
        .join("") +
    "</g>";

const FLAGS = {
    en:
        `<svg viewBox="0 0 60 30" preserveAspectRatio="none"><rect width="60" height="30" fill="#012169"/>` +
        `<path d="M0,0L60,30M60,0L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0L60,30M60,0L0,30" stroke="#C8102E" stroke-width="2"/>` +
        `<path d="M30,0V30M0,15H60" stroke="#fff" stroke-width="10"/><path d="M30,0V30M0,15H60" stroke="#C8102E" stroke-width="6"/></svg>`,
    kr:
        `<svg viewBox="-36 -24 72 48" preserveAspectRatio="none"><rect x="-36" y="-24" width="72" height="48" fill="#fff"/>` +
        `<g transform="rotate(33.69)"><circle r="12" fill="#cd2e3a"/><path d="M-12,0A12,12 0 0,0 12,0A6,6 0 0,0 0,0A6,6 0 0,1 -12,0Z" fill="#0047a0"/></g>` +
        trigram(-22, -15, 56.31) +
        trigram(22, 15, 56.31) +
        trigram(22, -15, -56.31) +
        trigram(-22, 15, -56.31) +
        `</svg>`,
    jp: `<svg viewBox="0 0 30 20" preserveAspectRatio="none"><rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#bc002d"/></svg>`,
    cn:
        `<svg viewBox="0 0 30 20" preserveAspectRatio="none"><rect width="30" height="20" fill="#de2910"/><path fill="#ffde00" d="` +
        starPath(5, 5, 3, 1.15) +
        starPath(10, 2, 1, 0.38, 5, 0) +
        starPath(12, 4, 1, 0.38, 5, 20) +
        starPath(12, 7, 1, 0.38, 5, -20) +
        starPath(10, 9, 1, 0.38, 5, 0) +
        `"/></svg>`,
    trcn:
        `<svg viewBox="0 0 30 20" preserveAspectRatio="none"><rect width="30" height="20" fill="#fe0000"/><rect width="15" height="10" fill="#000095"/>` +
        `<path fill="#fff" d="${starPath(7.5, 5, 3.8, 2.3, 12)}"/><circle cx="7.5" cy="5" r="2.1" fill="#000095"/><circle cx="7.5" cy="5" r="1.75" fill="#fff"/></svg>`,
};

export function renderLangGroup() {
    const cur = langInfo();
    const btn = $("#lang-btn");
    btn.innerHTML = FLAGS[cur.key] + `<span class="caret">▾</span>`;
    btn.setAttribute("aria-label", `Name language: ${cur.name}`);
    const menu = $("#lang-menu");
    menu.textContent = "";
    for (const l of LANGUAGES) {
        const li = el("li", { role: "option" });
        li.innerHTML = FLAGS[l.key];
        li.append(el("span", { textContent: l.name, lang: l.tag }));
        li.dataset.lang = l.key;
        li.setAttribute("aria-selected", l.key === state.lang);
        li.onclick = () => {
            closeLangMenu();
            setLang(l.key);
        };
        menu.append(li);
    }
}

function openLangMenu() {
    $("#lang-menu").hidden = false;
    $("#lang-btn").setAttribute("aria-expanded", "true");
    focusLangItem(
        [...$("#lang-menu").children].findIndex(
            (li) => li.dataset.lang === state.lang
        )
    );
}

function closeLangMenu() {
    $("#lang-menu").hidden = true;
    $("#lang-btn").setAttribute("aria-expanded", "false");
}

function focusLangItem(i) {
    const items = [...$("#lang-menu").children];
    items.forEach((li, j) => li.classList.toggle("focus", j === i));
}

export function initLangMenu() {
    $("#lang-btn").onclick = () =>
        $("#lang-menu").hidden ? openLangMenu() : closeLangMenu();
    document.addEventListener("pointerdown", (e) => {
        if (!$("#lang-dd").contains(e.target)) {
            closeLangMenu();
        }
    });
    $("#lang-dd").addEventListener("keydown", (e) => {
        const menu = $("#lang-menu");
        const items = [...menu.children];
        const cur = items.findIndex((li) => li.classList.contains("focus"));
        if (menu.hidden) {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                openLangMenu();
            }
            return;
        }
        if (e.key === "Escape") {
            e.preventDefault();
            closeLangMenu();
            $("#lang-btn").focus();
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            focusLangItem((cur + 1) % items.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            focusLangItem((cur - 1 + items.length) % items.length);
        } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            items[cur]?.click();
        }
    });
}

async function setLang(key) {
    if (key === state.lang) {
        return;
    }
    state.lang = key;
    store.set("lang", key);
    renderLangGroup();
    await loadIndex();
    loadJSON("customize/special_heads.json")
        .then(buildFixedHeads)
        .catch(() => {});
    const entry = state.index.find((e) => e.key === state.skinKey);
    if (entry) {
        $("#skin-title").textContent = entry.name;
    }
    document.querySelector(".item.active")?.scrollIntoView({ block: "center" });
}
