"use strict";

const UNIT_PX = 100;
const SPRITE_UV = new Float32Array([0, 1, 0, 0, 1, 0, 1, 1]);

function quatMat(q, s, p) {
  let [x, y, z, w] = q;
  const n = Math.hypot(x, y, z, w) || 1;
  x /= n; y /= n; z /= n; w /= n;
  return [
    (1 - 2 * (y * y + z * z)) * s[0], 2 * (x * y - z * w) * s[1], 2 * (x * z + y * w) * s[2], p[0],
    2 * (x * y + z * w) * s[0], (1 - 2 * (x * x + z * z)) * s[1], 2 * (y * z - x * w) * s[2], p[1],
    2 * (x * z - y * w) * s[0], 2 * (y * z + x * w) * s[1], (1 - 2 * (x * x + y * y)) * s[2], p[2],
    0, 0, 0, 1,
  ];
}

function mul(a, b) {
  const o = new Array(16);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      o[r * 4 + c] = a[r * 4] * b[c] + a[r * 4 + 1] * b[4 + c] + a[r * 4 + 2] * b[8 + c] + a[r * 4 + 3] * b[12 + c];
    }
  }
  return o;
}

function sampleTrack(tr, t) {
  const times = tr.times, vals = tr.values;
  let lo = 0, hi = times.length - 1;
  if (t < times[0]) return vals[0];
  if (t >= times[hi]) return vals[hi];
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (times[mid] <= t) lo = mid; else hi = mid - 1;
  }
  const k = lo;
  if (tr.step || k >= times.length - 1) return vals[k];
  const t0 = times[k], t1 = times[k + 1];
  const f = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
  const a = vals[k];
  let b = vals[k + 1];
  if (Array.isArray(a)) {
    if (tr.prop === "rotation" && a.reduce((s, x, i) => s + x * b[i], 0) < 0) b = b.map(x => -x);
    return a.map((x, i) => x + (b[i] - x) * f);
  }
  if (typeof a !== "number") return a;
  return a + (b - a) * f;
}

class ScenePlayer {
  static async load(gl, dir) {
    const res = await fetch(`${dir}/scene.json`);
    if (!res.ok) throw new Error(`${res.status} ${dir}/scene.json`);
    const doc = await res.json();
    const files = new Set();
    for (const s of Object.values(doc.sprites)) files.add(s.file);
    for (const m of Object.values(doc.meshes)) files.add(m.file);
    const tex = {};
    await Promise.all([...files].map(async f => {
      try { tex[f] = new GLTexture(gl, await loadBitmap(`${dir}/${f}`), false); } catch { tex[f] = null; }
    }));
    const spineData = {};
    await Promise.all(Object.entries(doc.spine || {}).map(async ([k, sp]) => {
      try { spineData[k] = (await loadSpine(gl, `${dir}/${sp.dir}`, sp.skeleton, sp.atlas, false)).data; } catch { spineData[k] = null; }
    }));
    return new ScenePlayer(doc, tex, dir, spineData);
  }

  constructor(doc, tex, dir, spineData = {}) {
    this.doc = doc;
    this.tex = tex;
    this.dir = dir;
    this.skel = doc.renderers.map(r => {
      const data = r.kind === "spine" ? spineData[r.spine] : null;
      if (!data) return null;
      const sk = new spine.Skeleton(data);
      const skin = doc.spine[r.spine].skin;
      if (skin && skin !== "default" && data.findSkin(skin)) sk.setSkinByName(skin);
      return sk;
    });
    this.byNode = new Map();
    doc.renderers.forEach((r, i) => {
      if (!this.byNode.has(r.node)) this.byNode.set(r.node, []);
      this.byNode.get(r.node).push(i);
    });
    const firstByPath = new Map();
    doc.nodes.forEach((n, i) => { if (!firstByPath.has(n.path)) firstByPath.set(n.path, i); });
    for (const clip of Object.values(doc.clips)) {
      for (const tr of clip.tracks) {
        if (tr.target === "node") tr.node = firstByPath.get(doc.nodes[tr.node].path) ?? tr.node;
      }
    }
    this.depth = doc.nodes.map(n => { let d = 0, p = n.parent; while (p >= 0) { d++; p = doc.nodes[p].parent; } return d; });
    this.meshCache = {};
    for (const [k, m] of Object.entries(doc.meshes)) {
      this.meshCache[k] = {
        uvs: new Float32Array(m.uvs.flat()),
        tris: m.triangles,
        bind: m.bindposes.map(b => b.slice()),
      };
    }
  }

