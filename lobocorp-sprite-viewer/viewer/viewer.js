"use strict";

const IS_LOCAL =
    location.protocol === "file:" ||
    ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
const DATA_ROOT = (
    new URLSearchParams(location.search).get("data") ||
    (IS_LOCAL ? "data/" : "/assets/lobocorp/")
).replace(/\/?$/, "/");
const LIST_GROUPS = [
    { key: "nugget", label: "Nugget" },
    { key: "abno", label: "Abnormalities" },
    { key: "tool", label: "Tools" },
    { key: "ordeal", label: "Ordeals" },
    { key: "core", label: "Core Suppression" },
    { key: "other", label: "Special" },
];
const EMP_ANIM_GROUPS = [
    { label: "Idle", test: (n) => /^Standing/.test(n) },
    { label: "Walk", test: (n) => /^Walk/.test(n) },
    { label: "Work", test: (n) => /^Work/.test(n) && n !== "Worker_Attack" },
    {
        label: "Attack",
        test: (n) => /^Attack/i.test(n) || n === "Worker_Attack",
    },
    { label: "Panic", test: (n) => /^Panic/.test(n) },
    { label: "Death", test: (n) => /^Dead/.test(n) },
    { label: "Dance", test: (n) => /^dance/i.test(n) },
    { label: "Other", test: () => true },
];
const ANIM_WEAPONS = {
    Walk_OneHand: [
        "mace",
        "axe",
        "knife",
        "pistol",
        "bowgun",
        "spear",
        "rifle",
        "officer",
    ],
    Walk_Cannon: ["cannon"],
    Walk_Fist: ["fist"],
    Walk_Hammer: ["hammer"],
    Attack_Axe_01: ["axe"],
    Attack_BowGun_01: ["bowgun"],
    Attack_Cannon_01: ["cannon"],
    Attack_Fist_01: ["fist"],
    Attack_Hammer_01: ["hammer"],
    Attack_Knife_01: ["knife"],
    Attack_Knife_02: ["knife"],
    Attack_Mace_01: ["mace"],
    Attack_Rifle_01: ["rifle"],
    Attack_Spear_01: ["spear"],
    Worker_Attack: ["pistol", "officer"],
};
const RIG_PREVIOUS = {
    PromiseAndFaithUse: {
        "loop for_2to3_3-doing": "2_get_marble",
        "3_fail": "loop for_2to3_3-doing",
        "3_success": "loop for_2to3_3-doing",
        "4_fail": "3_fail",
        "4_fail_to_default": "4_fail",
        "4_Success": "3_success",
        "5_success_give_ball": "4_Success",
        "5_success_gice_ball_to_default": "5_success_give_ball",
    },
};
const RIG_LABELS = {
    SingingMachineAttackerAgentCTRL: "Singing Machine (attacker)",
    SingingMachineDieAgentCTRL: "Singing Machine (victim)",
};
const RIG_ABNO = {
    Orchestra: "SilentOrchestra",
    ScytheApostle: "DeathAngel",
    SpearApostle: "DeathAngel",
    WandApostle: "DeathAngel",
};
const WALKING_WEAPON_ANIMS = new Set(["Walk_OneHand", "Panic_Berserk_Walk"]);
const WALKING_WEAPON_CLASSES = new Set([
    "mace",
    "axe",
    "knife",
    "pistol",
    "bowgun",
    "spear",
    "rifle",
]);
const LOOK_PARTS = [
    { key: "front", region: "front", label: "Front hair" },
    { key: "rear", region: "rear", label: "Rear hair" },
    { key: "eye", region: "eye_default", label: "Eyes" },
    { key: "eyebrow", region: "eyebrow", label: "Brows" },
    { key: "mouth", region: "mouth", label: "Mouth" },
    { key: "eye_closed", region: "eye_closed", label: "Closed eyes" },
];
const FACE_REGION_LOOK = {
    front: "front",
    rear: "rear",
    eye_default: "eye",
    eyebrow: "eyebrow",
    mouth: "mouth",
    eyebrow_battle: "eyebrow",
    mouth_battle: "mouth",
    eye_panic: "eye",
    eyebrow_panic: "eyebrow",
    mouth_panic: "mouth",
    eye_dead: "eye",
    eye_closed: "eye_closed",
};
const DEFAULT_LOOK = {
    expression: "default",
    hair: "#93daff",
    front: [1, 0],
    rear: [0, 0],
    eye: [0, 0],
    eyebrow: [0, 0],
    mouth: [0, 0],
    eye_closed: [0, 0],
};
const FACE_SLOTS = ["Eye", "EyeBrow", "Mouth"];
const ANIM_FACE_CLIPS = [
    [/^(Attack_|Worker_Attack$|Walk_(OneHand|Fist|Hammer|Cannon)$)/, "battle"],
    [/^Panic_/, "panic"],
    [/^Dead_\d+$/, "dead"],
];
const ANIM_FACE_RIGS = {
    AgentPanic: "panic",
    BlackCorpsAgentCTRL: "panic",
    BigBirdAgentDead: "panic",
    LongBirdAgentDead: "panic",
    OrchestraAgentDead: "dead",
    MachineDawnAgentDead: "dead",
    HealthBraceletDead: "dead",
    OtherWorldPortraitDead: "dead",
    ArmorCreatureDead: "dead",
    SpiderMomAgentDead: "dead",
};
const NO_ARMBAND_RIGS = new Set(["employee/rigs/ScytheApostleDead"]);
const ARMBAND_SLOT = "R arm 1";
const SEPARATE_FACE_RIGS = new Set(["employee/rigs/OtherWorldPortraitDead"]);
const GIFT_TYPES = ["add", "replace", "special_add"];
const GIFT_REGION_LABELS = {
    head: "Head",
    eye: "Eye",
    mouth: "Mouth",
    hair: "Hair",
    right_hand: "Right hand",
    body_up: "Body",
    ribborn: "Ribbon",
    right_cheek: "Cheek",
    face: "Face",
    back: "Back",
    headback: "Behind head",
    back2: "Back 2",
    left_hand: "Left hand",
};
const GIFT_TYPE_SUFFIX = ["", " (replace)", " (special)"];
const GIFT_MERGED_REGIONS = new Set([2, 4, 13]);
const GIFT_GROUP_LABELS = { "2:10": "Special" };
const GIFT_NAMES = { 1021: "Snow Queen's Kiss", 1022: "Snow Queen's Duel" };
const GIFT_WEAPON = {
    slot: "R Weapon",
    att: "Weapon_Mace",
    rotate: 90,
    shift: [0.47, 0],
};
const GIFT_GROUP_TAIL = ["2:10", "2:5", "2:4"];
const isWeaponGift = (g) => g.type === 2 && g.region === 4;
const DEPARTMENTS = [
    { key: "malkut", label: "Malkuth" },
    { key: "yesod", label: "Yesod" },
    { key: "hod", label: "Hod" },
    { key: "netzach", label: "Netzach" },
    { key: "tiphereth1", label: "Tiphereth 1" },
    { key: "tiphereth2", label: "Tiphereth 2" },
    { key: "geburah", label: "Gebura" },
    { key: "chesed", label: "Chesed" },
    { key: "binah", label: "Binah" },
    { key: "chokhmah", label: "Hokma" },
    { key: "kether", label: "Kether" },
];

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const el = (tag, props = {}, ...kids) => {
    const e = Object.assign(document.createElement(tag), props);
    for (const k of kids) {
        e.append(k);
    }
    return e;
};
const spaced = (s) =>
    s.replace(/(?<=[a-z0-9])(?=[A-Z])/g, " ").replace(/_/g, " ");

const store = {
    get(k, d) {
        try {
            const v = localStorage.getItem("lobo-viewer:" + k);
            return v == null ? d : JSON.parse(v);
        } catch {
            return d;
        }
    },
    set(k, v) {
        try {
            localStorage.setItem("lobo-viewer:" + k, JSON.stringify(v));
        } catch {}
    },
};

const DATA = {
    entities: [],
    kit: null,
    armors: [],
    weapons: [],
    giftGroups: [],
    giftById: new Map(),
    rigAnims: {},
};

const state = {
    sel: "employee",
    filter: { text: "" },
    collapsed: new Set(store.get("collapsed", [])),
    lang: "en",
    anim: 0,
    part: 0,
    skin: null,
    hiddenLayers: new Set(),
    shownLayers: new Set(),
    look: structuredClone(DEFAULT_LOOK),
    armor: null,
    weapon: null,
    gifts: {},
    department: { employee: "malkut", clerk: "malkut" },
    animFace: store.get("animFace", true) !== false,
    serviceLevel: 1,
    editingColor: null,
    play: { playing: true, ended: false, t: 0, speed: 1, loop: true },
    view: { zoom: 1, camX: 0, camY: 0, flip: false },
    expKind: "still",
};

// ---- canvas & GL ----

const canvas = $("#canvas");
const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
    antialias: true,
});
const batcher = new Batcher(gl);
const drawer = new Drawer(batcher);
const dpr = () => devicePixelRatio || 1;

// ---- model loading ----

const spineCache = new Map();
const sceneCache = new Map();
const textureCache = new Map();
const failed = new Map();

function loadOnce(map, key, fn) {
    if (!map.has(key)) {
        const p = fn().then(
            (v) => {
                p.value = v;
                renderAfterLoad();
                return v;
            },
            (err) => {
                failed.set(key, err);
                console.error(err);
                renderAfterLoad();
            }
        );
        map.set(key, p);
    }
    return map.get(key);
}

function spineModel(dir, skel, atlas, pma) {
    const key = dir;
    if (failed.has(key)) {
        return { error: failed.get(key) };
    }
    const p = loadOnce(spineCache, key, async () => {
        const m = await loadSpine(gl, DATA_ROOT + dir, skel, atlas, pma);
        if (SEPARATE_FACE_RIGS.has(dir)) {
            for (const name of FACE_SLOTS) {
                const sd = m.data.findSlot(name);
                if (
                    sd &&
                    !sd.attachmentName &&
                    m.data.defaultSkin?.getAttachment(sd.index, name)
                ) {
                    sd.attachmentName = name;
                }
            }
        }
        m.skeleton = new spine.Skeleton(m.data);
        m.dir = dir;
        m.orig = new Map();
        return m;
    });
    return p.value || null;
}

function sceneModel(dir) {
    if (failed.has(dir)) {
        return { error: failed.get(dir) };
    }
    const p = loadOnce(sceneCache, dir, () =>
        ScenePlayer.load(gl, DATA_ROOT + dir)
    );
    return p.value || null;
}

function kitTexture(file) {
    if (!textureCache.has(file)) {
        const p = loadBitmap(DATA_ROOT + "employee/" + file).then(
            (b) => {
                p.value = new GLTexture(gl, b, false);
                return p.value;
            },
            () => {
                p.value = null;
            }
        );
        textureCache.set(file, p);
    }
    return textureCache.get(file);
}

let afterLoadQueued = false;
function renderAfterLoad() {
    if (afterLoadQueued) {
        return;
    }
    afterLoadQueued = true;
    queueMicrotask(() => {
        afterLoadQueued = false;
        clampAnim();
        renderAnims();
        renderLayers();
        renderOptions();
        renderTitle();
        if (pendingDefaultView && currentModel()?.ready) {
            pendingDefaultView = false;
            defaultView();
        }
    });
}

// ---- background loading ----

const preload = {
    enabled: true,
    gen: 0,
    limit: 6,
    active: 0,
    waiters: [],
    loaded: new Set(),
};

function updateLoadedCount() {
    if (!preload.enabled && $("#preload-count").textContent) {
        return;
    }
    $("#preload-count").textContent =
        `${preload.loaded.size} / ${allEntries().length} prefabs loaded`;
}

function pumpPreload() {
    while (preload.waiters.length && preload.active < preload.limit) {
        preload.active++;
        preload.waiters.shift()();
    }
}

const acquirePreload = () =>
    new Promise((r) => {
        preload.waiters.push(r);
        pumpPreload();
    });

function releasePreload() {
    preload.active--;
    pumpPreload();
}

const idle = () =>
    new Promise((r) =>
        (window.requestIdleCallback || ((f) => setTimeout(f, 50)))(() => r(), {
            timeout: 2000,
        })
    );

function initPreloadSetting() {
    preload.enabled = store.get("preload", true) !== false;
    preload.limit = Math.min(
        20,
        Math.max(1, Math.round(Number(store.get("preloadParallel", 6))) || 6)
    );
    const box = $("#preload"),
        range = $("#preload-parallel"),
        out = $("#preload-parallel-value");
    const sync = () => {
        range.disabled = !preload.enabled;
        $("#preload-parallel-field").classList.toggle(
            "disabled-block",
            !preload.enabled
        );
        $("#preload-count").classList.toggle(
            "disabled-block",
            !preload.enabled
        );
    };
    box.checked = preload.enabled;
    range.value = preload.limit;
    out.textContent = preload.limit;
    sync();
    box.onchange = () => {
        preload.enabled = box.checked;
        store.set("preload", preload.enabled);
        sync();
        updateLoadedCount();
        if (preload.enabled) {
            restartPreload();
        } else {
            preload.gen++;
        }
    };
    range.oninput = () => {
        preload.limit = Number(range.value);
        out.textContent = preload.limit;
        pumpPreload();
    };
    range.onchange = () => store.set("preloadParallel", preload.limit);
}

function restartPreload() {
    const g = ++preload.gen;
    if (preload.enabled && DATA.kit && state.sel) {
        runPreload(g, state.sel);
    }
}

function kitFiles() {
    const out = new Set();
    const walk = (v) => {
        if (typeof v === "string") {
            if (v.endsWith(".png")) {
                out.add(v);
            }
        } else if (Array.isArray(v)) {
            v.forEach(walk);
        } else if (v && typeof v === "object") {
            for (const [k, x] of Object.entries(v)) {
                if (k !== "rigs") {
                    walk(x);
                }
            }
        }
    };
    walk(DATA.kit);
    return [...out].map((f) => ({ kit: f }));
}

function rigSource(name) {
    const r = rigInfo(name);
    return (
        r && { spine: "employee/" + r.dir, skel: r.skeleton, atlas: r.atlas }
    );
}

