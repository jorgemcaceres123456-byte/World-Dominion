import "./menu.css";
import { icon as i } from "./icons.js";
import { cinematic, crest, prefs, savePrefs, SCENES } from "./cinema.js";
import {
  DEFAULT,
  SIZES,
  readSlot,
  writeSlot,
  newId,
  newSlot,
  listWorlds,
  removeSlot,
  worldSize,
  dimensions,
  gameURL,
} from "./worlds.js";
import {
  CONTINENTS,
  BIOMES,
  RACES,
  PANTHEON,
  regionOf,
  realmName,
  fmt,
  W,
  H,
} from "./data.js";
import { liveRealms, totalPop } from "./sim.js";
import { CATALOG, yieldText } from "./objects.js";
import { toolArt } from "./art.js";
const $ = (q) => document.querySelector(q),
  esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const pref = prefs();
let tone,
  mode = "",
  before = null,
  chosenWorld = DEFAULT,
  chosenRealm = null;
const btn = (act, label, ic, cls = "", v = "") =>
  `<button data-lobby="${act}" ${v ? `data-v="${esc(v)}"` : ""} class="lobby-btn ${cls}">${ic ? i(ic, 16) : ""}${label}</button>`;
const cards = [
  [
    "create",
    "creation",
    "SANDBOX",
    "Crear un mundo",
    "Dibuja continentes y da vida a tus propias civilizaciones.",
    "Nuevo mundo",
    "wand-sparkles",
    "N",
  ],
  [
    "rule",
    "crown",
    "ESTRATEGIA",
    "Gobernar un reino",
    "Toma la corona y decide el destino de tu pueblo.",
    "Elegir reino",
    "crown",
    "R",
  ],
  [
    "library",
    "archive",
    "ARCHIVO LOCAL",
    "Mis mundos",
    "Regresa a tus tierras y continúa su historia.",
    "Abrir archivo",
    "folder-open",
    "M",
  ],
];
$("#app").className = "lobby";
$("#app").innerHTML =
  `<header class="lobby-top"><div class="lobby-wrap lobby-top-in"><a class="lobby-brand" href="./" aria-label="Aethoria, inicio">${crest}<span><b>AETHORIA</b><small>WORLD SANDBOX</small></span></a><nav class="lobby-nav" aria-label="Navegación principal"><button data-lobby="home" class="current">${i("house", 15)}Inicio</button><button data-lobby="library">${i("folder-open", 16)}Mis mundos</button><button data-lobby="codex">${i("book-open", 15)}Códice</button></nav><div class="lobby-utils"><button data-lobby="audio" class="lobby-audio"></button><span></span><button class="lobby-setting" data-lobby="settings" title="Ajustes del menú" aria-label="Ajustes del menú">${i("settings", 17)}</button></div></div></header>
<main class="lobby-main"><section class="hero-stage" aria-labelledby="hero-title"><div class="scene-art" aria-hidden="true">${SCENES.map((s, j) => `<img class="scene-frame ${j === 0 ? "on" : ""}" ${j === 0 ? 'src="/art/menu-valdoria.webp" fetchpriority="high"' : ""} alt="" decoding="${j === 0 ? "sync" : "async"}">`).join("")}</div><div class="scene-shade"></div><canvas class="cinema-fx" aria-hidden="true"></canvas><div class="hero-inner lobby-wrap"><div class="hero-copy"><div class="world-ribbon">${i("compass", 13)} MUNDO PREDETERMINADO</div><h1 id="hero-title">Aethoria</h1><div class="hero-subtitle" aria-label="World Sandbox"><span></span>WORLD SANDBOX<span></span></div><p>Un mundo vivo de magia, reinos y civilizaciones.<br>Su próxima era está en tus manos.</p><div class="hero-facts"><span>${i("earth", 15)}7 continentes</span><b>·</b><span>${i("crown", 15)}63 reinos</span><b>·</b><span>${i("mountain", 16)}Escala colosal</span></div><div class="hero-actions">${btn("play", "Entrar al mundo", "play", "gold-play")}${btn("about", "Ver detalles", "book-open", "glass-btn")}</div></div></div><div class="scene-hud"><div class="scene-meta"><small><em></em><span class="scene-count">ESCENA 01 / 03</span></small><span class="scene-location">Valle de Valdoria</span></div><div class="scene-switch"><button data-scene="pause" aria-label="Pausar cinemática">${i("pause", 13)}</button><button data-scene="next" aria-label="Siguiente paisaje" title="Siguiente paisaje">${i("chevron-right", 15)}</button></div></div><div class="scene-pages" aria-label="Paisajes de Aethoria">${SCENES.map((s, j) => `<button class="scene-dot ${j === 0 ? "on" : ""}" data-scene="${j}" title="${s.name}" aria-label="Mostrar ${s.name}"></button>`).join("")}</div></section>
<section class="gateways"><div class="lobby-wrap"><div class="gateway-heading"><div class="gateway-title"><span class="gate-mark" aria-hidden="true">✥</span><h2>Elige tu camino</h2></div><span class="hairline"></span><span class="section-locator">MENÚ PRINCIPAL</span></div><div class="gateway-grid">${cards.map(([act, img, k, title, desc, action, ic, key], n) => `<button class="gateway gateway-${n}" data-lobby="${act}"><span class="gate-pattern"></span><img class="gate-art" src="/art/menu-${img}.webp" alt="" draggable="false"><span class="gate-body"><span class="gate-kicker">${i(ic, 13)}${k}</span><span class="gate-name">${title}</span><span class="gate-desc">${desc}</span></span><span class="gate-base"><span>${action}${i("arrow-right", 13)}</span><kbd>${key}</kbd></span></button>`).join("")}</div></div></section></main>
<footer class="lobby-foot"><div class="lobby-wrap"><span class="local-status"><i></i>Guardado local</span><span class="foot-ornament" aria-hidden="true"><b></b>✧<b></b></span><span class="edition">AETHORIA <em>/</em> V.2.0</span></div></footer><dialog class="game-dialog lobby-dialog" aria-labelledby="lobby-dialog-title"><div class="dialog-head"><div><span class="eyebrow" id="lobby-eyebrow"></span><h2 id="lobby-dialog-title"></h2></div><button class="icon-btn" data-lobby="close" aria-label="Cerrar">${i("x", 17)}</button></div><div class="dialog-body" id="lobby-content"></div></dialog><div class="lobby-toast" role="status" aria-live="polite"></div>`;
const cinema = cinematic($(".hero-stage"), pref),
  dlg = $(".lobby-dialog"),
  content = $("#lobby-content");
