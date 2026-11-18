// Physical objects share one catalogue in the codex, creator's palette, and royal works.
// Costs are [wood, stone, iron, essence]. Yields are applied only in an inhabited territory.
export const MATERIALS = {
  wood: "Madera",
  stone: "Piedra",
  iron: "Hierro",
  essence: "Esencia",
};
export const STARTER_KIT = { wood: 240, stone: 180, iron: 90, essence: 60 };
const make = (
  id,
  name,
  family,
  art,
  cost,
  yieldPerSeason = {},
  surface = "land",
) => ({
  id,
  name,
  family,
  art,
  cost: Object.fromEntries(
    Object.keys(MATERIALS)
      .map((k, i) => [k, cost[i] || 0])
      .filter(([, n]) => n),
  ),
  yield: yieldPerSeason,
  surface,
});
export const CATALOG = [
  make("cottage", "Cabaña", "Edificios", "cottage", [8, 3], { gold: 1 }),
  make("windmill", "Molino", "Edificios", "windmill", [18, 8, 2], { food: 5 }),
  make("wheatfield", "Trigal", "Edificios", "wheatfield", [4, 0, 0, 1], {
    food: 4,
  }),
  make("sawmill", "Aserradero", "Edificios", "sawmill", [12, 4, 3], {
    wood: 5,
  }),
  make("quarry", "Cantera", "Edificios", "quarry", [7, 9, 2], { stone: 4 }),
  make("forge", "Herrería", "Edificios", "forge", [10, 14, 4], { iron: 3 }),
  make("bazaar", "Mercado", "Edificios", "bazaar", [14, 7], { gold: 4 }),
  make("granary", "Granero", "Edificios", "granary", [12, 5], { food: 3 }),
  make("well", "Pozo", "Edificios", "well", [3, 8], { food: 2 }),
  make("watchtower", "Atalaya", "Edificios", "watchtower", [13, 10, 2], {
    gold: 1,
  }),
  make("chapel", "Santuario", "Edificios", "chapel", [6, 14, 0, 4], {
    mana: 3,
  }),
  make("academy", "Academia", "Edificios", "academy", [16, 16, 3, 7], {
    mana: 5,
  }),
  make(
    "woodbridge",
    "Puente",
    "Edificios",
    "woodbridge",
    [10, 3],
    { gold: 1 },
    "either",
  ),
  make("pier", "Muelle", "Edificios", "pier", [12, 2], { food: 2 }, "either"),
  make("fort", "Fortaleza", "Edificios", "castle", [24, 28, 10], { gold: 5 }),
  make("pagoda-hall", "Pagoda", "Edificios", "pagoda", [17, 9, 0, 4], {
    mana: 2,
    gold: 1,
  }),
  make("desertcourt", "Alcázar", "Edificios", "palace", [12, 22, 6], {
    gold: 4,
  }),
  make("beacon", "Faro", "Edificios", "lighthouse", [9, 16, 2], { gold: 2 }),
  make("oaktree", "Roble", "Vegetación", "oak", [0, 0, 0, 1], { wood: 1 }),
  make("firgrove", "Abeto", "Vegetación", "fir", [0, 0, 0, 1], { wood: 1 }),
  make("sakura", "Cerezo", "Vegetación", "cherry", [0, 0, 0, 2], { food: 1 }),
  make("bamboostem", "Bambú", "Vegetación", "bambooPlant", [0, 0, 0, 1], {
    wood: 1,
  }),
  make("datepalm", "Palmera", "Vegetación", "palm", [0, 0, 0, 1], { food: 1 }),
  make("cactus-garden", "Cactus", "Vegetación", "cactus", [0, 0, 0, 1], {}),
  make("mushrooms", "Hongos", "Vegetación", "mushrooms", [0, 0, 0, 1], {
    food: 1,
  }),
  make("reeds", "Juncos", "Vegetación", "reeds", [0, 0, 0, 1], {}),
  make(
    "lotus",
    "Loto",
    "Vegetación",
    "lotus",
    [0, 0, 0, 1],
    { mana: 1 },
    "water",
  ),
  make("runestone", "Piedra rúnica", "Reliquias", "runestone", [0, 10, 0, 4], {
    mana: 2,
  }),
  make("ruins", "Ruinas", "Reliquias", "ruins", [0, 8], { stone: 1 }),
  make("camp", "Campamento", "Reliquias", "camp", [6, 1], { food: 1 }),
  make("fountain", "Fuente", "Reliquias", "fountain", [0, 10, 0, 2], {
    mana: 1,
  }),
  make("emberstone", "Ámbar", "Minerales", "amber", [0, 0, 0, 2], { gold: 1 }),
  make("blackglass", "Obsidiana", "Minerales", "obsidian", [0, 0, 0, 2], {
    iron: 1,
  }),
  make("emerald-ore", "Esmeralda", "Minerales", "emerald", [0, 0, 0, 3], {
    gold: 2,
  }),
  make("ruby-ore", "Rubí", "Minerales", "ruby", [0, 0, 0, 3], { gold: 2 }),
  make("amethyst", "Amatista", "Minerales", "amethyst", [0, 0, 0, 3], {
    mana: 2,
  }),
  make("deer", "Ciervo", "Fauna", "deer", [0, 0, 0, 2], {}),
  make("boar", "Jabalí", "Fauna", "boar", [0, 0, 0, 2], {}),
  make("sheep", "Oveja", "Fauna", "sheep", [0, 0, 0, 2], { food: 1 }),
  make("wolf", "Lobo", "Fauna", "wolf", [0, 0, 0, 2], {}),
  make("duck", "Pato", "Fauna", "duck", [0, 0, 0, 1], { food: 1 }, "either"),
  make("fox-wild", "Zorro", "Fauna", "fox-wild", [0, 0, 0, 2], {}),
];
export const OBJECTS = Object.fromEntries(CATALOG.map((o) => [o.id, o]));
export const construction = CATALOG.filter((o) => o.family === "Edificios");
export const costText = (o, royal = false) =>
  Object.entries(o.cost)
    .map(
      ([k, n]) =>
        `${n} ${royal && k === "essence" ? "maná" : MATERIALS[k].toLowerCase()}`,
    )
    .join(" · ");
