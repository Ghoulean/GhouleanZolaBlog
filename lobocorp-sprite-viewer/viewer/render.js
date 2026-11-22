"use strict";

const BLEND = { normal: 0, additive: 1 };

class GLTexture extends spine.Texture {
  constructor(gl, bitmap, pma) {
    super(bitmap);
    this.gl = gl;
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.pma = pma;
  }
  setFilters() {}
  setWraps() {}
  dispose() { this.gl.deleteTexture(this.tex); }
}

class Batcher {
  constructor(gl) {
    this.gl = gl;
    const vs = `attribute vec2 aPos; attribute vec4 aColor; attribute vec2 aUV;
      uniform mat3 uProj; varying vec4 vColor; varying vec2 vUV;
      void main() { vec3 p = uProj * vec3(aPos, 1.0); gl_Position = vec4(p.xy, 0.0, 1.0); vColor = aColor; vUV = aUV; }`;
    const fs = `precision mediump float; varying vec4 vColor; varying vec2 vUV; uniform sampler2D uTex;
      void main() { gl_FragColor = texture2D(uTex, vUV) * vColor; }`;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = this.prog = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    this.loc = {
      pos: gl.getAttribLocation(p, "aPos"), color: gl.getAttribLocation(p, "aColor"), uv: gl.getAttribLocation(p, "aUV"),
      proj: gl.getUniformLocation(p, "uProj"), tex: gl.getUniformLocation(p, "uTex"),
    };
    this.max = 65536;
    this.verts = new Float32Array(this.max * 8);
    this.idx = new Uint16Array(this.max * 3);
    this.vbo = gl.createBuffer();
    this.ibo = gl.createBuffer();
    this.nv = 0;
    this.ni = 0;
    this.texture = null;
    this.blend = BLEND.normal;
  }

  begin(proj) {
    const gl = this.gl;
    gl.useProgram(this.prog);
    gl.uniformMatrix3fv(this.loc.proj, false, proj);
    gl.uniform1i(this.loc.tex, 0);
    gl.enable(gl.BLEND);
    this.applyBlend();
    this.nv = this.ni = 0;
    this.texture = null;
  }

  applyBlend() {
    const gl = this.gl;
    if (this.blend === BLEND.additive) gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  draw(texture, blend, verts, nVerts, tris, nTris) {
    if (texture !== this.texture || blend !== this.blend || this.nv + nVerts > this.max || this.ni + nTris > this.max * 3) {
      this.flush();
      this.texture = texture;
      if (blend !== this.blend) { this.blend = blend; this.applyBlend(); }
    }
    this.verts.set(verts.subarray ? verts.subarray(0, nVerts * 8) : verts.slice(0, nVerts * 8), this.nv * 8);
    const base = this.nv;
    for (let i = 0; i < nTris; i++) this.idx[this.ni + i] = tris[i] + base;
    this.nv += nVerts;
    this.ni += nTris;
  }

  flush() {
    if (!this.ni || !this.texture) { this.nv = this.ni = 0; return; }
    const gl = this.gl, L = this.loc;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture.tex);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.verts.subarray(0, this.nv * 8), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.idx.subarray(0, this.ni), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(L.pos);
    gl.vertexAttribPointer(L.pos, 2, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(L.color);
    gl.vertexAttribPointer(L.color, 4, gl.FLOAT, false, 32, 8);
    gl.enableVertexAttribArray(L.uv);
    gl.vertexAttribPointer(L.uv, 2, gl.FLOAT, false, 32, 24);
    gl.drawElements(gl.TRIANGLES, this.ni, gl.UNSIGNED_SHORT, 0);
    this.nv = this.ni = 0;
  }

  end() { this.flush(); }
}

const QUAD_TRIS = [0, 1, 2, 2, 3, 0];

class Drawer {
  constructor(batcher) {
    this.b = batcher;
    this.buf = new Float32Array(8 * 4096);
    this.clipper = new spine.SkeletonClipping();
    this.world = new Float32Array(4096);
    this.lastBounds = null;
  }

  ensure(n) {
    if (this.buf.length < n * 8) this.buf = new Float32Array(n * 8 * 2);
    if (this.world.length < n * 2) this.world = new Float32Array(n * 4);
  }

  track(x, y) {
    const b = this.bounds;
    if (!b) return;
    if (x < b.minX) b.minX = x;
    if (x > b.maxX) b.maxX = x;
    if (y < b.minY) b.minY = y;
    if (y > b.maxY) b.maxY = y;
  }

  emit(texture, blend, xy, uvs, n, tris, nTris, r, g, bl, a, xf) {
    if (a <= 0) return;
    this.ensure(n);
    const v = this.buf;
    const pr = r * a, pg = g * a, pb = bl * a;
    for (let i = 0; i < n; i++) {
      let x = xy[i * 2], y = xy[i * 2 + 1];
      if (xf) { const tx = xf[0] * x + xf[2] * y + xf[4]; y = xf[1] * x + xf[3] * y + xf[5]; x = tx; }
      this.track(x, y);
      const o = i * 8;
      v[o] = x; v[o + 1] = y;
      v[o + 2] = pr; v[o + 3] = pg; v[o + 4] = pb; v[o + 5] = a;
      v[o + 6] = uvs[i * 2]; v[o + 7] = uvs[i * 2 + 1];
    }
    if (this.b) this.b.draw(texture, blend, v, n, tris, nTris);
  }