function entitySources(id) {
    if (id === "employee" || id === "clerk") {
        const rigs =
            id === "employee"
                ? Object.keys(DATA.kit.rigs)
                      .filter((n) => n !== "agent" && n !== "clerk")
                      .map(rigSource)
                : [];
        return [
            [rigSource(id === "employee" ? "agent" : "clerk")],
            [...rigs, ...kitFiles()],
        ].map((l) => l.filter(Boolean));
    }
    const e = DATA.entities.find((x) => x.id === id);
    if (!e) {
        return [[], []];
    }
    if (e.kind === "scene") {
        return [[{ scene: e.dir }], []];
    }
    const src = e.parts.map((p) =>
        p.scene
            ? { scene: p.dir }
            : { spine: p.dir, skel: "skeleton.json", atlas: "skeleton.atlas" }
    );
    return [src.slice(0, 1), src.slice(1)];
}

async function preloadFile(url, live) {
    if (assetDone.has(url) || assetStore.has(url)) {
        return (
            assetStore.get(url)?.then(
                () => true,
                () => false
            ) ?? true
        );
    }
    await acquirePreload();
    if (!live()) {
        releasePreload();
        return null;
    }
    try {
        await idle();
        if (!live()) {
            return null;
        }
        await prefetchAsset(url);
        return true;
    } catch {
        return false;
    } finally {
        releasePreload();
    }
}

async function preloadText(url, live) {
    const ok = await preloadFile(url, live);
    if (!ok) {
        return ok;
    }
    const p = assetStore.get(url);
    return p ? (await p).text() : "";
}

async function preloadSpine(dir, skel, atlas, live) {
    const root = DATA_ROOT + dir + "/";
    const text = await preloadText(root + atlas, live);
    if (!text) {
        return text === "";
    }
    const res = await Promise.all(
        [skel, ...atlasPages(text).map((p) => p.name)].map((f) =>
            preloadFile(root + f, live)
        )
    );
    return res.every(Boolean);
}

async function preloadScene(dir, live) {
    const root = DATA_ROOT + dir + "/";
    const text = await preloadText(root + "scene.json", live);
    if (!text) {
        return text === "";
    }
    const doc = JSON.parse(text);
    const files = new Set(
        [...Object.values(doc.sprites), ...Object.values(doc.meshes)].map(
            (x) => x.file
        )
    );
    const res = await Promise.all([
        ...[...files].map((f) => preloadFile(root + f, live)),
        ...Object.values(doc.spine || {}).map((sp) =>
            preloadSpine(dir + "/" + sp.dir, sp.skeleton, sp.atlas, live)
        ),
    ]);
    return res.every(Boolean);
}

async function preloadSource(s, live) {
    const cached = s.kit
        ? textureCache.get(s.kit)
        : s.spine
          ? spineCache.get(s.spine)
          : sceneCache.get(s.scene);
    if (cached) {
        await cached;
        return (
            !failed.has(s.spine || s.scene) && (!s.kit || cached.value != null)
        );
    }
    if (s.kit) {
        return preloadFile(DATA_ROOT + "employee/" + s.kit, live);
    }
    if (s.spine) {
        return preloadSpine(s.spine, s.skel, s.atlas, live);
    }
    return preloadScene(s.scene, live);
}

function preloadNeighbors(id) {
    const order = sortedEntries().map((e) => e.id);
    const i = order.indexOf(id);
    const out = [];
    for (let d = 1; d < order.length; d++) {
        if (order[i + d]) {
            out.push(order[i + d]);
        }
        if (i - d >= 0) {
            out.push(order[i - d]);
        }
    }
    return out;
}

async function runPreload(g, id) {
    const live = () => g === preload.gen;
    const ids = [id, ...preloadNeighbors(id)];
    const pending = new Map(ids.map((k) => [k, []]));
    const sources = new Map(ids.map((k) => [k, entitySources(k)]));
    const finish = (k) =>
        Promise.all(pending.get(k)).then((ok) => {
            if (live() && ok.every(Boolean)) {
                preload.loaded.add(k);
                updateLoadedCount();
            }
        });
    try {
        for (const pass of [0, 1]) {
            for (const k of ids) {
                if (!live()) {
                    return;
                }
                if (
                    preload.loaded.has(k) ||
                    (pass === 1 && !sources.get(k)[1].length)
                ) {
                    continue;
                }
                for (const s of sources.get(k)[pass]) {
                    const p = preloadSource(s, live);
                    pending.get(k).push(p);
                    if (s.scene || s.spine) {
                        await p;
                    }
                    if (!live()) {
                        return;
                    }
                }
                if (pass === 1 || !sources.get(k)[1].length) {
                    finish(k);
                }
            }
        }
    } catch {}
}

// ---- selection helpers ----

function selKind() {
    if (state.sel === "employee" || state.sel === "clerk") {
        return state.sel;
    }
    return state.sel ? "abno" : null;
}

function currentEntity() {
    const k = selKind();
    if (k === "abno") {
        return DATA.entities.find((a) => a.id === state.sel) || null;
    }
    if (k) {
        return { id: k, name: k === "employee" ? "Employee" : "Clerk" };
    }
    return null;
}

function rigInfo(name) {
    const r = DATA.kit?.rigs[name];
    return r && !r.error ? r : null;
}

function rigAnims(name, group, extra = {}) {
    const r = rigInfo(name);
    if (!r?.animations) {
        return [];
    }
    const loopOf = {};
    for (const s of r.states || []) {
        if (s.clip && !(s.clip in loopOf)) {
            loopOf[s.clip] = [!!s.loop, s.speed || 1];
        }
    }
    return r.animations.map((a) => ({
        name: a,
        loop: loopOf[a]?.[0] ?? true,
        speed: loopOf[a]?.[1] ?? 1,
        rig: name,
        group: group ?? null,
        ...extra,
    }));
}

function groupedBase(name) {
    const list = rigAnims(name);
    const out = [];
    for (const g of EMP_ANIM_GROUPS) {
        for (const a of list) {
            if (out.includes(a)) {
                continue;
            }
            if (g.test(a.name)) {
                a.group = g.label;
                out.push(a);
            }
        }
    }
    for (const a of out) {
        if (ANIM_WEAPONS[a.name]) {
            a.weapons = ANIM_WEAPONS[a.name];
        }
    }
    const cannon = out.findIndex((a) => a.name === "Walk_Cannon");
    if (cannon >= 0 && out.some((a) => a.name === "Walk_Fist")) {
        const [a] = out.splice(cannon, 1);
        out.splice(
            out.findIndex((b) => b.name === "Walk_Fist"),
            0,
            a
        );
    }
    return out;
}

function equippedClass() {
    const k = selKind();
    if (k === "clerk") {
        return "officer";
    }
    return k === "employee" ? (currentWeapon()?.class ?? null) : null;
}

function animEnabled(a) {
    if (
        selKind() === "clerk" &&
        a?.group === "Attack" &&
        !a.weapons?.includes("officer")
    ) {
        return false;
    }
    if (a?.unavailable) {
        return false;
    }
    return !a?.weapons || a.weapons.includes(equippedClass());
}

function specialRigs() {
    const names = Object.keys(DATA.kit?.rigs || {}).filter(
        (n) =>
            rigInfo(n) && n !== "agent" && n !== "clerk" && !/Weapon$/.test(n)
    );
    const rank = (n) =>
        /Panic/.test(n) ? 0 : /CTRL$/.test(n) ? 1 : /Dead$/.test(n) ? 2 : 3;
    const sorted = names.sort(
        (a, b) => rank(a) - rank(b) || rigLabel(a).localeCompare(rigLabel(b))
    );
    const byLabel = new Map();
    for (const n of sorted) {
        const l = rigLabel(n);
        if (!byLabel.has(l)) {
            byLabel.set(l, []);
        }
        byLabel.get(l).push(n);
    }
    return [...byLabel.values()].flat();
}

function rigLabel(name) {
    if (RIG_LABELS[name]) {
        return RIG_LABELS[name];
    }
    const base = name
        .replace(/(Agent)?(CTRL|Dead|Use)$/, "")
        .replace(/Agent$/, "");
    const code = (RIG_ABNO[base] || base).toLowerCase();
    const abno = DATA.entities.find((e) => e.code?.toLowerCase() === code);
    return abno ? abno.name : spaced(base);
}

function currentWeapon() {
    return DATA.weapons.find((w) => w.id === state.weapon) || null;
}

let catalogCache = null;
function employeeCatalog() {
    if (catalogCache) {
        return catalogCache;
    }
    const base = groupedBase("agent");
    const variants = new Map();
    const spelling = new Map();
    const rigs = [
        ...new Set(
            DATA.weapons
                .map((w) => w.special_anim)
                .filter((r) => r && rigInfo(r))
        ),
    ];
    for (const r of rigs) {
        for (const s of rigInfo(r).states || []) {
            if (!s.clip) {
                continue;
            }
            const key = s.clip.toLowerCase();
            if (!variants.has(key)) {
                variants.set(key, new Map());
            }
            if (!variants.get(key).has(r)) {
                variants.get(key).set(r, {
                    clip: s.clip,
                    loop: !!s.loop,
                    speed: s.speed || 1,
                });
            }
            if (!spelling.has(key) || /^[a-z]/.test(spelling.get(key))) {
                spelling.set(key, s.clip);
            }
        }
    }
    const out = base.map((a) => {
        const key = a.name.toLowerCase();
        const v = variants.get(key) || null;
        return {
            key,
            name: v ? a.name + "*" : a.name,
            group: a.group,
            base: a,
            variants: v,
        };
    });
    const baseKeys = new Set(out.map((e) => e.key));
    const extra = [...variants.keys()].filter((k) => !baseKeys.has(k)).sort();
    for (const key of extra) {
        const v = variants.get(key);
        const name = spelling.get(key);
        const group = EMP_ANIM_GROUPS.find((g) => g.test(name)).label;
        const e = {
            key,
            name: v.size > 1 ? name + "*" : name,
            group,
            base: null,
            variants: v,
        };
        let i = out.findIndex((o) => o.group === group && o.key > key);
        if (i < 0) {
            i = out.findLastIndex((o) => o.group === group) + 1 || out.length;
        }
        out.splice(i, 0, e);
    }
    return (catalogCache = out);
}

function resolveForWeapon(catalog, weaponRig) {
    return catalog.map((e) => {
        const common = {
            name: e.name,
            key: e.key,
            group: e.group,
            gated: !e.base || !!e.base.weapons,
        };
        const v = weaponRig && e.variants?.get(weaponRig);
        if (v) {
            return {
                ...common,
                rig: weaponRig,
                clip: v.clip,
                loop: v.loop,
                speed: v.speed,
            };
        }
        if (e.base) {
            return {
                ...common,
                rig: "agent",
                clip: e.base.name,
                loop: e.base.loop,
                speed: e.base.speed,
                weapons: e.base.weapons,
            };
        }
        const [r, f] = e.variants.entries().next().value;
        return {
            ...common,
            rig: r,
            clip: f.clip,
            loop: f.loop,
            speed: f.speed,
            unavailable: true,
        };
    });
}

let animCache = { key: null, list: [] };
function currentAnims() {
    const k = selKind();
    const e = currentEntity();
    if (!e) {
        return [];
    }
    const key = [
        state.sel,
        state.part,
        state.weapon,
        !!DATA.kit,
        !!currentModelLoaded(),
    ].join("|");
    if (animCache.key === key) {
        return animCache.list;
    }
    let list = [];
    if (k === "abno") {
        const src = sceneSource();
        if (src) {
            const sc = sceneModel(src.dir);
            if (sc && !sc.error) {
                list = sc.parts()[src.part]?.anims || [];
            }
        } else {
            list = (e.parts[state.part]?.anims || []).map((a) => ({ ...a }));
        }
    } else if (k === "clerk") {
        list = groupedBase("clerk");
    } else if (DATA.kit) {
        const w = currentWeapon();
        list = resolveForWeapon(
            employeeCatalog(),
            w?.special_anim && rigInfo(w.special_anim) ? w.special_anim : null
        );
        for (const r of specialRigs()) {
            list = list.concat(rigAnims(r, rigLabel(r)));
        }
    }
    animCache = { key, list };
    return list;
}

function currentAnim() {
    return currentAnims()[state.anim] ?? null;
}

function defaultAnimIndex() {
    const k = selKind();
    const e = currentEntity();
    if (!e) {
        return -1;
    }
    if (k === "abno") {
        const src = sceneSource();
        if (!src) {
            const p = e.parts[state.part];
            const i = p ? p.anims.findIndex((a) => a.name === p.idle) : -1;
            return i >= 0 ? i : 0;
        }
        const sc = sceneModel(src.dir);
        return sc && !sc.error ? (sc.parts()[src.part]?.idle ?? 0) : 0;
    }
    const i = currentAnims().findIndex(
        (a) => (a.clip ?? a.name) === "Standing_1"
    );
    return Math.max(0, i);
}

function clampAnim() {
    const n = currentAnims().length;
    if (state.anim >= n) {
        state.anim = Math.max(0, defaultAnimIndex());
    }
}

function animDuration(a) {
    if (!a) {
        return 0;
    }
    if (a.dur != null) {
        return a.dur;
    }
    const m = currentModel();
    const an = m?.spine?.data.findAnimation(a.clip ?? a.name);
    return an ? an.duration : 0;
}

// ---- current model ----

function sceneSource() {
    const e = currentEntity();
    if (selKind() !== "abno" || !e) {
        return null;
    }
    if (e.kind === "scene") {
        return { dir: e.dir, part: state.part };
    }
    const p = e.parts[state.part];
    return p?.scene ? { dir: p.dir, part: 0 } : null;
}

function currentModelLoaded() {
    const src = sceneSource();
    return src ? sceneCache.get(src.dir)?.value : null;
}

function currentModel() {
    const k = selKind();
    const e = currentEntity();
    if (!e) {
        return null;
    }
    if (k === "abno") {
        const src = sceneSource();
        if (src) {
            const sc = sceneModel(src.dir);
            if (sc?.error) {
                return { error: sc.error };
            }
            return sc
                ? { ready: true, scene: sc, scenePart: src.part }
                : { loading: true };
        }
        {
            const p = e.parts[state.part];
            if (!p) {
                return null;
            }
            const m = spineModel(
                p.dir,
                "skeleton.json",
                "skeleton.atlas",
                true
            );
            if (m?.error) {
                return { error: m.error };
            }
            return m ? { ready: true, spine: m, part: p } : { loading: true };
        }
    }
    if (!DATA.kit) {
        return { loading: true };
    }
    const a = currentAnim();
    const rigName = a?.rig || (k === "clerk" ? "clerk" : "agent");
    const r = rigInfo(rigName);
    const m = spineModel("employee/" + r.dir, r.skeleton, r.atlas, false);
    if (m?.error) {
        return { error: m.error };
    }
    if (!m) {
        return { loading: true };
    }
    const dressed = ensureDressed(m, k);
    return dressed
        ? { ready: true, spine: m, employee: true }
        : { loading: true };
}

