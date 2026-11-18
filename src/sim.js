import { tileAt } from "./geography.js";
import { gatherObjects } from "./objects.js";
import {
  CONTINENTS,
  realmName,
  biomeOf,
  RACES,
  PANTHEON,
  RANKS,
  ELEMENTS,
  SEASONS,
  clamp,
  rng,
} from "./data.js";
export const SAVE_KEY = "aethoria.atlas.v1";
const pick = (a, r = Math.random) => a[Math.floor(r() * a.length)];
const pair = (a, b) => [a, b].sort((m, n) => m - n).join(":");
export const relation = (s, a, b) => s.treaties[pair(a, b)] || "neutral";
export const liveRealms = (s) => s.realms.filter((r) => r.pop > 0);
export const totalPop = (s) => s.realms.reduce((n, r) => n + r.pop, 0);
export const dominant = (r) =>
  Object.keys(r.races)
    .filter((k) => r.races[k] > 0)
    .sort((a, b) => r.races[b] - r.races[a])[0] || "human";
export const raceName = (id) =>
  RACES.find((r) => r.id === id)?.name ||
  {
    mage: "Mago",
    spirit: "Portador de espíritu",
    possessed: "Poseído",
    invasion: "Mago oscuro",
  }[id] ||
  id;
export function addEvent(s, type, title, text) {
  const e = {
    uid: ++s.serial,
    year: s.year,
    season: s.season,
    type,
    title,
    text,
  };
  s.events.unshift(e);
  if (s.events.length > 240) s.events.length = 240;
  return e;
}
export function changePop(r, n, race = dominant(r)) {
  if (n >= 0) {
    r.races[race] = (r.races[race] || 0) + n;
    r.pop += n;
  } else {
    let loss = Math.min(-n, r.pop);
    for (const k of Object.keys(r.races).sort(
      (a, b) => r.races[b] - r.races[a],
    )) {
      const m = Math.min(loss, r.races[k]);
      r.races[k] -= m;
      r.pop -= m;
      loss -= m;
      if (!loss) break;
    }
  }
}
export function freshWorld(seed = 7319, name = "Aethoria", empty = false) {
  const rand = rng(seed);
  const state = {
    version: 1,
    seed,
    name,
    empty,
    year: 128,
    season: 0,
    steps: 0,
    serial: 0,
    speed: 1,
    paused: false,
    mode: "creator",
    ruler: null,
    layers: { labels: true, borders: false, buildings: true },
    sound: false,
    eventRate: "normal",
    marks: [],
    objects: [],
    realms: [],
    treaties: {},
    events: [],
    ascended: { god: [], demon: [] },
  };
  const common = [
    "human",
    "elf",
    "dwarf",
    "human",
    "fairy",
    "leon",
    "lunar",
    "golem",
    "human",
    "fox",
    "angel",
    "fox",
    "mer",
    "elf",
    "avian",
    "treefolk",
    "naiad",
    "dragonkin",
    "human",
    "treefolk",
    "lunar",
    "dwarf",
    "giant",
    "mush",
    "orc",
    "angel",
    "leon",
    "orc",
    "elf",
    "human",
    "golem",
    "dwarf",
    "shade",
    "orc",
    "giant",
    "dragonkin",
    "human",
    "leon",
    "dwarf",
    "elf",
    "lunar",
    "avian",
    "giant",
    "treefolk",
    "fox",
    "human",
    "leon",
    "dragonkin",
    "golem",
    "angel",
    "shade",
    "orc",
    "naiad",
    "giant",
    "human",
    "mer",
    "elf",
    "naiad",
    "human",
    "avian",
    "dwarf",
    "fairy",
    "mush",
  ];
  for (let id = 0; id < 63; id++) {
    const n = empty ? 0 : 166 + Math.floor(rand() * 460),
      r = {
        id,
        pop: 0,
        races: {},
        gold: empty ? 0 : 65 + Math.floor(rand() * 85),
        mana: 60,
        food: 20,
        stone: 12,
        wood: 18,
        buildings: empty ? 0 : 1 + Math.floor(n / 105),
        harmony: 75,
        shield: 0,
        mages: 0,
        prod: 0,
      };
    if (n) {
      changePop(r, n, common[id]);
      if (id === 24) changePop(r, 1, "god");
      if (id === 50) changePop(r, 1, "demon");
    }
    state.realms.push(r);
  }
  if (!empty) {
    state.year = 126;
    addEvent(
      state,
      "resource",
      "Nueva veta de oro",
      "Los enanos descubren oro en Drakenheim.",
    );
    state.year = 127;
    addEvent(
      state,
      "magic",
      "Despertar arcano",
      "Un mago de Kaizhan descubre su don.",
    );
    addEvent(
      state,
      "birth",
      "La vida florece",
      "Un nuevo bosque crece en Solandria.",
    );
    state.year = 128;
    state.treaties[pair(0, 1)] = "alliance";
    addEvent(
      state,
      "alliance",
      "Alianza forjada",
      "Valdoria y Astervald sellan un pacto.",
    );
  } else {
    state.year = 1;
    addEvent(
      state,
      "world",
      "El primer amanecer",
      "Un océano en calma espera tus continentes.",
    );
  }
  return state;
}
export function randomRace(random = Math.random) {
  const roll = random();
  if (roll < 0.05) return "god";
  if (roll < 0.1) return "demon";
  return pick(RACES.slice(0, -2), random).id;
}
export function divineIdentity(s, order, random = Math.random) {
  let r = random(),
    rank = r < 0.62 ? 0 : r < 0.89 ? 1 : r < 0.982 ? 2 : 3;
  if (rank === 3) {
    const free = PANTHEON.filter((p) => !s.ascended[order].includes(p[order]));
    if (free.length) {
      const d = pick(free, random);
      s.ascended[order].push(d[order]);
      return { name: d[order], rank: RANKS[3], element: d.element };
    }
    rank = 2;
  }
  const first =
    order === "god"
      ? ["Iriel", "Anur", "Selia", "Galen", "Oriel"]
      : ["Mord", "Araz", "Vorn", "Nerez", "Zerak"];
  return {
    name: pick(first, random),
    rank: RANKS[rank],
    element: pick(ELEMENTS.slice(0, -1), random),
  };
}
export function addObject(s, obj) {
  obj.uid = ++s.serial;
  s.objects.push(obj);
  return obj;
}
const divineSpells = {
  god: [
    "Sol de la fragua",
    "Marea sanadora",
    "Cosecha de piedra",
    "Aliento viajero",
    "Bastión del trueno",
    "Muralla de hielo",
    "Alba purificadora",
    "Velo del ocaso",
    "Flor de la vida",
    "Reloj celeste",
    "Génesis universal",
  ],
  demon: [
    "Pira carmesí",
    "Marea abisal",
    "Falla profunda",
    "Aullido del vacío",
    "Ira de la tormenta",
    "Escarcha negra",
    "Resplandor caído",
    "Noche espectral",
    "Marchitar",
    "Deuda del tiempo",
    "Eclipse absoluto",
  ],
};
export function summon(s, kind, x, y, id, random = Math.random, log = true) {
  if (id < 0) return null;
  if (kind === "random") kind = randomRace(random);
  const r = s.realms[id];
  if (!r.pop) {
    r.gold = 85;
    r.buildings =
      1 +
      s.objects.filter(
        (o) => o.realm === id && o.objectId && o.class === "building",
      ).length;
    addObject(s, {
      x,
      y,
      kind: "village",
      class: "building",
      realm: id,
    });
  }
  const magical = [
      "mage",
      "invasion",
      "spirit",
      "possessed",
      "god",
      "demon",
      "angel",
    ].includes(kind),
    baseRace = ["mage", "spirit", "possessed", "invasion"].includes(kind)
      ? "human"
      : kind;
  const ent = {
    kind,
    x,
    y,
    class: "unit",
    realm: id,
    name: raceName(kind),
    age: 0,
  };
  changePop(r, 1, baseRace);
  if (kind === "god" || kind === "demon")
    Object.assign(ent, divineIdentity(s, kind, random));
  if (magical) {
    ent.mana = ent.maxMana = kind === "god" || kind === "demon" ? 90 : 45;
    ent.spell =
      kind === "invasion" || kind === "demon" || kind === "possessed"
        ? "Llama umbría"
        : kind === "spirit"
          ? "Canto ancestral"
          : kind === "god"
            ? "Gracia elemental"
            : "Pulso vital";
  }
  if (kind === "mage" || kind === "invasion") r.mages++;
  if (ent.rank) ent.spell = divineSpells[kind][ELEMENTS.indexOf(ent.element)];
  if (kind === "spirit") ent.element = pick(ELEMENTS.slice(0, -1), random);
  if (kind === "possessed") {
    const bound = divineIdentity(s, "demon", random);
    ent.presence = bound.name;
    ent.element = bound.element;
    ent.presenceRank = bound.rank;
  }
  addObject(s, ent);
  if (log)
    addEvent(
      s,
      magical ? "magic" : "birth",
      ent.rank
        ? `${raceName(kind)} de rango ${ent.rank.toLowerCase()}`
        : kind === "spirit"
          ? "Vínculo espiritual"
          : kind === "possessed"
            ? "Posesión demoníaca"
            : "Nueva vida",
      `${ent.name}${ent.element ? " · " + ent.element : ""} aparece en ${realmName(s, id)}.`,
    );
  return ent;
}
export function cast(s, ent) {
  if (!ent?.spell) return "Esta criatura no conoce hechizos.";
  if (ent.mana < 15)
    return "Necesita 15 de maná. Se recarga con cada estación.";
  ent.mana -= 15;
  const r = s.realms[ent.realm],
    strength = 1 + Math.max(0, RANKS.indexOf(ent.rank));
  const affinities =
    ent.element === "Todo" ? ELEMENTS.slice(0, -1) : [ent.element];
  if (ent.kind === "god" || ent.kind === "demon") {
    const dark = ent.kind === "demon";
    for (const e of affinities) {
      if (dark && r.shield) {
        continue;
      }
      switch (e) {
        case "Fuego":
        case "Tierra":
          r.stone = Math.max(0, r.stone + (dark ? -1 : 1) * 3 * strength);
          r.gold = Math.max(0, r.gold + (dark ? -1 : 1) * 5 * strength);
          break;
        case "Agua":
        case "Vida":
          changePop(r, (dark ? -1 : 1) * 5 * strength);
          r.food = Math.max(0, r.food + (dark ? -1 : 1) * 4 * strength);
          break;
        case "Viento":
          r.gold = Math.max(0, r.gold + (dark ? -1 : 1) * 8 * strength);
          break;
        case "Rayo":
        case "Hielo":
          if (dark) changePop(r, -4 * strength);
          else r.shield = Math.max(r.shield, 1 + strength);
          break;
        case "Luz":
        case "Sombra":
          r.harmony = clamp(r.harmony + (dark ? -1 : 1) * 5 * strength, 0, 100);
          break;
        case "Tiempo":
          r.mana = clamp(r.mana + (dark ? -1 : 1) * 9 * strength, 0, 120);
          break;
      }
    }
  } else if (ent.spell === "Llama umbría") {
    if (!r.shield) {
      changePop(r, -Math.min(5, r.pop));
      r.harmony = clamp(r.harmony - 3, 0, 100);
    }
  } else if (ent.kind === "spirit") {
    r.shield = Math.max(r.shield, 2);
    r.harmony = clamp(r.harmony + 5, 0, 100);
  } else {
    changePop(r, 4);
    r.harmony = clamp(r.harmony + 3, 0, 100);
  }
  addEvent(
    s,
    "magic",
    ent.spell,
    `${ent.name} canaliza su poder en ${realmName(s, r.id)}.`,
  );
  return "";
}
export function diplomacy(s, a, b, act) {
  if (a === b || !s.realms[a]?.pop || !s.realms[b]?.pop)
    return "Elige otro reino habitado.";
  const rel = relation(s, a, b),
    an = realmName(s, a),
    bn = realmName(s, b);
  if (act === "pact" && rel === "alliance")
    return "Estos reinos ya son aliados.";
  if (act === "hostility" && rel === "war")
    return "El conflicto ya está activo.";
  if (act === "peace" && rel !== "war") return "No hay guerra con este reino.";
  const to =
    act === "pact" ? "alliance" : act === "hostility" ? "war" : "neutral";
  s.treaties[pair(a, b)] = to;
  addEvent(
    s,
    act === "hostility" ? "war" : "alliance",
    act === "pact"
      ? "Alianza forjada"
      : act === "hostility"
        ? "Guerra declarada"
        : "Tratado de paz",
    act === "pact"
      ? `${an} y ${bn} unen sus estandartes.`
      : act === "hostility"
        ? `${an} y ${bn} entran en conflicto.`
        : `La paz vuelve a ${an} y ${bn}.`,
  );
  return "";
}
export function realmAction(s, id, act, position) {
  const r = s.realms[id],
    prices = {
      farm: [12, 0],
      build: [35, 0],
      mine: [20, 0],
      festival: [15, 0],
      recruit: [30, 12],
      heal: [0, 18],
      ward: [0, 24],
    },
    cost = prices[act];
  if (!cost) return "Orden desconocida.";
  if (r.gold < cost[0] || r.mana < cost[1])
    return `Necesitas ${cost[0]} de oro y ${cost[1]} de maná.`;
  if (act === "build" && (r.wood < 6 || r.stone < 3))
    return "Construir requiere 6 de madera y 3 de piedra.";
  if (act === "build") {
    r.wood -= 6;
    r.stone -= 3;
  }
  r.gold -= cost[0];
  r.mana -= cost[1];
  let text = "",
    title = "";
  const { x, y } = position;
  if (act === "farm") {
    changePop(r, 18);
    r.food += 15;
    title = "Cosecha abundante";
    text = "Los graneros alimentan a 18 nuevos habitantes.";
  }
  if (act === "build") {
    r.buildings++;
    addObject(s, { kind: "village", x, y, class: "building", realm: id });
    title = "Aldea fundada";
    text = "Una aldea aumenta los ingresos del reino.";
  }
  if (act === "mine") {
    r.prod++;
    r.stone += 8;
    addObject(s, { kind: "gold", x, y, class: "resource", realm: id });
    title = "Mina abierta";
    text = "La mina añade oro al tesoro cada estación.";
  }
  if (act === "festival") {
    r.harmony = clamp(r.harmony + 15, 0, 100);
    title = "Fiesta del reino";
    text = "El festival reúne a la población.";
  }
  if (act === "recruit") {
    summon(s, "mage", x, y, id, Math.random, false);
    title = "Academia arcana";
    text = "Un nuevo mago sirve a la corona.";
  }
  if (act === "heal") {
    changePop(r, 25);
    r.harmony = clamp(r.harmony + 4, 0, 100);
    title = "Sanación colectiva";
    text = "Un pulso de vida acoge a 25 habitantes.";
  }
  if (act === "ward") {
    r.shield = 4;
    title = "Santuario elemental";
    text = "El reino queda protegido durante cuatro estaciones.";
  }
  addEvent(
    s,
    act === "recruit" || act === "ward" || act === "heal" ? "magic" : "realm",
    title,
    `${realmName(s, id)}: ${text}`,
  );
  return "";
}
export function power(s, id, kind, p, random = Math.random) {
  if (id < 0) return "Elige una zona de tierra firme.";
  const r = s.realms[id],
    n = realmName(s, id);
  if (["rain", "bless"].includes(kind)) {
    r.harmony = clamp(r.harmony + 6, 0, 100);
    r.food += 8;
    changePop(r, kind === "rain" ? 4 : 8);
    addEvent(
      s,
      "birth",
      kind === "rain" ? "Lluvia fértil" : "Bendición divina",
      `La vida prospera en ${n}.`,
    );
    return "";
  }
  if (kind === "portal" || kind === "invasion") {
    const gate = kind === "portal";
    if (gate)
      addObject(s, { kind: "portal", ...p, class: "gate", realm: id, life: 6 });
    for (let i = 0; i < 3; i++) {
      const invader = summon(
        s,
        gate ? "demon" : "invasion",
        p.x + i * 1.7,
        p.y + (i % 2) * 2,
        id,
        random,
        false,
      );
      invader.hostile = true;
      invader.raid = 5;
    }
    addEvent(
      s,
      "disaster",
      gate ? "Puerta del inframundo" : "Incursión arcana",
      gate
        ? `Un portal abisal libera demonios en ${n}.`
        : `Los magos oscuros llegan a ${n}.`,
    );
  } else {
    const names = {
      quake: "Terremoto",
      fire: "Incendio",
      meteor: "Caída de meteoro",
      storm: "Tormenta",
    };
    if (!names[kind]) return "Poder desconocido.";
    let loss = r.shield
      ? 0
      : Math.min(r.pop, Math.ceil(r.pop * (kind === "meteor" ? 0.115 : 0.035)));
    changePop(r, -loss);
    r.food = Math.max(0, r.food - 4);
    if (!r.shield && ["meteor", "fire", "quake"].includes(kind))
      s.marks.push({
        ...p,
        r: kind === "meteor" ? 6 : 4,
        kind:
          kind === "quake" ? "mountain" : kind === "fire" ? "savanna" : "lava",
      });
    addEvent(
      s,
      "disaster",
      names[kind],
      r.shield
        ? `El escudo de ${n} contiene el desastre.`
        : `${n} pierde ${loss} habitantes y prepara su recuperación.`,
    );
  }
  return "";
}
export function advance(s, geo, random = Math.random) {
  s.steps++;
  s.season = (s.season + 1) % 4;
  if (!s.season) s.year++;
  const active = liveRealms(s);
  if (!active.length) return;
  for (const r of active) {
    const grow = Math.floor(random() * 3) + (r.harmony > 85 ? 1 : 0);
    changePop(r, grow);
    r.gold += 2 + Math.floor(r.buildings / 2) + r.prod * 2;
    r.mana = clamp(r.mana + 4, 0, 120);
    r.food += 1;
    r.wood += 1 + ((r.biome || biomeOf(r.id)) === "forest" ? 1 : 0);
    r.stone += 1 + ((r.biome || biomeOf(r.id)) === "mountain" ? 1 : 0);
    r.iron = (r.iron || 0) + (r.prod ? 2 : 1);
    if (r.shield) r.shield--;
  }
  gatherObjects(s);
  for (const [k, v] of Object.entries(s.treaties)) {
    const [a, b] = k.split(":").map(Number),
      r = s.realms[a],
      q = s.realms[b];
    if (v === "alliance") {
      r.gold += 2;
      q.gold += 2;
    }
    if (v === "war") {
      for (const h of [r, q])
        if (!h.shield) changePop(h, -Math.min(Math.ceil(h.pop * 0.02), 10));
      if (!r.pop || !q.pop || random() < 0.1) {
        s.treaties[k] = "neutral";
        addEvent(
          s,
          "alliance",
          "Armisticio",
          `Termina el conflicto entre ${realmName(s, a)} y ${realmName(s, b)}.`,
        );
      }
    }
  }
  for (const e of [...s.objects]) {
    if (e.class === "unit") {
      e.age++;
      if (e.maxMana) {
        e.mana = Math.min(e.maxMana, e.mana + 7);
        if (
          (e.kind === "invasion" || e.kind === "possessed" || e.hostile) &&
          e.mana >= 15 &&
          random() < 0.32
        )
          cast(s, e);
      }
    }
    if (e.class === "unit" && e.hostile) {
      e.raid--;
      const home = s.realms[e.realm];
      if (e.raid <= 0 || home.shield || (home.mages > 0 && random() < 0.24)) {
        e.withdrawn = true;
        const race = e.kind === "invasion" ? "human" : "demon";
        if (home.races[race] > 0) {
          home.races[race]--;
          home.pop--;
        }
        if (e.kind === "invasion") home.mages = Math.max(0, home.mages - 1);
        addEvent(
          s,
          "realm",
          "Defensa del reino",
          `Los guardianes de ${realmName(s, e.realm)} repelen a ${e.name}.`,
        );
      }
    }
    if (e.class === "gate" && e.life > 0) {
      e.life--;
      if (e.life % 2 === 0) {
        const invader = summon(
          s,
          "demon",
          e.x + random() * 2,
          e.y + 2,
          e.realm,
          random,
          false,
        );
        invader.hostile = true;
        invader.raid = 4;
        const r = s.realms[e.realm];
        if (!r.shield) changePop(r, -Math.min(r.pop, 2));
      }
      if (!e.life)
        addEvent(
          s,
          "magic",
          "Portal sellado",
          `Los guardianes de ${realmName(s, e.realm)} cierran la brecha.`,
        );
    }
  }
  s.objects = s.objects.filter(
    (o) => !o.withdrawn && (o.class !== "gate" || o.life > 0),
  );
  if (s.eventRate === "calm" && random() > 0.36) return;
  const r = pick(active, random),
    id = r.id,
    n = realmName(s, id),
    p = geo.caps[id];
  let roll = random();
  const near = {
    x: p.x + ((random() - 0.5) * 8) / (s.scale || 1),
    y: p.y + ((random() - 0.5) * 6) / (s.scale || 1),
  };
  if (tileAt(geo, near.x, near.y).realm !== id)
    Object.assign(near, { x: p.x, y: p.y });
  if (s.eventRate === "chaos" && random() < 0.32) roll = 0.98;
  if (roll < 0.18 && active.length > 1) {
    const b = pick(
      active.filter((a) => a.id !== id),
      random,
    );
    diplomacy(
      s,
      id,
      b.id,
      relation(s, id, b.id) === "war"
        ? "peace"
        : random() > 0.68
          ? "hostility"
          : "pact",
    );
  } else if (roll < 0.39) {
    const q = summon(s, "random", near.x, near.y, id, random);
    if (q.kind === "god" || q.kind === "demon")
      r.mana = clamp(r.mana + 8, 0, 120);
  } else if (roll < 0.53) {
    summon(
      s,
      pick(["mage", "spirit", "possessed"], random),
      near.x,
      near.y,
      id,
      random,
    );
  } else if (roll < 0.75) {
    const k = pick(["gold", "crystal", "iron", "wood"], random);
    addObject(s, { kind: k, ...near, class: "resource", realm: id });
    r.gold += 8;
    r.prod++;
    addEvent(
      s,
      "resource",
      "Recursos descubiertos",
      `Los exploradores de ${n} hallan ${k === "gold" ? "oro" : k === "crystal" ? "cristal" : k === "iron" ? "hierro" : "madera"}.`,
    );
  } else if (roll < 0.88) {
    r.buildings++;
    changePop(r, 5);
    addObject(s, { kind: "village", ...near, class: "building", realm: id });
    addEvent(s, "realm", "Nuevo asentamiento", `Una aldea se alza en ${n}.`);
  } else {
    const rare = random();
    power(
      s,
      id,
      rare < 0.035
        ? "portal"
        : rare < 0.11
          ? "invasion"
          : pick(["quake", "fire", "storm", "meteor"], random),
      near,
      random,
    );
  }
}
export function decodeWorld(raw) {
  try {
    const s = JSON.parse(raw);
    if (
      !s ||
      s.version !== 1 ||
      !Number.isFinite(s.seed) ||
      !Array.isArray(s.realms) ||
      s.realms.length !== 63 ||
      !Array.isArray(s.marks) ||
      !Array.isArray(s.objects) ||
      !Array.isArray(s.events) ||
      !s.ascended ||
      !s.treaties
    )
      return null;
    if (
      !s.realms.every((r, i) => r.id === i && Number.isFinite(r.pop) && r.races)
    )
      return null;
    if (
      typeof s.name !== "string" ||
      !Number.isInteger(s.year) ||
      !Number.isInteger(s.season) ||
      s.season < 0 ||
      s.season > 3
    )
      return null;
    s.speed = clamp(Math.round(Number(s.speed) || 1), 1, 10);
    return s;
  } catch {
    return null;
  }
}