  skeleton(sk, opts = {}) {
    const hidden = opts.hidden;
    const xf = opts.xf || null;
    const clipper = this.clipper;
    const skc = sk.color;
    for (const slot of opts.order || sk.drawOrder) {
      if (slot.gift) {
        if (hidden && hidden.has(slot.key)) continue;
        const att = slot.att;
        this.ensure(4);
        att.computeWorldVertices(slot.bone, this.world, 0, 2);
        const ac = att.color;
        this.emit(att.region.texture, BLEND.normal, this.world, att.uvs, 4, QUAD_TRIS, 6, skc.r * ac.r, skc.g * ac.g, skc.b * ac.b, skc.a * ac.a, xf);
        continue;
      }
      const att = slot.getAttachment();
      if (!att) { clipper.clipEndWithSlot(slot); continue; }
      if (hidden && hidden.has(slot.data.index)) { clipper.clipEndWithSlot(slot); continue; }
      if (att instanceof spine.ClippingAttachment) { clipper.clipStart(slot, att); continue; }
      let n, uvs, tris, tex;
      if (att instanceof spine.RegionAttachment) {
        this.ensure(4);
        att.computeWorldVertices(slot.bone, this.world, 0, 2);
        n = 4; uvs = att.uvs; tris = QUAD_TRIS; tex = att.region.texture;
      } else if (att instanceof spine.MeshAttachment) {
        n = att.worldVerticesLength >> 1;
        this.ensure(n);
        att.computeWorldVertices(slot, 0, att.worldVerticesLength, this.world, 0, 2);
        uvs = att.uvs; tris = att.triangles; tex = att.region.texture;
      } else { clipper.clipEndWithSlot(slot); continue; }
      const sc = slot.color, ac = opts.tint?.get(slot.data.index) || att.color;
      const r = skc.r * sc.r * ac.r, g = skc.g * sc.g * ac.g, b = skc.b * sc.b * ac.b, a = skc.a * sc.a * ac.a;
      const blend = slot.data.blendMode === spine.BlendMode.Additive ? BLEND.additive : BLEND.normal;
      if (clipper.isClipping()) {
        const pr = r * a, pg = g * a, pb = b * a;
        const light = new spine.Color(pr, pg, pb, a);
        clipper.clipTriangles(this.world, n * 2, tris, tris.length, uvs, light, light, false);
        const cv = clipper.clippedVertices, ct = clipper.clippedTriangles;
        const m = cv.length / 8;
        if (m) {
          const xy = new Float32Array(m * 2), uv = new Float32Array(m * 2);
          for (let i = 0; i < m; i++) { xy[i * 2] = cv[i * 8]; xy[i * 2 + 1] = cv[i * 8 + 1]; uv[i * 2] = cv[i * 8 + 6]; uv[i * 2 + 1] = cv[i * 8 + 7]; }
          this.emit(tex, blend, xy, uv, m, ct, ct.length, r, g, b, a, xf);
        }
      } else {
        this.emit(tex, blend, this.world, uvs, n, tris, tris.length, r, g, b, a, xf);
      }
      clipper.clipEndWithSlot(slot);
    }
    clipper.clipEnd();
  }
}

async function loadBitmap(url, pma = false) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const blob = await res.blob();
  return createImageBitmap(blob, { premultiplyAlpha: pma ? "none" : "premultiply", colorSpaceConversion: "none" });
}

function atlasPages(text) {
  const pages = [];
  let expectPage = true, last = null;
  for (const raw of text.split(/\r\n|\r|\n/)) {
    const line = raw.trim();
    if (!line) { expectPage = true; continue; }
    if (expectPage) { last = { name: line }; pages.push(last); expectPage = false; continue; }
    const m = last && last.w == null && /^size:\s*(\d+)\s*,\s*(\d+)/.exec(line);
    if (m) { last.w = +m[1]; last.h = +m[2]; }
    last = null;
  }
  return pages;
}

async function loadSpine(gl, dir, skelFile, atlasFile, pma) {
  const [atlasText, json] = await Promise.all([
    fetch(`${dir}/${atlasFile}`).then(r => { if (!r.ok) throw new Error(`${r.status} ${dir}/${atlasFile}`); return r.text(); }),
    fetch(`${dir}/${skelFile}`).then(r => { if (!r.ok) throw new Error(`${r.status} ${dir}/${skelFile}`); return r.text(); }),
  ]);
  const pages = atlasPages(atlasText);
  const bitmaps = await Promise.all(pages.map(p => loadBitmap(`${dir}/${p.name}`, pma)));
  const tex = {};
  pages.forEach((p, i) => {
    const t = new GLTexture(gl, bitmaps[i], pma);
    const w = p.w || bitmaps[i].width, h = p.h || bitmaps[i].height;
    t.thumbScale = [bitmaps[i].width / w, bitmaps[i].height / h];
    t._image = { width: w, height: h };
    tex[p.name] = t;
  });
  const atlas = new spine.TextureAtlas(atlasText, name => tex[name]);
  pages.forEach((p, i) => { tex[p.name]._image = bitmaps[i]; });
  const sj = new spine.SkeletonJson(new spine.AtlasAttachmentLoader(atlas));
  sj.scale = 1;
  const data = sj.readSkeletonData(json.replace(/^﻿/, ""));
  return { data, atlas, textures: Object.values(tex) };
}
