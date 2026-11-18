import { W, H, CONTINENTS, BIOMES, biomeOf, rng, clamp } from "./data.js";
export const TILES = [
  "ocean",
  ...Object.keys(BIOMES).filter((k) => k !== "ocean"),
];
export const tid = (k) => Math.max(0, TILES.indexOf(k));
export function noiseField(seed) {
  const rand = rng(seed),
    a = Float32Array.from({ length: 256 * 256 }, rand);
  return (x, y) => {
    let ix = Math.floor(x),
      iy = Math.floor(y),
      fx = x - ix,
      fy = y - iy;
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);
    ix &= 255;
    iy &= 255;
    const i0 = iy * 256,
      i1 = ((iy + 1) & 255) * 256,
      j = (ix + 1) & 255;
    const u = a[i0 + ix] + (a[i0 + j] - a[i0 + ix]) * fx,
      v = a[i1 + ix] + (a[i1 + j] - a[i1 + ix]) * fx;
    return u + (v - u) * fy;
  };
}
function fillPolygon(a, pts, value) {
  for (
    let y = Math.floor(Math.min(...pts.map((p) => p[1])));
    y < Math.ceil(Math.max(...pts.map((p) => p[1])));
    y++
  ) {
    const xs = [];
    for (let j = pts.length - 1, k = 0; k < pts.length; j = k++) {
      let [x1, y1] = pts[j],
        [x2, y2] = pts[k];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y))
        xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i < xs.length; i += 2)
      a.fill(value, y * W + Math.ceil(xs[i]), y * W + Math.ceil(xs[i + 1]));
  }
}
function distanceTransform(land) {
  const d = new Float32Array(W * H);
  d.fill(128);
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (
        (land[i] === 0) !== (land[i + 1] === 0) ||
        (land[i] === 0) !== (land[i - 1] === 0) ||
        (land[i] === 0) !== (land[i + W] === 0) ||
        (land[i] === 0) !== (land[i - W] === 0)
      )
        d[i] = 0.5;
    }
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      let i = y * W + x;
      d[i] = Math.min(
        d[i],
        d[i - 1] + 1,
        d[i - W] + 1,
        d[i - W - 1] + 1.414,
        d[i - W + 1] + 1.414,
      );
    }
  for (let y = H - 2; y > 0; y--)
    for (let x = W - 2; x > 0; x--) {
      let i = y * W + x;
      d[i] = Math.min(
        d[i],
        d[i + 1] + 1,
        d[i + W] + 1,
        d[i + W + 1] + 1.414,
        d[i + W - 1] + 1.414,
      );
    }
  return d;
}
export function createGeography(seed = 7319) {
  const rand = rng(seed),
    noise = noiseField(seed),
    raw = new Uint8Array(W * H),
    land = new Uint8Array(W * H),
    owner = new Int16Array(W * H).fill(-1),
    tile = new Uint8Array(W * H),
    caps = [];
  CONTINENTS.forEach((c, i) =>
    c.shapes.forEach((s) => fillPolygon(raw, s, i + 1)),
  );
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const xx = Math.round(
          x +
            (noise(x / 40, y / 40) - 0.5) * 31 +
            (noise(x / 9 + 25, y / 9) - 0.5) * 10 +
            (noise(x / 2, y / 2) - 0.5) * 3,
        ),
        yy = Math.round(
          y +
            (noise(x / 44 + 61, y / 44) - 0.5) * 27 +
            (noise(x / 11, y / 11 + 25) - 0.5) * 11 +
            (noise(x / 2 + 8, y / 2) - 0.5) * 3,
        );
      land[y * W + x] = raw[yy * W + xx] || 0;
    }
  let dist = distanceTransform(land);
  // Maximin sampling gives each of the nine realms its own continuous, unequal territory.
  CONTINENTS.forEach((c, ci) => {
    const places = [],
      points = [];
    for (let y = 8; y < H; y += 4)
      for (let x = 8; x < W; x += 4) {
        const i = y * W + x;
        if (land[i] === ci + 1 && dist[i] > 8) points.push({ x, y });
      }
    for (let j = 0; j < 9; j++) {
      let best = -Infinity,
        pick = points[0];
      for (let tries = 0; tries < 190; tries++) {
        const a = points[Math.floor(rand() * points.length)];
        const s =
          j === 0
            ? -Math.hypot(a.x - c.label[0], a.y - c.label[1] + 21)
            : Math.min(
                ...places.map((p) => Math.hypot(p.x - a.x, (p.y - a.y) * 1.03)),
              ) +
              Math.min(18, dist[a.y * W + a.x]) * 0.52 +
              rand() * 8;
        if (s > best) {
          best = s;
          pick = a;
        }
      }
      const p = { ...pick, id: ci * 9 + j, c: ci };
      places.push(p);
      caps.push(p);
    }
  });
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let i = y * W + x,
        c = land[i] - 1;
      if (c < 0) continue;
      let best = 1e9,
        which = c * 9;
      const xx = x + (noise(x / 33, y / 33) - 0.5) * 18,
        yy = y + (noise(x / 29 + 40, y / 29) - 0.5) * 14;
      for (let j = c * 9; j < c * 9 + 9; j++) {
        const k = caps[j],
          d = (xx - k.x) ** 2 + (yy - k.y) ** 2;
        if (d < best) {
          best = d;
          which = j;
        }
      }
      owner[i] = which;
      const n = noise(x / 34, y / 34),
        bio = biomeOf(which),
        base = CONTINENTS[c].base;
      let t =
        best < 100 || n + Math.max(0, 0.42 - best / 3600) > 0.64 ? bio : base;
      if (c === 3) {
        if (y < 101 + (noise(x / 43, y / 43) - 0.5) * 54) t = "snow";
        else if (t === "forest" || t === "meadow") t = "pine";
      }
      if (c === 5 && !(best < 150))
        t = n > 0.81 && bio !== "desert" ? bio : "desert";
      if (c === 2 && t === "desert" && n < 0.6) t = "savanna";
      tile[i] = tid(t);
    }
  // Rivers carve actual water tiles. Their mouths and lakes feed back into the coast field.
  const river = new Uint8Array(W * H);
  // Rivers wind from inland lakes to a real coastline. A downstream direction
  // avoids the closed loops that a purely noise-driven random walk would create.
  CONTINENTS.forEach((c, ci) => {
    for (let b = 0; b < (ci === 5 ? 1 : 2); b++) {
      const s = caps[ci * 9 + (b === 0 ? 0 : 4)],
        ox = s.x + 9,
        oy = s.y - 10,
        ang = rand() * Math.PI * 2;
      let len = 0;
      while (len < 210) {
        len++;
        const xx = Math.round(ox + Math.cos(ang) * len),
          yy = Math.round(oy + Math.sin(ang) * len);
        if (land[yy * W + xx] !== ci + 1) break;
      }
      const cs = Math.cos(ang),
        sn = Math.sin(ang),
        phase = rand() * 6,
        amp = 3 + rand() * 4;
      for (let st = 0; st < len + 7; st += 0.48) {
        const bend =
            Math.sin(st / 14 + phase) * amp * Math.min(1, st / 8) +
            Math.sin(st / 5.3 + 0.7) * 1.6,
          xx = Math.round(ox + cs * st - sn * bend),
          yy = Math.round(oy + sn * st + cs * bend),
          i = yy * W + xx;
        if (!land[i]) {
          if (st > 8) break;
          continue;
        }
        river[i] = 1;
        river[i + 1] = 1;
        if (st > len * 0.5 && b === 0) river[i + W] = 1;
      }
      if (b === 0) {
        for (let y = -5; y <= 5; y++)
          for (let x = -7; x <= 7; x++) {
            let i = (oy + y) * W + ox + x;
            if (
              land[i] === ci + 1 &&
              (x * x) / 40 + (y * y) / 16 <
                0.83 + noise(x / 3 + ci, y / 3) * 0.5
            )
              river[i] = 1;
          }
      }
    }
  });
  // Keep a little habitable ground around the seat, including where local streets will be drawn.
  for (const p of caps) {
    const dry = (x, y) => {
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          const j = (y + dy) * W + x + dx;
          if (river[j] || owner[j] !== p.id) return false;
        }
      return true;
    };
    if (dry(p.x, p.y)) continue;
    const ax = p.x,
      ay = p.y;
    let found = false;
    for (let rr = 1; rr < 18 && !found; rr++)
      for (let k = 0; k < 16; k++) {
        const x = Math.round(ax + Math.cos((k * Math.PI) / 8) * rr),
          y = Math.round(ay + Math.sin((k * Math.PI) / 8) * rr);
        if (dry(x, y)) {
          p.x = x;
          p.y = y;
          found = true;
          break;
        }
      }
  }
  // Regional climate may vary at the frontiers, but every seat retains its country's assigned biome.
  for (const p of caps) {
    const type = tid(biomeOf(p.id));
    for (let yy = Math.max(0, p.y - 15); yy <= Math.min(H - 1, p.y + 15); yy++)
      for (
        let xx = Math.max(0, p.x - 15);
        xx <= Math.min(W - 1, p.x + 15);
        xx++
      ) {
        const at = yy * W + xx;
        if (
          owner[at] === p.id &&
          !river[at] &&
          (xx - p.x) ** 2 + (yy - p.y) ** 2 <
            (9 + 6 * noise(xx / 9, yy / 9)) ** 2
        )
          tile[at] = type;
      }
  }
  const decorations = [];
  const mountain = (kind, x, y, size) =>
    decorations.push({
      kind,
      x: Math.round(x),
      y: Math.round(y),
      size,
      terrain: "relief",
    });
  // Irregular chains follow an axial ridge, rather than scattering isolated cone symbols.
  for (let c = 0; c < 7; c++) {
    const targets = caps
      .slice(c * 9, c * 9 + 9)
      .filter((a) => ["mountain", "snow"].includes(biomeOf(a.id)));
    targets.push(caps[c * 9 + (c === 3 ? 0 : 1)]);
    for (const [j, s] of targets.entries()) {
      const count = c === 3 ? 11 : c === 5 ? 6 : 7,
        ang = -0.5 + rand() * 1.25;
      for (let k = 0; k < count; k++) {
        const dx = (k - count / 2) * 7.4,
          xx = Math.round(s.x + dx * Math.cos(ang)),
          yy = Math.round(s.y - 6 + dx * Math.sin(ang) + (rand() - 0.5) * 14);
        const i = yy * W + xx;
        if (land[i] === c + 1 && dist[i] > 5)
          mountain(
            c === 5 ? "sandpeak" : c === 3 ? "icepeak" : "peak",
            xx,
            yy,
            15 + rand() * 17 + (k % 3 === 0 ? 5 : 0),
          );
      }
    }
  }
  const trees = {
    forest: "oak",
    pine: "pine",
    bamboo: "bambooPlant",
    jungle: "jungleTree",
    cherry: "cherry",
    meadow: "oak",
    savanna: "autumn",
    tundra: "coldpine",
    swamp: "jungleTree",
    snow: "snowpine",
    desert: "dune",
    mountain: "pine",
  };
  for (let n = 0; n < 9000; n++) {
    let x = 6 + Math.floor(rand() * (W - 12)),
      y = 6 + Math.floor(rand() * (H - 12)),
      i = y * W + x,
      c = land[i] - 1;
    if (c < 0 || river[i] || dist[i] < 4) continue;
    let t = TILES[tile[i]],
      cluster = noise(x / 24 + 113, y / 24 + 11),
      chance =
        t === "meadow" || t === "savanna"
          ? 0.61
          : t === "tundra" || t === "snow"
            ? 0.58
            : 0.4;
    if (cluster < chance && rand() > 0.09) continue;
    const cap = caps[owner[i]];
    if (Math.hypot(x - cap.x, y - cap.y) < 8) continue;
    let kind = trees[t] || "oak";
    if (t === "forest" && (c === 0 || c === 6) && rand() > 0.38) kind = "fir";
    if (c === 1 && rand() > 0.73) kind = "cherry";
    if (c === 4 && rand() > 0.82) kind = "autumn";
    if (c === 2 && (t === "jungle" || t === "meadow") && rand() > 0.66)
      kind = "palm";
    if (c === 3 && t !== "snow") kind = "coldpine";
    if (t === "desert") {
      if (rand() > 0.35) continue;
      kind = rand() > 0.78 ? "cactus" : "dune";
    }
    decorations.push({
      kind,
      x,
      y,
      size: (kind === "dune" ? 14 : 9) + rand() * (kind === "palm" ? 13 : 11),
      terrain: "plant",
    });
  }
  const cities = [
    "castle",
    "pagoda",
    "temple",
    "icecastle",
    "woodkeep",
    "palace",
    "lighthouse",
  ];
  for (const s of caps) {
    const capital = s.id % 9 === 0,
      monument = capital || s.id % 9 === 3;
    decorations.push({
      kind: monument ? cities[s.c] : "town",
      x: s.x,
      y: s.y,
      size: capital ? 47 : monument ? 29 : 19 + rand() * 4,
      terrain: "structure",
      realm: s.id,
      capital,
    });
  }
  decorations.sort((a, b) => a.y - b.y);
  for (let i = 0; i < river.length; i++) if (river[i]) tile[i] = 0;
  return {
    seed,
    rand,
    noise,
    land,
    owner,
    tile,
    dist,
    river,
    caps,
    decorations,
  };
}
// Only coast cells need a second natural terrain mask. Generate their beaches and inlets
// on the physical grid; interior land and open seas remain a single byte in the overview.
export function makeShore(g) {
  const masks = new Map(),
    n = g.scale,
    beach = tid("sand"),
    snow = tid("snow");
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x,
        land = g.tile[i];
      if (!land) continue;
      const w = !g.tile[i - 1],
        e = !g.tile[i + 1],
        no = !g.tile[i - W],
        so = !g.tile[i + W];
      if (!w && !e && !no && !so) continue;
      const a = new Uint8Array(n * n);
      for (let j = 0; j < a.length; j++) {
        const u = ((j % n) + 0.5) / n,
          v = (Math.floor(j / n) + 0.5) / n;
        const dx = Math.min(w ? u : 1, e ? 1 - u : 1),
          dy = Math.min(no ? v : 1, so ? 1 - v : 1);
        const coast =
            Math.min(dx, dy) - Math.max(0, 0.6 - Math.max(dx, dy)) * 0.45,
          shore = 0.045 + 0.24 * g.noise(x * 2.7 + u * 2, y * 2.7 + v * 2);
        a[j] =
          coast < shore
            ? 0
            : coast < shore + 0.17
              ? land === snow
                ? snow
                : beach
              : land;
      }
      masks.set(i, a);
    }
  return masks;
}
export const cellDetail = (g, i) =>
  g.subtiles?.get(i) || (!g.edited?.[i] && g.shore?.get(i)) || null;
