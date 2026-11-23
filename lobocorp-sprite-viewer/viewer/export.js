"use strict";

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    return c >>> 0;
});

function crc32(bytes, c = 0xffffffff) {
    for (let i = 0; i < bytes.length; i++) {
        c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    }
    return c;
}
const crcDone = (c) => (c ^ 0xffffffff) >>> 0;

function makeZip(files) {
    const enc = new TextEncoder();
    const now = new Date();
    const time =
        (now.getHours() << 11) |
        (now.getMinutes() << 5) |
        (now.getSeconds() >> 1);
    const date =
        ((now.getFullYear() - 1980) << 9) |
        ((now.getMonth() + 1) << 5) |
        now.getDate();
    const parts = [],
        central = [];
    let offset = 0;
    for (const { name, data } of files) {
        const nameBytes = enc.encode(name);
        const crc = crcDone(crc32(data));
        const local = new DataView(new ArrayBuffer(30));
        local.setUint32(0, 0x04034b50, true);
        local.setUint16(4, 20, true);
        local.setUint16(6, 0x0800, true);
        local.setUint16(10, time, true);
        local.setUint16(12, date, true);
        local.setUint32(14, crc, true);
        local.setUint32(18, data.length, true);
        local.setUint32(22, data.length, true);
        local.setUint16(26, nameBytes.length, true);
        parts.push(local, nameBytes, data);
        const cen = new DataView(new ArrayBuffer(46));
        cen.setUint32(0, 0x02014b50, true);
        cen.setUint16(4, 20, true);
        cen.setUint16(6, 20, true);
        cen.setUint16(8, 0x0800, true);
        cen.setUint16(12, time, true);
        cen.setUint16(14, date, true);
        cen.setUint32(16, crc, true);
        cen.setUint32(20, data.length, true);
        cen.setUint32(24, data.length, true);
        cen.setUint16(28, nameBytes.length, true);
        cen.setUint32(42, offset, true);
        central.push(cen, nameBytes);
        offset += 30 + nameBytes.length + data.length;
    }
    const size = central.reduce((n, x) => n + x.byteLength, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, size, true);
    end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end], { type: "application/zip" });
}

// ---- APNG ----

function pngChunks(bytes) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const out = [];
    for (let p = 8; p + 8 <= bytes.length;) {
        const len = dv.getUint32(p);
        const type = String.fromCharCode(...bytes.subarray(p + 4, p + 8));
        out.push({ type, data: bytes.subarray(p + 8, p + 8 + len) });
        p += 12 + len;
    }
    return out;
}

function pngChunk(type, data) {
    const out = new Uint8Array(12 + data.length);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, data.length);
    for (let i = 0; i < 4; i++) {
        out[4 + i] = type.charCodeAt(i);
    }
    out.set(data, 8);
    dv.setUint32(
        8 + data.length,
        crcDone(crc32(out.subarray(4, 8 + data.length)))
    );
    return out;
}

function u32s(...vals) {
    const out = new Uint8Array(vals.length * 4);
    const dv = new DataView(out.buffer);
    vals.forEach((v, i) => dv.setUint32(i * 4, v));
    return out;
}

function encodeApng(pngs, fps) {
    const frames = pngs.map(pngChunks);
    const ihdr = frames[0].find((c) => c.type === "IHDR").data;
    const parts = [
        new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
        pngChunk("IHDR", ihdr),
        pngChunk("acTL", u32s(frames.length, 0)),
    ];
    const w = new DataView(ihdr.buffer, ihdr.byteOffset).getUint32(0),
        h = new DataView(ihdr.buffer, ihdr.byteOffset).getUint32(4);
    let seq = 0;
    frames.forEach((chunks, i) => {
        const own = chunks.find((c) => c.type === "IHDR").data;
        if (own.some((b, k) => b !== ihdr[k])) {
            throw new Error("frames have different PNG headers");
        }
        const fc = new Uint8Array(26);
        const dv = new DataView(fc.buffer);
        dv.setUint32(0, seq++);
        dv.setUint32(4, w);
        dv.setUint32(8, h);
        dv.setUint16(20, 1);
        dv.setUint16(22, fps);
        fc[24] = 1;
        fc[25] = 0;
        parts.push(pngChunk("fcTL", fc));
        for (const c of chunks) {
            if (c.type !== "IDAT") {
                continue;
            }
            if (i === 0) {
                parts.push(pngChunk("IDAT", c.data));
            } else {
                const d = new Uint8Array(4 + c.data.length);
                new DataView(d.buffer).setUint32(0, seq++);
                d.set(c.data, 4);
                parts.push(pngChunk("fdAT", d));
            }
        }
    });
    parts.push(pngChunk("IEND", new Uint8Array(0)));
    return new Blob(parts, { type: "image/apng" });
}

