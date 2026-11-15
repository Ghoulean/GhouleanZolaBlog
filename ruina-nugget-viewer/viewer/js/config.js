export const IS_LOCAL =
    location.protocol === "file:" ||
    ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);

export const DATA_ROOT = (
    new URLSearchParams(location.search).get("data") ||
    (IS_LOCAL ? "data/" : "/assets/ruina/")
).replace(/\/?$/, "/");

export const CATEGORIES = [
    { key: "new", label: "Key pages", prefix: "appearance_" },
    { key: "enemy", label: "Key pages (enemy)", prefix: "appearance_" },
    { key: "egos", label: "EGO", prefix: "ego_" },
    { key: "creatureskin", label: "Abnormalities", prefix: "creature_" },
];

export const RANKS = [
    "Canard",
    "Urban Myth",
    "Urban Legend",
    "Urban Plague",
    "Urban Nightmare",
    "Star of the City",
    "Impuritas Civitatis",
];
const SEPHIROT = [
    "Malkuth",
    "Yesod",
    "Hod",
    "Netzach",
    "Tiphereth",
    "Gebura",
    "Chesed",
    "Binah",
    "Hokma",
    "Keter",
];
export const DEFAULT_RANK = "Default";
export const OTHER = "Other";
export const SUBGROUPS = {
    new: [DEFAULT_RANK, ...RANKS],
    enemy: [DEFAULT_RANK, ...RANKS],
    egos: [...SEPHIROT, OTHER],
    creatureskin: [...SEPHIROT, OTHER],
};

export const HIDDEN_SKINS = new Set([
    "creature_nihil_despairlibrarian",
    "creature_nihil_greedlibrarian",
    "creature_nihil_hatredlibrarian",
    "creature_nihil_wrathlibrarian",
    "creature_hokmafirst",
    "creature_hokmafirstchild",
]);
export const CATEGORY_OVERRIDES = {
    ego_nihil_despairphase: "creatureskin",
    ego_nihil_greedphase: "creatureskin",
    ego_nihil_hatredphase: "creatureskin",
    ego_nihil_wrathphase: "creatureskin",
};

export const ATK_FACE = new Set([
    "Guard",
    "Evade",
    "Slash",
    "Penetrate",
    "Hit",
    "S1",
    "S2",
    "S3",
    "S4",
    "S5",
]);
export const HIDDEN_WHEN_CUSTOM = new Set([
    "Head",
    "FrontHair",
    "RearHair",
    "Face",
    "Mask",
    "EnemyOnly",
]);
export const STORED_HEAD_TYPES = new Set([
    "Head",
    "Face",
    "FrontHair",
    "RearHair",
    "Mask",
]);
export const STORED_HEAD_EXTRA_LAYERS = {
    appearance_blue_bremen: new Set(["head 2", "head 3"]),
};
export const STORED_HEAD_ANCHORS = {
    Head: "head",
    Face: "face",
    FrontHair: "frontHair",
};
export const SLASH_ALIASES = new Set([
    "Fire",
    "Aim",
    "Special",
    "S1",
    "S2",
    "S3",
    "S4",
    "S5",
    "Slash2",
    "Penetrate2",
    "Hit2",
]);
export const GIFT_ORDER_FROM_FACE = { Eye: 2, Nose: 1, Cheek: 1, Mouth: 1 };
export const GIFT_ORDER_FROM_HAIR = {
    HairAccessory: 4,
    Hood: 5,
    Mask: 3,
    Helmet: 1,
};
export const ROLE_KIND = {
    head: "Head",
    face: "Face",
    frontHair: "FrontHair",
    rearHair: "RearHair",
};
export const GIFT_POSITIONS = [
    "HairAccessory",
    "Helmet",
    "Hood",
    "Mask",
    "Eye",
    "Ear",
    "Nose",
    "Cheek",
    "Mouth",
];
export const POSE_LABELS = {
    Guard: "Block",
    Penetrate: "Pierce",
    Hit: "Blunt",
};
export const POSE_ORDER = [
    "Default",
    "Standing",
    "Move",
    "Guard",
    "Evade",
    "Slash",
    "Penetrate",
    "Hit",
    "Damaged",
    "Fire",
    "Aim",
];
export const PARTS = [
    { key: "frontHair", label: "Front hair", thumb: (p) => p.front },
    { key: "rearHair", label: "Rear hair", thumb: (p) => p.front },
    { key: "eyes", label: "Eyes", thumb: (p) => p.normal },
    { key: "brows", label: "Brows", thumb: (p) => p.normal },
    { key: "mouths", label: "Mouth", thumb: (p) => p.normal },
];
export const DEFAULT_CUSTOM = {
    frontHair: 0,
    rearHair: 0,
    eyes: 0,
    brows: 0,
    mouths: 0,
    hairColor: "#5a3a2e",
    eyeColor: "#3c6e8c",
    skinColor: "#ffe6d7",
};
export const DEFAULT_SKIN = "new/appearance_ketherlibrarian";
