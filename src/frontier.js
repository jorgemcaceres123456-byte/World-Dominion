import { W, H, CONTINENTS, rng, regionOf } from "./data.js";
import { markTerrain, tileAt, coastRealm, makeShore } from "./geography.js";
import { addEvent } from "./sim.js";
const roots = [
  [
    ["Alder", "Valen", "Raven", "Eisen", "Rosen", "Eber", "Linden", "Falken"],
    ["burg", "wald", "stein", "fels", "heim", "mark"],
  ],
  [
    ["Aki", "Hana", "Mizu", "Taka", "Kuro", "Yuki", "Hoshi", "Kaze"],
    ["gawa", "mori", "zaki", "hara", "yama", "sato"],
  ],
  [
    ["Inti", "Killa", "Suma", "Puku", "Tumi", "Aru", "Yana", "Ama"],
    ["marca", "pampa", "suyu", "tambo", "loma", "cay"],
  ],
  [
    ["Vol", "Var", "Nov", "Veli", "Belo", "Moro", "Sever", "Zelen"],
    ["grad", "gorod", "mir", "skov", "voda", "gorsk"],
  ],
  [
    ["Ash", "Kings", "Silver", "Oak", "Elder", "Thorn", "Bright", "Wester"],
    ["ford", "haven", "wick", "mere", "bridge", "hold"],
  ],
  [
    ["Al-", "Qasr ", "Dar ", "Nur ", "Ain ", "Burj ", "Wadi ", "Bab "],
    ["Rashan", "Zahir", "Khalir", "Azmar", "Samid", "Safra"],
  ],
  [
    ["Monte", "Alta", "Bella", "Porto", "Costa", "Valle", "Torre", "Riva"],
    ["doro", "verde", "luna", "chiara", "bruna", "serena"],
  ],
];
export function medievalName(s, region, random = Math.random) {
  const [a, b] = roots[region],
    used = new Set(s.realms.map((r) => r.name));
  const length = a.length * b.length,
    start = Math.floor(random() * length);
  for (let k = 0; k < length; k++) {
    const j = (start + k) % length,
      name = a[Math.floor(j / b.length)] + b[j % b.length];
    if (!used.has(name)) return name;
  }
  return `${a[0]}${b[0]} ${s.serial + 1}`;
}
export function settle(s, g, x, y) {
  const t = tileAt(g, x, y);
  if (t.kind === "ocean") return -1;
  if (t.realm >= 0 && (!s.sandbox || s.realms[t.realm].pop > 0)) return t.realm;
  const nearest = (g.originalCaps || g.caps).reduce((a, b) =>
    (b.x - x) ** 2 + (b.y - y) ** 2 < (a.x - x) ** 2 + (a.y - y) ** 2 ? b : a,
  );
  const region = t.c >= 0 ? t.c : nearest.c;
  const slot =
    (t.realm >= 0 ? s.realms[t.realm] : null) ||
    s.realms.find((r) => !r.pop && Math.floor(r.id / 9) === region) ||
    s.realms.find((r) => !r.pop);
  if (!slot) return -1;
  const id = slot.id,
    where = { x, y };
  slot.name = medievalName(
    s,
    region,
    rng(
      (s.seed + id * 6151 + Math.round(x * 1039 + y * 1259) + s.serial) >>> 0,
    ),
  );
  slot.biome = t.kind;
  slot.origin = region;
  slot.claimRadius = 5 + 12 / (s.scale || 1);
  slot.iron = 12;
  Object.assign(g.caps[id], where, { c: region });
  (s.anchors ||= {})[id] = where;
  const m = { x, y, r: slot.claimRadius, realm: id, region, kind: "settle" };
  s.marks.push(m);
  markTerrain(g, m);
  for (const o of s.objects) {
    if (o.realm < 0 && coastRealm(g, o.x, o.y) === id) {
      o.realm = id;
      if (o.class === "resource") {
        slot[o.kind] = (slot[o.kind] || 0) + 8;
      }
    }
  }
  addEvent(
    s,
    "realm",
    "Reino fundado",
    `${slot.name} se funda en ${CONTINENTS[region].name}.`,
  );
  return id;
}
// Expanding non-overwriting claims never steal a neighbour's village just because time passes.
export function growFrontiers(s) {
  if (!s.sandbox || s.steps % 4) return;
  for (const r of s.realms) {
    if (!r.pop || !r.name || !s.anchors?.[r.id]) continue;
    const old = r.claimRadius || 5,
      goal = Math.min(35, 5 + Math.sqrt(r.pop) * 1.65);
    if (old >= goal) continue;
    r.claimRadius = Math.min(goal, old + 1.5);
    s.marks.push({
      ...s.anchors[r.id],
      r: r.claimRadius,
      kind: "settle",
      realm: r.id,
      region: regionOf(s, r.id),
    });
  }
}
export function prepareWorld(s, g) {
  g.originalCaps = g.caps.map((c) => ({ ...c }));
  g.scale = s.scale || 8;
  g.sandbox = !!s.sandbox;
  g.subtiles = new Map();
  if (s.sandbox) {
    g.owner.fill(-1);
    g.decorations = g.decorations.filter((d) => d.terrain !== "structure");
  }
  if (s.empty) {
    g.owner.fill(-1);
    g.land.fill(0);
    g.tile.fill(0);
    g.river.fill(0);
    g.dist.fill(128);
    g.decorations = [];
  }
  if (!s.empty) g.shore = makeShore(g);
  g.hamlets = [];
  if (!s.sandbox && !s.empty) {
    const rnd = rng(s.seed + 1689);
    for (let j = 0; j < g.scale * 380; j++) {
      const x = Math.floor(rnd() * W),
        y = Math.floor(rnd() * H),
        idx = y * W + x,
        id = g.owner[idx];
      if (
        id < 0 ||
        !g.tile[idx] ||
        g.shore.has(idx) ||
        g.dist[idx] < 3 ||
        Math.hypot(x - g.caps[id].x, y - g.caps[id].y) < 8
      )
        continue;
      g.hamlets.push({
        id,
        c: Math.floor(id / 9),
        x,
        y,
        hamlet: true,
        kind: ["windmill", "granary", "chapel", "watchtower", "cottage"][j % 5],
      });
    }
  }
  for (const m of s.marks) markTerrain(g, m);
  for (const [id, pos] of Object.entries(s.anchors || {})) {
    Object.assign(g.caps[id], pos, { c: regionOf(s, +id) });
    const t = g.decorations.find(
      (d) => d.realm === +id && d.terrain === "structure",
    );
    if (t) Object.assign(t, pos);
  }
  return g;
}