// ---- employee dressing ----

function basicSprite(region, sel) {
    const sets = DATA.kit.basic[region] || [];
    const [sid, idx] = sel || [0, 0];
    const s = sets.find((x) => x.id === sid);
    if (!s || !s.sprites.length) {
        const f = sets.find((x) => x.id === 0) || sets[0];
        return f?.sprites[0] || null;
    }
    return s.sprites[idx >= 0 && idx < s.sprites.length ? idx : 0];
}

function regionSelection(region) {
    const lk = FACE_REGION_LOOK[region];
    const sel = state.look[lk] || [0, 0];
    if (region === LOOK_PARTS.find((p) => p.key === lk)?.region) {
        return sel;
    }
    const sets = DATA.kit.basic[region] || [];
    const s = sets.find((x) => x.id === sel[0]);
    return s && sel[1] < s.sprites.length
        ? sel
        : [
              0,
              Math.min(
                  sel[1],
                  ((sets.find((x) => x.id === 0) || sets[0])?.sprites.length ||
                      1) - 1
              ),
          ];
}

function armorSheet(id) {
    return (
        DATA.kit.armor_sheets.find((s) => s.id === id) ||
        DATA.kit.armor_sheets[0]
    );
}

function selectedGifts() {
    return Object.values(state.gifts)
        .map((id) => DATA.giftById.get(id))
        .filter(Boolean);
}

function isSpecialRig(m) {
    return !["agent", "clerk"].some(
        (n) => "employee/" + DATA.kit.rigs[n]?.dir === m.dir
    );
}

function animFaceTimeline(m) {
    const a = currentAnim();
    if (!a) {
        return [];
    }
    const rig = a.rig || (selKind() === "clerk" ? "clerk" : "agent");
    const clip = a.clip ?? a.name;
    let face = ANIM_FACE_RIGS[rig] || (/Weapon$/.test(rig) ? "battle" : null);
    if (!face && (rig === "agent" || rig === "clerk")) {
        face = ANIM_FACE_CLIPS.find(([re]) => re.test(clip))?.[1] || null;
    }
    if (!face) {
        return [];
    }
    const out = [[0, face]];
    if (face === "panic") {
        const an = m.data.findAnimation(clip);
        const ev = an?.timelines
            .find((t) => t instanceof spine.EventTimeline)
            ?.events.find((e) => e.data.name === "Suicide");
        if (ev) {
            out.push([ev.time, "dead"]);
        }
    }
    return out;
}

function currentFace(m) {
    if (!state.animFace) {
        return state.look.expression;
    }
    const a = currentAnim();
    const t = a?.speed < 0 ? animDuration(a) - state.play.t : state.play.t;
    let face = "default";
    for (const [at, f] of animFaceTimeline(m)) {
        if (t >= at) {
            face = f;
        }
    }
    return face;
}

function faceFiles(face) {
    const R = DATA.kit.rules;
    return (R.face[face] || R.face.default)
        .map((r) => basicSprite(r.region, regionSelection(r.region))?.file)
        .filter(Boolean);
}

function dressPlan(kind, special, face = state.look.expression) {
    const kit = DATA.kit,
        R = kit.rules;
    const ch = [];
    const hair = state.look.hair;
    for (const r of R.hair) {
        ch.push({
            slot: r.slot,
            att: r.attachment,
            sprite: basicSprite(r.region, regionSelection(r.region)),
            tint: r.tint === "hair" ? hair : null,
        });
    }
    for (const r of R.face[face] || R.face.default) {
        ch.push({
            slot: r.slot,
            att: r.attachment,
            sprite: basicSprite(r.region, regionSelection(r.region)),
            tint: null,
            keepEmpty: r.slot === "Mouth",
        });
    }
    ch.push({
        slot: "EyeClose",
        att: "EyeClose",
        sprite: basicSprite("eye_closed", regionSelection("eye_closed")),
        tint: null,
    });
    const armorId =
        kind === "clerk"
            ? (R.clerk_armor[state.department.clerk] ?? R.clerk_armor.malkut)
            : (DATA.armors.find((a) => a.id === state.armor)?.armor_id ?? 0);
    const sheet = armorSheet(armorId);
    for (const r of R.armor) {
        const sp = sheet.sprites[r.sheet_index];
        if (sp) {
            ch.push({
                slot: r.slot,
                att: r.attachment,
                sprite: sp,
                tint: null,
            });
        }
    }
    const w = kind === "clerk" ? null : currentWeapon();
    if (w) {
        const cls = w.class;
        if (cls === "fist") {
            const sh = kit.weapon_sheets.find((s) => s.class === "fist");
            const n = parseInt(w.sprite, 10) || 0;
            const left = sh?.sprites[2 * n],
                right = sh?.sprites[2 * n + 1];
            if (left && right) {
                ch.push({
                    slot: "L Weapon",
                    att: "Weapon_Fist_Left",
                    sprite: left,
                });
                ch.push({
                    slot: "R Weapon",
                    att: "Weapon_Fist_Right",
                    sprite: right,
                });
            }
        } else if (R.weapon[cls]) {
            const sp = kit.weapon_sheets
                .filter((s) => s.class === cls)
                .flatMap((s) => s.sprites)
                .find((s) => s.name === w.sprite);
            if (sp) {
                ch.push({
                    slot: R.weapon[cls].slot,
                    att: R.weapon[cls].attachment,
                    sprite: sp,
                });
                if (cls !== "rifle") {
                    ch.push({
                        slot: "R Weapon",
                        att: "Weapon_Rifle",
                        sprite: null,
                        keepEmpty: true,
                    });
                }
            }
        }
    }
    if (kind === "employee") {
        for (const g of selectedGifts()) {
            if (g.type !== 1) {
                continue;
            }
            if (g.region === 2) {
                if (!special) {
                    ch.push({
                        slot: "Mouth",
                        att: "Mouth",
                        sprite: null,
                        keepEmpty: true,
                    });
                }
            } else if (g.region === 1) {
                if (face !== "panic" && face !== "dead") {
                    ch.push({
                        slot: "Eye",
                        att: "Eye",
                        sprite: g.sprite,
                        tint: "#ffffff",
                    });
                }
            } else {
                const slot = R.gifts.replace_slots[g.region];
                ch.push({ slot, att: slot, sprite: g.sprite, tint: null });
            }
        }
    }
    return ch.filter((c) => c.sprite || c.keepEmpty);
}

function hexColor(h) {
    const m = /^#?([0-9a-f]{6})$/i.exec(h || "");
    if (!m) {
        return new spine.Color(1, 1, 1, 1);
    }
    const n = parseInt(m[1], 16);
    return new spine.Color(
        ((n >> 16) & 255) / 255,
        ((n >> 8) & 255) / 255,
        (n & 255) / 255,
        1
    );
}

let lookVersion = 0;
function lookChanged() {
    lookVersion++;
}