export const yieldText = (o) =>
  Object.entries(o.yield)
    .map(
      ([k, n]) =>
        `+${n} ${{ ...MATERIALS, food: "alimento", gold: "oro", mana: "maná" }[k].toLowerCase()}`,
    )
    .join(" · ") || "Elemento de paisaje";
export function installObject(state, id, point, realm, kind, royal = false) {
  const o = OBJECTS[id];
  if (!o) return { error: "Objeto desconocido." };
  if (
    (kind === "ocean" && o.surface === "land") ||
    (kind !== "ocean" && o.surface === "water")
  )
    return {
      error:
        o.surface === "water"
          ? "Coloca este objeto sobre el agua."
          : "Este objeto necesita tierra firme.",
    };
  if (
    royal &&
    (realm !== state.ruler ||
      !state.realms[realm]?.pop ||
      o.family !== "Edificios")
  )
    return { error: "Construye dentro de las fronteras de tu reino." };
  const wallet = royal ? state.realms[realm] : state.supplies;
  const costs = Object.entries(o.cost).map(([k, n]) => [
    royal && k === "essence" ? "mana" : k,
    n,
  ]);
  if (royal || !state.unlimited) {
    if (!wallet || costs.some(([k, n]) => (wallet[k] || 0) < n))
      return { error: "Materiales insuficientes: " + costText(o, royal) + "." };
    for (const [k, n] of costs) wallet[k] -= n;
  }
  const obj = {
    uid: ++state.serial,
    ...point,
    kind: o.art,
    objectId: id,
    name: o.name,
    class:
      o.family === "Edificios"
        ? "building"
        : o.family === "Fauna"
          ? "animal"
          : "scenery",
    realm,
  };
  state.objects.push(obj);
  if (o.family === "Edificios" && state.realms[realm]?.pop)
    state.realms[realm].buildings++;
  return { object: obj };
}
export function gatherObjects(s) {
  for (const obj of s.objects) {
    const o = OBJECTS[obj.objectId],
      r = s.realms[obj.realm];
    if (!o || !r?.pop) continue;
    for (const [k, n] of Object.entries(o.yield))
      r[k] = k === "mana" ? Math.min(120, (r[k] || 0) + n) : (r[k] || 0) + n;
  }
}
