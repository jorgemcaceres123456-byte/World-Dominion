import { colors } from "./palette.js";
// The world atlas is a relief representation, not a single image blown up on zoom.
// Generate the visible 32-cell districts at the current detail level. Only their 256px tiles are cached.
import { W, H, rng } from "./data.js";
import { TILES, fineTile, cellDetail } from "./geography.js";
import { sprite } from "./art.js";
const C = 32,
  U = 8,
  S = C * U;
const castles = [
  "castle",
  "pagoda",
  "temple",
  "icecastle",
  "woodkeep",
  "palace",
  "lighthouse",
];
const plants = {
  forest: "oak",
  pine: "fir",
  jungle: "jungleTree",
  bamboo: "bambooPlant",
  cherry: "cherry",
  meadow: "oak",
  savanna: "autumn",
  swamp: "jungleTree",
  snow: "snowpine",
  tundra: "coldpine",
  mountain: "fir",
  desert: "cactus",
};
function hash(x, y, s) {
  let a = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + s) | 0;
  a = Math.imul(a ^ (a >>> 13), 1274126177);
  return ((a ^ (a >>> 16)) >>> 0) / 4294967296;
}
export class LocalMap {
  constructor(m) {
    this.m = m;
    this.tiles = new Map();
  }
  clear() {
    this.tiles.clear();
  }
  level(z) {
    return Math.min(
      this.m.geo.scale || 1,
      2 ** Math.max(0, Math.floor(Math.log2(z / 4))),
    );
  }
  chunk(cx, cy, L) {
    const key = L + ":" + cx + ":" + cy;
    if (this.tiles.has(key)) {
      const a = this.tiles.get(key);
      this.tiles.delete(key);
      this.tiles.set(key, a);
      return a;
    }
    const m = this.m,
      geo = m.geo,
      state = m.state,
      bx = cx * C,
      by = cy * C,
      c = document.createElement("canvas");
    c.width = S;
    c.height = S;
    const g = c.getContext("2d", { alpha: false, willReadFrequently: true });
    if (L === 1) {
      g.imageSmoothingEnabled = true;
      g.drawImage(m.base, bx, by, C, C, 0, 0, S, S);
    } else {
      if (!this.ground) {
        this.ground = document.createElement("canvas");
        this.ground.width = this.ground.height = C;
        this.gu = this.ground.getContext("2d", { willReadFrequently: true });
        this.mask = this.gu.createImageData(C, C);
      }
      const pixels = this.mask.data,
        rgba = m.terrainRGBA;
      for (let y = 0, k = 0; y < C; y++)
        for (let x = 0; x < C; x++, k += 4) {
          const xx = bx + x + 0.5,
            yy = by + y + 0.5,
            at = (Math.floor(yy / L) * W + Math.floor(xx / L)) * 4,
            relief =
              Math.round((geo.noise(xx / 10 + 17, yy / 9) - 0.5) * 8) * 2;
          pixels[k] = rgba[at] + relief;
          pixels[k + 1] = rgba[at + 1] + relief;
          pixels[k + 2] = rgba[at + 2] + relief * 0.68;
          pixels[k + 3] = 255;
        }
      this.gu.putImageData(this.mask, 0, 0);
      g.imageSmoothingEnabled = false;
      g.drawImage(this.ground, 0, 0, S, S);
    }
    g.imageSmoothingEnabled = false;
    const rr = rng(geo.seed + cx * 937 + cy * 7823),
      list = [];
    const typeofAt = (x, y) => TILES[fineTile(geo, x / L, y / L)];
    // Resolve local brush cells at their real scale instead of stretching the overview.
    if (geo.subtiles?.size || (L > 1 && geo.shore?.size)) {
      const n = geo.scale;
      for (let v = Math.floor(by / L); v < Math.ceil((by + C) / L); v++)
        for (let u = Math.floor(bx / L); u < Math.ceil((bx + C) / L); u++) {
          const i = v * W + u,
            a = cellDetail(geo, i);
          if (!a) continue;
          for (let j = 0; j < a.length; j++) {
            const xx = (u + (j % n) / n) * L,
              yy = (v + Math.floor(j / n) / n) * L,
              land = a[j],
              variation = Math.round((geo.noise(xx / 4, yy / 4) - 0.5) * 7) * 2;
            const rgb =
              colors[TILES[land]] ||
              (geo.river[i] ? [77, 141, 153] : [86, 148, 156]);
            g.fillStyle = `rgb(${rgb[0] + variation},${rgb[1] + variation},${rgb[2] + variation})`;
            g.fillRect(
              Math.floor((xx - bx) * U),
              Math.floor((yy - by) * U),
              Math.ceil((U * L) / n),
              Math.ceil((U * L) / n),
            );
          }
        }
    }
    const local = (x, y) => [
      Math.round((x - bx) * U),
      Math.round((y - by) * U),
    ];
    const rect = (x, y, w, h, color) => {
      g.fillStyle = color;
      g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    };
    for (let k = 0; k < 780; k++) {
      const x = rr() * S,
        y = rr() * S,
        wx = bx + x / U,
        wy = by + y / U,
        t = typeofAt(wx, wy),
        a = rr();
      if (t === "ocean") {
        if (a > 0.46) rect(x, y, 2 + rr() * 10, 1, "rgba(152,207,213,.30)");
        if (a > 0.91) {
          rect(x + 5, y - 1, 4, 1, "rgba(187,225,221,.36)");
          rect(x + 8, y, 4, 1, "rgba(157,199,206,.30)");
        }
        continue;
      }
      const desert = t === "desert" || t === "sand",
        ice = t === "snow" || t === "tundra";
      const shade = desert
          ? "rgba(159,120,65,.26)"
          : ice
            ? "rgba(115,146,150,.27)"
            : "rgba(68,106,58,.26)",
        light = desert
          ? "rgba(255,219,151,.62)"
          : ice
            ? "rgba(246,248,222,.7)"
            : "rgba(217,223,149,.58)";
      rect(x, y, 2 + rr() * 5, 1 + rr() * 2, shade);
      if (k % 4 === 0) rect(x - 1, y - 1, 3, 1, light);
      if (k % 6 === 0 && !desert && !ice && t !== "lava") {
        rect(x, y - 3, 1, 4, shade);
        rect(x - 2, y - 1, 1, 2, shade);
        if (a > 0.91) rect(x - 1, y - 4, 3, 2, "#e8d391");
      }
    }
    // All jitter is keyed to world coordinates; the forest has no chunk seams.
    for (
      let iy = Math.floor((by - 3) / 1.8);
      iy <= Math.ceil((by + C + 4) / 1.8);
      iy++
    )
      for (
        let ix = Math.floor((bx - 3) / 1.8);
        ix <= Math.ceil((bx + C + 4) / 1.8);
        ix++
      ) {
        const a = hash(ix, iy, geo.seed),
          b = hash(iy, ix, geo.seed + 481),
          x = ix * 1.8 + a * 1.5,
          y = iy * 1.8 + b * 1.5;
        if (x < 0 || y < 0 || x >= W * L || y >= H * L) continue;
        const j = Math.floor(y / L) * W + Math.floor(x / L),
          t = typeofAt(x, y),
          n = geo.noise(x / 9 + 113, y / 9 + 11);
        if (t === "ocean" || t === "lava") continue;
        const cap = geo.caps[geo.owner[j]];
        if (
          cap &&
          state.realms[cap.id].pop &&
          Math.hypot(x - cap.x * L, (y - cap.y * L) * 1.2) < 12
        )
          continue;
        const prob =
          t === "desert" || t === "sand"
            ? 0.035
            : t === "meadow" || t === "savanna"
              ? 0.14
              : t === "snow" || t === "tundra"
                ? 0.19
                : 0.53;
        if (a > (0.12 + n * 1.65) * prob) continue;
        let kind = plants[t],
          sz = 1.25 + b * 1.35;
        if (t === "sand" || (t === "desert" && b > 0.47)) {
          kind = "dune";
          sz = 2.8 + b;
        }
        if (t === "forest" && b > 0.57) kind = "fir";
        if (t === "jungle" && b > 0.59) kind = "palm";
        if (t === "mountain" && b > 0.48) {
          kind = "peak";
          sz = 3.2 + b * 2.9;
        }
        if (!kind) continue;
        list.push({ x, y, kind, sz });
      }
    if (!state.empty)
      for (const a of geo.decorations) {
        if (
          a.terrain !== "relief" ||
          a.x * L < bx - 10 ||
          a.x * L > bx + C + 10 ||
          a.y * L < by - 10 ||
          a.y * L > by + C + 10
        )
          continue;
        const j = a.y * W + a.x;
        if (!geo.tile[j] || geo.edited?.[j]) continue;
        for (let k = 0; k < 4; k++) {
          let x = a.x * L + Math.sin(k * 2.4 + a.x) * k * 1.1,
            y = a.y * L + Math.cos(k * 2.4 + a.y) * k;
          if (typeofAt(x, y) !== "ocean")
            list.push({ x, y, kind: a.kind, sz: 3 + a.size / 10 + k * 0.32 });
        }
      }
    if (m.layerOptions.buildings)
      for (const seat of this.seats(cx, cy, L)) {
        const cap = { ...seat, x: seat.x * L, y: seat.y * L };
        if (
          !state.realms[cap.id].pop ||
          cap.x < bx - 21 ||
          cap.y < by - 21 ||
          cap.x > bx + C + 21 ||
          cap.y > by + C + 24 ||
          typeofAt(cap.x, cap.y) === "ocean"
        )
          continue;
        const rd = rng(geo.seed + cap.id * 109),
          city = !cap.hamlet && cap.id % 9 === 0,
          count = cap.hamlet
            ? 4
            : state.sandbox
              ? Math.min(15, Math.ceil(state.realms[cap.id].pop / 10))
              : city
                ? 20
                : 13;
        for (let j = 0; j < count; j++) {
          const th = j * 2.399 + cap.id,
            rad = 4.5 + Math.sqrt(j) * 1.85,
            xx = cap.x + Math.cos(th) * rad,
            yy = cap.y + Math.sin(th) * rad * 0.78;
          if (typeofAt(xx, yy) === "ocean") continue;
          const [lx, ly] = local(xx, yy);
          for (let k = 0; k < 18; k++) {
            let t = k / 18,
              wx = cap.x + (xx - cap.x) * t,
              wy = cap.y + (yy - cap.y) * t;
            if (typeofAt(wx, wy) === "ocean") continue;
            let [u, v] = local(wx, wy);
            rect(u, v, 3, 2, "#c8b88a");
          }
          if (j % 5 === 0) {
            rect(lx - 6, ly - 2, 16, 9, "#a0905c");
            for (let k = 0; k < 4; k++) {
              rect(
                lx - 5,
                ly + k * 2,
                13,
                1,
                cap.c === 5 ? "#c8b477" : "#96ac64",
              );
              rect(lx - 4 + k * 3, ly - 1, 1, 9, "#7e8b51");
            }
          } else
            list.push({
              x: xx,
              y: yy,
              kind: cap.c === 1 && j % 3 === 0 ? "pagoda" : "town",
              sz: 2.7 + rd() * 0.85,
            });
        }
        list.push({
          x: cap.x,
          y: cap.y,
          kind: cap.hamlet
            ? cap.kind
            : state.sandbox && state.realms[cap.id].pop < 20
              ? "cottage"
              : castles[cap.c],
          sz: cap.hamlet ? 3.5 : city ? 8.3 : 6.2,
        });
      }
    list.sort((a, b) => a.y - b.y);
    for (const a of list) {
      const [lx, ly] = local(a.x, a.y),
        ww = Math.round(a.sz * U);
      rect(
        lx - ww * 0.27,
        ly - ww * 0.07,
        ww * 0.62,
        Math.max(1, ww * 0.08),
        "rgba(39,62,41,.18)",
      );
      g.drawImage(
        sprite(a.kind),
        Math.round(lx - ww / 2),
        Math.round(ly - ww * 0.93),
        ww,
        ww,
      );
    }
    this.tiles.set(key, c);
    if (this.tiles.size > 120)
      this.tiles.delete(this.tiles.keys().next().value);
    return c;
  }
  *seats(cx, cy, L) {
    yield* this.m.geo.caps;
    if (L === 1 || this.m.state.sandbox) return;
    this.regions ||= new Map();
    if (!this.regions.has(L)) {
      const grid = new Map();
      for (const h of this.m.geo.hamlets || []) {
        const key = Math.floor((h.x * L) / C) + ":" + Math.floor((h.y * L) / C);
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(h);
      }
      this.regions.set(L, grid);
    }
    const buckets = this.regions.get(L);
    for (let y = cy - 1; y <= cy + 1; y++)
      for (let x = cx - 1; x <= cx + 1; x++)
        yield* buckets.get(x + ":" + y) || [];
  }
  draw(g) {
    const { zoom: z, vw, vh } = this.m,
      L = this.level(z),
      ox = this.m.ox * L,
      oy = this.m.oy * L,
      sx = ((vw / W) * z) / L,
      sy = ((vh / H) * z) / L;
    const x0 = Math.floor(ox / C),
      x1 = Math.min(Math.ceil((W * L) / C), Math.ceil((ox + (W * L) / z) / C)),
      y0 = Math.floor(oy / C),
      y1 = Math.min(Math.ceil((H * L) / C), Math.ceil((oy + (H * L) / z) / C));
    for (let cy = y0; cy < y1; cy++)
      for (let cx = x0; cx < x1; cx++) {
        const x = Math.round((cx * C - ox) * sx),
          y = Math.round((cy * C - oy) * sy),
          w = Math.round(((cx + 1) * C - ox) * sx) - x,
          h = Math.round(((cy + 1) * C - oy) * sy) - y;
        g.drawImage(this.chunk(cx, cy, L), x, y, w, h);
      }
  }
}