function audioUI() {
  const b = $(".lobby-audio");
  b.innerHTML =
    i(pref.sound ? "volume-2" : "volume-x", 16) + "<span>Sonido</span>";
  b.title = pref.sound ? "Silenciar sonidos" : "Activar sonidos";
  b.setAttribute("aria-label", b.title);
  b.setAttribute("aria-pressed", pref.sound);
}
audioUI();
function chime() {
  if (!pref.sound) return;
  try {
    tone = tone || new AudioContext();
    tone.resume();
    for (const [j, hz] of [392, 494, 587].entries()) {
      const osc = tone.createOscillator(),
        gain = tone.createGain(),
        start = tone.currentTime + j * 0.065;
      osc.frequency.value = hz;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.026, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.55);
      osc.connect(gain);
      gain.connect(tone.destination);
      osc.start(start);
      osc.stop(start + 0.58);
    }
  } catch {}
}
let toastTimer;
function message(t) {
  const el = $(".lobby-toast");
  el.textContent = t;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3500);
}
function open(page, head, kicker, html) {
  mode = page;
  $("#lobby-dialog-title").textContent = head;
  $("#lobby-eyebrow").textContent = kicker;
  content.innerHTML = html;
  content.scrollTop = 0;
  if (!dlg.open) {
    before = document.activeElement;
    dlg.showModal();
  }
  document
    .querySelectorAll(".lobby-nav button")
    .forEach((b) =>
      b.classList.toggle(
        "current",
        b.dataset.lobby ===
          (page === "codex"
            ? "codex"
            : page === "library"
              ? "library"
              : "home"),
      ),
    );
}
function close() {
  dlg.close();
}
dlg.addEventListener("close", () => {
  mode = "";
  document
    .querySelectorAll(".lobby-nav button")
    .forEach((b) => b.classList.toggle("current", b.dataset.lobby === "home"));
  before?.focus?.({ preventScroll: true });
});
dlg.addEventListener("click", (e) => {
  if (e.target === dlg) {
    let r = dlg.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      close();
  }
});
function play(id, params = {}) {
  const s = readSlot(id);
  if (!s) {
    message("Esta partida no se puede leer. Las demás siguen disponibles.");
    return;
  }
  chime();
  location.assign(gameURL(id, params));
}
function about() {
  const s = readSlot(DEFAULT),
    d = dimensions(s || { scale: 8 });
  open(
    "about",
    "El mundo de Aethoria",
    "ATLAS ORIGINAL",
    `<div class="lore-hero"><span>ELDORIA · VALDORIA</span></div><p class="dialog-intro">Siete continentes con sus propios climas, culturas y dioses. El atlas original empieza con nueve reinos por continente; sus fronteras y alianzas cambian con tu historia.</p><div class="info-grid"><div class="info-cell"><small>Escala colosal</small><b>${fmt(d.width)} × ${fmt(d.height)} celdas</b></div><div class="info-cell"><small>Habitantes</small><b>20 razas · 22 supremos</b></div></div><p class="field-hint">La cámara comienza en Eldoria. Usa el minimapa para viajar entre continentes o acércate para explorar cada asentamiento.</p><div class="dialog-actions">${btn("codex", "Consultar el códice", "book-open")}${btn("play", "Entrar al mundo", "play", "primary")}</div>`,
  );
}
function create() {
  open(
    "create",
    "Crear un mundo",
    "TALLER DEL CREADOR",
    `<p class="dialog-intro">Empieza sin reinos. Dibuja tu tierra, coloca materiales y añade humanos para fundar la primera civilización.</p><form id="genesis" class="form-grid"><label><span class="form-label">Nombre del mundo</span><input name="name" class="field" maxlength="40" value="Mi nuevo mundo" required autocomplete="off"></label><fieldset class="template-choice"><legend>Terreno inicial</legend><label><input type="radio" name="template" value="wild" checked><span>${i("trees", 22)}<b>Tierra virgen</b><small>Continentes sin habitantes</small></span></label><label><input type="radio" name="template" value="ocean"><span>${i("waves", 22)}<b>Océano vacío</b><small>Pinta desde la primera isla</small></span></label></fieldset><div class="genesis-cols"><label><span class="form-label">Tamaño</span><select name="scale" aria-describedby="size-extent">${SIZES.map((z) => `<option value="${z.value}" ${z.value === 8 ? "selected" : ""}>${z.name}</option>`).join("")}</select><small id="size-extent" class="field-hint">${fmt(W * 8)} × ${fmt(H * 8)} celdas</small></label><label><span class="form-label">Materiales</span><select name="materials"><option value="free">Sandbox sin límites</option><option value="kit">Kit de fundación</option></select></label></div><div id="kit-info" class="kit-description">${i("infinity", 15)}Todos los objetos y pinceles están a tu disposición.</div><div class="genesis-cols"><label><span class="form-label">Semilla del terreno</span><span class="seed-edit"><input name="seed" type="number" required min="1" max="2147483647" value="${1 + Math.floor(Math.random() * 999999)}" class="field"><button type="button" class="icon-btn" data-lobby="seed" title="Sortear semilla" aria-label="Sortear semilla">${i("shuffle", 15)}</button></span></label><label><span class="form-label">Velocidad del tiempo <output id="speed-output">1×</output></span><input type="range" name="speed" min="1" max="10" value="1" step="1"></label></div><div class="genesis-foot"><small>${i("save", 13)}Se guarda como una partida nueva.</small><button type="submit" class="lobby-btn primary">${i("sparkles", 15)}Crear y jugar</button></div></form>`,
  );
}
function library() {
  const arr = listWorlds();
  open(
    "library",
    "Mis mundos",
    "ARCHIVO LOCAL",
    `<div class="archive-lead"><p class="dialog-intro">${arr.length} ${arr.length === 1 ? "mundo disponible" : "mundos disponibles"} en este navegador.</p>${btn("create", "Nuevo mundo", "plus")}</div><div class="save-list">${arr
      .map((s) => {
        const def = s.slotId === DEFAULT;
        return `<article class="saved-world"><div class="save-thumb ${def ? "original" : ""}">${def ? "" : `<img src="/art/menu-creation.webp" alt="">`}</div><div class="saved-copy"><small>${def ? "MUNDO ORIGINAL" : worldSize(s).name.toUpperCase() + " · SANDBOX"}</small><h3>${esc(s.name)}</h3><p>Año ${s.year} · ${liveRealms(s).length} reinos · ${fmt(totalPop(s))} hab.</p></div><button data-lobby="resume" data-v="${esc(s.slotId)}" class="icon-btn" aria-label="Jugar ${esc(s.name)}" title="Continuar partida">${i("play", 15)}</button>${def ? "" : `<button data-lobby="delete" data-v="${esc(s.slotId)}" class="plain-trash" aria-label="Eliminar ${esc(s.name)}">${i("trash-2", 14)}</button>`}</article>`;
      })
      .join(
        "",
      )}</div><p class="field-hint">Cada partida conserva su terreno, sus criaturas, sus fronteras y su reloj. Aethoria siempre está disponible.</p>`,
  );
}
function rule(id = DEFAULT) {
  chosenWorld = id;
  chosenRealm = null;
  const worlds = listWorlds();
  open(
    "rule",
    "Gobernar un reino",
    "SALA DEL TRONO",
    `<p class="dialog-intro">Elige un mundo y toma la corona de uno de sus reinos. Sus edificios, recursos y pactos estarán a tu cargo.</p><label class="form-label rule-world">Mundo<select id="crown-world">${worlds.map((s) => `<option value="${esc(s.slotId)}" ${s.slotId === id ? "selected" : ""}>${esc(s.name)} · ${liveRealms(s).length} reinos</option>`).join("")}</select></label><div class="input-row"><label class="searchbox">${i("search", 15)}<input id="crown-search" type="search" placeholder="Buscar reino…" aria-label="Buscar reino"></label><select id="crown-filter" aria-label="Continente"><option value="-1">Todos los continentes</option>${CONTINENTS.map((c, j) => `<option value="${j}">${c.name}</option>`).join("")}</select></div><div class="realm-list" id="crown-realms"></div><div class="crown-footer"><small id="crown-pick">Selecciona un estandarte.</small>${btn("crown-play", "Tomar la corona", "crown", "primary")}</div>`,
  );
  realms();
}
const norm = (s) =>
  s
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
function realms() {
  const s = readSlot(chosenWorld);
  if (!s) return;
  const c = +$("#crown-filter").value,
    q = norm($("#crown-search").value);
  const arr = liveRealms(s).filter(
    (r) =>
      (c < 0 || regionOf(s, r.id) === c) &&
      norm(realmName(s, r.id)).includes(q),
  );
  if (!arr.some((r) => r.id === chosenRealm)) {
    chosenRealm = null;
    $("#crown-pick").textContent = "Selecciona un estandarte.";
  }
  $("#crown-realms").innerHTML =
    arr
      .map(
        (r) =>
          `<button data-lobby="pick-crown" data-v="${r.id}" class="realm-card ${r.id === chosenRealm ? "picked" : ""}" aria-pressed="${r.id === chosenRealm}" style="--realmcolor:${CONTINENTS[regionOf(s, r.id)].color}"><span class="realm-flag">${i("flag", 16)}</span><div><b>${esc(realmName(s, r.id))}</b><small>${CONTINENTS[regionOf(s, r.id)].name} · ${fmt(r.pop)} hab.</small></div>${i(r.id === chosenRealm ? "check" : "chevron-right", 14)}</button>`,
      )
      .join("") ||
    `<p class="empty-message">${liveRealms(s).length ? "Ningún reino coincide." : "Todavía no hay reinos. Coloca un humano en tierra firme para fundar uno."}</p>`;
  $('[data-lobby="crown-play"]').disabled = chosenRealm === null;
}
function codex(t = "Continentes", continent = null) {
  const tabs = ["Continentes", "Razas", "Panteón", "Objetos"];
  let h = `<div class="d-tabs">${tabs.map((k) => `<button class="${k === t ? "sel" : ""}" data-lobby="codex-tab" data-v="${k}">${k}</button>`).join("")}</div>`;
  if (t === "Continentes") {
    if (continent != null) {
      const c = CONTINENTS[continent];
      h += `<div class="archive-lead"><h3 class="subhead">${c.name}</h3>${btn("codex-tab", "Volver", "arrow-left", "", "Continentes")}</div><p class="dialog-intro">${c.culture} · ${c.faith}</p><div class="pop-table">${c.countries.map((s, j) => `<b>${s}</b><span>${BIOMES[c.biomes[j]]}</span>`).join("")}</div>`;
    } else
      h += `<p class="dialog-intro">Siete continentes, nueve países en cada uno. Elige una región para conocer sus tierras.</p><div class="manual-grid">${CONTINENTS.map((c, j) => `<button class="realm-card" data-lobby="codex-land" data-v="${j}" style="--realmcolor:${c.color}"><span class="realm-flag">${i("earth", 19)}</span><div><b>${c.name}</b><small>${BIOMES[c.base]}</small></div></button>`).join("")}</div>`;
  }
  if (t === "Razas")
    h += `<p class="dialog-intro">20 linajes habitan el atlas. Dioses y demonios tienen un 5% cada uno en una invocación al azar.</p><div class="manual-grid">${RACES.map((r) => `<div class="race-card"><img src="${toolArt(r.id)}" alt=""><b>${r.name}</b></div>`).join("")}</div>`;
  if (t === "Panteón")
    h += `<p class="dialog-intro">Once identidades supremas por orden. La undécima reúne todos los elementos.</p><table class="pantheon"><thead><tr><th>Elemento</th><th>Dios</th><th>Demonio</th></tr></thead><tbody>${PANTHEON.map((p, n) => `<tr><td><span class="index-num">${String(n + 1).padStart(2, "0")}</span>${p.element}</td><td>${p.god}</td><td>${p.demon}</td></tr>`).join("")}</tbody></table>`;
  if (t === "Objetos")
    h += `<p class="dialog-intro">${CATALOG.length} objetos para construir, poblar y decorar. Su producción se recoge por estación dentro de un reino.</p><div class="manual-grid">${CATALOG.map((o) => `<div class="race-card"><img src="${toolArt(o.art)}" alt=""><div><b>${o.name}</b><small>${o.family} · ${yieldText(o)}</small></div></div>`).join("")}</div>`;
  open("codex", "Códice de Aethoria", "BIBLIOTECA DEL ATLAS", h);
}
function settings() {
  open(
    "settings",
    "Ajustes del menú",
    "PREFERENCIAS",
    `<div class="settings-row"><div><b>Cinemática de fondo</b><small>Recorrido de cámara, motas de luz y cambio de escenario.</small></div><button class="switch ${pref.motion ? "on" : ""}" data-lobby="motion" role="switch" aria-checked="${pref.motion}" aria-label="Animación del menú"></button></div><div class="settings-row"><div><b>Sonido</b><small>Señales musicales de las acciones del menú.</small></div><button class="switch ${pref.sound ? "on" : ""}" data-lobby="audio" role="switch" aria-checked="${pref.sound}" aria-label="Sonido del menú"></button></div><h3 class="subhead">Atajos</h3><div class="pop-table">${[
      ["Entrar a Aethoria", "J"],
      ["Nuevo mundo", "N"],
      ["Modo reino", "R"],
      ["Mis mundos", "M"],
      ["Cerrar ventana", "Esc"],
    ]
      .map(([k, v]) => `<span>${k}</span><kbd>${v}</kbd>`)
      .join("")}</div>`,
  );
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-lobby]");
  if (!b) return;
  const a = b.dataset.lobby,
    v = b.dataset.v;
  if (a === "close" || a === "home") {
    if (dlg.open) close();
    return;
  }
  if (a !== "audio") chime();
  if (a === "play") play(DEFAULT, { modo: "creador" });
  else if (a === "about") about();
  else if (a === "resume") play(v);
  else if (a === "create") create();
  else if (a === "library") library();
  else if (a === "rule") rule();
  else if (a === "pick-crown") {
    chosenRealm = +v;
    realms();
    $("#crown-pick").textContent =
      realmName(readSlot(chosenWorld), chosenRealm) + " · corona seleccionada";
  } else if (a === "crown-play" && chosenRealm !== null)
    play(chosenWorld, { corona: chosenRealm });
  else if (a === "codex") codex();
  else if (a === "codex-tab") codex(v);
  else if (a === "codex-land") codex("Continentes", +v);
  else if (a === "seed")
    $("#genesis").elements.seed.value = 1 + Math.floor(Math.random() * 999999);
  else if (a === "settings") settings();
  else if (a === "motion") {
    cinema.motion(!pref.motion);
    settings();
  } else if (a === "audio") {
    pref.sound = !pref.sound;
    savePrefs(pref);
    audioUI();
    chime();
    if (mode === "settings") settings();
  } else if (a === "delete") {
    const s = readSlot(v);
    if (!s || v === DEFAULT) return;
    open(
      "delete",
      "Eliminar mundo",
      "ARCHIVO LOCAL",
      `<p class="dialog-intro">Se eliminará <b>${esc(s.name)}</b> de este navegador. Las otras partidas no cambiarán. Esta acción no se puede deshacer.</p><div class="dialog-actions">${btn("library", "Cancelar", "arrow-left")}${btn("confirm-delete", "Eliminar partida", "trash-2", "danger", v)}</div>`,
    );
  } else if (a === "confirm-delete") {
    if (removeSlot(v)) library();
    else message("No se pudo eliminar la partida.");
  }
});
content.addEventListener("input", (e) => {
  if (e.target.name === "speed")
    $("#speed-output").textContent = e.target.value + "×";
  if (e.target.id === "crown-search") realms();
});
content.addEventListener("change", (e) => {
  if (e.target.id === "crown-world") rule(e.target.value);
  if (e.target.id === "crown-filter") realms();
  if (e.target.name === "scale")
    $("#size-extent").textContent =
      fmt(W * e.target.value) + " × " + fmt(H * e.target.value) + " celdas";
  if (e.target.name === "materials")
    $("#kit-info").innerHTML =
      e.target.value === "kit"
        ? i("package-open", 16) +
          "240 madera · 180 piedra · 90 hierro · 60 esencia. Puedes reponer el kit en el taller."
        : i("infinity", 15) +
          "Todos los objetos y pinceles están a tu disposición.";
});
content.addEventListener("submit", (e) => {
  if (e.target.id !== "genesis") return;
  e.preventDefault();
  const f = new FormData(e.target),
    name = f.get("name").trim();
  if (!name) {
    e.target.elements.name.focus();
    return;
  }
  const s = newSlot({
    id: newId(),
    name,
    seed: +f.get("seed"),
    template: f.get("template"),
    scale: +f.get("scale"),
    unlimited: f.get("materials") === "free",
    speed: +f.get("speed"),
  });
  s.sound = pref.sound;
  if (!writeSlot(s)) {
    message(
      "No hay espacio para otra partida. No se ha sustituido ningún mundo.",
    );
    return;
  }
  play(s.slotId);
});
document.addEventListener("keydown", (e) => {
  if (dlg.open || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  const a = { j: "play", n: "create", r: "rule", m: "library" }[
    e.key.toLowerCase()
  ];
  if (a) {
    e.preventDefault();
    document.querySelector(`[data-lobby="${a}"]`).click();
  }
});
const route = location.hash.slice(1);
if (route === "crear") create();
else if (route === "mundos") library();
else if (route === "reino") rule();