export function fineTile(geo, x, y) {
  const xx = clamp(x, 0, W - 0.0001),
    yy = clamp(y, 0, H - 0.0001),
    i = Math.floor(yy) * W + Math.floor(xx),
    a = cellDetail(geo, i),
    s = geo.scale || 1;
  return a
    ? a[(Math.floor(yy * s) % s) * s + (Math.floor(xx * s) % s)]
    : geo.tile[i];
}
export function tileAt(geo, x, y) {
  const i = clamp(Math.floor(y), 0, H - 1) * W + clamp(Math.floor(x), 0, W - 1),
    t = fineTile(geo, x, y);
  return {
    i,
    kind: TILES[t],
    realm: t ? geo.owner[i] : -1,
    c: geo.land[i] - 1,
  };
}
// A water prop can serve a kingdom at the bank, but the open sea has no treasury.
export function coastRealm(geo, x, y, t = tileAt(geo, x, y)) {
  if (t.kind !== "ocean") return t.realm;
  const step = 1 / (geo.scale || 1);
  for (let n = 1; n <= 3; n++)
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const id = tileAt(geo, x + dx * step * n, y + dy * step * n).realm;
      if (id >= 0) return id;
    }
  return -1;
}
const nearestCap = (g, x, y) =>
  (g.originalCaps || g.caps).reduce((a, b) =>
    (b.x - x) ** 2 + (b.y - y) ** 2 < (a.x - x) ** 2 + (a.y - y) ** 2 ? b : a,
  );