function giftOffset(name) {
    for (const [pat, off] of Object.entries(
        DATA.kit.rules.gifts.sprite_offsets || {}
    )) {
        const re = new RegExp(
            "^" +
                pat
                    .split("*")
                    .map((x) => x.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
                    .join(".*") +
                "$"
        );
        if (re.test(name)) {
            return off;
        }
    }
    return [0, 0, 0];
}

function armbandSprite() {
    return (
        DATA.kit.symbol_sheets?.[state.serviceLevel - 1]?.sprites[
            state.department.employee
        ] || null
    );
}

function giftAdds(special, m) {
    const an = DATA.kit.rules.gifts.anchors.agent;
    const out = [];
    const armband = NO_ARMBAND_RIGS.has(m.dir) ? null : armbandSprite();
    const armbandAnchor = DATA.kit.rules.symbol?.anchor;
    if (armband && armbandAnchor) {
        out.push({
            g: { key: "armband", name: "Armband", sprite: armband },
            anchor: armbandAnchor,
            offset: [0, 0, 0],
        });
    }
    for (const g of selectedGifts()) {
        let anchor,
            offset = [0, 0, 0];
        if (isWeaponGift(g)) {
            out.push({ g, weapon: true });
            continue;
        }
        if (g.type === 1) {
            if (g.region !== 2 || special) {
                continue;
            }
            anchor = an.mouth_gift;
        } else {
            anchor = an.gift_pos[g.region] || an.gift_pos[0];
            offset = giftOffset(g.sprite.name);
        }
        if (anchor) {
            out.push({ g, anchor, offset });
        }
    }
    return out;
}

function buildGiftSlots(m, adds, special) {
    const rigScale = rigScaleOf(m) || 0.01;
    m.gifts = [];
    m.giftSpecial = special;
    for (const { g, anchor, offset, weapon } of adds) {
        if (weapon) {
            const w = weaponGiftSlot(m, g, rigScale);
            if (w) {
                m.gifts.push(w);
            }
            continue;
        }
        const bone = m.skeleton.findBone(anchor.bone);
        const tex = textureCache.get(g.sprite.file)?.value;
        if (!bone || !tex) {
            continue;
        }
        const [[a, b, c], [d, e, f]] = anchor.matrix;
        const [ox, oy, oz] = offset;
        const sx = Math.hypot(a, d);
        const sp = g.sprite;
        const [w, h] = sp.size;
        const ppu = sp.ppu || 100;
        const att = new spine.RegionAttachment("gift_" + g.key);
        att.x = (a * ox + b * oy + c) / rigScale;
        att.y = (d * ox + e * oy + f) / rigScale;
        att.rotation = (Math.atan2(d, a) * 180) / Math.PI;
        att.scaleX = sx;
        att.scaleY = (a * e - b * d) / sx;
        att.width = w / ppu / rigScale;
        att.height = h / ppu / rigScale;
        att.path = sp.name;
        att.setRegion(spriteRegion(sp, tex));
        att.updateOffset();
        const follow =
            g.key === "armband" ? m.skeleton.findSlot(ARMBAND_SLOT) : null;
        m.gifts.push({
            gift: true,
            key: "gift:" + g.key,
            name: g.name,
            bone,
            att,
            z: anchor.z + oz,
            follow,
        });
    }
}

function weaponGiftSlot(m, g, rigScale) {
    const si = m.data.findSlotIndex(GIFT_WEAPON.slot);
    const tex = textureCache.get(g.sprite.file)?.value;
    if (si < 0 || !tex) {
        return null;
    }
    const ref =
        m.orig.get(si + "\u0000" + GIFT_WEAPON.att)?.att ||
        m.data.defaultSkin.getAttachment(si, GIFT_WEAPON.att);
    if (!(ref instanceof spine.RegionAttachment)) {
        return null;
    }
    const sp = g.sprite;
    const [w, h] = sp.size;
    const ppu = sp.ppu || 100;
    const r = (ref.rotation * Math.PI) / 180,
        [dx, dy] = GIFT_WEAPON.shift;
    const att = new spine.RegionAttachment("gift_" + g.key);
    att.x = ref.x + (dx * Math.cos(r) - dy * Math.sin(r)) / rigScale;
    att.y = ref.y + (dx * Math.sin(r) + dy * Math.cos(r)) / rigScale;
    att.rotation = ref.rotation + GIFT_WEAPON.rotate;
    att.scaleX = ref.scaleX;
    att.scaleY = ref.scaleY;
    att.width = w / ppu / rigScale;
    att.height = h / ppu / rigScale;
    att.path = sp.name;
    att.setRegion(spriteRegion(sp, tex));
    att.updateOffset();
    return {
        gift: true,
        top: true,
        key: "gift:" + g.key,
        name: g.name,
        bone: m.skeleton.slots[si].bone,
        att,
        z: -Infinity,
    };
}

function giftDrawOrder(m) {
    const R = DATA.kit.rules.gifts;
    const eps = R.z_tie,
        partZ = R.anchors.agent.part_z;
    const byGap = new Map();
    const armband = m.skeleton.findSlot(ARMBAND_SLOT)
        ? m.gifts.find((g) => g.key === "gift:armband")
        : null;
    for (const g of [...m.gifts].sort((x, y) => y.z - x.z)) {
        if (g.top || g === armband) {
            continue;
        }
        let p = -1;
        if (m.giftSpecial) {
            p = g.z > eps ? -1 : partZ.length;
        } else {
            partZ.forEach((pz, k) => {
                if (pz >= g.z - eps) {
                    p = k;
                }
            });
        }
        if (!byGap.has(p)) {
            byGap.set(p, []);
        }
        byGap.get(p).push(g);
    }
    const seps = new Set(R.separator_slots);
    const out = [...(byGap.get(-1) || [])];
    let k = 0;
    for (const slot of m.skeleton.drawOrder) {
        if (seps.has(slot.data.name)) {
            out.push(...(byGap.get(k) || []));
            k++;
        }
        out.push(slot);
        if (armband && slot.data.name === ARMBAND_SLOT) {
            out.push(armband);
        }
    }
    for (const [p, list] of [...byGap].sort((x, y) => x[0] - y[0])) {
        if (p >= k) {
            out.push(...list);
        }
    }
    out.push(...m.gifts.filter((g) => g.top));
    return out;
}

function ensureDressed(m, kind) {
    const face = currentFace(m);
    const key = `${kind}|${lookVersion}|${face}`;
    if (m.dressedKey === key) {
        return true;
    }
    const special = isSpecialRig(m);
    const plan = dressPlan(kind, special, face);
    const adds =
        kind === "employee" && DATA.kit.rules.gifts ? giftAdds(special, m) : [];
    const files = [
        ...plan.filter((c) => c.sprite).map((c) => c.sprite.file),
        ...adds.map((a) => a.g.sprite.file),
    ];
    if (state.animFace) {
        for (const [, f] of animFaceTimeline(m)) {
            files.push(...faceFiles(f));
        }
    }
    const pending = files.map(kitTexture).filter((p) => !("value" in p));
    if (pending.length) {
        if (!m.dressWaiting) {
            m.dressWaiting = true;
            Promise.all(pending).then(() => {
                m.dressWaiting = false;
                renderAfterLoad();
            });
        }
        return m.dressedKey != null;
    }
    applyDress(m, plan);
    m.dressPlan = plan;
    buildGiftSlots(m, adds, special);
    m.dressedKey = key;
    return true;
}

function spriteRegion(sprite, tex) {
    const [w, h] = sprite.size;
    const [pvx, pvy] = sprite.pivot || [0.5, 0.5];
    const region = new spine.TextureAtlasRegion();
    region.texture = tex;
    region.name = sprite.name;
    region.u = 0;
    region.v = 0;
    region.u2 = 1;
    region.v2 = 1;
    region.x = 0;
    region.y = 0;
    region.width = w;
    region.height = h;
    region.originalWidth = w;
    region.originalHeight = h;
    region.offsetX = Math.round(w * (0.5 - pvx));
    region.offsetY = Math.round(h * (0.5 - pvy));
    region.rotate = false;
    return region;
}

function applyDress(m, plan) {
    const data = m.data;
    const skin = data.defaultSkin;
    const rigScale = rigScaleOf(m) || 0.01;
    for (const [k, o] of m.orig) {
        const [si, name] = k.split("\u0000");
        if (o.att instanceof spine.MeshAttachment) {
            o.att.region = o.region;
            o.att.updateUVs();
            o.att.color.setFromColor(o.color);
        }
        skin.addAttachment(+si, name, o.att);
    }
    for (const c of plan) {
        const si = data.findSlotIndex(c.slot);
        if (si < 0) {
            continue;
        }
        const k = si + "\u0000" + c.att;
        const orig = m.orig.get(k)?.att || skin.getAttachment(si, c.att);
        if (!orig) {
            continue;
        }
        if (!m.orig.has(k)) {
            const color = new spine.Color();
            color.setFromColor(orig.color);
            m.orig.set(k, { att: orig, region: orig.region, color });
        }
        if (!c.sprite) {
            delete skin.attachments[si][c.att];
            continue;
        }
        const tex = textureCache.get(c.sprite.file)?.value;
        if (!tex) {
            continue;
        }
        const [w, h] = c.sprite.size;
        const region = spriteRegion(c.sprite, tex);
        const color = c.tint ? hexColor(c.tint) : new spine.Color(1, 1, 1, 1);
        if (orig instanceof spine.RegionAttachment) {
            const ppu = c.sprite.ppu || 100;
            const na = new spine.RegionAttachment(c.att);
            na.x = orig.x;
            na.y = orig.y;
            na.rotation = orig.rotation;
            na.scaleX = orig.scaleX;
            na.scaleY = orig.scaleY;
            na.width = w / ppu / rigScale;
            na.height = h / ppu / rigScale;
            na.path = c.sprite.name;
            na.color.setFromColor(color);
            na.setRegion(region);
            na.updateOffset();
            skin.addAttachment(si, c.att, na);
        } else if (orig instanceof spine.MeshAttachment) {
            orig.region = region;
            orig.updateUVs();
            orig.color.setFromColor(color);
        }
    }
}

function rigScaleOf(m) {
    const r = Object.values(DATA.kit.rigs).find(
        (r) => "employee/" + r.dir === m.dir
    );
    return r?.scale;
}

// ---- left panel ----

function allEntries() {
    return [
        { id: "employee", name: "Employee", group: "nugget", code: "" },
        { id: "clerk", name: "Clerk", group: "nugget", code: "" },
        ...DATA.entities,
    ];
}

function sortedEntries() {
    const all = allEntries();
    return LIST_GROUPS.flatMap((g) =>
        all
            .filter((e) => e.group === g.key)
            .sort((a, b) =>
                a.name.localeCompare(b.name, "en", {
                    sensitivity: "base",
                    numeric: true,
                })
            )
    );
}

function listEntries() {
    const q = state.filter.text.trim().toLowerCase();
    return sortedEntries().filter((e) => {
        return (
            !q ||
            e.name.toLowerCase().includes(q) ||
            e.code.toLowerCase().includes(q)
        );
    });
}

function highlight(text, q) {
    const frag = document.createDocumentFragment();
    const i = q ? text.toLowerCase().indexOf(q) : -1;
    if (i < 0) {
        frag.append(text);
        return frag;
    }
    frag.append(
        text.slice(0, i),
        el("mark", { textContent: text.slice(i, i + q.length) }),
        text.slice(i + q.length)
    );
    return frag;
}

function renderList() {
    const nav = $("#list");
    nav.replaceChildren();
    const q = state.filter.text.trim().toLowerCase();
    const entries = listEntries();
    for (const g of LIST_GROUPS) {
        const items = entries.filter((e) => e.group === g.key);
        if (!items.length) {
            continue;
        }
        const wrap = el("div", {
            className:
                "group" +
                (state.collapsed.has(g.key) && !q ? " collapsed" : ""),
        });
        const head = el(
            "button",
            { className: "group-head" },
            el("span", { className: "caret", textContent: "▾" }),
            g.label,
            el("span", { className: "n", textContent: items.length })
        );
        head.onclick = () => {
            wrap.classList.toggle("collapsed");
            state.collapsed[
                wrap.classList.contains("collapsed") ? "add" : "delete"
            ](g.key);
            store.set("collapsed", [...state.collapsed]);
        };
        const box = el("div", { className: "group-items" });
        for (const e of items) {
            const b = el(
                "button",
                { className: "item" + (e.id === state.sel ? " active" : "") },
                el("span", { className: "nm" }, highlight(e.name, q))
            );
            b.dataset.id = e.id;
            b.onclick = () => select(e.id);
            box.append(b);
        }
        wrap.append(head, box);
        nav.append(wrap);
    }
    $("#list-count").textContent = q
        ? `${entries.length} match${entries.length === 1 ? "" : "es"}`
        : `${entries.length} prefabs`;
}

function select(id) {
    if (id !== state.sel) {
        clearLayerToggles();
    }
    state.sel = id;
    state.part = 0;
    state.skin = null;
    animCache.key = null;
    state.anim = Math.max(0, defaultAnimIndex());
    resetPlayback();
    syncUrl();
    renderAll();
    restartPreload();
}

function moveSelection(d) {
    const order = listEntries().map((e) => e.id);
    if (!order.length) {
        return;
    }
    const i = order.indexOf(state.sel);
    const next =
        order[
            i < 0
                ? d > 0
                    ? 0
                    : order.length - 1
                : Math.max(0, Math.min(order.length - 1, i + d))
        ];
    if (next === state.sel) {
        return;
    }
    select(next);
    $(`.item[data-id="${next}"]`)?.scrollIntoView({ block: "nearest" });
}

// ---- title, animation dropdown, playbar ----

function renderTitle() {
    const e = currentEntity();
    $("#entity-title").textContent = e ? e.name : "Nothing selected";
    $("#empty").hidden = !!e;
}

function currentParts() {
    const e = currentEntity();
    return selKind() === "abno" && e ? abnoParts(e) : [];
}

function menuOption(name, value, label, onPick) {
    const r = el("input", { type: "radio", name, value });
    r.onchange = () => {
        onPick();
        r.blur();
    };
    return el(
        "label",
        { className: "menu-opt" },
        r,
        el("span", { textContent: label })
    );
}

let animMenuKey = null;
function renderAnims() {
    const anims = currentAnims();
    const parts = currentParts();
    const key = [animCache.key, parts.length].join("|");
    if (key !== animMenuKey) {
        animMenuKey = key;
        const groups = [];
        if (parts.length > 1) {
            groups.push({
                title: "Part",
                opts: parts.map((p, i) =>
                    menuOption("part", i, p.name, () => selectPart(i))
                ),
            });
        }
        anims.forEach((a, i) => {
            const title = a.group || "Animation";
            if (groups.at(-1)?.title !== title) {
                groups.push({ title, opts: [] });
            }
            groups
                .at(-1)
                .opts.push(menuOption("anim", i, a.name, () => selectAnim(i)));
        });
        $("#anim-menu").replaceChildren(
            el(
                "div",
                { className: "menu-cols" },
                ...groups.map((g) =>
                    el(
                        "div",
                        { className: "menu-section" },
                        el("h4", { textContent: g.title }),
                        ...g.opts
                    )
                )
            )
        );
    }
    renderAnimState();
    $("#anims").hidden = !anims.length;
    $("#anim-section").hidden = !anims.length;
    if (!anims.length) {
        $("#anims").open = false;
    }
    $("#playbar").classList.toggle("disabled", !anims.length);
    $("#export-all").disabled = !anims.length || exportBusy;
}

function renderAnimState() {
    const anims = currentAnims();
    for (const r of $$('#anim-menu input[name="anim"]')) {
        r.checked = +r.value === state.anim;
        r.disabled = !animEnabled(anims[+r.value]);
    }
    for (const r of $$('#anim-menu input[name="part"]')) {
        r.checked = +r.value === state.part;
    }
    const parts = currentParts();
    $("#part-value").textContent =
        parts.length > 1 ? (parts[state.part]?.name ?? "") : "Default*";
    const a = currentAnim();
    $("#anim-value").textContent = a
        ? selKind() !== "abno" && a.group
            ? `${a.group} / ${a.name}`
            : a.name
        : "";
}

function selectPart(i) {
    state.part = i;
    state.skin = null;
    animCache.key = null;
    clearLayerToggles();
    state.anim = Math.max(0, defaultAnimIndex());
    resetPlayback();
    renderAnims();
    renderLayers();
    renderAbnoOptions();
}

function selectAnim(i) {
    const prevRig = currentAnim()?.rig;
    const prevSkin = abnoSkin(currentModel());
    const prevExtras = animExtras();
    state.anim = i;
    renderAnimState();
    resetPlayback();
    renderTitle();
    const skinChanged = abnoSkin(currentModel()) !== prevSkin;
    const extrasChanged = prevExtras !== animExtras();
    if (currentAnim()?.rig !== prevRig || skinChanged || extrasChanged) {
        renderLayers();
    }
    if (skinChanged) {
        renderAbnoOptions();
    }
}

function animExtras() {
    const a = currentAnim();
    return a?.show || a?.follow ? JSON.stringify([a.show, a.follow]) : null;
}

function abnoSkin(m) {
    if (state.skin) {
        return state.skin;
    }
    if (!m?.part) {
        return null;
    }
    const a = currentAnim();
    const hit =
        a &&
        m.part.animSkins?.find(([prefix]) =>
            (a.clip ?? a.name).startsWith(prefix)
        );
    return hit?.[1] || m.part.skin || null;
}

function resetPlayback() {
    state.play.t = 0;
    state.play.ended = false;
}

function updatePlaybar() {
    const dur = animDuration(currentAnim());
    $("#time").textContent = `${state.play.t.toFixed(2)} / ${dur.toFixed(2)} s`;
    $("#scrub").value = dur ? Math.round((state.play.t / dur) * 1000) : 0;
    const showPause = state.play.playing && !state.play.ended;
    $("#play").innerHTML = showPause ? "&#10074;&#10074;" : "&#9654;";
    $("#loop").setAttribute("aria-pressed", state.play.loop);
}

function togglePlay() {
    const p = state.play;
    if (p.ended) {
        p.t = 0;
        p.ended = false;
        p.playing = true;
        return;
    }
    p.playing = !p.playing;
}

function step(d) {
    const a = currentAnim();
    if (!a) {
        return;
    }
    state.play.playing = false;
    state.play.ended = false;
    state.play.t = Math.max(
        0,
        Math.min(animDuration(a), state.play.t + d / 30)
    );
}

// ---- layers panel ----

function regionThumb(region) {
    const img = region?.texture?.getImage?.();
    if (!img) {
        return null;
    }
    const [kx, ky] = region.texture.thumbScale || [1, 1];
    const rw = (region.rotate ? region.height : region.width) * kx,
        rh = (region.rotate ? region.width : region.height) * ky;
    const x = (region.x ?? Math.round(region.u * img.width)) * kx,
        y = (region.y ?? Math.round(region.v * img.height)) * ky;
    const size = 32;
    const c = el("canvas", {
        width: size,
        height: size,
        className: "lp-thumb",
    });
    const g = c.getContext("2d");
    const s = Math.min(
        size / (region.rotate ? rh : rw),
        size / (region.rotate ? rw : rh)
    );
    g.translate(size / 2, size / 2);
    if (region.rotate) {
        g.rotate(-Math.PI / 2);
    }
    try {
        g.drawImage(
            img,
            x,
            y,
            rw,
            rh,
            (-rw * s) / 2,
            (-rh * s) / 2,
            rw * s,
            rh * s
        );
    } catch {}
    return c;
}

function currentLayers() {
    const m = currentModel();
    if (!m?.ready) {
        return [];
    }
    if (m.scene) {
        return m.scene.layers(sceneAnimator(m));
    }
    const data = m.spine.data;
    const skin = data.defaultSkin;
    const skinName = abnoSkin(m);
    const extraSkin = skinName ? data.findSkin(skinName) : null;
    const rows = [];
    const dressed = (name) =>
        m.spine.dressPlan?.find((c) => c.slot === name && c.sprite)?.att;
    data.slots.forEach((sd, i) => {
        const atts = [
            ...Object.values(skin?.attachments[i] || {}),
            ...Object.values(extraSkin?.attachments[i] || {}),
        ];
        if (!atts.length) {
            return;
        }
        const name = sd.attachmentName || dressed(sd.name);
        const setup =
            (name &&
                (extraSkin?.getAttachment(i, name) ||
                    skin?.getAttachment(i, name))) ||
            atts[0];
        rows.push({
            key: i,
            order: i,
            name: sd.name,
            region: setup?.region,
            off: partHides(m, sd.name),
        });
    });
    for (const f of followers(m)) {
        const at = rows.findIndex((r) => r.name === f.after);
        rows.splice(at + 1, 0, {
            key: f.key,
            order: f.key,
            name: f.name,
            region: f.att.region,
        });
    }
    if (!m.employee || !m.spine.gifts?.length) {
        return rows;
    }
    const slotRow = new Map(rows.map((r) => [r.key, r]));
    let at = 0;
    for (const o of giftDrawOrder(m.spine)) {
        if (o.gift) {
            rows.splice(at++, 0, {
                key: o.key,
                order: o.key,
                name: o.name,
                region: o.att.region,
            });
        } else if (slotRow.has(o.data.index)) {
            at = rows.indexOf(slotRow.get(o.data.index)) + 1;
        }
    }
    return rows;
}

function renderLayers() {
    const layers = currentLayers();
    $("#layers-toggle").textContent = `Layers (${layers.length})`;
    $("#layers-count").textContent = layers.length ? `(${layers.length})` : "";
    const list = $("#layers-list");
    list.replaceChildren();
    let n = 0;
    const num = new Map(layers.map((l) => [l, ++n]));
    for (const l of [...layers].reverse()) {
        const box = el("input", { type: "checkbox", checked: layerOn(l) });
        box.onchange = () => {
            setLayerOn(l, box.checked);
            syncLayersAll();
        };
        let thumb;
        if (l.thumb?.url) {
            thumb = el("img", {
                className: "lp-thumb",
                src: l.thumb.url,
                loading: "lazy",
                alt: "",
            });
        } else {
            thumb =
                regionThumb(l.region) ||
                el("span", { className: "lp-thumb ph" });
        }
        const row = el(
            "label",
            { className: "lp-row" },
            box,
            thumb,
            el("span", { className: "lp-order mono", textContent: num.get(l) })
        );
        list.append(el("li", {}, row));
    }
    syncLayersAll();
}

function clearLayerToggles() {
    state.hiddenLayers.clear();
    state.shownLayers.clear();
}

function layerOn(l) {
    return l.off
        ? state.shownLayers.has(l.key)
        : !state.hiddenLayers.has(l.key);
}

function setLayerOn(l, on) {
    const set = l.off ? state.shownLayers : state.hiddenLayers;
    if (on === !!l.off) {
        set.add(l.key);
    } else {
        set.delete(l.key);
    }
}

function syncLayersAll() {
    const all = $("#layers-all");
    const layers = currentLayers();
    const hidden = layers.filter((l) => !layerOn(l)).length;
    all.disabled = !layers.length;
    all.checked = hidden === 0;
    all.indeterminate = hidden > 0 && hidden < layers.length;
}

function toggleAllLayers() {
    const layers = currentLayers();
    const allVisible = layers.every(layerOn);
    for (const l of layers) {
        setLayerOn(l, !allVisible);
    }
    renderLayers();
}

function setLayersOpen(open) {
    $("#layers-popover").hidden = !open;
    $("#layers-toggle").setAttribute("aria-expanded", open);
}

// ---- right panel ----

function renderOptions() {
    const k = selKind();
    const off = k !== "employee";
    const opts = $("#employee-options");
    opts.classList.toggle("disabled-block", off);
    opts.inert = off;
    const gifts = $("#gift-controls");
    const giftsOff = off || !DATA.giftGroups.length;
    gifts.classList.toggle("disabled-block", giftsOff);
    gifts.inert = giftsOff;
    $("#abno-options").hidden = k !== "abno";
    renderDepartment(k);
    if (DATA.kit) {
        renderEmployeeOptions();
    }
    if (k === "abno") {
        renderAbnoOptions();
    }
    renderExport();
}

function renderDepartment(k) {
    const block = $("#department-options");
    const off = k !== "employee" && k !== "clerk";
    block.classList.toggle("disabled-block", off);
    block.inert = off;
    if (off || !DATA.kit) {
        return;
    }
    const clerk = k === "clerk";
    const sheet = DATA.kit.symbol_sheets?.[0]?.sprites || {};
    const usable = (d) =>
        clerk ? d in DATA.kit.rules.clerk_armor : d === "none" || d in sheet;
    const items = [{ key: "none", label: "None" }, ...DEPARTMENTS];
    const sel = $("#department");
    sel.replaceChildren(
        ...items.map((d) =>
            el("option", {
                value: d.key,
                textContent: d.label,
                disabled: !usable(d.key),
            })
        )
    );
    sel.value = state.department[k];
    const lv = $("#service-level");
    if (!lv.options.length) {
        fillSelect(
            lv,
            (DATA.kit.symbol_sheets || []).map((s) => ({
                id: s.level,
                name: String(s.level),
            })),
            state.serviceLevel
        );
    }
    lv.value = state.serviceLevel;
    const lvOff = clerk || state.department.employee === "none";
    lv.disabled = lvOff;
    lv.closest(".field").classList.toggle("disabled-block", lvOff);
}

const openParts = {};

function partSprites(region) {
    return (DATA.kit.basic[region] || []).flatMap((s) =>
        s.sprites.map((sp, i) => ({ sel: [s.id, i], sp }))
    );
}

function renderEmployeeOptions() {
    for (const b of $$("#expression button")) {
        b.setAttribute("aria-pressed", b.dataset.v === state.look.expression);
    }
    $("#anim-face").checked = state.animFace;
    $("#expression").classList.toggle("disabled-block", state.animFace);
    for (const b of $$(".color-item")) {
        b.querySelector(".color-fill").style.background =
            state.look[b.dataset.color];
        b.setAttribute("aria-pressed", state.editingColor === b.dataset.color);
    }
    renderColorEditor();

    const parts = $("#parts");
    parts.replaceChildren();
    for (const p of LOOK_PARTS) {
        const all = partSprites(p.region);
        const cur = state.look[p.key];
        const ci = all.findIndex(
            (x) => x.sel[0] === cur[0] && x.sel[1] === cur[1]
        );
        const d = el(
            "details",
            {},
            el(
                "summary",
                {},
                p.label,
                el("span", {
                    className: "val muted small",
                    textContent: `${ci} / ${all.length - 1}`,
                })
            )
        );
        const body = el("div", { className: "part-body" });
        const grid = el("div", { className: "thumbs" });
        d.ontoggle = () => {
            openParts[p.key] = d.open;
            if (d.open && !grid.childElementCount) {
                fillThumbs();
            }
        };
        const fillThumbs = () => {
            all.forEach((x, i) => {
                const t = el(
                    "button",
                    { className: "thumb", ariaLabel: x.sp.name },
                    el("img", {
                        src: DATA_ROOT + "employee/" + x.sp.file,
                        loading: "lazy",
                        alt: "",
                    }),
                    el("span", { className: "n", textContent: i })
                );
                t.setAttribute("aria-pressed", i === ci);
                t.onclick = () => {
                    state.look[p.key] = x.sel;
                    lookChanged();
                    renderEmployeeOptions();
                };
                grid.append(t);
            });
        };
        body.append(grid);
        d.append(body);
        d.open = !!openParts[p.key];
        if (d.open) {
            fillThumbs();
        }
        parts.append(d);
    }

    fillSelect(
        $("#armor"),
        DATA.armors.map((a) => ({ id: a.id, name: a.name })),
        state.armor
    );
    fillSelect(
        $("#weapon"),
        [
            { id: "", name: "None" },
            ...DATA.weapons.map((w) => ({ id: w.id, name: w.name })),
        ],
        state.weapon ?? ""
    );
    renderGiftValues();
}

function giftName(g) {
    if (GIFT_NAMES[g.id]) {
        return GIFT_NAMES[g.id];
    }
    if (g.name && !/_name$/.test(g.name)) {
        return g.name;
    }
    return spaced(
        (g.key || g.sprite || String(g.id)).replace(/(_gift)?_name$/, "")
    );
}

function prepareGifts(kit) {
    const R = kit.rules.gifts;
    DATA.giftGroups = [];
    DATA.giftById = new Map();
    if (!R) {
        return;
    }
    const groups = new Map();
    for (const g of kit.equipment.gifts || []) {
        const type = GIFT_TYPES.indexOf((g.attach_type || "").toLowerCase());
        if (type < 0 || g.region == null || !g.file) {
            continue;
        }
        if (type === 1 && !(g.region in R.replace_slots)) {
            continue;
        }
        const sprite = kit.gift_sheets
            .filter((s) => s.region === g.region)
            .flatMap((s) => s.sprites)
            .find((sp) => sp.name === g.sprite);
        if (!sprite) {
            continue;
        }
        const merged =
            GIFT_MERGED_REGIONS.has(g.region) &&
            !isWeaponGift({ type, region: g.region });
        const key = merged ? String(g.region) : `${type}:${g.region}`;
        const regionLabel =
            GIFT_REGION_LABELS[g.attach_pos] || spaced(g.attach_pos);
        if (!groups.has(key)) {
            groups.set(key, {
                key,
                type: merged ? 0 : type,
                region: g.region,
                label:
                    GIFT_GROUP_LABELS[key] ||
                    regionLabel + (merged ? "" : GIFT_TYPE_SUFFIX[type]),
                byName: new Map(),
            });
        }
        const grp = groups.get(key);
        const name = giftName(g);
        const prev = grp.byName.get(name);
        if (!prev || g.id < prev.id) {
            grp.byName.set(name, {
                id: g.id,
                key,
                type,
                region: g.region,
                name,
                sprite,
            });
        }
    }
    const tail = (k) => {
        const i = GIFT_GROUP_TAIL.indexOf(k);
        return i < 0 ? -1 : i;
    };
    DATA.giftGroups = [...groups.values()]
        .sort(
            (a, b) =>
                tail(a.key) - tail(b.key) ||
                a.region - b.region ||
                a.type - b.type
        )
        .map(({ byName, ...grp }) => {
            const gifts = [...byName.values()].sort((a, b) =>
                a.name.localeCompare(b.name)
            );
            for (const g of gifts) {
                DATA.giftById.set(g.id, g);
            }
            return { ...grp, gifts };
        });
}

function buildGifts() {
    const box = $("#gifts");
    box.replaceChildren();
    for (const grp of DATA.giftGroups) {
        const sel = el(
            "select",
            {},
            el("option", { value: "", textContent: "None" })
        );
        for (const g of grp.gifts) {
            sel.append(el("option", { value: g.id, textContent: g.name }));
        }
        sel.dataset.key = grp.key;
        sel.onchange = () => {
            if (sel.value === "") {
                delete state.gifts[grp.key];
            } else {
                state.gifts[grp.key] = +sel.value;
            }
            giftsChanged();
        };
        box.append(el("label", { className: "field" }, grp.label, sel));
    }
}

function renderGiftValues() {
    for (const sel of $$("#gifts select")) {
        sel.value = state.gifts[sel.dataset.key] ?? "";
    }
    const n = Object.keys(state.gifts).length;
    $("#gift-count").textContent = n ? `(${n})` : "";
}

function giftsChanged() {
    lookChanged();
    renderGiftValues();
    renderLayers();
}

function randomizeGifts() {
    state.gifts = {};
    for (const grp of DATA.giftGroups) {
        if (Math.random() < 0.5 || !grp.gifts.length) {
            continue;
        }
        state.gifts[grp.key] =
            grp.gifts[Math.floor(Math.random() * grp.gifts.length)].id;
    }
    giftsChanged();
}

function cssColor(c) {
    const g = el("canvas").getContext("2d");
    g.fillStyle = c;
    return g.fillStyle;
}

const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbToHex = (rgb) =>
    "#" + rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");

function buildColorRows() {
    const box = $("#ce-rows");
    box.textContent = "";
    box.append(el("div", { className: "ce-group", textContent: "RGB" }));
    ["R", "G", "B"].forEach((label, i) => {
        const range = el("input", {
            type: "range",
            className: "ce-track",
            min: 0,
            max: 255,
            step: 1,
        });
        const num = el("input", { type: "number", min: 0, max: 255, step: 1 });
        range.setAttribute("aria-label", label);
        num.setAttribute("aria-label", label);
        const commit = (raw) => {
            const n = Math.min(255, Math.max(0, Math.round(Number(raw))));
            if (!Number.isFinite(n)) {
                return;
            }
            const rgb = hexToRgb(state.look[state.editingColor]);
            rgb[i] = n;
            setColor(state.editingColor, rgbToHex(rgb));
        };
        range.addEventListener("input", () => commit(range.value));
        num.addEventListener("input", () => {
            if (num.value !== "") {
                commit(num.value);
            }
        });
        num.addEventListener("blur", () => renderColorEditor());
        const row = el(
            "div",
            { className: "ce-row" },
            el("span", { textContent: label }),
            range,
            num
        );
        row.dataset.i = i;
        box.append(row);
    });
}

function renderColorEditor() {
    const k = state.editingColor;
    $("#color-editor").hidden = !k;
    if (!k) {
        return;
    }
    const hexIn = $("#ce-hex");
    if (document.activeElement !== hexIn) {
        hexIn.value = state.look[k].toUpperCase();
        hexIn.classList.remove("invalid");
    }
    const rgb = hexToRgb(state.look[k]);
    const css = (c) => `rgb(${c.join(",")})`;
    for (const row of $$("#ce-rows .ce-row")) {
        const i = +row.dataset.i;
        const [range, num] = row.querySelectorAll("input");
        const at = (c) => css(rgb.map((x, j) => (j === i ? c : x)));
        range.value = rgb[i];
        range.style.background = `linear-gradient(to right, ${at(0)}, ${at(255)})`;
        if (document.activeElement !== num) {
            num.value = rgb[i];
        }
    }
}

function setColor(k, v) {
    state.look[k] = v;
    lookChanged();
    renderEmployeeOptions();
}

function abnoParts(e) {
    if (e.kind === "spine") {
        return e.parts.map((p) => ({ name: p.name }));
    }
    const sc = sceneModel(e.dir);
    return sc && !sc.error ? sc.parts().map((p) => ({ name: p.name })) : [];
}

function renderAbnoOptions() {
    const m = currentModel();
    const skins = m?.spine ? m.spine.data.skins.map((s) => s.name) : [];
    $("#skin-section").hidden = skins.length < 2;
    if (skins.length > 1) {
        fillSelect(
            $("#skin"),
            skins.map((s) => ({ id: s, name: s })),
            abnoSkin(m) || "default"
        );
    }
}

function fillSelect(s, items, value) {
    s.replaceChildren(
        ...items.map((i) => el("option", { value: i.id, textContent: i.name }))
    );
    s.value = value;
}

function renderExport() {
    for (const b of $$("#exp-kind button")) {
        b.setAttribute("aria-pressed", b.dataset.v === state.expKind);
    }
    const formats =
        state.expKind === "still"
            ? [
                  ["png", "PNG"],
                  ["webp", "WebP"],
                  ["jpeg", "JPEG"],
              ]
            : [
                  ["webm", "WebM"],
                  ["apng", "APNG"],
                  ["gif", "GIF"],
                  ["frames", "PNG frames (.zip)"],
              ];
    const fmt = $("#exp-format");
    const prev = fmt.value;
    fillSelect(
        fmt,
        formats.map(([id, name]) => ({ id, name })),
        formats.some((f) => f[0] === prev) ? prev : formats[0][0]
    );
    $("#exp-fps-field").hidden = state.expKind === "still";
    fillFps(fmt.value === "gif");
    $("#exp-bg-color-field").hidden = $("#exp-bg").value !== "color";
    $("#copy").hidden = state.expKind !== "still";
    $("#export-all").hidden = state.expKind !== "anim";
    const b = measure();
    const sc = exportScalePct / 100;
    const pad = Math.max(0, +$("#exp-pad").value || 0);
    const a = currentAnim();
    $("#exp-info").textContent = b
        ? `${Math.ceil((b.maxX - b.minX) * sc) + pad * 2} x ${Math.ceil((b.maxY - b.minY) * sc) + pad * 2} px${a && state.expKind === "anim" ? `, ${frameTimes(a, exportFps()).length} frames` : ""}`
        : "";
}

const EXPORT_SCALE_MIN = 10,
    EXPORT_SCALE_MAX = 990;
let exportScalePct = 100;

function setExportScale(pct) {
    exportScalePct = Math.min(
        EXPORT_SCALE_MAX,
        Math.max(EXPORT_SCALE_MIN, Math.round(pct))
    );
    $("#exp-scale-range").value = exportScalePct;
    $("#exp-scale").value = exportScalePct + "%";
    renderExport();
}

function initExportScale() {
    const range = $("#exp-scale-range"),
        txt = $("#exp-scale");
    range.addEventListener("input", () => setExportScale(+range.value));
    txt.addEventListener("focus", () => txt.select());
    txt.addEventListener("change", () => {
        const n = parseFloat(txt.value.replace(/[^\d.]/g, ""));
        setExportScale(Number.isFinite(n) ? n : exportScalePct);
    });
    txt.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            txt.blur();
        }
        if (e.key === "Escape") {
            txt.value = exportScalePct + "%";
            txt.blur();
        }
    });
    txt.addEventListener("blur", () => {
        txt.value = exportScalePct + "%";
    });
}

