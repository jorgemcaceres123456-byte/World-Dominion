import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTINENTS,
  RACES,
  PANTHEON,
  W,
  H,
  rng,
  countryName,
  biomeOf,
} from "../src/data.js";
import { createGeography, markTerrain, tileAt, tid } from "../src/geography.js";
import { survey } from "../src/territory.js";
import {
  freshWorld,
  totalPop,
  randomRace,
  divineIdentity,
  summon,
  cast,
  diplomacy,
  relation,
  realmAction,
  power,
  advance,
  liveRealms,
} from "../src/sim.js";
const seed = 7319,
  geo = createGeography(seed);

test("El atlas conserva los 63 países, su bioma y una capital habitable por territorio", () => {
  assert.equal(CONTINENTS.length, 7);
  assert.equal(new Set(CONTINENTS.flatMap((c) => c.countries)).size, 63);
  for (const c of CONTINENTS) {
    assert.equal(c.countries.length, 9);
    assert.equal(c.biomes.length, 9);
  }
  assert.equal(countryName(2), "Drakenheim");
  assert.equal(countryName(25), "Nueva Granada Imperial");
  assert.equal(countryName(62), "Thalassor");
  for (const c of geo.caps) {
    assert.equal(tileAt(geo, c.x, c.y).realm, c.id);
    assert.equal(tileAt(geo, c.x, c.y).kind, biomeOf(c.id));
  }
  const same = createGeography(seed);
  assert.deepEqual(same.caps, geo.caps);
  assert.deepEqual(same.tile, geo.tile);
});
test("El censo inicial suma las 20 razas y los 63 reinos", () => {
  const s = freshWorld();
  assert.equal(RACES.length, 20);
  assert.equal(liveRealms(s).length, 63);
  assert.equal(new Set(s.realms.flatMap((r) => Object.keys(r.races))).size, 20);
  assert.ok(totalPop(s) > 20000);
  for (const r of s.realms)
    assert.equal(
      r.pop,
      Object.values(r.races).reduce((a, b) => a + b, 0),
    );
});
test("Cada orden sobrenatural ocupa exactamente el 5% de los nacimientos aleatorios", () => {
  const sample = Array.from({ length: 1000 }, (_, n) =>
    randomRace(() => (n + 0.5) / 1000),
  );
  assert.equal(sample.filter((k) => k === "god").length, 50);
  assert.equal(sample.filter((k) => k === "demon").length, 50);
});
test("Once supremos únicos por orden; Todo solo corresponde al undécimo", () => {
  const s = freshWorld();
  for (const order of ["god", "demon"]) {
    const got = Array.from({ length: 11 }, () =>
      divineIdentity(s, order, () => 0.999),
    );
    assert.equal(new Set(got.map((q) => q.name)).size, 11);
    assert.equal(new Set(got.map((q) => q.element)).size, 11);
    assert.equal(
      got.find((q) => q.element === "Todo").name,
      PANTHEON[10][order],
    );
    assert.ok(got.every((q) => q.rank === "Supremo"));
    assert.notEqual(divineIdentity(s, order, () => 0.999).rank, "Supremo");
  }
  assert.equal(divineIdentity(s, "god", () => 0.01).rank, "Bajo");
  assert.equal(divineIdentity(s, "demon", () => 0.7).rank, "Medio");
});
test("La magia consume maná y el portador puede proteger su reino", () => {
  const s = freshWorld(),
    p = geo.caps[0];
  const e = summon(s, "spirit", p.x, p.y, p.id, rng(1));
  assert.equal(cast(s, e), "");
  assert.equal(e.mana, 30);
  assert.equal(s.realms[0].shield, 2);
  e.mana = 5;
  assert.ok(cast(s, e));
  assert.equal(e.mana, 5);
  const d = summon(s, "god", p.x, p.y, 0, () => 0.999);
  assert.equal(d.spell, "Génesis universal");
  let old = s.realms[0].gold;
  cast(s, d);
  assert.ok(s.realms[0].gold > old);
});
test("Las órdenes reales cobran sus recursos y rechazan tesoros insuficientes", () => {
  const s = freshWorld(),
    r = s.realms[0],
    p = geo.caps[0],
    pop = r.pop,
    gold = r.gold;
  assert.equal(realmAction(s, 0, "farm", p), "");
  assert.equal(r.pop, pop + 18);
  assert.equal(r.gold, gold - 12);
  const b = r.buildings,
    wood = r.wood;
  assert.equal(realmAction(s, 0, "build", p), "");
  assert.equal(r.buildings, b + 1);
  assert.equal(r.wood, wood - 6);
  r.gold = 0;
  assert.ok(realmAction(s, 0, "recruit", p));
  assert.equal(r.gold, 0);
  assert.equal(r.mages, 0);
});
test("Diplomacia bilateral: guerra, paz y pacto; ningún reino puede pactar consigo mismo", () => {
  const s = freshWorld();
  assert.ok(diplomacy(s, 2, 2, "pact"));
  assert.equal(diplomacy(s, 2, 3, "hostility"), "");
  assert.equal(relation(s, 3, 2), "war");
  assert.equal(diplomacy(s, 3, 2, "peace"), "");
  assert.equal(relation(s, 2, 3), "neutral");
  assert.equal(diplomacy(s, 2, 3, "pact"), "");
  assert.equal(relation(s, 3, 2), "alliance");
  assert.ok(diplomacy(s, 3, 2, "pact"));
});
test("Los portales traen demonios con rango y los guardianes repelen a los invasores", () => {
  const s = freshWorld(),
    p = geo.caps[0];
  assert.equal(
    power(s, 0, "portal", p, () => 0.5),
    "",
  );
  assert.equal(s.objects.filter((o) => o.kind === "demon").length, 3);
  assert.ok(s.objects.filter((o) => o.hostile).every((o) => o.rank === "Bajo"));
  s.eventRate = "calm";
  s.realms[0].shield = 15;
  for (let n = 0; n < 7; n++) advance(s, geo, () => 0.5);
  assert.equal(s.objects.filter((o) => o.class === "gate").length, 0);
  assert.ok(s.events.some((e) => e.title === "Portal sellado"));
  assert.ok(s.events.some((e) => e.title === "Defensa del reino"));
});
test("Los desastres alteran el terreno y respetan los escudos", () => {
  const s = freshWorld(),
    p = geo.caps[1],
    r = s.realms[1],
    pop = r.pop;
  power(s, 1, "meteor", p);
  assert.ok(r.pop < pop);
  assert.equal(s.marks.at(-1).kind, "lava");
  const now = r.pop,
    count = s.marks.length;
  r.shield = 3;
  power(s, 1, "quake", p);
  assert.equal(r.pop, now);
  assert.equal(s.marks.length, count);
});
test("Los cambios de relieve y fronteras se reproducen desde la semilla y el guardado", () => {
  const s = freshWorld(),
    a = createGeography(seed);
  const p = a.caps[0];
  s.marks.push(
    { x: 5, y: 5, r: 3, kind: "forest" },
    { x: p.x, y: p.y, r: 6, kind: "claim", realm: 1 },
  );
  for (const stroke of s.marks) markTerrain(a, stroke);
  survey(s, a, true);
  assert.equal(tileAt(a, 5, 5).kind, "forest");
  assert.equal(tileAt(a, p.x, p.y).realm, 0);
  assert.equal(tileAt(a, geo.caps[0].x, geo.caps[0].y).realm, 1);
  assert.ok(a.areas[0] > 0 && a.areas[1] > 0);
  const b = createGeography(seed);
  for (const stroke of JSON.parse(JSON.stringify(s)).marks)
    markTerrain(b, stroke);
  assert.deepEqual(a.owner, b.owner);
  assert.deepEqual(a.tile, b.tile);
});
test("Se puede colonizar un mundo vacío y el censo se conserva a lo largo de los años", () => {
  const empty = freshWorld(34, "Nuevo", true);
  assert.equal(totalPop(empty), 0);
  summon(empty, "elf", 30, 60, 0, rng(2));
  assert.equal(liveRealms(empty).length, 1);
  assert.equal(totalPop(empty), 1);
  const s = freshWorld(),
    r = rng(835);
  for (let n = 0; n < 400; n++) advance(s, geo, r);
  assert.equal(s.year, 228);
  assert.ok(s.events.length <= 240);
  assert.ok(
    s.events.some((e) => e.type === "magic") &&
      s.events.some((e) => e.type === "disaster"),
  );
  for (const realm of s.realms) {
    assert.ok(realm.gold >= 0 && realm.pop >= 0 && realm.mana >= 0);
    assert.equal(
      realm.pop,
      Object.values(realm.races).reduce((a, b) => a + b, 0),
    );
  }
  assert.equal(JSON.parse(JSON.stringify(s)).version, 1);
});
