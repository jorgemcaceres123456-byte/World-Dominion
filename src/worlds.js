import { W, H, clamp } from "./data.js";
import { freshWorld, decodeWorld, SAVE_KEY } from "./sim.js";
import { STARTER_KIT } from "./objects.js";
export const DEFAULT = "aethoria",
  PREFIX = "aethoria.world.v2:";
export const SIZES = [
  { value: 2, name: "Grande" },
  { value: 4, name: "Gigante" },
  { value: 8, name: "Colosal" },
];
export const worldSize = (s) =>
  SIZES.find((z) => z.value === s.scale) || SIZES[2];
export const dimensions = (s) => ({
  width: W * worldSize(s).value,
  height: H * worldSize(s).value,
});
export function newSlot({
  id = DEFAULT,
  name = "Aethoria",
  seed = 7319,
  template = "atlas",
  scale = 8,
  unlimited = true,
  speed = 1,
} = {}) {
  const sandbox = template !== "atlas",
    s = freshWorld(seed, name, sandbox);
  Object.assign(s, {
    slotId: id,
    template,
    sandbox,
    empty: template === "ocean",
    scale: SIZES.some((v) => v.value === scale) ? scale : 8,
    unlimited,
    supplies: { ...STARTER_KIT },
    speed: clamp(Math.round(speed), 1, 10),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  for (const r of s.realms) r.iron = 12;
  if (sandbox)
    s.events[0].text =
      template === "ocean"
        ? "Pinta una isla y coloca un humano para fundar su primer reino."
        : "La tierra está lista. Coloca un humano para fundar su primer reino.";
  return s;
}
export function writeSlot(s, store) {
  try {
    s.updatedAt = Date.now();
    (store || localStorage).setItem(PREFIX + s.slotId, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}
const read = (store, key) => {
  try {
    return (store || localStorage).getItem(key);
  } catch {
    return null;
  }
};
export function readSlot(id = DEFAULT, store) {
  const raw = read(store, PREFIX + id);
  if (!raw) return id === DEFAULT ? newSlot() : null;
  const s = decodeWorld(raw);
  if (!s || s.slotId !== id) return null;
  return s;
}
export function migrateOldSave(store) {
  try {
    store = store || localStorage;
    if (store.getItem("aethoria.migrated.v2")) return;
    const s = decodeWorld(store.getItem(SAVE_KEY));
    if (!s) return;
    const standard = !s.empty && s.seed === 7319;
    const id =
      standard && !store.getItem(PREFIX + DEFAULT)
        ? DEFAULT
        : "legado-" + s.seed;
    if (!store.getItem(PREFIX + id)) {
      Object.assign(s, {
        slotId: id,
        template: s.empty ? "ocean" : "atlas",
        scale: 8,
        sandbox: false,
        unlimited: true,
        supplies: { ...STARTER_KIT },
        createdAt: Date.now(),
      });
      for (const r of s.realms) r.iron ??= 12;
      if (!writeSlot(s, store)) return;
    }
    store.setItem("aethoria.migrated.v2", "1");
  } catch {
    /* Keep the old slot untouched on failure. */
  }
}
export function listWorlds(store) {
  const ids = new Set([DEFAULT]);
  try {
    store = store || localStorage;
    for (let j = 0; j < store.length; j++) {
      const k = store.key(j);
      if (k?.startsWith(PREFIX)) ids.add(k.slice(PREFIX.length));
    }
  } catch {}
  return Array.from(ids, (id) => readSlot(id, store))
    .filter(Boolean)
    .sort((a, b) =>
      a.slotId === DEFAULT
        ? -1
        : b.slotId === DEFAULT
          ? 1
          : b.updatedAt - a.updatedAt,
    );
}
export function removeSlot(id, store) {
  if (id === DEFAULT) return false;
  try {
    (store || localStorage).removeItem(PREFIX + id);
    return true;
  } catch {
    return false;
  }
}
export function newId() {
  return `m-${globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8)}`;
}
export const gameURL = (id, extra = {}) =>
  `?${new URLSearchParams({ mundo: id, ...extra })}`;