// ---- posing & drawing ----

function poseModel(m) {
    const a = currentAnim();
    const t = a?.speed < 0 ? animDuration(a) - state.play.t : state.play.t;
    if (m.scene) {
        const parts = m.scene.parts();
        const p = parts[m.scenePart];
        m.scene.pose(
            p ? p.animator : -1,
            a && a.clip
                ? { clip: a.clip, loop: state.play.loop, speed: a.speed }
                : null,
            t
        );
        return;
    }
    const sk = m.spine.skeleton;
    const skinName = abnoSkin(m);
    const want = skinName && m.spine.data.findSkin(skinName) ? skinName : null;
    if ((sk.skin?.name || null) !== want) {
        sk.setSkin(null);
        if (want) {
            sk.setSkinByName(want);
        }
    }
    sk.setToSetupPose();
    const an = a ? m.spine.data.findAnimation(a.clip ?? a.name) : null;
    const chain = [];
    const prev = m.employee && an && RIG_PREVIOUS[a.rig];
    for (let n = prev?.[an.name]; n; n = prev[n]) {
        chain.unshift(m.spine.data.findAnimation(n));
    }
    for (const p of chain) {
        p?.apply(
            sk,
            0,
            p.duration,
            false,
            null,
            1,
            spine.MixPose.current,
            spine.MixDirection.in
        );
    }
    if (an) {
        an.apply(
            sk,
            0,
            t,
            false,
            null,
            1,
            chain.length ? spine.MixPose.current : spine.MixPose.setup,
            spine.MixDirection.in
        );
    }
    if (m.employee) {
        showWalkingWeapon(sk, a);
    }
    sk.updateWorldTransform();
}