  parts() {
    if (this._parts) return this._parts;
    const doc = this.doc;
    const list = doc.animators.map((a, i) => ({ i, a })).filter(x => x.a.states.some(s => s.clip) && x.a.enabled !== false && x.a.part !== false);
    const activeChain = n => { while (n >= 0) { if (!doc.nodes[n].active) return false; n = doc.nodes[n].parent; } return true; };
    const rank = a => a.part_rank ?? Infinity;
    list.sort((x, y) => (rank(x.a) - rank(y.a)) || (activeChain(y.a.node) - activeChain(x.a.node)) || (y.a.states.length - x.a.states.length) || (this.depth[x.a.node] - this.depth[y.a.node]));
    const multi = list.filter(x => x.a.part_rank != null || x.a.states.filter(s => s.clip).length > 1);
    const chosen = multi.length ? multi : list.slice(0, 1);
    this._parts = chosen.map(x => {
      const a = x.a;
      const anims = a.states.filter(s => s.clip).map(s => ({
        name: s.name, clip: s.clip, loop: !!s.loop, speed: s.speed || 1, dur: doc.clips[s.clip]?.duration || 0,
      }));
      const def = anims.findIndex(s => s.name === a.default);
      return { name: a.label ?? doc.nodes[a.node].name, animator: x.i, anims, idle: def >= 0 ? def : 0 };
    });
    if (chosen.length && !activeChain(chosen[0].a.node)) {
      this._parts.unshift({ name: "Static*", animator: -1, anims: [{ name: "Static*", clip: null, loop: true, speed: 1, dur: 0 }], idle: 0 });
    }
    return this._parts;
  }

  flipbookNodes(clipName) {
    this._flip ??= {};
    if (this._flip[clipName]) return this._flip[clipName];
    const tracks = this.doc.clips[clipName]?.tracks || [];
    const alpha = new Set(tracks.filter(t => t.prop === "color.a").map(t => t.node));
    return this._flip[clipName] = tracks
      .filter(t => t.prop === "active" && !alpha.has(t.node) && t.values.includes(true) && t.values.includes(false))
      .map(t => t.node);
  }