function coarseCell(g, i, x, y, t) {
  g.tile[i] = t;
  g.river[i] = 0;
  (g.edited ||= new Uint8Array(W * H))[i] = 1;
  if (t) {
    if (!g.land[i] || (!g.sandbox && g.owner[i] < 0)) {
      const p = nearestCap(g, x, y);
      if (!g.sandbox && g.owner[i] < 0) g.owner[i] = p.id;
      g.land[i] = p.c + 1;
    }
  } else {
    g.land[i] = 0;
    if (g.sandbox) g.owner[i] = -1;
  }
}
// A detailed brush subdivides only touched atlas cells; a colossal ocean allocates no empty sectors.
function fineMark(g, m, t) {
  const n = g.scale,
    r = Math.max(0.7 / n, m.r),
    surfaces = (g.subtiles ||= new Map());
  for (
    let y = Math.max(0, Math.floor(m.y - r));
    y <= Math.min(H - 1, Math.floor(m.y + r));
    y++
  )
    for (
      let x = Math.max(0, Math.floor(m.x - r));
      x <= Math.min(W - 1, Math.floor(m.x + r));
      x++
    ) {
      const i = y * W + x;
      let arr =
          surfaces.get(i) ||
          (!g.edited?.[i] && g.shore?.get(i)?.slice()) ||
          new Uint8Array(n * n).fill(g.tile[i]),
        changed = false;
      for (let j = 0; j < n * n; j++) {
        const dx = x + ((j % n) + 0.5) / n - m.x,
          dy = y + (Math.floor(j / n) + 0.5) / n - m.y;
        if (dx * dx + dy * dy <= r * r) {
          arr[j] = t;
          changed = true;
        }
      }
      if (!changed) continue;
      const counts = new Uint16Array(TILES.length);
      for (const v of arr) counts[v]++;
      let major = 0,
        score = 0;
      for (let k = 1; k < counts.length; k++)
        if (counts[k] > score) {
          score = counts[k];
          major = k;
        }
      coarseCell(g, i, x, y, major);
      if (arr.every((v) => v === major)) surfaces.delete(i);
      else surfaces.set(i, arr);
    }
}
export function markTerrain(geo, mark) {
  const { x, y, r, kind } = mark,
    t = tid(kind),
    claim = kind === "claim" || kind === "settle";
  if (
    claim &&
    (!Number.isInteger(mark.realm) || mark.realm < 0 || mark.realm >= 63)
  )
    return;
  if (!Number.isFinite(r) || !Number.isFinite(x) || !Number.isFinite(y)) return;
  if (mark.detail && !claim && geo.scale > 1) {
    fineMark(geo, mark, t);
    return;
  }
  const radius = clamp(r, 0.8, 65);
  for (
    let yy = Math.max(0, Math.floor(y - radius));
    yy <= Math.min(H - 1, Math.ceil(y + radius));
    yy++
  )
    for (
      let xx = Math.max(0, Math.floor(x - radius));
      xx <= Math.min(W - 1, Math.ceil(x + radius));
      xx++
    ) {
      let d = (x - xx) ** 2 + (y - yy) ** 2;
      if (d > radius * radius * (0.88 + 0.18 * geo.noise(xx / 4, yy / 4)))
        continue;
      let i = yy * W + xx;
      if (claim) {
        if (
          geo.tile[i] &&
          (kind !== "settle" || geo.owner[i] < 0 || geo.owner[i] === mark.realm)
        ) {
          geo.owner[i] = mark.realm;
          if (!geo.sandbox || !geo.land[i])
            geo.land[i] = (mark.region ?? Math.floor(mark.realm / 9)) + 1;
        }
        continue;
      }
      geo.subtiles?.delete(i);
      coarseCell(geo, i, xx, yy, t);
    }
}
export function updateDepth(geo) {
  geo.dist = distanceTransform(geo.land);
}