function showWalkingWeapon(sk, a) {
    if (
        selKind() !== "employee" ||
        a?.rig !== "agent" ||
        !WALKING_WEAPON_ANIMS.has(a.clip)
    ) {
        return;
    }
    const cls = currentWeapon()?.class;
    const key = WALKING_WEAPON_CLASSES.has(cls) && DATA.kit.rules.weapon[cls];
    if (!key) {
        return;
    }
    const si = sk.data.findSlotIndex(key.slot);
    const att = si >= 0 ? sk.getAttachment(si, key.attachment) : null;
    if (att) {
        sk.slots[si].setAttachment(att);
    }
}

function sceneAnimator(m) {
    return m.scene.parts()[m.scenePart]?.animator ?? -1;
}

function drawModel(m, d) {
    if (m.scene) {
        m.scene.draw(
            d,
            state.hiddenLayers,
            state.shownLayers,
            sceneAnimator(m)
        );
    } else {
        d.skeleton(m.spine.skeleton, {
            hidden: spineHidden(m),
            tint: partTint(m),
            order:
                m.employee && m.spine.gifts?.length
                    ? giftDrawOrder(m.spine)
                    : followerDrawOrder(m),
        });
    }
}

function partHides(m, name) {
    return (
        !!m.part?.hide?.includes(name) && !currentAnim()?.show?.includes(name)
    );
}

function followers(m) {
    const list = m.part && currentAnim()?.follow;
    if (!list) {
        return [];
    }
    const sk = m.spine.skeleton;
    return list
        .map((f, i) => {
            const bone = sk.findBone(f.bone);
            const si = sk.data.findSlotIndex(f.slot);
            const src =
                si >= 0
                    ? sk.data.defaultSkin.getAttachment(si, f.attachment)
                    : null;
            if (!bone || !src) {
                return null;
            }
            m.spine.followAtts ??= new Map();
            let att = m.spine.followAtts.get(f);
            if (!att) {
                att = new spine.RegionAttachment(f.name);
                att.x = f.x;
                att.y = f.y;
                att.rotation = f.rotation;
                att.width = src.width;
                att.height = src.height;
                att.setRegion(src.region);
                att.updateOffset();
                m.spine.followAtts.set(f, att);
            }
            return {
                gift: true,
                key: "follow:" + i,
                name: f.name,
                after: f.after,
                att,
                src: bone,
            };
        })
        .filter(Boolean);
}

function followerDrawOrder(m) {
    const list = followers(m);
    if (!list.length) {
        return null;
    }
    const order = [...m.spine.skeleton.drawOrder];
    for (const f of list) {
        const r = Math.atan2(f.src.c, f.src.a),
            cos = Math.cos(r),
            sin = Math.sin(r);
        f.bone = {
            a: cos,
            b: -sin,
            c: sin,
            d: cos,
            worldX: f.src.worldX,
            worldY: f.src.worldY,
        };
        order.splice(
            order.findIndex((s) => s.data?.name === f.after) + 1,
            0,
            f
        );
    }
    return order;
}

function spineHidden(m) {
    if (!m.part?.hide) {
        return state.hiddenLayers;
    }
    const out = new Set(state.hiddenLayers);
    for (const name of m.part.hide) {
        if (!partHides(m, name)) {
            continue;
        }
        const i = m.spine.data.findSlotIndex(name);
        if (i >= 0 && !state.shownLayers.has(i)) {
            out.add(i);
        }
    }
    return out;
}

function partTint(m) {
    const p = m.part;
    if (!p?.tint) {
        return null;
    }
    if (!p.tintMap) {
        p.tintMap = new Map();
        for (const [name, hex] of Object.entries(p.tint)) {
            const i = m.spine.data.findSlotIndex(name);
            if (i >= 0) {
                p.tintMap.set(i, hexColor(hex));
            }
        }
    }
    return p.tintMap;
}

function measure() {
    const m = currentModel();
    if (!m?.ready) {
        return null;
    }
    poseModel(m);
    const d = new Drawer(null);
    d.bounds = {
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity,
    };
    drawModel(m, d);
    return Number.isFinite(d.bounds.minX) ? d.bounds : null;
}

function resizeCanvas() {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * dpr()));
    canvas.height = Math.max(1, Math.round(r.height * dpr()));
}

const ZOOM_MIN_PCT = 10,
    ZOOM_MAX_PCT = 990;
const clampZoom = (z) =>
    Math.min(ZOOM_MAX_PCT / 100, Math.max(ZOOM_MIN_PCT / 100, z));
const zoomPct = () => Math.round(state.view.zoom * 100);

function updateZoomLabel() {
    for (const zl of $$(".zoom-label")) {
        if (document.activeElement !== zl) {
            zl.value = zoomPct() + "%";
        }
    }
}

function centerView() {
    const b = measure() || { minX: -100, maxX: 100, minY: 0, maxY: 300 };
    state.view.camX = (b.minX + b.maxX) / 2;
    state.view.camY = -(b.minY + b.maxY) / 2;
}

function fitView() {
    const b = measure();
    if (!b) {
        return;
    }
    const cw = canvas.width / dpr(),
        ch = canvas.height / dpr();
    state.view.zoom = clampZoom(
        Math.min(
            cw / Math.max(1, b.maxX - b.minX),
            ch / Math.max(1, b.maxY - b.minY)
        ) * 0.86
    );
    centerView();
}

function defaultView() {
    state.view.zoom = 1;
    centerView();
}

function resetView() {
    state.view.zoom = 1;
    state.view.camX = 0;
    state.view.camY = -50;
}

function zoomAt(factor, sx, sy) {
    const v = state.view;
    const nz = clampZoom(v.zoom * factor);
    const cw = canvas.width / dpr(),
        ch = canvas.height / dpr();
    if (sx == null) {
        sx = cw / 2;
        sy = ch / 2;
    }
    const ox = sx - cw / 2,
        oy = sy - ch / 2;
    const s = v.flip ? -1 : 1;
    v.camX += s * (ox / v.zoom - ox / nz);
    v.camY += oy / v.zoom - oy / nz;
    v.zoom = nz;
}

function setZoomPct(pct, sx, sy) {
    const p = Math.min(ZOOM_MAX_PCT, Math.max(ZOOM_MIN_PCT, Math.round(pct)));
    zoomAt(p / 100 / state.view.zoom, sx, sy);
}

const stepZoom = (dir, sx, sy) =>
    setZoomPct(zoomPct() + (dir > 0 ? 10 : -10), sx, sy);

function setFlip(f) {
    state.view.flip = f;
    $$('[data-act="flip"]').forEach((b) => b.setAttribute("aria-pressed", f));
}

function projection(cw, ch, zoom, camX, camY, flip) {
    const s = flip ? -1 : 1;
    const a = (2 * s * zoom) / cw,
        d = (2 * zoom) / ch;
    return new Float32Array([a, 0, 0, 0, d, 0, -a * camX, d * camY, 1]);
}

let pendingDefaultView = true;

function draw() {
    updateZoomLabel();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const m = currentModel();
    $("#loading").hidden = !m?.loading;
    $("#load-error").hidden = !m?.error;
    if (m?.error) {
        $("#load-error").textContent =
            `Could not load this prefab (${m.error.message}).`;
    }
    if (!m?.ready) {
        return;
    }
    poseModel(m);
    const v = state.view;
    batcher.begin(
        projection(
            canvas.width / dpr(),
            canvas.height / dpr(),
            v.zoom,
            v.camX,
            v.camY,
            v.flip
        )
    );
    drawer.bounds = null;
    drawModel(m, drawer);
    batcher.end();
}

let lastFrame = performance.now();
function tick(now) {
    const dt = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    const a = currentAnim();
    const p = state.play;
    const dur = animDuration(a);
    if (a && dur > 0 && p.playing && !p.ended) {
        p.t += dt * p.speed * Math.abs(a.speed || 1);
        if (p.t >= dur) {
            if (p.loop) {
                p.t %= dur;
            } else {
                p.t = dur;
                p.ended = true;
            }
        }
    }
    updatePlaybar();
    draw();
    requestAnimationFrame(tick);
}

// ---- export ----

function renderToCanvas(scale, pad, bg, flip, bounds) {
    const m = currentModel();
    if (!m?.ready) {
        return null;
    }
    if (bounds) {
        poseModel(m);
    }
    const b = bounds || measure();
    if (!b) {
        return null;
    }
    const W = Math.min(8192, Math.ceil((b.maxX - b.minX) * scale) + pad * 2);
    const H = Math.min(8192, Math.ceil((b.maxY - b.minY) * scale) + pad * 2);
    const fb = gl.createFramebuffer();
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        W,
        H,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        tex,
        0
    );
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const cx = (b.minX + b.maxX) / 2,
        cy = (b.minY + b.maxY) / 2;
    batcher.begin(projection(W, -H, scale, cx, -cy, flip));
    drawModel(m, drawer);
    batcher.end();
    const px = new Uint8Array(W * H * 4);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fb);
    gl.deleteTexture(tex);
    const out = el("canvas", { width: W, height: H });
    const g = out.getContext("2d");
    const img = g.createImageData(W, H);
    for (let i = 0; i < W * H; i++) {
        const a = px[i * 4 + 3];
        const k = a ? 255 / a : 0;
        img.data[i * 4] = Math.min(255, px[i * 4] * k);
        img.data[i * 4 + 1] = Math.min(255, px[i * 4 + 1] * k);
        img.data[i * 4 + 2] = Math.min(255, px[i * 4 + 2] * k);
        img.data[i * 4 + 3] = a;
    }
    g.putImageData(img, 0, 0);
    if (bg) {
        const o2 = el("canvas", { width: W, height: H });
        const g2 = o2.getContext("2d");
        g2.fillStyle = bg;
        g2.fillRect(0, 0, W, H);
        g2.drawImage(out, 0, 0);
        return o2;
    }
    return out;
}

const FPS_CHOICES = [15, 30, 60, 100].map((f) => ({
    id: String(f),
    name: String(f),
}));
const GIF_FPS_CHOICES = [2, 3, 4, 5, 6, 8, 10].map((cs) => ({
    id: `${cs}cs`,
    name: `${+(100 / cs).toFixed(1)} (${cs * 10} ms)`,
}));
const fpsPick = { normal: "30", gif: "3cs" };

function fillFps(gif) {
    const sel = $("#exp-fps");
    const key = gif ? "gif" : "normal";
    if (sel.dataset.kind === key) {
        return;
    }
    if (sel.dataset.kind) {
        fpsPick[sel.dataset.kind] = sel.value;
    }
    sel.dataset.kind = key;
    fillSelect(sel, gif ? GIF_FPS_CHOICES : FPS_CHOICES, fpsPick[key]);
}

