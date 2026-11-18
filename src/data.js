import { CATALOG, construction, costText } from "./objects.js";
// The atlas is authored; coastlines, settlements and local relief are seeded.
export const W = 1060,
  H = 600;
export const BIOMES = {
  meadow: "Pradera",
  forest: "Bosque templado",
  pine: "Bosque de pinos",
  mountain: "Montañas",
  savanna: "Sabana",
  tundra: "Tundra",
  bamboo: "Bosque de bambú",
  cherry: "Bosque de cerezo",
  jungle: "Selva",
  swamp: "Pantano",
  desert: "Desierto",
  snow: "Montañas nevadas",
  ocean: "Océano",
  sand: "Arena",
  lava: "Lava",
};
const land = (
  name,
  color,
  base,
  culture,
  faith,
  label,
  shapes,
  countries,
  biomes,
) => ({
  name,
  color,
  base,
  culture,
  faith,
  label,
  shapes: shapes.map((s) => s.split(" ").map((p) => p.split(",").map(Number))),
  countries: countries.split("|"),
  biomes: biomes.split(" "),
});
export const CONTINENTS = [
  land(
    "Eldoria",
    "#91bd68",
    "forest",
    "Señoríos de piedra",
    "El Pacto del Roble",
    [246, 180],
    [
      "40,145 63,123 58,100 92,100 78,80 103,74 119,89 149,86 160,63 191,63 213,78 242,48 269,58 281,42 300,60 328,51 339,72 365,67 365,89 398,101 380,123 413,142 398,159 419,177 400,191 371,186 363,211 332,207 317,228 306,219 292,253 270,248 251,282 235,269 227,236 198,224 174,231 160,213 131,222 111,194 75,202 60,180 85,171 67,154",
      "37,217 57,204 76,217 67,231 45,234",
      "360,230 372,214 390,218 386,232 368,241",
    ],
    "Valdoria|Astervald|Drakenheim|Luskarien|Montelucia|Vesteria|Nordhafen|Arkenburgo|Bellacorte",
    "forest pine mountain meadow forest savanna tundra pine meadow",
  ),
  land(
    "Kaizhan",
    "#82b779",
    "bamboo",
    "Dinastías de los cerezos",
    "El Camino de los Kami",
    [860, 204],
    [
      "754,103 778,107 794,80 825,84 835,62 867,68 889,50 905,66 931,62 924,84 949,93 970,77 990,90 975,112 950,116 941,140 967,154 960,169 984,182 980,209 950,214 944,246 920,256 926,282 908,306 894,285 900,265 872,261 854,243 830,257 818,230 796,230 783,208 749,210 762,185 734,176 748,149 734,135 762,126",
      "982,224 998,210 1011,216 1001,237 990,245",
      "947,273 966,253 977,259 972,283 949,295",
      "910,322 927,300 940,306 928,324",
    ],
    "Shenzara|Koryuhan|Akitsune|Ryukhan|Zhaoming|Takamori|Xianzhou|Hanekawa|Qirath",
    "bamboo forest cherry jungle meadow mountain bamboo swamp desert",
  ),
  land(
    "Solandria",
    "#79ba65",
    "jungle",
    "Terrazas del Sol",
    "Los Hijos de Inti",
    [400, 424],
    [
      "273,364 299,344 320,343 328,317 352,329 366,307 386,328 408,316 428,341 462,330 472,355 501,360 489,383 520,393 508,417 489,424 480,454 458,461 444,483 428,482 407,511 384,506 367,529 360,554 347,557 335,531 343,506 325,485 330,461 312,445 295,442 297,413 274,399 284,389 263,382",
      "270,433 280,421 290,435 283,448 267,446",
      "368,565 386,554 394,561 377,574",
    ],
    "Nueva Castilla|Atzuria|Valparaíso Real|Montelmar|Gran Tahuantía|Costaverde|Auracén|Nueva Granada Imperial|Solvaria",
    "meadow jungle forest mountain mountain jungle savanna forest desert",
  ),
  land(
    "Varkhonia",
    "#91bace",
    "tundra",
    "Principados boreales",
    "La Aurora Eterna",
    [572, 130],
    [
      "420,91 445,65 470,74 476,45 491,48 500,63 510,36 532,44 550,26 563,43 586,28 597,45 622,35 631,58 657,49 674,62 690,50 711,66 695,85 712,100 695,119 673,111 661,133 638,136 620,158 590,150 574,177 552,168 535,192 512,183 520,161 494,152 480,165 466,145 447,159 437,141 452,124 431,120 448,106",
      "643,160 658,144 677,143 671,160 650,173",
      "412,65 420,47 435,45 440,58 425,70",
    ],
    "Dravosk|Volgaria|Zarovik|Karsovia|Veligrad|Morzavia|Estrovnia|Rutenmark|Varkhaz",
    "pine tundra forest mountain pine swamp tundra meadow snow",
  ),
  land(
    "Ambaria",
    "#a6bf67",
    "meadow",
    "Ligas de la Pradera",
    "Las Siete Semillas",
    [151, 382],
    [
      "41,309 75,308 94,281 119,286 143,267 156,286 181,273 201,287 198,307 229,297 241,320 232,345 255,361 243,382 220,384 212,410 186,416 181,444 159,435 149,459 127,447 98,459 91,440 61,432 73,411 47,400 55,376 31,360 43,340 27,324",
      "214,448 224,431 241,439 234,455 218,459",
    ],
    "Nueva Arcadia|Westoria|Montelibre|Altavalle|Nortavia|Libertania|Silvermont|Dorchester|Auroria",
    "forest meadow mountain meadow pine savanna snow forest desert",
  ),
  land(
    "Zarynth",
    "#e4b26b",
    "desert",
    "Sultanatos del Ámbar",
    "El Ojo del Desierto",
    [799, 462],
    [
      "634,423 653,407 681,415 697,388 727,392 732,364 755,372 774,351 802,365 828,345 846,362 875,354 890,381 918,383 931,400 961,397 958,421 986,435 968,449 983,471 960,480 951,508 921,503 908,526 875,514 853,535 826,527 811,550 779,540 760,551 739,529 715,534 706,515 674,508 683,489 657,477 664,457 642,452",
      "987,491 1005,480 1014,494 1004,508 985,503",
      "637,487 652,481 661,495 646,501",
    ],
    "Azharim|Qasrabad|Zafira|Khorazán|Samarkia|Darvash|Namarat|Iskandria|Tazmeria",
    "desert desert savanna mountain meadow desert savanna forest mountain",
  ),
  land(
    "Thalassia",
    "#93bb82",
    "forest",
    "Puertos de mármol",
    "El Canto de las Mareas",
    [596, 318],
    [
      "479,269 508,261 513,239 539,245 555,224 579,236 595,216 613,229 637,222 647,244 680,235 687,257 715,264 695,283 711,299 682,310 667,335 643,328 627,351 604,343 586,364 567,352 573,331 547,317 527,325 513,304 488,312 495,290 475,285",
      "675,351 692,327 708,332 720,319 732,329 717,348 696,363",
      "514,349 534,338 549,354 542,367 523,371",
      "612,384 628,367 642,376 634,392 615,398",
    ],
    "Belloria|Marentia|Corsalia|Velmora|Castalia|Portus Alba|Aramonte|Lusentia|Thalassor",
    "forest meadow savanna forest meadow forest mountain forest mountain",
  ),
];
export const RACES = [
  ["Humano", "human", "#b99a66"],
  ["Elfo", "elf", "#95bb71"],
  ["Orco", "orc", "#70a65d"],
  ["Enano", "dwarf", "#d08a59"],
  ["Celestial", "angel", "#e7cd7b"],
  ["Silvano", "treefolk", "#719956"],
  ["Tritón", "mer", "#59bac2"],
  ["Dracónido", "dragonkin", "#ca7662"],
  ["Feérico", "fairy", "#cc90c1"],
  ["Gólem", "golem", "#a3a9a0"],
  ["Lunario", "lunar", "#a2a5dd"],
  ["Kitsune", "fox", "#df9673"],
  ["Aviar", "avian", "#81b9cd"],
  ["Náyade", "naiad", "#65afbc"],
  ["Umbrío", "shade", "#9e81bb"],
  ["Leonino", "leon", "#caa858"],
  ["Micelio", "mush", "#c08283"],
  ["Gigante", "giant", "#a1a18b"],
  ["Dios", "god", "#fbd275"],
  ["Demonio", "demon", "#d87578"],
].map(([name, id, color]) => ({ name, id, color }));
export const ELEMENTS = [
  "Fuego",
  "Agua",
  "Tierra",
  "Viento",
  "Rayo",
  "Hielo",
  "Luz",
  "Sombra",
  "Vida",
  "Tiempo",
  "Todo",
];
const gNames = [
  "Aurel",
  "Nerelia",
  "Orun",
  "Eolyn",
  "Raikos",
  "Isvel",
  "Solarys",
  "Noctia",
  "Viridia",
  "Eonar",
  "Aethor",
];
const dNames = [
  "Brask",
  "Neroth",
  "Krag",
  "Veyr",
  "Rhazek",
  "Skelda",
  "Azrion",
  "Umbrael",
  "Morveth",
  "Zathros",
  "Vaelkor",
];
export const PANTHEON = ELEMENTS.map((element, i) => ({
  element,
  god: gNames[i],
  demon: dNames[i],
}));
export const RANKS = ["Bajo", "Medio", "Alto", "Supremo"];
export const SEASONS = ["Primavera", "Verano", "Otoño", "Invierno"];
export const TOOLS = {
  Terreno: [
    ["inspect", "Inspeccionar"],
    ["ocean", "Océano"],
    ["sand", "Arena"],
    ["meadow", "Pradera"],
    ["forest", "Bosque"],
    ["mountain", "Montaña"],
    ["snow", "Nieve"],
    ["lava", "Lava"],
  ],
  Biomas: Object.entries(BIOMES)
    .filter(([k]) => !["ocean", "sand", "lava"].includes(k))
    .map(([k, v]) => [
      k,
      v
        .replace("Bosque de ", "")
        .replace("Bosque templado", "Templado")
        .replace("Montañas nevadas", "Alpino"),
    ])
    .map(([k, v]) => [k, v[0].toUpperCase() + v.slice(1)]),
  Recursos: [
    ["wood", "Madera"],
    ["stone", "Piedra"],
    ["copper", "Cobre"],
    ["iron", "Hierro"],
    ["silver", "Plata"],
    ["gold", "Oro"],
    ["crystal", "Cristal"],
    ["mithril", "Mithril"],
    ["flowers", "Flores"],
    ["berries", "Frutos"],
  ],
  Objetos: CATALOG.map((o) => [o.id, o.name]),
  Criaturas: [
    ["random", "Al azar"],
    ...RACES.map((r) => [r.id, r.name]),
    ["mage", "Mago"],
    ["spirit", "Portador"],
    ["possessed", "Poseído"],
  ],
  Poderes: [
    ["rain", "Lluvia"],
    ["bless", "Bendición"],
    ["quake", "Terremoto"],
    ["fire", "Incendio"],
    ["meteor", "Meteoro"],
    ["storm", "Tormenta"],
    ["invasion", "Magos oscuros"],
    ["portal", "Portal abisal"],
  ],
};
export const EVENTS = {
  alliance: { icon: "handshake", color: "green", label: "Diplomacia" },
  war: { icon: "swords", color: "red", label: "Diplomacia" },
  birth: { icon: "sprout", color: "green", label: "Vida" },
  magic: { icon: "sparkles", color: "purple", label: "Magia" },
  resource: { icon: "gem", color: "gold", label: "Recursos" },
  disaster: { icon: "flame", color: "red", label: "Desastres" },
  realm: { icon: "castle", color: "blue", label: "Reinos" },
  world: { icon: "globe", color: "blue", label: "Mundo" },
};
export const POLICIES = {
  Gobierno: [
    ["farm", "Cultivar", "+18 habitantes · 12 oro"],
    ["build", "Edificar", "35 oro · 6 madera · 3 piedra"],
    ["mine", "Prospectar", "Abrir una mina · 20 oro"],
    ["festival", "Celebrar", "+15 armonía · 15 oro"],
  ],
  Obras: construction.map((o) => [o.id, o.name, costText(o, true)]),
  Diplomacia: [
    ["pact", "Alianza", "Elegir un reino aliado"],
    ["hostility", "Guerra", "Elegir un rival"],
    ["peace", "Hacer la paz", "Resolver un conflicto"],
  ],
  Magia: [
    ["recruit", "Formar mago", "30 oro · 12 maná"],
    ["heal", "Sanación", "+25 habitantes · 18 maná"],
    ["ward", "Protección", "Escudo de 4 estaciones · 24 maná"],
  ],
};
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const fmt = (n) =>
  new Intl.NumberFormat("es-GT", { useGrouping: "always" })
    .format(n)
    .replace(/,/g, ".");
export const countryIndex = (c, k) => c * 9 + k;
export const regionOf = (s, id) => s.realms[id]?.origin ?? Math.floor(id / 9);
export const continentOf = (id) => CONTINENTS[Math.floor(id / 9)];
export const countryName = (id) => continentOf(id).countries[id % 9];
export const realmName = (s, id) => s.realms[id]?.name || countryName(id);
export const biomeOf = (id) => continentOf(id).biomes[id % 9];
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
