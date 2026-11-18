import test from "node:test";
import assert from "node:assert/strict";
import { W, H, regionOf, realmName, rng } from "../src/data.js";
import { createGeography, markTerrain, tileAt } from "../src/geography.js";
import {
  freshWorld,
  summon,
  liveRealms,
  advance,
  SAVE_KEY,
} from "../src/sim.js";
import {
  DEFAULT,
  PREFIX,
  SIZES,
  newSlot,
  readSlot,
  listWorlds,
  writeSlot,
  migrateOldSave,
  removeSlot,
  dimensions,
} from "../src/worlds.js";
import {
  CATALOG,
  construction,
  STARTER_KIT,
  installObject,
  gatherObjects,
} from "../src/objects.js";
import {
  medievalName,
  prepareWorld,
  settle,
  growFrontiers,
} from "../src/frontier.js";
import { survey } from "../src/territory.js";
class Store extends Map {
  get length() {
    return this.size;
  }
  key(i) {
    return Array.from(this.keys())[i] ?? null;
  }
  getItem(k) {
    return this.get(k) ?? null;
  }
  setItem(k, v) {
    this.set(k, v);
  }
  removeItem(k) {
    this.delete(k);
  }
}
const build = (s) => prepareWorld(s, createGeography(s.seed));
const paint = (s, g, m) => {
  s.marks.push(m);
  markTerrain(g, m);
};

test("Archivo: crear, continuar y eliminar mundos no modifica el atlas original", () => {
  const store = new Store(),
    original = readSlot(DEFAULT, store),
    a = newSlot({ id: "a", name: "I", template: "wild", scale: 2, speed: 7 }),
    b = newSlot({
      id: "b",
      name: "II",
      template: "ocean",
      scale: 4,
      speed: 10,
    });
  assert.equal(store.length, 0);
  assert.equal(liveRealms(original).length, 63);
  assert.equal(liveRealms(a).length, 0);
  assert.equal(liveRealms(b).length, 0);
  for (const s of [a, original, b]) assert.ok(writeSlot(s, store));
  const originalRaw = store.getItem(PREFIX + DEFAULT);
  a.year = 9;
  writeSlot(a, store);
  assert.equal(readSlot("a", store).year, 9);
  assert.equal(readSlot("b", store).year, 1);
  assert.equal(readSlot("a", store).speed, 7);
  assert.equal(listWorlds(store).length, 3);
  assert.equal(removeSlot(DEFAULT, store), false);
  assert.ok(removeSlot("a", store));
  assert.equal(readSlot("a", store), null);
  assert.equal(store.getItem(PREFIX + DEFAULT), originalRaw);
  assert.equal(newSlot({ speed: 99 }).speed, 10);
  assert.equal(newSlot({ speed: 0 }).speed, 1);
  assert.equal(
    writeSlot(b, {
      setItem() {
        throw new Error("quota");
      },
    }),
    false,
  );
});

test("Migración V1 idempotente: ni el mundo antiguo ni otra partida se reemplazan", () => {
  for (const existed of [false, true]) {
    const store = new Store(),
      old = freshWorld(7319, "Mi atlas antiguo");
    old.year = 190;
    const raw = JSON.stringify(old);
    store.setItem(SAVE_KEY, raw);
    if (existed) writeSlot(newSlot(), store);
    migrateOldSave(store);
    migrateOldSave(store);
    assert.equal(store.getItem(SAVE_KEY), raw);
    assert.equal(listWorlds(store).length, existed ? 2 : 1);
    assert.equal(readSlot(existed ? "legado-7319" : DEFAULT, store).year, 190);
    if (existed) assert.equal(readSlot(DEFAULT, store).year, 128);
  }
  const store = new Store();
  store.setItem(SAVE_KEY, JSON.stringify(freshWorld(42, "Mi isla", true)));
  migrateOldSave(store);
  assert.ok(readSlot("legado-42", store).empty);
  assert.equal(liveRealms(readSlot(DEFAULT, store)).length, 63);
});

test("Escalas físicas: 40.704.000 celdas en colosal; dos pinceladas independientes caben en una celda del atlas", () => {
  for (const z of SIZES) {
    assert.deepEqual(dimensions(newSlot({ scale: z.value })), {
      width: W * z.value,
      height: H * z.value,
    });
  }
  const s = newSlot({ id: "isla", template: "ocean", scale: 8 }),
    g = build(s);
  assert.equal(dimensions(s).width * dimensions(s).height, 40704000);
  assert.equal(g.subtiles.size, 0);
  const x = 80 + 1.5 / 8,
    y = 65 + 1.5 / 8,
    x2 = x + 4 / 8;
  paint(s, g, { kind: "forest", x, y, r: 0.09, detail: true });
  paint(s, g, { kind: "mountain", x: x2, y, r: 0.09, detail: true });
  assert.equal(g.subtiles.size, 1);
  assert.equal(tileAt(g, x, y).kind, "forest");
  assert.equal(tileAt(g, x2, y).kind, "mountain");
  assert.equal(tileAt(g, x + 2 / 8, y).kind, "ocean");
  const id = settle(s, g, x, y);
  assert.notEqual(id, -1);
  summon(s, "human", x, y, id);
  survey(s, g, true);
  assert.deepEqual(s.anchors[id], { x, y });
  assert.equal(g.areas[id] * 64, 2);
  assert.equal(tileAt(g, x, y).realm, id);
  const loaded = JSON.parse(JSON.stringify(s)),
    copy = build(loaded);
  assert.deepEqual(copy.subtiles, g.subtiles);
  assert.equal(tileAt(copy, x2, y).realm, id);
  assert.equal(loaded.realms[id].name, s.realms[id].name);
  paint(s, g, { kind: "ocean", x, y, r: 0.09, detail: true });
  survey(s, g, true);
  assert.equal(s.realms[id].pop, 1);
  assert.equal(tileAt(g, g.caps[id].x, g.caps[id].y).realm, id);
  assert.equal(g.areas[id] * 64, 1);
});