function exportFps() {
    const v = $("#exp-fps").value;
    return v.endsWith("cs") ? 100 / parseInt(v, 10) : +v;
}

function exportFileName(ext, a = currentAnim()) {
    const e = currentEntity();
    const rig =
        a?.rig && a.rig !== "agent" && a.rig !== "clerk" ? `_${a.rig}` : "";
    const base =
        (selKind() === "abno" ? `${e.num}_${e.code}` : e.id) +
        (a
            ? `${rig}_${selKind() === "abno" ? a.name : (a.clip ?? a.name)}`
            : "");
    return `${base.replace(/[^\w.-]+/g, "_")}.${ext}`;
}

function frameTimes(a, fps) {
    const dur = animDuration(a);
    const rate = Math.abs(a.speed || 1);
    if (!(dur > 0)) {
        return [0];
    }
    const real = dur / rate;
    const n =
        a.loop === false
            ? Math.floor(real * fps + 0.01) + 1
            : Math.max(1, Math.round(real * fps));
    return Array.from({ length: n }, (_, i) => Math.min(dur, (i / fps) * rate));
}

function gifDelays(a, fps, n) {
    const cs = (i) => Math.round((i * 100) / fps);
    const delays = Array.from({ length: n }, (_, i) => cs(i + 1) - cs(i));
    if (a.loop !== false && n > 1) {
        const total = Math.round(
            (animDuration(a) / Math.abs(a.speed || 1)) * 100
        );
        delays[n - 1] = total - cs(n - 1);
    }
    return delays.map((d) => Math.max(2, d));
}

function atTime(t, fn) {
    const p = state.play,
        saved = [p.t, p.loop];
    p.t = t;
    p.loop = false;
    try {
        return fn();
    } finally {
        [p.t, p.loop] = saved;
    }
}

function exportOptions() {
    const fmt = $("#exp-format").value;
    return {
        fmt,
        fps: exportFps(),
        scale: exportScalePct / 100,
        pad: Math.max(0, +$("#exp-pad").value || 0),
        bg: $("#exp-bg").value === "color" ? $("#exp-bg-color").value : null,
        flip: $("#exp-flip").checked && state.view.flip,
    };
}

const nextTask = () => new Promise((r) => setTimeout(r, 0));

async function renderAnimFrames(a, o, status) {
    const times = frameTimes(a, o.fps);
    let b = null;
    for (const t of times) {
        const fb = atTime(t, measure);
        if (!fb) {
            continue;
        }
        if (!b) {
            b = { ...fb };
        } else {
            b.minX = Math.min(b.minX, fb.minX);
            b.minY = Math.min(b.minY, fb.minY);
            b.maxX = Math.max(b.maxX, fb.maxX);
            b.maxY = Math.max(b.maxY, fb.maxY);
        }
    }
    if (!b) {
        return null;
    }
    const frames = [];
    for (let i = 0; i < times.length; i++) {
        const c = atTime(times[i], () =>
            renderToCanvas(o.scale, o.pad, o.bg, o.flip, b)
        );
        if (!c) {
            return null;
        }
        frames.push(c);
        if (i % 4 === 3) {
            status(`rendering frame ${i + 1} / ${times.length}`);
            await nextTask();
        }
    }
    return frames;
}

function canvasBlob(c, type = "image/png", quality = 0.92) {
    if (typeof OffscreenCanvas === "function") {
        const o = new OffscreenCanvas(c.width, c.height);
        o.getContext("2d").drawImage(c, 0, 0);
        return o.convertToBlob({ type, quality });
    }
    return new Promise((res, rej) =>
        c.toBlob(
            (b) => (b ? res(b) : rej(new Error("could not encode frame"))),
            type,
            quality
        )
    );
}
const blobBytes = async (b) => new Uint8Array(await b.arrayBuffer());

async function encodeAnim(a, o, status) {
    const frames = await renderAnimFrames(a, o, status);
    if (!frames) {
        return null;
    }
    if (o.fmt === "frames") {
        const files = [];
        const pngName = exportFileName("png", a);
        for (let i = 0; i < frames.length; i++) {
            files.push({
                name: pngName.replace(
                    /\.png$/,
                    `_${String(i).padStart(3, "0")}.png`
                ),
                data: await blobBytes(await canvasBlob(frames[i])),
            });
            if (i % 4 === 3) {
                status(`encoding frame ${i + 1} / ${frames.length}`);
            }
        }
        return { files, ext: "zip" };
    }
    if (o.fmt === "apng") {
        const pngs = [];
        for (let i = 0; i < frames.length; i++) {
            pngs.push(await blobBytes(await canvasBlob(frames[i])));
            if (i % 4 === 3) {
                status(`encoding frame ${i + 1} / ${frames.length}`);
            }
        }
        return { blob: encodeApng(pngs, o.fps), ext: "png" };
    }
    if (o.fmt === "gif") {
        const images = frames.map((c) =>
            c.getContext("2d").getImageData(0, 0, c.width, c.height)
        );
        status("building palette");
        await nextTask();
        const blob = await encodeGif(
            images,
            frames[0].width,
            frames[0].height,
            gifDelays(a, o.fps, frames.length),
            async (i, n) => {
                if (i % 4 === 0) {
                    status(`encoding frame ${i} / ${n}`);
                    await nextTask();
                }
            }
        );
        return { blob, ext: "gif" };
    }
    if (o.fmt === "webm") {
        const enc = webmEncoder();
        const blob = await enc.encode(frames, o.fps, (i, n) =>
            status(
                `${enc.realtime ? "recording" : "encoding"} frame ${i} / ${n}${enc.realtime ? " (real time)" : ""}`
            )
        );
        return { blob, ext: "webm" };
    }
    throw new Error(`unknown format ${o.fmt}`);
}

function saveBlob(blob, name) {
    const a = el("a", { href: URL.createObjectURL(blob), download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

let exportBusy = false;
function setExportBusy(on) {
    exportBusy = on;
    $("#export").disabled = on;
    $("#export-all").disabled = on || !currentAnims().length;
    $("#exp-kind").inert = on;
}

async function waitForModel() {
    for (let i = 0; i < 1200; i++) {
        const m = currentModel();
        if (m?.error) {
            return null;
        }
        if (m?.ready && !m.spine?.dressWaiting) {
            return m;
        }
        await new Promise((r) => setTimeout(r, 50));
    }
    return null;
}

async function exportAnimation() {
    const a = currentAnim();
    const status = $("#export-status");
    if (!a || exportBusy) {
        return;
    }
    setExportBusy(true);
    const o = exportOptions();
    try {
        status.textContent = `${a.name}: loading`;
        if (!(await waitForModel())) {
            status.textContent = "Nothing to export.";
            return;
        }
        const r = await encodeAnim(a, o, (t) => {
            status.textContent = `${a.name}: ${t}`;
        });
        if (!r) {
            status.textContent = "Nothing to export.";
            return;
        }
        const name = exportFileName(r.ext, a);
        saveBlob(r.blob || makeZip(r.files), name);
        status.textContent = `Saved ${name}`;
    } catch (err) {
        console.error(err);
        status.textContent = `Export failed: ${err.message}`;
    } finally {
        setExportBusy(false);
    }
}

async function exportAllAnimations() {
    const anims = currentAnims();
    const status = $("#export-status");
    if (!anims.length || exportBusy || state.expKind !== "anim") {
        return;
    }
    setExportBusy(true);
    const o = exportOptions();
    const savedAnim = state.anim,
        savedSel = state.sel;
    const files = [],
        skipped = [],
        used = new Set();
    const unique = (name) => {
        let n = name,
            i = 2;
        while (used.has(n)) {
            n = name.replace(/(\.[^.]+)$/, `_${i++}$1`);
        }
        used.add(n);
        return n;
    };
    let unavailable = 0;
    try {
        for (let i = 0; i < anims.length; i++) {
            if (state.sel !== savedSel) {
                throw new Error("selection changed");
            }
            const a = anims[i];
            if (!animEnabled(a)) {
                unavailable++;
                continue;
            }
            const label = `${i + 1} / ${anims.length} ${a.name}`;
            state.anim = i;
            status.textContent = `${label}: loading`;
            if (!(await waitForModel())) {
                skipped.push(a.name);
                continue;
            }
            const r = await encodeAnim(a, o, (t) => {
                status.textContent = `${label}: ${t}`;
            });
            if (!r) {
                skipped.push(a.name);
                continue;
            }
            if (r.files) {
                const dir = exportFileName("", a).replace(/\.$/, "");
                for (const f of r.files) {
                    files.push({
                        name: unique(`${dir}/${f.name}`),
                        data: f.data,
                    });
                }
            } else {
                files.push({
                    name: unique(exportFileName(r.ext, a)),
                    data: await blobBytes(r.blob),
                });
            }
        }
        if (!files.length) {
            status.textContent = "Nothing to export.";
            return;
        }
        const name = exportFileName("zip", null).replace(
            /\.zip$/,
            "_animations.zip"
        );
        saveBlob(makeZip(files), name);
        status.textContent =
            `Saved ${name} (${anims.length - unavailable - skipped.length} animations)` +
            (skipped.length ? `; skipped ${skipped.join(", ")}` : "");
    } catch (err) {
        console.error(err);
        status.textContent = `Export failed: ${err.message}`;
    } finally {
        if (state.sel === savedSel) {
            state.anim = savedAnim;
        }
        setExportBusy(false);
        renderAnims();
        renderLayers();
    }
}

function exportStill(copy) {
    const fmt = copy ? "png" : $("#exp-format").value;
    const bgColor =
        $("#exp-bg").value === "color" || fmt === "jpeg"
            ? $("#exp-bg-color").value
            : null;
    const c = renderToCanvas(
        exportScalePct / 100,
        Math.max(0, +$("#exp-pad").value || 0),
        bgColor,
        $("#exp-flip").checked && state.view.flip
    );
    const status = $("#export-status");
    if (!c) {
        status.textContent = "Nothing to export.";
        return;
    }
    c.toBlob(
        async (blob) => {
            if (!blob) {
                status.textContent = "Export failed.";
                return;
            }
            if (copy) {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ "image/png": blob }),
                    ]);
                    status.textContent = "Copied.";
                } catch {
                    status.textContent = "Clipboard is not available here.";
                }
                return;
            }
            const a = el("a", {
                href: URL.createObjectURL(blob),
                download: exportFileName(fmt === "jpeg" ? "jpg" : fmt),
            });
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
            status.textContent = `Saved ${a.download}`;
        },
        "image/" + fmt,
        0.92
    );
}

// ---- language & theme ----

const LANGUAGES = [
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

const langInfo = () =>
    LANGUAGES.find((l) => l.key === state.lang) || LANGUAGES[0];

function renderLangGroup() {
    const cur = langInfo();
    const btn = $("#lang-btn");
    btn.innerHTML = FLAGS[cur.key] + `<span class="caret">▾</span>`;
    btn.setAttribute("aria-label", `Name language: ${cur.name}`);
    const menu = $("#lang-menu");
    menu.replaceChildren();
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
    [...$("#lang-menu").children].forEach((li, j) =>
        li.classList.toggle("focus", j === i)
    );
}

function initLangMenu() {
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

function setLang(key) {
    if (key === state.lang) {
        return;
    }
    state.lang = key;
    store.set("lang", key);
    renderLangGroup();
    $("#list").lang = langInfo().tag;
    $("#entity-title").lang = langInfo().tag;
}

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

function setBg(bg) {
    const wrap = $("#canvas-wrap");
    wrap.classList.remove("bg-checker", "bg-dark", "bg-light");
    wrap.classList.add("bg-" + bg);
    $$(".bg-group [data-bg]").forEach((b) =>
        b.setAttribute("aria-pressed", b.dataset.bg === bg)
    );
    store.set("bg", bg);
}

// ---- canvas controls ----

function initZoomLabel(zl) {
    zl.addEventListener("focus", () => zl.select());
    zl.addEventListener("change", () => {
        const n = parseFloat(zl.value.replace(/[^\d.]/g, ""));
        zl.blur();
        if (Number.isFinite(n)) {
            setZoomPct(n);
        }
    });
    zl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            zl.blur();
        }
        if (e.key === "Escape") {
            zl.value = zoomPct() + "%";
            zl.blur();
        }
    });
    zl.addEventListener("blur", () => {
        zl.value = zoomPct() + "%";
    });
}

const CANVAS_ACTIONS = {
    "zoom-in": () => stepZoom(1),
    "zoom-out": () => stepZoom(-1),
    reset: defaultView,
    fit: fitView,
    flip: () => setFlip(!state.view.flip),
};

function wireCanvasControls(root) {
    for (const b of root.querySelectorAll("[data-act]")) {
        b.onclick = CANVAS_ACTIONS[b.dataset.act];
    }
    for (const b of root.querySelectorAll("[data-bg]")) {
        b.onclick = () => setBg(b.dataset.bg);
    }
    initZoomLabel(root.querySelector(".zoom-label"));
}

function initCanvasControls() {
    const controls = $("#canvas-controls");
    const copy = el(
        "div",
        { id: "bar-canvas-controls" },
        controls.querySelector(".zoom-label").parentElement.cloneNode(true)
    );
    $("#toolbar").append(copy);
    wireCanvasControls(controls);
    wireCanvasControls(copy);
}

// ---- layout ----

const MOBILE_QUERY = matchMedia("(max-width: 860px)");
const isMobile = () => MOBILE_QUERY.matches;
const TABS = ["prefabs", "canvas", "options"];
const MOBILE_SLOTS = [
    ["#canvas-controls", "#slot-canvas-controls"],
    ["#anim-menu", "#slot-anim-menu"],
    ["#layers-panel", "#slot-layers"],
    ["#app-controls", "#slot-app-controls"],
    ["#options-body", "#slot-options"],
];
const slotHomes = new Map();
let mobileTab = TABS.includes(store.get("mobile-tab"))
    ? store.get("mobile-tab")
    : TABS[0];

const isPanelOpen = (side) => $("#app").classList.contains(side + "-open");

function setPanel(side, open) {
    $("#app").classList.toggle(side + "-open", open);
    setTimeout(resizeCanvas, 200);
}