// ---- GIF ----

function gifPalette(images) {
    const N = 1 << 15;
    const count = new Uint32Array(N),
        sr = new Float64Array(N),
        sg = new Float64Array(N),
        sb = new Float64Array(N);
    for (const img of images) {
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] < 128) {
                continue;
            }
            const k =
                ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
            count[k]++;
            sr[k] += d[i];
            sg[k] += d[i + 1];
            sb[k] += d[i + 2];
        }
    }
    const keys = [];
    for (let k = 0; k < N; k++) {
        if (count[k]) {
            keys.push(k);
        }
    }
    const chan = (k, c) => (k >> (10 - c * 5)) & 31;
    const boxes = keys.length ? [keys] : [];
    while (boxes.length < 255) {
        let bi = -1,
            bc = 0,
            best = 0;
        boxes.forEach((b, i) => {
            if (b.length < 2) {
                return;
            }
            for (let c = 0; c < 3; c++) {
                let lo = 31,
                    hi = 0;
                for (const k of b) {
                    const v = chan(k, c);
                    if (v < lo) {
                        lo = v;
                    }
                    if (v > hi) {
                        hi = v;
                    }
                }
                const score = (hi - lo) * Math.log2(b.length + 1);
                if (score > best) {
                    best = score;
                    bi = i;
                    bc = c;
                }
            }
        });
        if (bi < 0) {
            break;
        }
        const b = boxes[bi].sort((x, y) => chan(x, bc) - chan(y, bc));
        let total = 0;
        for (const k of b) {
            total += count[k];
        }
        let acc = 0,
            cut = 1;
        for (let i = 0; i < b.length - 1; i++) {
            acc += count[b[i]];
            if (acc >= total / 2) {
                cut = i + 1;
                break;
            }
        }
        boxes.splice(bi, 1, b.slice(0, cut), b.slice(cut));
    }
    const pal = new Uint8Array(768);
    const colors = boxes.map((b) => {
        let n = 0,
            r = 0,
            g = 0,
            bl = 0;
        for (const k of b) {
            n += count[k];
            r += sr[k];
            g += sg[k];
            bl += sb[k];
        }
        return [Math.round(r / n), Math.round(g / n), Math.round(bl / n)];
    });
    colors.forEach((c, i) => pal.set(c, (i + 1) * 3));
    const lookup = new Uint8Array(N);
    for (const k of keys) {
        const r = ((k >> 10) & 31) * 8 + 4,
            g = ((k >> 5) & 31) * 8 + 4,
            bl = (k & 31) * 8 + 4;
        let bi = 0,
            bd = Infinity;
        colors.forEach((c, i) => {
            const d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - bl) ** 2;
            if (d < bd) {
                bd = d;
                bi = i;
            }
        });
        lookup[k] = bi + 1;
    }
    return { pal, lookup };
}