test("Tierras vírgenes: reinos en el lugar del primer colono, nombres regionales únicos y fronteras no invasivas", () => {
  const s = newSlot({ template: "wild", seed: 7319 }),
    g = build(s);
  assert.equal(liveRealms(s).length, 0);
  assert.ok(!g.decorations.some((d) => d.terrain === "structure"));
  assert.equal(settle(s, g, 0, 0), -1);
  for (const rid of [0, 9, 18, 27, 36, 45, 54]) {
    const { x, y, c } = g.originalCaps[rid];
    assert.equal(tileAt(g, x, y).realm, -1);
    const id = settle(s, g, x, y);
    summon(s, "human", x, y, id, rng(7));
    assert.equal(regionOf(s, id), c);
    assert.equal(settle(s, g, x + 0.01, y), id);
    assert.deepEqual(s.anchors[id], { x, y });
    assert.ok(
      s.events.some(
        (e) => e.title === "Reino fundado" && e.text.includes(realmName(s, id)),
      ),
    );
  }
  assert.equal(new Set(liveRealms(s).map((r) => r.name)).size, 7);
  const id = liveRealms(s)[0].id,
    name = medievalName(s, 0, () => 0);
  s.realms[id].name = name;
  assert.notEqual(
    medievalName(s, 0, () => 0),
    name,
  );
  const a = g.caps[id],
    other = g.caps[9],
    t = { x: other.x, y: other.y, r: 9, kind: "settle", realm: id };
  markTerrain(g, t);
  assert.equal(tileAt(g, other.x, other.y).realm, 9);
  s.realms[id].pop = 40;
  s.realms[id].races = { human: 40 };
  s.steps = 4;
  const n = s.marks.length;
  growFrontiers(s);
  assert.ok(s.marks.length > n);
  assert.deepEqual(s.anchors[id], { x: a.x, y: a.y });
});

test("42 objetos, producción por estación, terreno válido y una tesorería distinta del kit del creador", () => {
  assert.equal(new Set(CATALOG.map((o) => o.id)).size, 42);
  assert.equal(construction.length, 18);
  const s = newSlot({ template: "ocean", unlimited: false }),
    g = build(s),
    p = { x: 80, y: 67 };
  const add = (id, royal = false) => {
    const t = tileAt(g, p.x, p.y);
    return installObject(s, id, p, t.realm, t.kind, royal);
  };
  assert.ok(add("cottage").error);
  assert.deepEqual(s.supplies, STARTER_KIT);
  assert.ok(add("lotus").object);
  s.objects = [];
  paint(s, g, { ...p, r: 10, kind: "meadow" });
  assert.ok(add("lotus").error);
  assert.ok(add("windmill").object);
  assert.equal(s.supplies.wood, 222);
  gatherObjects(s);
  assert.equal(liveRealms(s).length, 0);
  const id = settle(s, g, p.x, p.y);
  summon(s, "human", p.x, p.y, id);
  assert.equal(s.objects.find((o) => o.objectId === "windmill").realm, id);
  const r = s.realms[id];
  assert.equal(r.buildings, 2);
  let food = r.food;
  gatherObjects(s);
  assert.equal(r.food, food + 5);
  s.ruler = id;
  const oldWood = r.wood,
    kit = { ...s.supplies };
  assert.ok(add("well", true).object);
  assert.equal(r.wood, oldWood - 3);
  assert.deepEqual(s.supplies, kit);
  assert.ok(installObject(s, "cottage", p, -1, "meadow", true).error);
  assert.ok(add("fox-wild", true).error);
  r.wood = 0;
  const stone = r.stone;
  assert.ok(add("forge", true).error);
  assert.equal(r.stone, stone);
  food = r.food;
  s.eventRate = "calm";
  advance(s, g, () => 0.8);
  assert.equal(r.food - food, 8);
});

test("Aethoria conserva su geografía y suma aldeas locales reproducibles según la escala", () => {
  const s = newSlot(),
    g = build(s);
  assert.ok(g.hamlets.length > 400);
  assert.ok(g.hamlets.every((p) => tileAt(g, p.x, p.y).realm === p.id));
  const other = build(s);
  assert.deepEqual(other.hamlets, g.hamlets);
  for (const p of g.caps) assert.equal(tileAt(g, p.x, p.y).realm, p.id);
});
