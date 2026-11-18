import { tileAt, coastRealm, cellDetail } from "./geography.js";
import { OBJECTS } from "./objects.js";
import { W, realmName } from "./data.js";
import { addEvent } from "./sim.js";

// Territory, not the marker on the atlas, is the source of truth. If a coast
// washes away a capital, move the seat of government to its nearest dry tile.
export function survey(state, geo, reconcile = false) {
  const counts = new Float64Array(63),
    nearest = new Int32Array(63).fill(-1),
    cost = new Float64Array(63).fill(Infinity);
  for (let at = 0; at < geo.tile.length; at++) {
    if (!geo.tile[at]) continue;
    const id = geo.owner[at];
    if (id < 0) continue;
    const sub = cellDetail(geo, at);
    counts[id] += sub
      ? sub.reduce((n, t) => n + Number(!!t), 0) / sub.length
      : 1;
    if (!reconcile) continue;
    const p = geo.caps[id],
      x = at % W,
      y = Math.floor(at / W),
      d = (x - p.x) ** 2 + (y - p.y) ** 2;
    if (d < cost[id]) {
      cost[id] = d;
      nearest[id] = at;
    }
  }
  geo.areas = counts;
  if (!reconcile) return;
  for (const r of state.realms) {
    if (!r.pop) continue;
    const cap = geo.caps[r.id],
      at = Math.floor(cap.y) * W + Math.floor(cap.x);
    if (counts[r.id]) {
      if (tileAt(geo, cap.x, cap.y).realm !== r.id) {
        const dest = nearest[r.id],
          pos = { x: dest % W, y: Math.floor(dest / W) },
          sub = cellDetail(geo, dest);
        if (sub) {
          const j = sub.findIndex(Boolean),
            n = geo.scale;
          pos.x += ((j % n) + 0.5) / n;
          pos.y += (Math.floor(j / n) + 0.5) / n;
        }
        Object.assign(cap, pos);
        (state.anchors ||= {})[r.id] = pos;
        const town = geo.decorations.find(
          (d) => d.realm === r.id && d.terrain === "structure",
        );
        if (town) Object.assign(town, pos);
      }
    } else {
      const to = geo.tile[at] ? state.realms[geo.owner[at]] : null;
      if (to && to !== r) {
        to.pop += r.pop;
        for (const [race, n] of Object.entries(r.races))
          to.races[race] = (to.races[race] || 0) + n;
        to.gold += r.gold;
        to.mages += r.mages;
        addEvent(
          state,
          "realm",
          "Territorio reunido",
          `${realmName(state, r.id)} se incorpora a ${realmName(state, to.id)}.`,
        );
      } else
        addEvent(
          state,
          "world",
          "Reino sumergido",
          `Las aguas cubren el último territorio de ${realmName(state, r.id)}.`,
        );
      r.pop = 0;
      r.races = {};
      r.buildings = 0;
      r.mages = 0;
      r.gold = 0;
      for (const k of Object.keys(state.treaties)) {
        if (k.split(":").map(Number).includes(r.id)) delete state.treaties[k];
      }
    }
  }
  // Move the singular inhabitants' census entries along with an edited border.
  state.objects = state.objects.filter((o) => {
    const t = tileAt(geo, o.x, o.y),
      old = state.realms[o.realm],
      spec = OBJECTS[o.objectId];
    if (spec) {
      const owner = coastRealm(geo, o.x, o.y, t),
        fits =
          t.kind === "ocean"
            ? spec.surface !== "land"
            : spec.surface !== "water";
      if (o.class === "building" && old && (!fits || o.realm !== owner))
        old.buildings = Math.max(0, old.buildings - 1);
      if (!fits) return false;
      if (
        o.class === "building" &&
        o.realm !== owner &&
        state.realms[owner]?.pop
      )
        state.realms[owner].buildings++;
      o.realm = owner;
      return true;
    }
    if (!old) {
      if (o.class === "unit" || o.class === "gate") return false;
      o.realm = t.realm;
      return t.kind !== "ocean";
    }
    if (t.kind !== "ocean") {
      const id = t.realm;
      if (id < 0) {
        if (o.class === "unit" && counts[o.realm]) {
          o.x = geo.caps[o.realm].x;
          o.y = geo.caps[o.realm].y;
          return true;
        }
        o.realm = id;
        return o.class !== "unit" && o.class !== "gate";
      }
      if (id !== o.realm) {
        const to = state.realms[id],
          race = ["mage", "invasion", "spirit", "possessed"].includes(o.kind)
            ? "human"
            : o.kind;
        if (o.class === "unit" && old.races[race] > 0) {
          old.races[race]--;
          old.pop--;
          to.races[race] = (to.races[race] || 0) + 1;
          to.pop++;
          if (o.kind === "mage" || o.kind === "invasion") {
            old.mages = Math.max(0, old.mages - 1);
            to.mages++;
          }
        }
        o.realm = id;
      }
      return true;
    }
    if (o.class === "unit" && old.pop && counts[o.realm]) {
      o.x = geo.caps[o.realm].x;
      o.y = geo.caps[o.realm].y;
      return true;
    }
    return false;
  });
  geo.decorations.sort((a, b) => a.y - b.y);
}