  pose(chosenAnimator, chosenState, t) {
    const doc = this.doc;
    const N = doc.nodes.length;
    const pos = doc.nodes.map(n => n.pos.slice());
    const rot = doc.nodes.map(n => n.rot.slice());
    const scl = doc.nodes.map(n => n.scale.slice());
    const act = doc.nodes.map(n => n.active);
    const spineState = new Map();
    const rs = doc.renderers.map(r => ({
      enabled: r.enabled, color: r.color.slice(), order: r.order,
      flipX: !!r.flipX, flipY: !!r.flipY, sprite: r.sprite ?? null,
    }));
    doc.animators.forEach((a, ai) => {
      if (a.enabled === false) return;
      let st, loop;
      if (ai === chosenAnimator && chosenState) { st = chosenState; loop = chosenState.loop; }
      else {
        st = a.states.find(s => s.name === a.default) || null;
        loop = true;
      }
      if (!st || !st.clip) return;
      const clip = doc.clips[st.clip];
      if (!clip) return;
      const d = clip.duration;
      let tt = ai === chosenAnimator ? t : t * (st.speed || 1);
      if (d > 0) tt = loop ? ((tt % d) + d) % d : Math.min(tt, d);
      spineState.set(a.node, { anim: st.clip.replace(/#\d+$/, ""), t: tt, loop });
      for (const n of this.flipbookNodes(st.clip)) {
        for (const ri of this.byNode.get(n) || []) if (rs[ri].color[3] <= 0) rs[ri].color[3] = 1;
      }
      for (const tr of clip.tracks) {
        const v = sampleTrack(tr, tt);
        const n = tr.node, p = tr.prop;
        if (tr.target === "node") {
          if (p === "position") pos[n] = v;
          else if (p === "rotation") rot[n] = v;
          else if (p === "scale") scl[n] = v;
          else if (p === "active") act[n] = v;
          continue;
        }
        for (const ri of this.byNode.get(n) || []) {
          if (doc.renderers[ri].kind !== tr.target) continue;
          const s = rs[ri];
          if (p.startsWith("color.")) s.color["rgba".indexOf(p[p.length - 1])] = v;
          else s[p] = v;
        }
      }
    });
    const skelOnNode = new Map();
    doc.renderers.forEach((r, i) => {
      const sk = this.skel[i];
      if (!sk) return;
      skelOnNode.set(r.node, { sk, scale: doc.spine[r.spine].scale });
      sk.setToSetupPose();
      const ss = spineState.get(r.node);
      const an = ss ? sk.data.findAnimation(ss.anim) : null;
      if (an) an.apply(sk, 0, ss.t, ss.loop, null, 1, spine.MixPose.setup, spine.MixDirection.in);
      sk.updateWorldTransform();
    });
    const world = new Array(N);
    doc.nodes.forEach((n, i) => {
      const f = n.follow && skelOnNode.get(n.follow.node);
      const bone = f && f.sk.findBone(n.follow.bone);
      if (bone) {
        pos[i] = [bone.worldX * f.scale, bone.worldY * f.scale, n.follow.z ? 0 : pos[i][2]];
        if (n.follow.rotation) {
          const h = Math.atan2(bone.c, bone.a) / 2;
          rot[i] = [0, 0, Math.sin(h), Math.cos(h)];
        }
        if (n.follow.scale) scl[i] = [bone.scaleX, bone.scaleY, scl[i][2]];
      }
      const m = quatMat(rot[i], scl[i], pos[i]);
      world[i] = n.parent >= 0 ? mul(world[n.parent], m) : m;
    });
    this.world = world;
    this.act = act;
    this.rs = rs;
    this.forced = new Set();
    const an = chosenAnimator !== this.parts()[0]?.animator ? doc.animators[chosenAnimator] : null;
    for (let n = an ? an.node : -1; n >= 0; n = doc.nodes[n].parent) this.forced.add(n);
  }

  visible(n) {
    while (n >= 0) {
      if (!this.act[n] && !this.forced.has(n)) return false;
      n = this.doc.nodes[n].parent;
    }
    return true;
  }

  defaultOff(i) {
    const doc = this.doc;
    if (!doc.renderers[i].enabled && doc.renderers[i].kind !== "spine") return true;
    for (let n = doc.renderers[i].node; n >= 0; n = doc.nodes[n].parent) if (!doc.nodes[n].active) return true;
    return false;
  }

  sortZ(i) {
    const r = this.doc.renderers[i];
    const w = this.world[r.node];
    if (r.kind !== "skinned") return w[11];
    const m = this.doc.meshes[r.mesh];
    const skinned = m.weights && m.bones.every(b => b >= 0);
    const mats = skinned ? m.bones.map((b, k) => mul(this.world[b], this.meshCache[r.mesh].bind[k])) : null;
    let lo = Infinity, hi = -Infinity;
    for (let v = 0; v < m.vertices.length; v++) {
      const [vx, vy, vz] = m.vertices[v];
      let z = 0;
      if (skinned) {
        let sum = 0;
        for (const [bi, wt] of m.weights[v]) {
          const M = mats[bi];
          sum += wt;
          z += wt * (M[8] * vx + M[9] * vy + M[10] * vz + M[11]);
        }
        if (sum > 0) z /= sum;
      } else {
        z = w[8] * vx + w[9] * vy + w[10] * vz + w[11];
      }
      if (z < lo) lo = z;
      if (z > hi) hi = z;
    }
    return lo <= hi ? (lo + hi) / 2 : w[11];
  }

  drawOrder(shown) {
    const doc = this.doc;
    const q = [];
    doc.renderers.forEach((r, i) => {
      const s = this.rs[i];
      if (s.color[3] <= 0) return;
      const enabled = s.enabled || r.kind === "spine";
      if (!(shown && shown.has(i)) && (!enabled || !this.visible(r.node))) return;
      if (r.kind !== "sprite" && r.kind !== "skinned" && r.kind !== "spine") return;
      q.push([r.layer, s.order, -this.sortZ(i), i]);
    });
    q.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || a[3] - b[3]);
    return q.map(x => x[3]);
  }

  partHidden(ai) {
    this._partHidden ??= new Map();
    if (this._partHidden.has(ai)) return this._partHidden.get(ai);
    const doc = this.doc;
    const roots = doc.animators[ai]?.hide || [];
    const only = doc.animators[ai]?.only;
    const under = n => { for (; n >= 0; n = doc.nodes[n].parent) if (roots.some(r => doc.nodes[n].path === r)) return true; return false; };
    const out = new Set();
    doc.renderers.forEach((r, i) => {
      if ((roots.length && under(r.node)) || (only && !only.includes(doc.nodes[r.node].path))) out.add(i);
    });
    this._partHidden.set(ai, out);
    return out;
  }

  draw(drawer, hidden, shown, animator = -1) {
    const partOff = this.partHidden(animator);
    for (const i of this.drawOrder(shown)) {
      if (hidden && hidden.has(i)) continue;
      if (partOff.has(i) && !(shown && shown.has(i))) continue;
      this.drawRenderer(drawer, i);
    }
  }

  drawRenderer(drawer, i) {
    const doc = this.doc;
    const r = doc.renderers[i];
    const s = this.rs[i];
    const w = this.world[r.node];
    const [cr, cg, cb, ca] = s.color;
    const blend = r.blend === "additive" ? BLEND.additive : BLEND.normal;
    if (r.kind === "spine") {
      const sk = this.skel[i];
      if (!sk) return;
      const k = doc.spine[r.spine].scale * UNIT_PX;
      sk.color.set(cr, cg, cb, ca);
      drawer.skeleton(sk, { xf: [w[0] * k, w[4] * k, w[1] * k, w[5] * k, w[3] * UNIT_PX, w[7] * UNIT_PX] });
    } else if (r.kind === "sprite") {
      const sp = s.sprite ? doc.sprites[s.sprite] : null;
      if (!sp || !this.tex[sp.file]) return;
      let [x0, y0, x1, y1] = sp.rect;
      if (s.flipX) { x0 = -x0; x1 = -x1; }
      if (s.flipY) { y0 = -y0; y1 = -y1; }
      const xy = new Float32Array(8);
      [[x0, y0], [x0, y1], [x1, y1], [x1, y0]].forEach(([x, y], k) => {
        xy[k * 2] = (w[0] * x + w[1] * y + w[3]) * UNIT_PX;
        xy[k * 2 + 1] = (w[4] * x + w[5] * y + w[7]) * UNIT_PX;
      });
      drawer.emit(this.tex[sp.file], blend, xy, SPRITE_UV, 4, QUAD_TRIS, 6, cr, cg, cb, ca);
    } else if (r.kind === "skinned") {
      const m = doc.meshes[r.mesh];
      const mc = this.meshCache[r.mesh];
      if (!this.tex[m.file]) return;
      const n = m.vertices.length;
      const xy = new Float32Array(n * 2);
      const skinned = m.weights && m.bones.every(b => b >= 0);
      if (skinned) {
        const mats = m.bones.map((b, k) => mul(this.world[b], mc.bind[k]));
        for (let v = 0; v < n; v++) {
          const [vx, vy, vz] = m.vertices[v];
          let x = 0, y = 0;
          let sum = 0;
          for (const [bi, wt] of m.weights[v]) {
            const M = mats[bi];
            sum += wt;
            x += wt * (M[0] * vx + M[1] * vy + M[2] * vz + M[3]);
            y += wt * (M[4] * vx + M[5] * vy + M[6] * vz + M[7]);
          }
          if (sum > 0) { x /= sum; y /= sum; }
          xy[v * 2] = x * UNIT_PX;
          xy[v * 2 + 1] = y * UNIT_PX;
        }
      } else {
        for (let v = 0; v < n; v++) {
          const [vx, vy, vz] = m.vertices[v];
          xy[v * 2] = (w[0] * vx + w[1] * vy + w[2] * vz + w[3]) * UNIT_PX;
          xy[v * 2 + 1] = (w[4] * vx + w[5] * vy + w[6] * vz + w[7]) * UNIT_PX;
        }
      }
      drawer.emit(this.tex[m.file], blend, xy, mc.uvs, n, mc.tris, mc.tris.length, cr, cg, cb, ca);
    }
  }

  layers(animator = -1) {
    const doc = this.doc;
    const partOff = this.partHidden(animator);
    const rows = [];
    doc.renderers.forEach((r, i) => {
      if (r.kind !== "sprite" && r.kind !== "skinned" && r.kind !== "spine") return;
      let thumb = null;
      if (r.kind === "sprite") {
        const key = r.sprite ?? Object.values(doc.clips).flatMap(c => c.tracks).find(t => t.prop === "sprite" && t.node === r.node)?.values.find(v => v);
        const sp = key ? doc.sprites[key] : null;
        if (sp) thumb = { url: `${this.dir}/${sp.file}` };
      } else if (r.kind === "skinned") {
        thumb = { url: `${this.dir}/${doc.meshes[r.mesh].file}` };
      }
      rows.push({ key: i, order: r.order, layer: r.layer, name: doc.nodes[r.node].name, thumb, off: this.defaultOff(i) || partOff.has(i) });
    });
    rows.sort((a, b) => a.layer - b.layer || a.order - b.order || a.key - b.key);
    return rows;
  }
}