function gifLzw(indices, out) {
    const minCode = 8,
        clear = 256,
        eoi = 257;
    const table = new Int16Array(1 << 20),
        stamp = new Uint16Array(1 << 20);
    let gen = 1,
        codeSize = minCode + 1,
        next = eoi + 1,
        cur = 0,
        shift = 0;
    const bytes = [];
    const emit = (c) => {
        cur |= c << shift;
        shift += codeSize;
        while (shift >= 8) {
            bytes.push(cur & 255);
            cur >>>= 8;
            shift -= 8;
        }
    };
    emit(clear);
    let code = indices[0];
    for (let i = 1; i < indices.length; i++) {
        const k = indices[i];
        const key = (code << 8) | k;
        if (stamp[key] === gen) {
            code = table[key];
            continue;
        }
        emit(code);
        if (next === 4096) {
            emit(clear);
            next = eoi + 1;
            codeSize = minCode + 1;
            if (++gen === 65536) {
                stamp.fill(0);
                gen = 1;
            }
        } else {
            if (next >= 1 << codeSize) {
                codeSize++;
            }
            table[key] = next++;
            stamp[key] = gen;
        }
        code = k;
    }
    emit(code);
    emit(eoi);
    if (shift > 0) {
        bytes.push(cur & 255);
    }
    out.push(minCode);
    for (let p = 0; p < bytes.length; p += 255) {
        const n = Math.min(255, bytes.length - p);
        out.push(n);
        for (let i = 0; i < n; i++) {
            out.push(bytes[p + i]);
        }
    }
    out.push(0);
}

async function encodeGif(images, w, h, delays, onProgress) {
    const { pal, lookup } = gifPalette(images);
    const head = [..."GIF89a"].map((c) => c.charCodeAt(0));
    head.push(w & 255, w >> 8, h & 255, h >> 8, 0xf7, 0, 0, ...pal);
    head.push(
        0x21,
        0xff,
        0x0b,
        ..."NETSCAPE2.0".split("").map((c) => c.charCodeAt(0)),
        3,
        1,
        0,
        0,
        0
    );
    const parts = [new Uint8Array(head)];
    const idx = new Uint8Array(w * h);
    for (let f = 0; f < images.length; f++) {
        const d = images[f].data;
        for (let i = 0, p = 0; p < idx.length; i += 4, p++) {
            idx[p] =
                d[i + 3] < 128
                    ? 0
                    : lookup[
                          ((d[i] >> 3) << 10) |
                              ((d[i + 1] >> 3) << 5) |
                              (d[i + 2] >> 3)
                      ];
        }
        const delay = delays[f];
        const out = [
            0x21,
            0xf9,
            4,
            (2 << 2) | 1,
            delay & 255,
            delay >> 8,
            0,
            0,
            0x2c,
            0,
            0,
            0,
            0,
            w & 255,
            w >> 8,
            h & 255,
            h >> 8,
            0,
        ];
        gifLzw(idx, out);
        parts.push(new Uint8Array(out));
        if (onProgress) {
            await onProgress(f + 1, images.length);
        }
    }
    parts.push(new Uint8Array([0x3b]));
    return new Blob(parts, { type: "image/gif" });
}

// ---- WebM ----

function readVint(b, p) {
    const first = b[p];
    let len = 1;
    while (len <= 8 && !(first & (0x80 >> (len - 1)))) {
        len++;
    }
    let v = first & (0xff >> len);
    for (let i = 1; i < len; i++) {
        v = v * 256 + b[p + i];
    }
    const unknown = v === 2 ** (7 * len) - 1;
    return { len, v, unknown };
}

function readId(b, p) {
    const first = b[p];
    let len = 1;
    while (len <= 4 && !(first & (0x80 >> (len - 1)))) {
        len++;
    }
    let id = 0;
    for (let i = 0; i < len; i++) {
        id = id * 256 + b[p + i];
    }
    return { len, id };
}