function placeControls() {
    for (const [sel, slot] of MOBILE_SLOTS) {
        const node = $(sel);
        if (!slotHomes.has(node)) {
            const mark = document.createComment(sel);
            node.before(mark);
            slotHomes.set(node, mark);
        }
        if (isMobile()) {
            $(slot).append(node);
        } else {
            slotHomes.get(node).after(node);
        }
    }
}

function setTab(next) {
    mobileTab = next;
    store.set("mobile-tab", mobileTab);
    applyTab();
}

function applyTab() {
    const mobile = isMobile();
    const shown = mobile ? mobileTab : "prefabs";
    $("#left .tab-bar").hidden = !mobile;
    for (const pane of $$("#left .tab-pane")) {
        pane.hidden = pane.dataset.tab !== shown;
    }
    for (const b of $$("#left .tab-bar [data-tab]")) {
        b.setAttribute("aria-selected", b.dataset.tab === mobileTab);
    }
}

function applyLayout() {
    for (const side of ["left", "right"]) {
        $("#app").classList.toggle(side + "-open", !isMobile());
    }
    if (isMobile()) {
        $("#anims").open = false;
    }
    placeControls();
    applyTab();
}

function initPanels() {
    for (const b of $$("[data-toggle]")) {
        b.onclick = () =>
            setPanel(b.dataset.toggle, !isPanelOpen(b.dataset.toggle));
    }
    for (const b of $$("#left .tab-bar [data-tab]")) {
        b.onclick = () => setTab(b.dataset.tab);
    }
    $("#scrim").onclick = () => setPanel("left", false);
    MOBILE_QUERY.addEventListener("change", applyLayout);
    applyLayout();
}

// ---- url ----

function syncUrl() {
    const p = new URLSearchParams(location.search);
    if (state.sel) {
        p.set("id", state.sel);
    } else {
        p.delete("id");
    }
    history.replaceState(null, "", "?" + p);
}

function readUrl() {
    const id = new URLSearchParams(location.search).get("id");
    if (
        id === "employee" ||
        id === "clerk" ||
        DATA.entities.some((e) => e.id === id)
    ) {
        state.sel = id;
    }
}

// ---- wiring ----

function renderAll() {
    renderList();
    renderTitle();
    renderAnims();
    renderLayers();
    renderOptions();
}

function randomLook() {
    const kit = DATA.kit;
    const r = Math.random;
    const pick = (region, exclude = []) => {
        const sets = (kit.basic[region] || []).filter(
            (s) => !s.custom && !exclude.includes(s.id) && s.sprites.length
        );
        const s = sets[Math.floor(r() * sets.length)];
        return s ? [s.id, Math.floor(r() * s.sprites.length)] : [0, 0];
    };
    const bald = r() <= 0.02;
    const get0 = (region) => [
        0,
        Math.floor(
            r() *
                Math.max(
                    1,
                    (kit.basic[region] || []).find((s) => s.id === 0)?.sprites
                        .length || 1
                )
        ),
    ];
    state.look.eye = pick("eye_default");
    state.look.eyebrow = pick("eyebrow");
    state.look.mouth = pick("mouth");
    state.look.eye_closed = pick("eye_closed");
    state.look.front = bald ? get0("front") : pick("front", [0]);
    state.look.rear = bald || r() <= 0.5 ? get0("rear") : pick("rear", [0]);
    state.look.hair =
        kit.hair_colors[Math.floor(r() * kit.hair_colors.length)].toLowerCase();
}

function wire() {
    const search = $("#search");
    search.oninput = (e) => {
        state.filter.text = e.target.value;
        renderList();
    };
    search.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            e.target.value = "";
            state.filter.text = "";
            renderList();
            e.target.blur();
        }
    });
    initPanels();

    $("#layers-toggle").onclick = () =>
        setLayersOpen($("#layers-popover").hidden);
    $("#layers-all").onchange = toggleAllLayers;
    initCanvasControls();
    $("#theme-toggle").onclick = () =>
        setTheme(
            document.documentElement.dataset.theme === "light"
                ? "dark"
                : "light"
        );
    initLangMenu();

    const animsBox = $("#anims");
    document.addEventListener("pointerdown", (e) => {
        if (animsBox.open && !animsBox.contains(e.target)) {
            animsBox.open = false;
        }
    });
    $("#play").onclick = togglePlay;
    $("#step-back").onclick = () => step(-1);
    $("#step-fwd").onclick = () => step(1);
    $("#scrub").oninput = (e) => {
        const a = currentAnim();
        if (!a) {
            return;
        }
        state.play.playing = false;
        state.play.ended = false;
        state.play.t = (e.target.value / 1000) * animDuration(a);
    };
    $("#speed").onchange = (e) => {
        state.play.speed = +e.target.value;
    };
    $("#loop").onclick = () => {
        state.play.loop = !state.play.loop;
        if (state.play.loop && state.play.ended) {
            state.play.ended = false;
            state.play.t = 0;
        }
    };

    for (const b of $$("#expression button")) {
        b.onclick = () => {
            state.look.expression = b.dataset.v;
            lookChanged();
            renderEmployeeOptions();
        };
    }
    $("#anim-face").onchange = (e) => {
        state.animFace = e.target.checked;
        store.set("animFace", state.animFace);
        lookChanged();
        renderEmployeeOptions();
    };
    for (const b of $$(".color-item")) {
        b.onclick = () => {
            state.editingColor =
                state.editingColor === b.dataset.color ? null : b.dataset.color;
            renderEmployeeOptions();
        };
    }
    const hexIn = $("#ce-hex");
    hexIn.addEventListener("input", () => {
        let s = hexIn.value.trim();
        if (!s.startsWith("#")) {
            s = "#" + s;
        }
        if (/^#[0-9a-f]{3}$/i.test(s)) {
            s = "#" + [...s.slice(1)].map((c) => c + c).join("");
        }
        const ok = /^#[0-9a-f]{6}$/i.test(s);
        hexIn.classList.toggle("invalid", !ok);
        if (ok) {
            setColor(state.editingColor, s.toLowerCase());
        }
    });
    hexIn.addEventListener("blur", () => renderColorEditor());
    hexIn.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            hexIn.blur();
        }
    });
    buildColorRows();
    $("#randomize").onclick = () => {
        randomLook();
        lookChanged();
        renderEmployeeOptions();
    };
    $("#reset-appearance").onclick = () => {
        state.look = {
            ...structuredClone(DEFAULT_LOOK),
            expression: state.look.expression,
        };
        lookChanged();
        renderEmployeeOptions();
    };
    $("#randomize-gifts").onclick = randomizeGifts;
    $("#clear-gifts").onclick = () => {
        state.gifts = {};
        giftsChanged();
    };
    $("#department").onchange = (e) => {
        state.department[selKind()] = e.target.value;
        lookChanged();
        renderDepartment(selKind());
        renderLayers();
    };
    $("#service-level").onchange = (e) => {
        state.serviceLevel = +e.target.value;
        lookChanged();
        renderLayers();
    };
    $("#armor").onchange = (e) => {
        state.armor = +e.target.value;
        lookChanged();
    };
    $("#weapon").onchange = (e) => {
        const prev = currentAnim();
        state.weapon = e.target.value === "" ? null : +e.target.value;
        lookChanged();
        animCache.key = null;
        const anims = currentAnims();
        let i = anims.findIndex(
            (a) =>
                a.name === prev?.name &&
                a.group === prev?.group &&
                animEnabled(a)
        );
        if (i < 0 && prev?.gated) {
            i = anims.findIndex(
                (a) => a.gated && a.group === prev.group && animEnabled(a)
            );
        }
        if (i >= 0) {
            state.anim = i;
        } else {
            state.anim = Math.max(0, defaultAnimIndex());
            resetPlayback();
        }
        renderTitle();
        renderAnims();
        renderLayers();
        renderEmployeeOptions();
    };
    initExportScale();

    $("#skin").onchange = (e) => {
        state.skin = e.target.value;
        renderLayers();
    };

    for (const b of $$("#exp-kind button")) {
        b.onclick = () => {
            state.expKind = b.dataset.v;
            renderExport();
        };
    }
    $("#exp-bg").onchange = renderExport;
    $("#exp-fps").onchange = renderExport;
    $("#exp-format").onchange = renderExport;
    $("#exp-pad").onchange = renderExport;
    $("#export").onclick = () => {
        if (state.expKind === "still") {
            exportStill(false);
        } else {
            exportAnimation();
        }
    };
    $("#copy").onclick = () => exportStill(true);
    $("#export-all").onclick = exportAllAnimations;

    let drag = null;
    canvas.onpointerdown = (e) => {
        drag = { x: e.clientX, y: e.clientY };
        canvas.setPointerCapture(e.pointerId);
        canvas.classList.add("dragging");
    };
    canvas.onpointermove = (e) => {
        if (!drag) {
            return;
        }
        state.view.camX -=
            ((e.clientX - drag.x) / state.view.zoom) *
            (state.view.flip ? -1 : 1);
        state.view.camY -= (e.clientY - drag.y) / state.view.zoom;
        drag = { x: e.clientX, y: e.clientY };
    };
    canvas.onpointerup = () => {
        drag = null;
        canvas.classList.remove("dragging");
    };

    const WHEEL_NOTCH = 40,
        WHEEL_SMOOTH_STEP = 100;
    let wheelAcc = 0;
    canvas.addEventListener(
        "wheel",
        (e) => {
            e.preventDefault();
            const r = canvas.getBoundingClientRect();
            const delta =
                e.deltaMode === 1
                    ? e.deltaY * 16
                    : e.deltaMode === 2
                      ? e.deltaY * 100
                      : e.deltaY;
            let dir = 0;
            if (Math.abs(delta) >= WHEEL_NOTCH) {
                wheelAcc = 0;
                dir = -Math.sign(delta);
            } else {
                wheelAcc += delta;
                if (Math.abs(wheelAcc) >= WHEEL_SMOOTH_STEP) {
                    dir = -Math.sign(wheelAcc);
                    wheelAcc = 0;
                }
            }
            if (dir) {
                stepZoom(dir, e.clientX - r.left, e.clientY - r.top);
            }
        },
        { passive: false }
    );

    addEventListener("keydown", (e) => {
        const t = e.target;
        if (e.key === "Escape" && $("#anims").open) {
            $("#anims").open = false;
            t.blur?.();
            return;
        }
        if (
            t.matches("input, select, textarea") &&
            t.type !== "range" &&
            t.type !== "checkbox"
        ) {
            if (e.key === "Escape") {
                t.blur();
            }
            return;
        }
        if (t.closest?.("#lang-dd")) {
            return;
        }
        switch (e.key) {
            case "ArrowDown":
                moveSelection(1);
                e.preventDefault();
                break;
            case "ArrowUp":
                moveSelection(-1);
                e.preventDefault();
                break;
            case " ":
                togglePlay();
                e.preventDefault();
                break;
            case ",":
                step(-1);
                break;
            case ".":
                step(1);
                break;
            case "l":
            case "L":
                $("#loop").click();
                break;
            case "f":
            case "F":
                setFlip(!state.view.flip);
                break;
            case "0":
                fitView();
                break;
            case "+":
            case "=":
                stepZoom(1);
                break;
            case "-":
                stepZoom(-1);
                break;
        }
    });

    new ResizeObserver(resizeCanvas).observe($("#canvas-wrap"));
}

function prepareEquipment(kit) {
    const byName = new Map();
    for (const a of kit.equipment.armors) {
        if (!a.name) {
            continue;
        }
        if (!byName.has(a.name) || a.id < byName.get(a.name).id) {
            byName.set(a.name, a);
        }
    }
    DATA.armors = [...byName.values()].sort(
        (a, b) =>
            (a.armor_id === 0 ? -1 : 0) - (b.armor_id === 0 ? -1 : 0) ||
            a.name.localeCompare(b.name)
    );
    const wOk = (w) =>
        w.name &&
        ((kit.rules.weapon[w.class] &&
            (w.class === "fist" ||
                kit.weapon_sheets.some(
                    (s) =>
                        s.class === w.class &&
                        s.sprites.some((sp) => sp.name === w.sprite)
                ))) ||
            (w.class === "special" &&
                w.special_anim &&
                kit.rigs[w.special_anim]));
    const wByName = new Map();
    for (const w of kit.equipment.weapons) {
        if (!wOk(w)) {
            continue;
        }
        if (!wByName.has(w.name) || w.id < wByName.get(w.name).id) {
            wByName.set(w.name, w);
        }
    }
    const base = (n) => n.replace(/\*$/, "");
    DATA.weapons = [...wByName.values()].sort(
        (a, b) =>
            (base(a.name) === "Standard Riot Stick" ? -1 : 0) -
                (base(b.name) === "Standard Riot Stick" ? -1 : 0) ||
            base(a.name).localeCompare(base(b.name)) ||
            a.name.length - b.name.length
    );
    state.armor = DATA.armors[0]?.id ?? null;
    state.weapon =
        (
            DATA.weapons.find((w) => w.name === "Standard Riot Stick*") ??
            DATA.weapons[0]
        )?.id ?? null;
}

async function init() {
    setTheme(
        document.documentElement.dataset.theme === "light" ? "light" : "dark",
        false
    );
    setBg(store.get("bg", "checker"));
    state.lang = LANGUAGES.some((l) => l.key === store.get("lang"))
        ? store.get("lang")
        : "en";
    renderLangGroup();
    wire();
    initPreloadSetting();
    resizeCanvas();
    requestAnimationFrame(tick);
    try {
        const [index, kit] = await Promise.all([
            fetch(DATA_ROOT + "index.json").then((r) => {
                if (!r.ok) {
                    throw new Error(`${r.status} index.json`);
                }
                return r.json();
            }),
            fetch(DATA_ROOT + "employee/kit.json").then((r) => {
                if (!r.ok) {
                    throw new Error(`${r.status} kit.json`);
                }
                return r.json();
            }),
        ]);
        DATA.entities = index.entities;
        DATA.kit = kit;
        prepareEquipment(kit);
        prepareGifts(kit);
        buildGifts();
    } catch (err) {
        $("#load-error").hidden = false;
        $("#load-error").textContent =
            `Could not load data (${err.message}). Is the data folder at ${DATA_ROOT}?`;
        return;
    }
    readUrl();
    animCache.key = null;
    state.anim = Math.max(0, defaultAnimIndex());
    syncUrl();
    renderAll();
    updateLoadedCount();
    restartPreload();
}

if (!IS_LOCAL && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(() => {});
}

init();
