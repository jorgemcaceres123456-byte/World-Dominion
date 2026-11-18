import { LocalMap } from "./local-map.js";
import { W, H, CONTINENTS, realmName, clamp, rng } from "./data.js";
import { TILES, tileAt, updateDepth } from "./geography.js";
import { sprite, citySprite } from "./art.js";
import { colors } from "./palette.js";
import { OBJECTS } from "./objects.js";
const makeCanvas = (w, h) => {
  const el = document.createElement("canvas");
  el.width = w;
  el.height = h;
  return el;
};
const nearest = (g) => {
  g.imageSmoothingEnabled = false;
  return g;
};
export class AtlasMap {
  constructor(el, geo, state, callbacks) {
    this.el = el;
    this.geo = geo;
    this.state = state;
    this.cb = callbacks;
    this.canvas = el.querySelector("canvas");
    this.ctx = nearest(this.canvas.getContext("2d", { alpha: false }));
    this.base = makeCanvas(W, H);
    this.bg = nearest(this.base.getContext("2d"));
    this.art = makeCanvas(W, H);
    this.ag = nearest(this.art.getContext("2d"));
    this.bounds = makeCanvas(W, H);
    this.zoom = 1;
    this.ox = 0;
    this.oy = 0;
    this.selection = null;
    this.cursor = null;
    this.dirty = true;
    this.lastFrame = 0;
    this.pointer = null;
    this.effect = [];
    this.boatTime = 0;
    this.lastTime = performance.now();
    this.layerOptions = {
      labels: true,
      borders: false,
      buildings: true,
      ...state.layers,
    };
    this.touches = new Map();
    this.mini = el.querySelector(".mini-atlas");
    this.miniCanvas = this.mini?.querySelector("canvas");
    const travel = (u, v) => {
      this.ox = W * clamp(u, 0, 1) - W / this.zoom / 2;
      this.oy = H * clamp(v, 0, 1) - H / this.zoom / 2;
      this.constrain();
      this.dirty = true;
    };
    this.mini?.addEventListener("click", (e) => {
      if (!e.detail) return;
      const r = this.mini.getBoundingClientRect();
      travel((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    });
    this.mini?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.setZoom(1);
      }
    });
    this.local = new LocalMap(this);
    this.paintTerrain();
    this.buildArt();
    this.buildBounds();
    this.bind();
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(el);
    this.loop = (t) => {
      const moving =
        !this.state.paused &&
        !document.hidden &&
        !document.querySelector("dialog[open]");
      if (
        this.dirty ||
        ((moving || this.effect.length > 0) && t - this.lastFrame > 90)
      ) {
        this.draw(t);
        this.lastFrame = t;
        this.dirty = false;
      }
      this.raf = requestAnimationFrame(this.loop);
    };
    this.raf = requestAnimationFrame(this.loop);
    document.fonts.ready.then(() => (this.dirty = true));
  }
  resize() {
    let r = this.el.getBoundingClientRect();
    this.vw = Math.max(1, r.width);
    this.vh = Math.max(1, r.height);
    const d = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = d;
    this.canvas.width = Math.round(r.width * d);
    this.canvas.height = Math.round(r.height * d);
    this.ctx.setTransform(d, 0, 0, d, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    this.dirty = true;
  }
  paintTerrain(box) {
    const { tile, land, dist, noise, river, edited } = this.geo;
    const [bx, by, ex, ey] = box || [0, 0, W, H];
    const x0 = clamp(Math.floor(bx), 0, W - 1),
      y0 = clamp(Math.floor(by), 0, H - 1),
      x1 = clamp(Math.ceil(ex), x0 + 1, W),
      y1 = clamp(Math.ceil(ey), y0 + 1, H);
    let im = this.bg.createImageData(x1 - x0, y1 - y0),
      a = im.data,
      k = 0;
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++, k += 4) {
        const i = y * W + x,
          d = dist[i],
          t = TILES[tile[i]],
          world = land[i] - 1;
        let red, grn, blu;
        const n = noise(x / 41 + 10, y / 38),
          n2 = noise(x / 13, y / 12),
          chip = noise(Math.floor(x / 2) * 0.48, Math.floor(y / 2) * 0.48),
          gr = chip > 0.75 ? 1 : chip < 0.2 ? -1 : 0;
        if (!tile[i]) {
          if (river[i]) {
            [red, grn, blu] = d > 4 ? [75, 140, 155] : [96, 162, 164];
            if (river[i - 1] && !river[i + 1]) {
              red += 24;
              grn += 18;
              blu += 12;
            }
          } else {
            const depth = d + (n2 - 0.5) * Math.min(12, d * 0.64);
            if (depth < 1.4) {
              [red, grn, blu] = n2 > 0.38 ? [156, 195, 178] : [118, 176, 168];
            } else if (depth < 3.6) {
              [red, grn, blu] = [96, 158, 159];
            } else if (depth < 6.2 + n) {
              [red, grn, blu] = [69, 133, 147];
            } else {
              const u = Math.max(0, 1 - (depth - 6) / 42),
                f = u * u,
                q = Math.floor(n * 4) * 0.85 + Math.floor(n2 * 3) * 0.5;
              red = 31 + f * 25 + q;
              grn = 65 + f * 53 + q;
              blu = 94 + f * 45 + q;
            }
          }
          if (!river[i] && d > 6) {
            let wave = noise(x / 22, y / 3.1);
            if (wave > 0.79) {
              red += 3;
              grn += 5;
              blu += 5;
            }
            if (x % 48 === 0 || y % 48 === 0) {
              red += 2;
              grn += 3;
              blu += 3;
            }
          }
        } else {
          let rgb = colors[t] || colors.forest;
          [red, grn, blu] = rgb;
          if (d < 3.6 + n2 * 2 && !edited?.[i]) {
            if (world === 3 && t === "snow") {
              red = 201;
              grn = 210;
              blu = 187;
            } else {
              red = 217;
              grn = 196;
              blu = 139;
            }
            if (d < 1.5) {
              if (!land[i + W] && land[i - W] && n > 0.25) {
                red -= 36;
                grn -= 35;
                blu -= 23;
              } else {
                red += 12;
                grn += 9;
                blu += 7;
              }
            }
          } else if (
            !edited?.[i] &&
            d < 5.8 + n2 * 2 &&
            t !== "sand" &&
            t !== "snow"
          ) {
            red = (red * 2 + 191) / 3;
            grn = (grn * 2 + 180) / 3;
            blu = (blu * 2 + 121) / 3;
          }
          const slope =
            (noise(x / 28, y / 22) - noise((x - 2.5) / 28, (y - 2.5) / 22)) *
            105;
          const light =
            (Math.floor(n * 7) - 3) * 3.3 +
            (Math.floor(n2 * 5) - 2) * 2.2 +
            Math.round(slope / 2) * 2 +
            gr * 2.4 +
            (noise(x / 9, y / 3) > 0.75 ? 4 : 0);
          red += light;
          grn += light;
          blu += light * 0.76;
          if (t === "desert" && d > 3) {
            const ridge = Math.sin(
              y * 0.39 + x * 0.1 + noise(x * 0.025, y * 0.026) * 9,
            );
            if (ridge > 0.83 && n2 > 0.45) {
              red += 10;
              grn += 7;
              blu += 4;
            }
          }
          if (t === "lava" && noise(x / 4, y / 4) > 0.65) {
            red = 232;
            grn = 142;
            blu = 65;
          }
        }
        a[k] = red;
        a[k + 1] = grn;
        a[k + 2] = blu;
        a[k + 3] = 255;
      }
    // Local tiles sample dry/wet colours independently: no blurred band over a river.
    if (x0 === 0 && x1 === W && y0 === 0 && y1 === H) this.terrainRGBA = a;
    else
      for (let y = y0; y < y1; y++) {
        const n = (y - y0) * (x1 - x0) * 4;
        this.terrainRGBA.set(
          a.subarray(n, n + (x1 - x0) * 4),
          (y * W + x0) * 4,
        );
      }
    this.bg.putImageData(im, x0, y0);
  }
  buildArt() {
    const g = this.ag,
      geo = this.geo,
      random = rng(geo.seed + 61);
    g.clearRect(0, 0, W, H);
    g.imageSmoothingEnabled = false;
    // Tiny threads of foam and wind give the ocean a hand-tiled surface.
    for (let k = 0; k < 3600; k++) {
      let x = Math.floor(random() * W),
        y = Math.floor(random() * H),
        i = y * W + x,
        rr = random();
      if (geo.tile[i] || geo.river[i]) continue;
      const d = geo.dist[i];
      g.fillStyle =
        d < 11
          ? "rgba(186,219,201,.51)"
          : rr < 0.42
            ? "rgba(123,168,181,.35)"
            : "rgba(104,149,171,.27)";
      const w = 2 + Math.floor(random() * 7);
      g.fillRect(x, y, w, 1);
      if (rr > 0.62) {
        g.fillRect(x + w, y - 1, 3, 1);
        g.fillRect(x + w + 3, y, 3, 1);
      }
      if (rr > 0.9) g.fillRect(x - 2, y + 3, 5, 1);
    }
    for (let i = 0; i < 6500; i++) {
      let x = Math.floor(random() * W),
        y = Math.floor(random() * H),
        k = y * W + x;
      if (!geo.tile[k] || geo.dist[k] < 5) continue;
      let t = TILES[geo.tile[k]];
      g.fillStyle =
        t === "snow"
          ? "#edf0db"
          : t === "desert"
            ? "rgba(166,126,75,.34)"
            : "rgba(77,114,64,.34)";
      g.fillRect(x, y, 2, 1);
      if (i % 3 === 0) {
        g.fillRect(x + 2, y - 1, 1, 1);
        g.fillRect(x - 1, y - 1, 1, 1);
      }
      if (i % 5 === 0) {
        g.fillStyle = t === "desert" ? "#ecd18c" : "rgba(216,218,149,.85)";
        g.fillRect(x + 2, y + 1, 2, 1);
      }
    }
    // Sandy tracks connect neighbouring settlements without crossing open water.
    for (const cap of geo.caps) {
      if (this.state.sandbox) continue;
      let near = null,
        dd = Infinity;
      for (const p of geo.caps) {
        if (p.c !== cap.c || p === cap) continue;
        let ds = Math.hypot(p.x - cap.x, p.y - cap.y);
        if (ds < dd) {
          dd = ds;
          near = p;
        }
      }
      if (!near) continue;
      for (let i = 0; i < dd; i++) {
        let t = i / dd,
          x = Math.round(
            cap.x + (near.x - cap.x) * t + Math.sin(t * Math.PI) * 3,
          ),
          y = Math.round(cap.y + (near.y - cap.y) * t + Math.sin(t * 6.2) * 4),
          j = y * W + x;
        if (geo.land[j] && geo.tile[j] && geo.dist[j] > 3 && !geo.edited?.[j]) {
          g.fillStyle = i % 4 === 1 ? "#bba77a" : "#ceb987";
          g.fillRect(x, y, 2, 1);
        }
      }
    }
    const dd = [...geo.decorations];
    if (geo.edited) {
      for (let y = 3; y < H; y += 5)
        for (let x = 4; x < W; x += 5) {
          const i = y * W + x;
          if (!geo.edited[i]) continue;
          const kind = TILES[geo.tile[i]],
            a = geo.noise(x * 0.7, y * 0.7);
          if (
            a > 0.51 &&
            [
              "forest",
              "mountain",
              "snow",
              "jungle",
              "cherry",
              "bamboo",
              "pine",
              "tundra",
              "swamp",
            ].includes(kind)
          ) {
            const sp = {
              forest: "oak",
              mountain: "peak",
              snow: "icepeak",
              jungle: "palm",
              pine: "fir",
              cherry: "cherry",
              bamboo: "bambooPlant",
              tundra: "coldpine",
              swamp: "jungleTree",
            }[kind];
            dd.push({
              kind: sp,
              x,
              y,
              size: kind === "mountain" || kind === "snow" ? 16 : 11,
              isEdit: true,
              terrain: "plant",
            });
          }
        }
      dd.sort((a, b) => a.y - b.y);
    }
    for (const q of dd) {
      const i = Math.floor(q.y) * W + Math.floor(q.x);
      if (
        !geo.tile[i] ||
        (!q.isEdit && geo.edited?.[i] && q.terrain !== "structure") ||
        (q.terrain === "structure" && !this.layerOptions.buildings)
      )
        continue;
      const s = Math.round(q.size),
        w = s;
      g.drawImage(
        q.capital ? citySprite(q.kind) : sprite(q.kind),
        Math.round(q.x - w / 2),
        Math.round(q.y - s * 0.92),
        w,
        s,
      );
    }
    if (this.miniCanvas) {
      const m = this.miniCanvas;
      this.miniBase ||= makeCanvas(m.width, m.height);
      const ctx = this.miniBase.getContext("2d");
      ctx.drawImage(this.base, 0, 0, m.width, m.height);
      ctx.drawImage(this.art, 0, 0, m.width, m.height);
    }
  }
  buildBounds() {
    const path = [];
    this.frontier = path;
    const g = this.bounds.getContext("2d"),
      im = g.createImageData(W, H),
      a = im.data;
    for (let i = 0; i < W * H; i++) {
      if (!this.geo.tile[i]) continue;
      const own = this.geo.owner[i],
        xx = i % W,
        yy = Math.floor(i / W);
      const edge = (n) =>
        this.geo.tile[n] &&
        this.geo.owner[n] !== own &&
        (own >= 0 || this.geo.owner[n] >= 0);
      const right = xx < W - 1 && edge(i + 1),
        down = yy < H - 1 && edge(i + W);
      if (!right && !down) continue;
      if (right) path.push([xx + 1, yy, xx + 1, yy + 1]);
      if (down) path.push([xx, yy + 1, xx + 1, yy + 1]);
      a.set([91, 78, 73, 150], i * 4);
    }
    g.putImageData(im, 0, 0);
  }
  selectionOverlay(id) {
    this.selection = id;
    this.highlight = null;
    if (id != null) {
      const h = makeCanvas(W, H),
        g = h.getContext("2d"),
        im = g.createImageData(W, H);
      for (let i = 0; i < W * H; i++) {
        if (this.geo.tile[i] && this.geo.owner[i] === id) {
          let edge = [i - 1, i + 1, i - W, i + W].some(
            (n) => this.geo.owner[n] !== id || !this.geo.tile[n],
          );
          im.data.set(edge ? [250, 221, 141, 250] : [246, 203, 108, 26], i * 4);
        }
      }
      g.putImageData(im, 0, 0);
      this.highlight = h;
    }
    this.dirty = true;
  }
  refreshTerrain(box, final = false) {
    this.local.clear();
    if (final) updateDepth(this.geo);
    this.paintTerrain(box);
    if (final) {
      this.buildArt();
      this.buildBounds();
    }
    this.dirty = true;
  }
  screen(x, y) {
    return [
      (((x - this.ox) * this.vw) / W) * this.zoom,
      (((y - this.oy) * this.vh) / H) * this.zoom,
    ];
  }
  world(px, py) {
    return {
      x: this.ox + ((px / this.vw) * W) / this.zoom,
      y: this.oy + ((py / this.vh) * H) / this.zoom,
    };
  }
  setZoom(z, px = this.vw / 2, py = this.vh / 2) {
    const a = this.world(px, py);
    this.zoom = clamp(z, 1, 32 * (this.geo.scale || 1));
    this.ox = a.x - ((px / this.vw) * W) / this.zoom;
    this.oy = a.y - ((py / this.vh) * H) / this.zoom;
    this.constrain();
    this.dirty = true;
    this.cb.zoom(this.zoom);
  }
  constrain() {
    this.ox = clamp(this.ox, 0, W - W / this.zoom);
    this.oy = clamp(this.oy, 0, H - H / this.zoom);
  }
  focus(id, z = 3) {
    const p = this.geo.caps[id];
    this.zoom = z;
    this.ox = p.x - W / z / 2;
    this.oy = p.y - H / z / 2;
    this.constrain();
    this.dirty = true;
    this.cb.zoom(z);
  }
  setLayer(k, v) {
    this.layerOptions[k] = v;
    this.local.clear();
    if (k === "buildings") this.buildArt();
    this.state.layers = { ...this.layerOptions };
    this.dirty = true;
  }
  flash(x, y, color = "#f8d07e", kind = "pulse") {
    if (this.effect.length > 32) this.effect.shift();
    this.effect.push({ x, y, color, kind, start: performance.now() });
    this.dirty = true;
  }
  draw(now) {
    if (this.mini) {
      this.mini.classList.toggle("hide", this.zoom < 1.35);
      if (this.zoom >= 1.35) {
        const m = this.miniCanvas,
          ctx = m.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.miniBase, 0, 0);
        ctx.strokeStyle = "#ffe2a2";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(
          (this.ox / W) * m.width + 0.5,
          (this.oy / H) * m.height + 0.5,
          Math.max(2, m.width / this.zoom - 1),
          Math.max(2, m.height / this.zoom - 1),
        );
      }
    }
    const g = this.ctx,
      geo = this.geo,
      vw = this.vw,
      vh = this.vh,
      z = this.zoom,
      sx = (vw / W) * z,
      sy = (vh / H) * z,
      ox = this.ox,
      oy = this.oy;
    g.save();
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, vw, vh);
    const dt = Math.min(350, now - this.lastTime);
    this.lastTime = now;
    if (!this.state.paused && !document.querySelector("dialog[open]"))
      this.boatTime += (dt * this.state.speed) / 1000;
    g.drawImage(this.base, ox, oy, W / z, H / z, 0, 0, vw, vh);
    if (z < 4.5) g.drawImage(this.art, ox, oy, W / z, H / z, 0, 0, vw, vh);
    if (z > 3.1) {
      g.globalAlpha = clamp((z - 3.1) / 1.4, 0, 1);
      this.local.draw(g);
      g.globalAlpha = 1;
    }
    if (this.layerOptions.borders || this.state.mode === "kingdom") {
      if (z < 4.5) {
        g.drawImage(this.bounds, ox, oy, W / z, H / z, 0, 0, vw, vh);
      } else if (this.frontier) {
        g.save();
        // Cull in world space: stroking an entire 32× atlas wastes huge GPU surfaces.
        g.lineWidth = 1.25;
        g.setLineDash([4, 3]);
        g.strokeStyle = "rgba(83,68,54,.8)";
        g.beginPath();
        for (const [x, y, xx, yy] of this.frontier) {
          if (
            x < ox - 1 ||
            y < oy - 1 ||
            x > ox + W / z + 1 ||
            y > oy + H / z + 1
          )
            continue;
          g.moveTo((x - ox) * sx, (y - oy) * sy);
          g.lineTo((xx - ox) * sx, (yy - oy) * sy);
        }
        g.stroke();
        g.restore();
      }
    }
    if (this.highlight && z < 4.5) {
      g.globalAlpha = clamp(2.5 / z, 0.28, 1);
      g.drawImage(this.highlight, ox, oy, W / z, H / z, 0, 0, vw, vh);
      g.globalAlpha = 1;
    }
    const drawObj = (kind, x, y, ww, hh = ww) => {
      const [px, py] = this.screen(x, y);
      if (px < -ww || py < -hh || px > vw + ww || py > vh + hh) return;
      g.drawImage(
        sprite(kind),
        Math.round(px - ww / 2),
        Math.round(py - hh * 0.9),
        Math.round(ww),
        Math.round(hh),
      );
    };
    const iso = Math.min(sx, sy),
      lod = this.local.level(z);
    for (const [i, start] of [
      [0, [447, 222]],
      [1, [593, 448]],
      [2, [270, 311]],
      [3, [986, 343]],
    ]) {
      let t = this.boatTime * 0.015 + i,
        x = start[0] + Math.sin(t) * 10,
        y = start[1] + Math.cos(t * 0.7) * 3;
      if (
        !this.state.empty &&
        !this.state.sandbox &&
        tileAt(geo, x, y).kind === "ocean"
      )
        drawObj(
          i % 2 ? "redship" : "ship",
          x,
          y,
          ((i % 2 ? 22 : 25) * iso) / (z > 2 ? Math.sqrt(z * 0.5) : 1),
        );
    }
    if (z > 1.65) {
      // Local level of detail: hamlets, residents and fine ground cover.
      const mod = clamp((z - 1.65) / 1.2, 0, 1);
      g.globalAlpha = mod;
      for (const p of geo.caps) {
        if (!this.state.realms[p.id].pop) continue;
        if (
          p.x < ox - 28 ||
          p.y < oy - 28 ||
          p.x > ox + W / z + 28 ||
          p.y > oy + H / z + 28
        )
          continue;
        for (
          let j = 0;
          j <
          (z > 4
            ? Math.min(38, Math.floor(this.state.realms[p.id].pop / 14) + 2)
            : 6);
          j++
        ) {
          let t = j * 2.4 + p.id,
            xx = p.x + (Math.sin(t) * (4 + (j % 15) * 0.85)) / lod,
            yy = p.y + (Math.cos(t) * (3 + (j % 15) * 0.75)) / lod;
          if (tileAt(geo, xx, yy).kind === "ocean") continue;
          if (z < 4.2 && j % 3 === 0 && this.layerOptions.buildings)
            drawObj(p.c === 1 ? "pagoda" : "village", xx, yy, 3.5 * iso);
          else if (z > 2.7)
            drawObj(
              Object.keys(this.state.realms[p.id].races).find(
                (k) => this.state.realms[p.id].races[k] > 0,
              ) || "human",
              xx + (Math.sin(this.boatTime * 0.25 + t) * 0.9) / lod,
              yy + (Math.cos(this.boatTime * 0.3 + t) * 0.6) / lod,
              ((z > 4 ? 1.36 : 2.1) * iso) / lod,
            );
        }
      }
      g.globalAlpha = 1;
    }
    for (const a of this.state.objects || []) {
      if (
        a.x < ox - 24 ||
        a.y < oy - 24 ||
        a.x > ox + W / z + 24 ||
        a.y > oy + H / z + 24
      )
        continue;
      if (a.class === "building" && !this.layerOptions.buildings) continue;
      if (
        tileAt(geo, a.x, a.y).kind === "ocean" &&
        a.kind !== "portal" &&
        !["water", "either"].includes(OBJECTS[a.objectId]?.surface)
      )
        continue;
      const mix = clamp((z - 2.6) / 2.8, 0, 1),
        s =
          ((a.kind === "portal" ? 20 : a.class === "unit" ? 11 : 13) *
            (1 - mix) +
            (a.kind === "portal"
              ? 6
              : a.class === "unit"
                ? 1.9
                : a.class === "building"
                  ? 4.2
                  : 2.6) *
              mix) *
          iso;
      const unit = a.class === "unit" || a.class === "animal",
        dx = unit ? Math.sin(this.boatTime * 0.32 + a.x) * 0.7 : 0;
      drawObj(a.kind, a.x + dx / lod, a.y, s / lod);
    }
    const text = (
      s,
      x,
      y,
      fs,
      col = "#fff3d6",
      stroke = true,
      spacing = 0.6,
    ) => {
      g.save();
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = `600 ${fs}px Pixelify, monospace`;
      if ("letterSpacing" in g) g.letterSpacing = spacing + "px";
      if (stroke) {
        g.lineJoin = "round";
        g.lineWidth = 3.6;
        g.strokeStyle = "#293b36";
        g.strokeText(s, Math.round(x), Math.round(y) + 1);
        g.strokeText(s, Math.round(x), Math.round(y));
      }
      g.fillStyle = col;
      g.fillText(s, Math.round(x), Math.round(y));
      g.restore();
    };
    if (this.layerOptions.labels) {
      if (z < 2.05 && !this.state.sandbox) {
        if (z < 1.5 && vw > 550 && !this.state.empty) {
          for (const [s, x, y] of [
            ["Mar de los Ecos", 406, 271],
            ["Océano Austral", 547, 528],
          ]) {
            let [px, py] = this.screen(x, y);
            g.save();
            g.textAlign = "center";
            g.font = `italic ${clamp(vw / 85, 10, 15)}px Georgia, serif`;
            g.fillStyle = "rgba(164,194,203,.66)";
            g.fillText(s, px, py);
            g.restore();
          }
        }
        for (const [ci, c] of CONTINENTS.entries()) {
          if (
            this.state.empty &&
            !this.state.realms.slice(ci * 9, ci * 9 + 9).some((r) => r.pop)
          )
            continue;
          const origin = this.state.empty
            ? geo.caps[
                this.state.realms.slice(ci * 9, ci * 9 + 9).find((r) => r.pop)
                  .id
              ]
            : null;
          const [px, py] = this.screen(
            ...(origin ? [origin.x, origin.y + 6] : c.label),
          );
          text(
            c.name.toUpperCase(),
            px,
            py,
            clamp(vw / 62, 12, 20),
            "#fff2ce",
            true,
            1.15,
          );
        }
      } else {
        for (const p of geo.caps) {
          if (!this.state.realms[p.id].pop || tileAt(geo, p.x, p.y).realm < 0)
            continue;
          const [px, py] = this.screen(p.x, p.y + 2 / lod);
          if (px < -60 || px > vw + 60 || py < -25 || py > vh + 25) continue;
          text(
            realmName(this.state, p.id),
            px,
            py,
            clamp(vw / 70, 12, 18),
            "#fff3da",
            true,
            0.25,
          );
        }
      }
    }
    for (const fx of this.effect) {
      const t = (now - fx.start) / 1250;
      if (t < 0 || t > 1) continue;
      const [x, y] = this.screen(fx.x, fx.y),
        k = fx.kind,
        alpha = Math.max(0, 1 - t),
        dot = (dx, dy, w, h, col) => {
          g.fillStyle = col;
          g.fillRect(Math.round(x + dx), Math.round(y + dy), w, h);
        };
      g.globalAlpha = alpha;
      g.strokeStyle = fx.color;
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(x, y, 4 + t * 32, 0, Math.PI * 2);
      g.stroke();
      if (k === "meteor") {
        if (t < 0.53) {
          const d = 1 - t / 0.53;
          for (let j = 0; j < 6; j++)
            dot(
              -d * 66 - j * 4,
              -d * 81 - j * 5,
              8 - j,
              8 - j,
              j % 2 ? "#e9b368" : "#de935c",
            );
          dot(-d * 66, -d * 81, 8, 7, "#816b61");
        } else {
          for (let j = 0; j < 15; j++) {
            const u = (t - 0.53) / 0.47;
            dot(
              Math.cos(j * 2.4) * u * 35,
              Math.sin(j * 2.4) * u * 28 - u * 12,
              3,
              3,
              j % 2 ? "#df955b" : "#f5cb80",
            );
          }
        }
      }
      if (k === "rain" || k === "storm") {
        for (let j = 0; j < 22; j++) {
          const dx = Math.sin(j * 2.4) * 34,
            dy = ((j * 7 + t * 90) % 50) - 43;
          dot(dx - t * 5, dy, 1, 4, "#abd5de");
        }
        if (k === "storm" && t < 0.45) {
          g.strokeStyle = "#f5e3a5";
          g.lineWidth = 2.5;
          g.beginPath();
          g.moveTo(x + 6, y - 49);
          g.lineTo(x - 3, y - 25);
          g.lineTo(x + 5, y - 28);
          g.lineTo(x - 2, y);
          g.stroke();
        }
      }
      if (k === "fire" || k === "quake") {
        for (let j = 0; j < 15; j++) {
          const dx = Math.sin(j * 2.4) * t * 25,
            dy =
              k === "fire"
                ? -((t * 33 + j * 5) % 36)
                : Math.sin(j * 4 + t * 6) * t * 12;
          dot(
            dx,
            dy,
            2 + (j % 3),
            2 + (j % 2),
            k === "quake" ? "#ccae83" : j % 2 ? "#e9a057" : "#dd8054",
          );
        }
      }
      if (["portal", "invasion", "bless", "magic", "summon"].includes(k)) {
        for (let j = 0; j < 11; j++) {
          const a = j * 2.4 + t * 1.8,
            rad = (k === "portal" ? 1 - t : t) * 25;
          dot(Math.cos(a) * rad, Math.sin(a) * rad - t * 13, 2, 2, fx.color);
          if (j % 3 === 0)
            dot(
              Math.cos(a) * rad - 1,
              Math.sin(a) * rad - t * 13 + 1,
              4,
              1,
              fx.color,
            );
        }
      }
    }
    g.globalAlpha = 1;
    this.effect = this.effect.filter((v) => now - v.start < 1250);
    const tool = this.cb.tool();
    if (
      this.cursor &&
      !this.pointer?.pan &&
      !this.touches.size &&
      tool.id !== "inspect" &&
      this.state.mode === "creator"
    ) {
      const cr = this.cursor,
        r = tool.paint ? this.cb.radius() * sx : 9;
      g.strokeStyle = "rgba(255,232,184,.9)";
      g.fillStyle = "rgba(253,224,166,.13)";
      g.setLineDash([3, 3]);
      g.beginPath();
      g.ellipse(
        cr.x,
        cr.y,
        r,
        tool.paint ? this.cb.radius() * sy : r,
        0,
        0,
        Math.PI * 2,
      );
      g.fill();
      g.stroke();
      g.setLineDash([]);
    }
    g.restore();
  }
  bind() {
    const c = this.canvas,
      pt = (e) => {
        const r = c.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
    const down = (e) => {
      this.cb.closeMenus();
      const a = pt(e);
      c.setPointerCapture(e.pointerId);
      if (e.pointerType === "touch") {
        this.touches.set(e.pointerId, a);
        if (this.touches.size === 2) {
          this.pointer = null;
          const [a, b] = this.touches.values();
          this.pinch = Math.hypot(a.x - b.x, a.y - b.y);
          return;
        }
      }
      let tool = this.cb.tool();
      this.pointer = {
        id: e.pointerId,
        start: a,
        last: a,
        moved: false,
        pan:
          e.button === 2 ||
          e.button === 1 ||
          e.shiftKey ||
          this.spaceHeld ||
          tool.id === "inspect",
        painting: false,
        box: null,
      };
      if (!this.pointer.pan) {
        this.pointer.pending = e.pointerType === "touch";
        if (!this.pointer.pending) this.act(a, true);
        this.pointer.painting = tool.paint;
      }
      this.cursor = a;
      c.classList.add("dragging");
    };
    c.addEventListener("pointerdown", down);
    c.addEventListener("contextmenu", (e) => e.preventDefault());
    c.addEventListener("pointermove", (e) => {
      const a = pt(e);
      this.cursor = a;
      if (this.touches.has(e.pointerId)) {
        this.touches.set(e.pointerId, a);
        if (this.touches.size === 2) {
          const [u, v] = this.touches.values(),
            d = Math.hypot(u.x - v.x, u.y - v.y);
          if (this.pinch > 0)
            this.setZoom(
              (this.zoom * d) / this.pinch,
              (u.x + v.x) / 2,
              (u.y + v.y) / 2,
            );
          this.pinch = d;
          return;
        }
      }
      const p = this.pointer;
      if (p?.id === e.pointerId) {
        if (Math.hypot(a.x - p.start.x, a.y - p.start.y) > 3) p.moved = true;
        if (p.pan && p.moved) {
          this.ox -= (((a.x - p.last.x) / this.vw) * W) / this.zoom;
          this.oy -= (((a.y - p.last.y) / this.vh) * H) / this.zoom;
          this.constrain();
        } else if (
          p.painting &&
          Math.hypot(a.x - p.last.x, a.y - p.last.y) > 1
        ) {
          p.pending = false;
          this.act(a, false, p.last);
        }
        p.last = a;
      }
      const w = this.world(a.x, a.y);
      this.cb.hover(w, tileAt(this.geo, w.x, w.y));
      this.dirty = true;
    });
    const up = (e) => {
      this.touches.delete(e.pointerId);
      const p = this.pointer;
      if (p?.id === e.pointerId) {
        if (p.pending && !p.moved && e.type !== "pointercancel")
          this.act(pt(e), true);
        if (
          p.pan &&
          !p.moved &&
          e.type !== "pointercancel" &&
          e.button === 0 &&
          !e.shiftKey &&
          !this.spaceHeld &&
          this.cb.tool().id === "inspect"
        )
          this.act(pt(e), true);
        if (p.box)
          this.refreshTerrain(
            p.box.map((v, i) => v + (i < 2 ? -24 : 24)),
            true,
          );
        this.cb.finished();
      }
      this.pointer = null;
      c.classList.remove("dragging");
      this.dirty = true;
    };
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
    c.addEventListener("pointerleave", () => {
      this.cursor = null;
      this.cb.hover(null, null);
      this.dirty = true;
    });
    c.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const a = pt(e);
        this.setZoom(this.zoom * Math.exp(-e.deltaY * 0.0026), a.x, a.y);
      },
      { passive: false },
    );
    c.addEventListener("dblclick", (e) => {
      if (this.cb.tool().id === "inspect") {
        let a = pt(e);
        this.setZoom(this.zoom * 1.8, a.x, a.y);
      }
    });
  }
  act(a, first, from = null) {
    const prev = from ? this.world(from.x, from.y) : null,
      w = this.world(a.x, a.y),
      steps = prev
        ? clamp(
            Math.ceil(
              Math.hypot(w.x - prev.x, w.y - prev.y) /
                Math.max(0.45 / (this.geo.scale || 1), this.cb.radius() * 0.65),
            ),
            1,
            80,
          )
        : 1;
    let box = null;
    const union = (u, v) =>
      !u
        ? v
        : [
            Math.min(u[0], v[0]),
            Math.min(u[1], v[1]),
            Math.max(u[2], v[2]),
            Math.max(u[3], v[3]),
          ];
    for (let j = 1; j <= steps; j++) {
      const v = prev
        ? {
            x: prev.x + ((w.x - prev.x) * j) / steps,
            y: prev.y + ((w.y - prev.y) * j) / steps,
          }
        : w;
      const patch = this.cb.at(v, tileAt(this.geo, v.x, v.y), first);
      if (patch) box = union(box, patch);
    }
    if (box && this.pointer) {
      this.pointer.box = union(this.pointer.box, box);
      this.refreshTerrain(box);
    }
  }
}