function webmWithDuration(bytes, ms) {
    try {
        let p = 0;
        const h = readId(bytes, p),
            hs = readVint(bytes, p + h.len);
        p += h.len + hs.len + hs.v;
        const seg = readId(bytes, p);
        if (seg.id !== 0x18538067) {
            return bytes;
        }
        const ss = readVint(bytes, p + seg.len);
        let q = p + seg.len + ss.len;
        while (q < bytes.length) {
            const e = readId(bytes, q),
                es = readVint(bytes, q + e.len);
            if (es.unknown || e.id === 0x114d9b74 || e.id === 0x1c53bb6b) {
                return bytes;
            }
            if (e.id === 0x1549a966) {
                const bodyStart = q + e.len + es.len,
                    bodyEnd = bodyStart + es.v;
                const dur = new Uint8Array(11);
                dur.set([0x44, 0x89, 0x88]);
                new DataView(dur.buffer).setFloat64(3, ms);
                const size = es.v + dur.length;
                const sizeBytes = new Uint8Array(8);
                sizeBytes[0] = 0x01;
                for (let i = 7, v = size; i > 0; i--, v = Math.floor(v / 256)) {
                    sizeBytes[i] = v & 255;
                }
                const out = [
                    bytes.subarray(0, q + e.len),
                    sizeBytes,
                    bytes.subarray(bodyStart, bodyEnd),
                    dur,
                    bytes.subarray(bodyEnd),
                ];
                if (!ss.unknown) {
                    const segSize = ss.v + (8 - es.len) + dur.length;
                    const sb = new Uint8Array(8);
                    sb[0] = 0x01;
                    for (
                        let i = 7, v = segSize;
                        i > 0;
                        i--, v = Math.floor(v / 256)
                    ) {
                        sb[i] = v & 255;
                    }
                    out.splice(
                        0,
                        1,
                        bytes.subarray(0, p + seg.len),
                        sb,
                        bytes.subarray(p + seg.len + ss.len, q + e.len)
                    );
                }
                return new Blob(out);
            }
            q += e.len + es.len + es.v;
        }
    } catch (err) {
        console.warn("could not add WebM duration", err);
    }
    return bytes;
}

async function mediaRecorderWebm(frames, fps, onProgress) {
    const mime = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
    ].find((m) => MediaRecorder.isTypeSupported(m));
    if (!mime) {
        throw new Error("this browser cannot record WebM");
    }
    const w = frames[0].width + (frames[0].width & 1),
        h = frames[0].height + (frames[0].height & 1);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d");
    const stream = c.captureStream(0);
    const track = stream.getVideoTracks()[0];
    const rec = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: Math.min(40e6, Math.max(2e6, w * h * fps * 0.3)),
    });
    const parts = [];
    rec.ondataavailable = (e) => {
        if (e.data.size) {
            parts.push(e.data);
        }
    };
    const stopped = new Promise((r) => {
        rec.onstop = r;
    });
    rec.start();
    const step = 1000 / fps;
    const start = performance.now();
    const waitUntil = (t) =>
        new Promise((r) => setTimeout(r, Math.max(0, t - performance.now())));
    for (let i = 0; i < frames.length; i++) {
        await waitUntil(start + i * step);
        g.clearRect(0, 0, w, h);
        g.drawImage(frames[i], 0, 0);
        track.requestFrame();
        if (onProgress) {
            onProgress(i + 1, frames.length);
        }
    }
    await waitUntil(start + frames.length * step);
    rec.stop();
    await stopped;
    track.stop();
    const raw = new Uint8Array(await new Blob(parts).arrayBuffer());
    const fixed = webmWithDuration(raw, frames.length * step);
    return new Blob([fixed], { type: "video/webm" });
}

const WEBM_ENCODERS = {
    mediarecorder: {
        realtime: true,
        available: () =>
            typeof MediaRecorder === "function" &&
            [
                "video/webm;codecs=vp9",
                "video/webm;codecs=vp8",
                "video/webm",
            ].some((m) => MediaRecorder.isTypeSupported(m)),
        encode: mediaRecorderWebm,
    },
};
const WEBM_ENCODER = "mediarecorder";

function webmEncoder() {
    const enc = WEBM_ENCODERS[WEBM_ENCODER];
    if (!enc?.available()) {
        throw new Error("WebM encoding is not available in this browser");
    }
    return enc;
}
