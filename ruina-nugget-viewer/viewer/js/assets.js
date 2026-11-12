import { DATA_ROOT } from "./config.js";

export function dataUrl(file) {
  return DATA_ROOT + file.split("/").map(encodeURIComponent).join("/");
}

const jsonCache = new Map();
export function loadJSON(path) {
  if (!jsonCache.has(path)) {
    jsonCache.set(path, fetch(dataUrl(path)).then(r => {
      if (!r.ok) throw new Error(`${r.status} ${path}`);
      return r.json();
    }));
  }
  return jsonCache.get(path);
}

const imgCache = new Map();
export function loadImage(file) {
  if (!imgCache.has(file)) {
    imgCache.set(file, new Promise((res, rej) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => res(img);
      img.onerror = () => rej(new Error("image " + file));
      img.src = dataUrl(file);
    }));
  }
  return imgCache.get(file);
}

const tintCache = new Map();
export function tinted(img, file, color) {
  const key = file + "|" + color.slice(0, 3).join(",");
  let c = tintCache.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = "multiply";
    g.fillStyle = `rgb(${color.slice(0, 3).map(v => Math.round(v * 255)).join(",")})`;
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = "destination-in";
    g.drawImage(img, 0, 0);
    tintCache.set(key, c);
  }
  return c;
}
