import { $ } from "./dom.js";
import { store } from "./state.js";

const THEME_ICONS = {
    dark: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/></svg>`,
    light:
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none"/>` +
        [0, 45, 90, 135, 180, 225, 270, 315]
            .map(
                (a) => `<path d="M12 2.5v2.5" transform="rotate(${a} 12 12)"/>`
            )
            .join("") +
        `</svg>`,
};

const currentTheme = () =>
    document.documentElement.dataset.theme === "light" ? "light" : "dark";

function setTheme(theme, save = true) {
    document.documentElement.dataset.theme = theme;
    if (save) {
        store.set("theme", theme);
    }
    const b = $("#theme-toggle");
    const other = theme === "dark" ? "light" : "dark";
    b.innerHTML = THEME_ICONS[theme];
    b.setAttribute("aria-label", `Switch to ${other} mode`);
}

export function initTheme() {
    $("#theme-toggle").onclick = () =>
        setTheme(currentTheme() === "light" ? "dark" : "light");
    setTheme(currentTheme(), false);
}
