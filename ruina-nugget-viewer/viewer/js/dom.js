export const $ = (s) => document.querySelector(s);
export const el = (tag, props = {}, ...kids) => {
    const e = Object.assign(document.createElement(tag), props);
    for (const k of kids) {
        e.append(k);
    }
    return e;
};
