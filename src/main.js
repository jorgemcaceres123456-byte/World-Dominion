import {
  DEFAULT,
  readSlot,
  writeSlot,
  worldSize,
  gameURL,
  dimensions,
} from "./worlds.js";
import {
  CATALOG,
  OBJECTS,
  STARTER_KIT,
  MATERIALS,
  costText,
  yieldText,
  installObject,
} from "./objects.js";
import { prepareWorld, settle, growFrontiers } from "./frontier.js";
import { survey } from "./territory.js";
import "./style.css";
import { icon } from "./icons.js";
import {
  W,
  H,
  BIOMES,
  CONTINENTS,
  TOOLS,
  POLICIES,
  EVENTS,
  RACES,
  SEASONS,
  fmt,
  realmName,
  regionOf,
  clamp,
  rng,
} from "./data.js";
import { toolArt } from "./art.js";
import {
  createGeography,
  markTerrain,
  tileAt,
  coastRealm,
  updateDepth,
} from "./geography.js";
import { AtlasMap } from "./map.js";
import {
  liveRealms,
  totalPop,
  advance,
  addEvent,
  addObject,
  summon,
  power,
  realmAction,
  raceName,
  cast,
} from "./sim.js";
import { makeDialogs } from "./windows.js";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
export const escapeHtml = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const esc = escapeHtml,
  i = icon;
const startParams = new URLSearchParams(location.search),
  slotId = startParams.get("mundo") || DEFAULT;
let state = readSlot(slotId),
  geo = prepareWorld(state, createGeography(state.seed)),
  map,
  menus,
  selected = state.mode === "kingdom" ? state.ruler : null,
  entity = null,
  category = state.mode === "kingdom" ? "Gobierno" : "Terreno",
  tool = "inspect",
  brush = 1,
  toastTimer,
  savedTimer,
  popupType = "",
  paintDirty = false,
  ticks = 0,
  audio;
const countryName = (id) => realmName(state, id);
let placement = null,
  objectGroup = "Todos";
if (state.marks.length) updateDepth(geo);
survey(state, geo);
if (
  !state.sandbox &&
  !state.empty &&
  !state.founded &&
  !state.steps &&
  !state.objects.length
) {
  const seeded = rng(state.seed + 37),
    a = geo.caps[11],
    b = geo.caps[2];
  summon(state, "mage", a.x + 3, a.y + 3, a.id, seeded, false);
  addObject(state, {
    kind: "gold",
    x: b.x + 6,
    y: b.y + 2,
    class: "resource",
    realm: b.id,
  });
  for (const [id, k] of [
    [24, "god"],
    [50, "demon"],
    [5, "spirit"],
    [28, "possessed"],
  ]) {
    const c = geo.caps[id],
      r = state.realms[id];
    if (["god", "demon"].includes(k) && r.races[k]) {
      r.pop--;
      r.races[k]--;
    }
    summon(state, k, c.x + 2, c.y + 2, id, seeded, false);
  }
}
state.founded = true;
const asset = (id, cls = "tool-img", alt = "") =>
  `<img src="${toolArt(id)}" class="${cls}" alt="${esc(alt)}" draggable="false">`;
const iconBtn = (action, ic, label, cl = "icon-btn") =>
  `<button class="${cl}" data-action="${action}" aria-label="${label}" title="${label}">${i(ic, 17)}</button>`;
const compass = `<svg class="windrose" viewBox="0 0 60 72" fill="none" aria-hidden="true"><text x="30" y="10" text-anchor="middle" fill="#e0c690" font-family="Pixelify,monospace" font-size="12">N</text><circle cx="30" cy="39" r="15.5" stroke="#a99b75" stroke-width=".75"/><circle cx="30" cy="39" r="13" stroke="#729597" stroke-width=".6"/><path d="M13 22l20 14 14 20-20-14zM13 56l14-20 20-14-14 20z" fill="#728d8e"/><path d="M30 15l4.3 19.5L55 39l-20.7 4.5L30 64l-4.5-20.5L5 39l20.5-4.5z" fill="#bca97d"/><path d="M30 15v24l-4.5-4.5zM55 39H30l4.5-4.5zM30 64V39l4.3 4.5zM5 39h25l-4.5 4.5z" fill="#5b7e83"/><path d="M30 17v20" stroke="#ead8a2"/><path d="M30 35l4 4-4 4-4-4z" fill="#dcc795"/></svg>`;
$("#app").innerHTML =
  `<header class="topbar"><div class="game-brand"><button class="icon-btn home-return" data-action="home" title="Volver al menú principal" aria-label="Menú principal">${i("house", 16)}</button><div class="identity">${asset("logo", "logoimg")}<div class="brand-copy"><span class="brand-name">AETHORIA</span><span class="brand-tag">WORLD SANDBOX</span></div></div></div><nav class="modebar" aria-label="Modo de juego"><button class="mode-btn" data-action="creator">${i("wand-sparkles", 16)}Modo creador</button><button class="mode-btn" data-action="kingdom">${i("crown", 17)}Modo reino</button></nav><div class="top-actions"><button id="audio-btn" class="icon-btn" data-action="sound"></button>${iconBtn("settings", "settings", "Ajustes del mundo")}<span class="action-rule"></span><button class="save-btn" data-action="save" title="Guardar en este navegador">${i("save", 15)}<span>Guardar</span></button></div></header>
<main class="workspace"><div class="play-column"><section class="panel map-panel" aria-label="Atlas interactivo"><div class="panel-head map-head"><div class="heading-group"><span class="head-icon">${i("earth", 20)}</span><h1>${esc(state.name)}</h1><span class="live-badge" id="live-badge"></span></div><div class="time-readout"><span id="year"></span><i class="thin-rule"></i><span id="season" class="season"></span></div></div><div class="map-stage" id="map-stage"><canvas class="world-canvas" tabindex="0" aria-label="Mapa de ${esc(state.name)}. Selecciona un reino, usa la rueda para acercarte y arrastra para explorar.">Mapa interactivo de ${esc(state.name)}</canvas><div class="map-label" title="Mundo ${worldSize(state).name.toLowerCase()}: ${fmt(dimensions(state).width)} × ${fmt(dimensions(state).height)} celdas">${i("scan", 12)}<span id="view-name">VISTA GLOBAL</span><span class="map-scale-tag"> · ${worldSize(state).name.toUpperCase()}</span></div><div class="country-hover" id="hover-name"></div><button class="map-button layer-btn" data-action="layers" aria-expanded="false">${i("layers", 14)}Capas${i("chevron-down", 11)}</button>${compass}<button class="mini-atlas hide" data-action="travel" title="Minimapa: pulsa para viajar" aria-label="Minimapa de viaje: pulsa un destino o usa Intro para ver el mundo completo"><canvas width="144" height="80"></canvas><span>MAPAMUNDI</span></button><div class="map-bottom"><div class="map-cluster time-control" aria-label="Velocidad del tiempo"><button class="time-toggle" data-action="pause"></button><span class="divider-vertical"></span><button data-action="pace" class="pace-selector" aria-expanded="false" title="Ajustar velocidad de los años">${i("hourglass", 13)}<b id="pace">${state.speed}×</b>${i("chevron-down", 11)}</button></div><div class="map-cluster zoom-control">${iconBtn("global", "globe", "Ver el mundo completo", "zoom-key")}${iconBtn("zoom-out", "minus", "Alejar", "zoom-key")}<span class="zoom-readout" id="zoom">100%</span>${iconBtn("zoom-in", "plus", "Acercar", "zoom-key")}<span class="divider-vertical"></span>${iconBtn("expand", "maximize-2", "Pantalla completa", "expand-view")}</div></div><div class="map-tip hide" id="map-tip"></div></div></section>
<section class="panel palette" id="palette" aria-label="Herramientas de creación"></section></div><aside class="side-column"><section class="panel inspector"><div class="panel-head"><div class="heading-group"><span class="head-icon">${i("scan-eye", 18)}</span><h2>Inspector</h2></div><span id="ins-tag" class="aside-tag"></span></div><div id="inspector-body"></div></section><section class="panel chronicle"><div class="panel-head"><div class="heading-group"><span class="head-icon">${i("book-open-text", 18)}</span><h2>Crónicas del mundo</h2></div><span class="live-signal" title="Registro de sucesos">${i("activity", 15)}</span></div><div class="feed-items" id="feed"></div><button class="panel-link" data-action="chronicles">Ver todas las crónicas${i("arrow-right", 15)}</button></section></aside></main>
<footer class="statusbar"><span class="sim-state"><i class="dot"></i><span id="sim-state">Simulación activa</span></span><div class="hints"><span>${i("mouse-pointer-2", 12)}Arrastra para explorar</span><span>${i("mouse", 12)}Rueda para acercar</span><span><kbd>Espacio</kbd>Pausar</span></div><span class="version">AETHORIA ENGINE · V2.0</span></footer><div id="popup" class="popup hide"></div><dialog class="game-dialog" id="window" aria-labelledby="dialog-title"><div class="dialog-head"><div><span class="eyebrow" id="dialog-eyebrow"></span><h2 id="dialog-title"></h2></div>${iconBtn("close-dialog", "x", "Cerrar ventana")}</div><div class="dialog-body" id="dialog-body"></div></dialog><div id="toast" class="toast" role="status" aria-live="polite"></div>`;
function beep(low = false) {
  if (!state.sound) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
    const osc = audio.createOscillator(),
      vol = audio.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(low ? 278 : 523, audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      low ? 370 : 784,
      audio.currentTime + 0.1,
    );
    vol.gain.setValueAtTime(0.025, audio.currentTime);
    vol.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.15);
    osc.connect(vol);
    vol.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.16);
  } catch {
    /* Muted or unsupported sound device. */
  }
}
function toast(msg, warn = false) {
  const el = $("#toast");
  el.className = "toast show" + (warn ? " warn" : "");
  el.innerHTML = i(warn ? "info" : "check", 16) + `<span>${esc(msg)}</span>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
}
function save(manual = false) {
  if (map) state.camera = { z: map.zoom, x: map.ox, y: map.oy };
  const ok = writeSlot(state);
  if (!ok && !manual)
    toast(
      "Guardado local no disponible: revisa el espacio del navegador.",
      true,
    );
  if (manual) {
    toast(
      ok
        ? "Mundo guardado en este navegador."
        : "No hay espacio para guardar el mundo.",
      !ok,
    );
    if (ok) {
      const el = $('[data-action="save"]');
      el.classList.add("saved");
      el.innerHTML = i("check", 16) + "<span>Guardado</span>";
      clearTimeout(savedTimer);
      savedTimer = setTimeout(() => {
        el.classList.remove("saved");
        el.innerHTML = i("save", 15) + "<span>Guardar</span>";
      }, 2200);
    }
  }
  return ok;
}
function closeMenus() {
  popupType = "";
  $("#popup").classList.add("hide");
  for (const e of $$('[aria-expanded="true"]'))
    e.setAttribute("aria-expanded", "false");
}
function popup(type, anchor, html) {
  if (popupType === type) {
    closeMenus();
    return;
  }
  closeMenus();
  const pop = $("#popup");
  (document.fullscreenElement || $("#app")).appendChild(pop);
  pop.innerHTML = html;
  pop.classList.remove("hide");
  popupType = type;
  anchor.setAttribute("aria-expanded", "true");
  const r = anchor.getBoundingClientRect(),
    pr = pop.getBoundingClientRect();
  pop.style.top =
    (r.bottom + pr.height + 10 < window.innerHeight
      ? r.bottom + 5
      : Math.max(5, r.top - pr.height - 5)) + "px";
  pop.style.left =
    clamp(r.right - pr.width, 7, window.innerWidth - pr.width - 7) + "px";
}
const catIcon = {
  Terreno: "mountain",
  Biomas: "trees",
  Recursos: "gem",
  Criaturas: "paw-print",
  Poderes: "sparkles",
  Objetos: "boxes",
  Obras: "hammer",
  Gobierno: "castle",
  Diplomacia: "handshake",
  Magia: "wand-sparkles",
};
const currentTool = () => ({
  id: placement || tool,
  paint:
    state.mode === "creator" &&
    tool !== "inspect" &&
    (category === "Terreno" || category === "Biomas"),
});
const singleCell = () =>
  brush === 1 && map?.zoom >= 16 * geo.scale && tool !== "border";
const radius = () =>
  singleCell()
    ? 0.7 / geo.scale
    : [4, 8, 15, 28][brush - 1] / Math.sqrt(map?.zoom || 1);
function toolDescription(id, name) {
  if (id === "inspect") return "Selecciona un reino o una criatura";
  if (id === "border") return "Trazar frontera · " + countryName(selected ?? 0);
  if (id === "remove-prop")
    return "Pulsa un objeto del catálogo para retirarlo";
  if (OBJECTS[id])
    return `${OBJECTS[id].name} · ${yieldText(OBJECTS[id])}${state.unlimited ? "" : " · " + costText(OBJECTS[id])}`;
  if (category === "Criaturas") return `Invocar: ${name}`;
  if (category === "Poderes") return `Desatar: ${name}`;
  if (category === "Recursos") return `Colocar ${name.toLowerCase()}`;
  return `Pintar ${name.toLowerCase()}`;
}
function renderTools() {
  const kingdom = state.mode === "kingdom",
    sets = kingdom ? POLICIES : TOOLS,
    items =
      tool === "border" && category === "Terreno"
        ? [...sets[category], ["border", "Frontera"]]
        : category === "Objetos" && objectGroup !== "Todos"
          ? sets[category].filter(([k]) => OBJECTS[k].family === objectGroup)
          : sets[category],
    active = kingdom ? placement : tool;
  $("#palette").classList.toggle("realm-palette", kingdom);
  const head = kingdom
    ? "Consejo del reino"
    : category === "Objetos"
      ? "Taller de objetos"
      : "Paleta de creación";
  $("#palette").innerHTML =
    `<div class="tool-head"><div class="heading-group"><span class="head-icon">${i(kingdom ? "crown" : "pencil-ruler", 18)}</span><h2>${head}</h2></div><div class="palette-settings">${!kingdom && category === "Objetos" ? `<div class="prop-options"><button data-action="remove-prop" class="brush-control ${tool === "remove-prop" ? "picked" : ""}" title="Retirar un objeto del mapa" aria-label="Retirar un objeto del mapa">${i("trash-2", 13)}</button><select id="object-filter" aria-label="Familia de objetos">${["Todos", ...new Set(CATALOG.map((o) => o.family))].map((k) => `<option ${objectGroup === k ? "selected" : ""}>${k}</option>`).join("")}</select></div>` : ""}${!kingdom ? `<button class="brush-control supplies-btn" data-action="supplies" title="Materiales del creador">${i("package-open", 13)}<span>Materiales</span></button>` : ""}${kingdom ? `<button class="brush-control" data-action="kingdom">${i("flag", 13)}Cambiar reino${i("chevron-down", 12)}</button>` : ["Terreno", "Biomas"].includes(category) ? `<button class="brush-control" data-action="brush" aria-expanded="false" title="Tamaño del pincel">${i("brush", 13)}Pincel<strong>${[1, 2, 4, 8][brush - 1]}×</strong>${i("chevron-down", 11)}</button>` : ""}</div></div><div class="category-bar" role="tablist" aria-label="Categorías">${Object.keys(
      sets,
    )
      .map(
        (c) =>
          `<button class="cat" data-action="category" role="tab" aria-selected="${c === category}" data-selected="${c === category}" data-val="${c}">${i(catIcon[c], 15)}${c}</button>`,
      )
      .join(
        "",
      )}</div><div class="tool-shelf"><div id="tools" class="tool-list ${items.length > 8 ? "is-long" : ""}">${items.map(([id, name, desc], idx) => `<button class="tool-item ${id === active ? "active" : ""}" data-action="${kingdom ? "policy" : "tool"}" data-val="${id}" ${!kingdom ? `aria-pressed="${id === active}"` : ""} aria-label="${esc(name)}" title="${esc(desc || toolDescription(id, name))}${idx < 9 && !kingdom ? " (" + (idx + 1) + ")" : ""}">${!kingdom && idx < 9 ? `<span class="slot-key">${idx + 1}</span>` : ""}${asset(OBJECTS[id]?.art || id)}<span class="tool-name">${esc(name)}</span>${kingdom ? `<small class="tool-price">${esc(desc)}</small>` : ""}</button>`).join("")}</div><button class="shelf-arrow prev hide" data-action="shelf-prev" aria-label="Herramientas anteriores">${i("chevron-left", 15)}</button><button class="shelf-arrow hide" data-action="shelf-next" aria-label="Más herramientas">${i("chevron-right", 15)}</button></div>`;
  $("#tools").addEventListener("scroll", shelfArrows);
  requestAnimationFrame(shelfArrows);
  const isInspect = (tool === "inspect" || kingdom) && !placement;
  $(".world-canvas").classList.toggle("paint", !isInspect);
  $('#tools [data-val="border"]')?.scrollIntoView({
    block: "nearest",
    inline: "end",
  });
  const tip = $("#map-tip");
  tip.classList.toggle("hide", isInspect);
  if (!isInspect)
    tip.textContent = placement
      ? `Coloca ${OBJECTS[placement].name.toLowerCase()} en tu reino · Esc para cancelar`
      : toolDescription(tool, items.find((t) => t[0] === tool)?.[1] || tool);
}
function shelfArrows() {
  const t = $("#tools");
  if (!t) return;
  const end = t.scrollWidth - t.clientWidth;
  $(".shelf-arrow.prev").classList.toggle("hide", t.scrollLeft < 3);
  $(".shelf-arrow:not(.prev)").classList.toggle(
    "hide",
    end - t.scrollLeft <= 3,
  );
}
function renderTime() {
  $("#pace").textContent = state.speed + "×";
  $("#year").innerHTML = i("calendar-days", 14) + `Año ${state.year}`;
  $("#season").innerHTML =
    i(["sprout", "sun", "leaf", "snowflake"][state.season], 14) +
    `<span class="season-name">${SEASONS[state.season]}</span>`;
  $("#season").title = SEASONS[state.season];
  $("#live-badge").classList.toggle("still", state.paused);
  $("#live-badge").innerHTML =
    '<i class="dot"></i>' + (state.paused ? "EN PAUSA" : "EN VIVO");
  $("#sim-state").textContent = state.paused
    ? "Simulación en pausa"
    : "Simulación activa";
  $(".sim-state .dot").classList.toggle("paused-dot", state.paused);
  const t = $(".time-toggle");
  t.innerHTML = i(state.paused ? "play" : "pause", 15);
  t.title = state.paused ? "Reanudar (Espacio)" : "Pausar (Espacio)";
  t.setAttribute("aria-label", t.title);
  for (const e of $$('[data-action="speed"]')) {
    e.classList.toggle("is-active", +e.dataset.val === state.speed);
    e.setAttribute("aria-pressed", +e.dataset.val === state.speed);
  }
}
function renderMode() {
  for (const e of $$(".mode-btn")) {
    const a = e.dataset.action === state.mode;
    e.classList.toggle("active", a);
    e.setAttribute("aria-pressed", a);
  }
  const au = $("#audio-btn");
  au.innerHTML = i(state.sound ? "volume-2" : "volume-x", 16);
  au.title = state.sound ? "Silenciar sonidos" : "Activar sonidos";
  au.setAttribute("aria-label", au.title);
  au.setAttribute("aria-pressed", state.sound);
}
const stat = (label, val, ic, color, act) =>
  `<button class="stat" data-action="${act}"><span class="stat-ico t-${color}">${i(ic, 17)}</span><span class="stat-copy"><span class="stat-label">${label}</span><strong class="stat-val">${val}</strong></span></button>`;
function renderInspector() {
  const isRealm = selected != null && state.realms[selected]?.pop > 0,
    r = isRealm ? state.realms[selected] : null,
    king = state.mode === "kingdom",
    c = isRealm ? CONTINENTS[regionOf(state, selected)] : null,
    active = liveRealms(state);
  $("#ins-tag").innerHTML = isRealm
    ? `<button data-action="${king ? "realm-detail" : "world-inspector"}" class="aside-tag" title="${king ? "Ver reino" : "Volver al mundo"}">${i(king ? "crown" : "arrow-left", 12)}${king ? "CORONA" : "MUNDO"}</button>`
    : `${i("globe", 11)}GLOBAL`;
  const races = new Set(
      active.flatMap((c) => Object.keys(c.races).filter((k) => c.races[k] > 0)),
    ),
    continents = new Set(active.map((r) => regionOf(state, r.id)));
  let h = `<div class="world-banner ${isRealm ? "kingdom" : ""}"><div><span class="banner-label">${isRealm ? esc(c.name.toUpperCase()) + " · REINO" : state.sandbox ? "MUNDO CREADO" : "MUNDO ORIGINAL"}</span><h3>${esc(isRealm ? countryName(selected) : state.name)}</h3></div></div><div class="stat-grid">${isRealm ? stat("Población", fmt(r.pop), "users", "teal", "realm-detail") + stat("Tesoro", fmt(r.gold), "coins", "gold", "realm-detail") + stat("Maná", fmt(r.mana), "sparkles", "purple", "realm-detail") + stat("Armonía", r.harmony + "%", "sprout", "green", "realm-detail") : stat("Población", fmt(totalPop(state)), "users", "teal", "population") + stat("Reinos", active.length, "crown", "gold", "atlas") + stat("Continentes", continents.size, "earth", "green", "continents") + stat("Razas", races.size, "paw-print", "purple", "races")}</div>`;
  if (isRealm && entity) {
    h += `<div class="entity-card">${asset(entity.kind, "pixel")}<div><b>${esc(entity.name || resourceName(entity.kind))}</b><p>${esc(entity.rank ? entity.rank + " · " + entity.element : entity.objectId ? yieldText(OBJECTS[entity.objectId]) : entity.spell || resourceName(entity.kind))}${entity.mana != null ? ` · ${entity.mana}/${entity.maxMana} MP` : ""}</p>${entity.spell ? `<button class="mini-btn" data-action="cast" data-val="${entity.uid}">${i("sparkles", 12)} Lanzar hechizo</button>` : ""}</div></div>`;
  }
  h += `<button class="panel-link" data-action="${isRealm ? "realm-detail" : "atlas"}"><span>${i(isRealm ? "flag" : "book-open", 13)} &nbsp;${isRealm ? "Ficha del reino" : "Explorar el atlas"}</span>${i("arrow-right", 14)}</button>`;
  $("#inspector-body").innerHTML = h;
}
const resourceName = (k) =>
  TOOLS.Recursos.find((r) => r[0] === k)?.[1] ||
  { village: "Aldea", portal: "Portal abisal" }[k] ||
  raceName(k);
export const eventMarkup = (e) => {
  const t = EVENTS[e.type] || EVENTS.world;
  return `<article class="feed-entry"><span class="ev-icon t-${t.color}">${i(t.icon, 16)}</span><div class="feed-copy"><h3>${esc(e.title)}</h3><p>${esc(e.text)}</p><small class="event-year">AÑO ${esc(e.year)}</small></div></article>`;
};
function update() {
  $(".map-head h1").textContent = state.name;
  renderTime();
  renderMode();
  renderInspector();
  $("#feed").innerHTML = state.events.slice(0, 6).map(eventMarkup).join("");
  if (map) map.dirty = true;
}
function inspect(id, obj = null, focus = false) {
  if (state.mode === "kingdom" && id !== state.ruler) {
    if (id != null) menus.realm(id);
    return;
  }
  selected = id;
  entity = obj;
  map?.selectionOverlay(id);
  if (focus && id != null) map.focus(id);
  renderInspector();
}
function govern(id) {
  if (!state.realms[id]?.pop) {
    toast("Este reino todavía no está habitado.", true);
    return;
  }
  placement = null;
  state.mode = "kingdom";
  state.ruler = id;
  category = "Gobierno";
  tool = "inspect";
  menus.close();
  map.focus(id, state.sandbox ? 12 : 3);
  inspect(id);
  renderTools();
  update();
  save();
  toast(`Ahora gobiernas ${countryName(id)}.`);
}
function creator() {
  placement = null;
  state.mode = "creator";
  state.ruler = null;
  tool = "inspect";
  category = "Terreno";
  inspect(null);
  map.setZoom(1);
  renderTools();
  update();
  save();
}
function pickTool(id) {
  tool = id;
  renderTools();
  const t = $(`[data-action="tool"][data-val="${id}"]`);
  if (t) {
    const s = $("#tools");
    if (t.offsetLeft > s.clientWidth - 10)
      s.scrollLeft = t.offsetLeft - s.clientWidth / 2;
  }
  beep();
}
function painted(id, w) {
  const r = radius(),
    mark = {
      x: singleCell()
        ? (Math.floor(w.x * geo.scale) + 0.5) / geo.scale
        : Math.round(w.x * geo.scale * 2) / (geo.scale * 2),
      y: singleCell()
        ? (Math.floor(w.y * geo.scale) + 0.5) / geo.scale
        : Math.round(w.y * geo.scale * 2) / (geo.scale * 2),
      detail: map.zoom > 12 && id !== "border",
      r: Math.round(r * 10) / 10,
      kind: id === "border" ? "claim" : id,
      ...(id === "border" ? { realm: selected } : {}),
    };
  const prev = state.marks.at(-1);
  if (
    prev &&
    prev.kind === id &&
    prev.r === mark.r &&
    Math.hypot(prev.x - mark.x, prev.y - mark.y) <
      Math.max(0.3 / geo.scale, r * 0.23)
  )
    return;
  state.marks.push(mark);
  markTerrain(geo, mark);
  paintDirty = true;
  return [w.x - r - 2, w.y - r - 2, w.x + r + 3, w.y + r + 3];
}
function at(w, t, first) {
  if (placement && state.mode === "kingdom") {
    if (first) {
      const result = installObject(
        state,
        placement,
        w,
        coastRealm(geo, w.x, w.y, t),
        t.kind,
        true,
      );
      if (result.error) {
        toast(result.error, true);
        return;
      }
      addEvent(
        state,
        "realm",
        "Obra terminada",
        `${OBJECTS[placement].name} en ${countryName(state.ruler)}.`,
      );
      placement = null;
      map.flash(w.x, w.y);
      renderTools();
      update();
      save();
    }
    return;
  }
  if (tool === "inspect" || state.mode === "kingdom") {
    if (!first) return;
    let obj = null,
      dist = 7 / Math.sqrt(map.zoom);
    for (const a of state.objects) {
      const d = Math.hypot(w.x - a.x, w.y - a.y);
      if (d < dist) {
        dist = d;
        obj = a;
      }
    }
    if (obj?.objectId) {
      const o = OBJECTS[obj.objectId];
      toast(
        `${o.name} · ${yieldText(o)}${obj.realm < 0 ? " · Sin reino" : ""}`,
      );
      if (obj.realm >= 0) inspect(obj.realm, obj);
    } else if (obj && obj.realm >= 0 && t.realm !== -1) inspect(obj.realm, obj);
    else if (t.realm >= 0) inspect(t.realm);
    else if (state.mode === "creator") inspect(null);
    return;
  }
  if (currentTool().paint) return painted(tool, w);
  if (!first) return;
  if (tool === "remove-prop") {
    const obj = state.objects
      .filter(
        (o) =>
          o.objectId &&
          Math.hypot(w.x - o.x, w.y - o.y) < 8 / Math.sqrt(map.zoom),
      )
      .sort(
        (a, b) =>
          Math.hypot(a.x - w.x, a.y - w.y) - Math.hypot(b.x - w.x, b.y - w.y),
      )[0];
    if (!obj) {
      toast("No hay un objeto del catálogo en ese punto.", true);
      return;
    }
    const r = state.realms[obj.realm];
    if (r && obj.class === "building")
      r.buildings = Math.max(0, r.buildings - 1);
    state.objects = state.objects.filter((o) => o !== obj);
    if (obj === entity) entity = null;
    addEvent(
      state,
      "world",
      "Objeto retirado",
      `${obj.name} vuelve al taller.`,
    );
    update();
    save();
    return;
  }
  if (category === "Objetos") {
    const owner = coastRealm(geo, w.x, w.y, t),
      res = installObject(state, tool, w, owner, t.kind);
    if (res.error) {
      toast(res.error, true);
      return;
    }
    const o = OBJECTS[tool];
    addEvent(
      state,
      "world",
      o.name + " colocado",
      owner < 0
        ? "El objeto espera a los primeros colonos."
        : `Nuevo objeto en ${countryName(owner)}.`,
    );
    map.flash(w.x, w.y);
    update();
    save();
    return;
  }
  if (t.kind === "ocean") {
    toast("Elige tierra firme o crea una isla con el pincel.", true);
    return;
  }
  const founding =
      category === "Criaturas" &&
      state.sandbox &&
      (t.realm < 0 || !state.realms[t.realm]?.pop),
    id = founding ? settle(state, geo, w.x, w.y) : t.realm,
    r = state.realms[id],
    p = { x: w.x, y: w.y };
  if (category === "Criaturas" && id < 0) {
    toast(
      "No queda un estandarte libre; añade habitantes dentro de un reino.",
      true,
    );
    return;
  }
  if (category === "Poderes" && id < 0) {
    toast("Este poder necesita un reino habitado.", true);
    return;
  }
  if (category === "Criaturas") {
    if (!founding && state.empty && !r.pop) {
      const center = { x: Math.round(p.x), y: Math.round(p.y) };
      (state.anchors ||= {})[id] = center;
      Object.assign(geo.caps[id], center);
      map.local.clear();
    }
    const unit = summon(state, tool, p.x, p.y, id);
    map.flash(p.x, p.y, "#b6d297", "summon");
    toast(
      `${unit.name}${unit.rank ? " · " + unit.rank : ""} en ${countryName(id)}.`,
    );
    if (founding) {
      survey(state, geo);
      map.buildBounds();
      map.local.clear();
      toast(`Reino fundado: ${countryName(id)}`);
    }
    entity = unit;
    selected = id;
    map.selectionOverlay(id);
  }
  if (category === "Recursos") {
    addObject(state, { kind: tool, ...p, class: "resource", realm: id });
    if (r) r[tool] = (r[tool] || 0) + 8;
    if (
      r &&
      ["gold", "iron", "copper", "silver", "mithril", "crystal"].includes(tool)
    )
      r.prod++;
    addEvent(
      state,
      "resource",
      `${resourceName(tool)} disponible`,
      r
        ? `Un nuevo depósito enriquece ${countryName(id)}.`
        : "Reserva disponible para los futuros colonos.",
    );
    map.flash(p.x, p.y);
  }
  if (category === "Poderes") {
    const n = state.marks.length,
      err = power(state, id, tool, p);
    if (err) toast(err, true);
    else {
      for (const m of state.marks.slice(n)) markTerrain(geo, m);
      if (state.marks.length !== n)
        map.refreshTerrain([p.x - 32, p.y - 32, p.x + 32, p.y + 32], true);
      map.flash(
        p.x,
        p.y,
        ["fire", "meteor", "quake"].includes(tool)
          ? "#efbe7d"
          : tool === "rain"
            ? "#b5dce4"
            : "#d49ec9",
        tool,
      );
      toast(state.events[0].title + " · " + countryName(id));
    }
  }
  update();
  save();
  beep();
}
map = new AtlasMap($("#map-stage"), geo, state, {
  tool: currentTool,
  radius,
  at,
  closeMenus,
  finished: () => {
    if (paintDirty) {
      paintDirty = false;
      survey(state, geo, true);
      map.buildArt();
      map.local.clear();
      if (selected != null && !state.realms[selected].pop) {
        selected = null;
        entity = null;
      }
      map.selectionOverlay(selected);
      if (tool === "border" && selected != null) {
        map.selectionOverlay(selected);
        addEvent(
          state,
          "realm",
          "Frontera trazada",
          `Se redibujan los límites de ${countryName(selected)}.`,
        );
      } else
        addEvent(
          state,
          "world",
          "Relieve transformado",
          `El creador dibuja ${BIOMES[tool]?.toLowerCase() || "terreno"} en el atlas.`,
        );
      update();
      save();
    }
  },
  zoom: (z) => {
    $("#zoom").textContent = Math.round(z * 100) + "%";
    $("#zoom").title =
      `Vista de ${fmt(Math.ceil((W * geo.scale) / z))} × ${fmt(Math.ceil((H * geo.scale) / z))} celdas`;
    $("#view-name").textContent =
      z < 1.8 ? "VISTA GLOBAL" : z < 5 ? "VISTA REGIONAL" : "VISTA LOCAL";
    $(".windrose").style.opacity = z < 1.8 ? ".86" : ".4";
  },
  hover: (w, t) => {
    const el = $("#hover-name");
    if (!w || t.realm < 0 || map.pointer || tool !== "inspect") {
      el.classList.remove("visible");
      return;
    }
    const val = countryName(t.realm) + " · " + BIOMES[t.kind];
    if (el.textContent !== val) el.textContent = val;
    el.classList.add("visible");
  },
});
menus = makeDialogs({
  state,
  geo,
  map,
  esc,
  asset,
  toast,
  update,
  save,
  closeMenus,
  renderMode,
  renderTools,
  govern,
  inspect,
  selected: () => selected,
  events: eventMarkup,
  sound: () => {
    state.sound = !state.sound;
    beep();
    renderMode();
    save();
  },
  chooseRace: (id) => {
    if (state.mode === "kingdom") creator();
    category = "Criaturas";
    pickTool(id);
  },
  castUnit: (id) => castUnit(id),
  claim: (id) => {
    menus.close();
    inspect(id);
    category = "Terreno";
    tool = "border";
    map.setLayer("borders", true);
    map.focus(id, 2.6);
    renderTools();
    toast(
      "Pinta sobre tierra para trazar las fronteras de " +
        countryName(id) +
        ".",
    );
  },
  newWorld: () => {
    if (save()) location.assign("./#crear");
  },
});
if (startParams.get("modo") === "creador") {
  state.mode = "creator";
  state.ruler = null;
  selected = null;
  category = "Terreno";
}
if (startParams.has("corona") && state.realms[+startParams.get("corona")]?.pop)
  govern(+startParams.get("corona"));
else if (
  !startParams.has("modo") &&
  [state.camera?.z, state.camera?.x, state.camera?.y].every(Number.isFinite)
) {
  map.setZoom(state.camera.z);
  map.ox = state.camera.x;
  map.oy = state.camera.y;
  map.constrain();
  map.selectionOverlay(selected);
} else if (selected != null && state.mode === "kingdom") {
  map.selectionOverlay(selected);
  map.focus(selected, state.sandbox ? 12 : 3);
} else if (!state.sandbox && !state.empty) map.focus(0, 2.75);
if (startParams.has("corona") || startParams.has("modo"))
  history.replaceState(null, "", gameURL(slotId));
renderTools();
update();
save();

function castUnit(id) {
  const e = state.objects.find((o) => o.uid === +id),
    err = cast(state, e);
  if (err) toast(err, true);
  else {
    map.flash(e.x, e.y, "#c9b1df", "magic");
    update();
    save();
    beep();
    toast(`${e.name} lanza ${e.spell}.`);
  }
}
function togglePause() {
  state.paused = !state.paused;
  renderTime();
  save();
  beep(true);
}
function setSpeed(v) {
  state.speed = clamp(Math.round(v), 1, 10);
  renderTime();
  save();
}
function activatePolicy(id) {
  if (OBJECTS[id]) {
    placement = id;
    tool = "inspect";
    renderTools();
    toast("Pulsa dentro de tus fronteras para construir.");
    return;
  }
  if (["pact", "hostility", "peace"].includes(id)) {
    menus.diplomacy(id);
    return;
  }
  const r = state.ruler,
    p = geo.caps[r];
  let pos = { x: p.x, y: p.y };
  for (let j = 0; j < 20; j++) {
    const x = p.x + (Math.random() - 0.5) * 23,
      y = p.y + (Math.random() - 0.5) * 19;
    if (tileAt(geo, x, y).realm === r) {
      pos = { x, y };
      break;
    }
  }
  const err = realmAction(state, r, id, pos);
  if (err) toast(err, true);
  else {
    toast(state.events[0].title + " · " + countryName(r));
    map.flash(pos.x, pos.y);
    update();
    save();
    beep();
  }
}
async function expand() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    if ($("#map-stage").requestFullscreen) {
      await $("#map-stage").requestFullscreen();
      return;
    }
  } catch {
    /* Embedded previews may disable the Fullscreen API. */
  }
  $("#map-stage").classList.toggle("fullscreen-fallback");
  map.resize();
}
const actions = {
  home: () => {
    if (save()) location.assign("./");
  },
  global: () => map.setZoom(1),
  "remove-prop": () => pickTool("remove-prop"),
  pace: (e) =>
    popup(
      "pace",
      e,
      `<span class="popup-title">RELOJ DEL MUNDO</span><label class="pace-row">Velocidad <output id="speed-live">${state.speed}×</output><input id="pace-range" aria-label="Velocidad de los años" type="range" min="1" max="10" step="1" value="${state.speed}"></label><small class="pace-help">1×: 72 s por año · 10×: 7,2 s</small><div class="pace-presets">${[1, 2, 5, 10].map((n) => `<button data-action="speed" data-val="${n}">${n}×</button>`).join("")}</div>`,
    ),
  supplies: (e) =>
    popup(
      "supplies",
      e,
      `<span class="popup-title">ARCA DE MATERIALES</span>${
        state.unlimited
          ? '<div class="supply-row">Sandbox libre <b>∞</b></div>'
          : Object.entries(state.supplies)
              .map(
                ([k, v]) =>
                  `<div class="supply-row">${MATERIALS[k]}<b>${v}</b></div>`,
              )
              .join("") +
            '<button class="btn" data-action="refill">Reponer kit inicial</button>'
      }<small class="pace-help">El terreno y los primeros colonos son gratuitos.</small>`,
    ),
  refill: () => {
    state.supplies = { ...STARTER_KIT };
    save();
    closeMenus();
    toast("Kit de fundación repuesto.");
  },
  creator: () => {
    if (state.mode !== "creator") creator();
  },
  kingdom: () => menus.kingdom(),
  settings: () => menus.settings(),
  save: () => save(true),
  sound: () => {
    state.sound = !state.sound;
    renderMode();
    beep();
    save();
    toast(
      state.sound ? "Sonidos del mundo activados." : "Sonidos desactivados.",
    );
  },
  pause: togglePause,
  speed: (e) => {
    setSpeed(+e.dataset.val);
    closeMenus();
  },
  "zoom-in": () => map.setZoom(map.zoom * 1.5),
  "zoom-out": () => map.setZoom(map.zoom / 1.5),
  expand,
  layers: (e) =>
    popup(
      "layers",
      e,
      `<span class="popup-title">CAPAS DEL ATLAS</span>${[
        ["labels", "Nombres del mapa"],
        ["borders", "Fronteras políticas"],
        ["buildings", "Asentamientos"],
      ]
        .map(
          ([k, v]) =>
            `<label class="check-row">${v}<input type="checkbox" data-layer="${k}" ${map.layerOptions[k] ? "checked" : ""}></label>`,
        )
        .join("")}`,
    ),
  brush: (e) =>
    popup(
      "brush",
      e,
      `<span class="popup-title">TAMAÑO DEL PINCEL</span><div class="brush-sizes">${[1, 2, 3, 4].map((v, k) => `<button class="${v === brush ? "selected" : ""}" data-action="brush-size" data-val="${v}"><i class="brush-pip" style="width:${4 + 3 * k}px;height:${4 + 3 * k}px"></i>${[1, 2, 4, 8][k]}×</button>`).join("")}</div>`,
    ),
  "brush-size": (e) => {
    brush = +e.dataset.val;
    closeMenus();
    renderTools();
  },
  category: (e) => {
    placement = null;
    category = e.dataset.val;
    tool =
      state.mode === "kingdom"
        ? "inspect"
        : category === "Objetos" && objectGroup !== "Todos"
          ? CATALOG.find((o) => o.family === objectGroup).id
          : TOOLS[category][0][0];
    renderTools();
  },
  tool: (e) => pickTool(e.dataset.val),
  policy: (e) => activatePolicy(e.dataset.val),
  "shelf-prev": () =>
    $("#tools").scrollBy({
      left: -$("#tools").clientWidth * 0.85,
      behavior: "smooth",
    }),
  "shelf-next": () =>
    $("#tools").scrollBy({
      left: $("#tools").clientWidth * 0.85,
      behavior: "smooth",
    }),
  atlas: () => menus.atlas("Reinos"),
  races: () => menus.atlas("Razas"),
  continents: () => menus.atlas("Continentes"),
  population: () => menus.population(),
  chronicles: () => menus.chronicles(),
  "realm-detail": () => menus.realm(selected),
  "world-inspector": () => inspect(null),
  cast: (e) => castUnit(e.dataset.val),
  "close-dialog": () => menus.close(),
};
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (
    !e.target.closest("#popup") &&
    !["brush", "layers", "supplies", "pace"].includes(el?.dataset.action)
  )
    closeMenus();
  if (el && actions[el.dataset.action]) {
    actions[el.dataset.action](el);
    return;
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "pace-range") {
    setSpeed(+e.target.value);
    $("#speed-live").textContent = state.speed + "×";
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "object-filter") {
    objectGroup = e.target.value;
    const o = CATALOG.find(
      (o) => objectGroup === "Todos" || o.family === objectGroup,
    );
    tool = o.id;
    renderTools();
  }
  if (e.target.dataset.layer) {
    map.setLayer(e.target.dataset.layer, e.target.checked);
    save();
  }
});
document.addEventListener("keydown", (e) => {
  if (
    $("#window").open ||
    e.ctrlKey ||
    e.metaKey ||
    e.altKey ||
    ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)
  )
    return;
  if (e.key === "Escape") {
    closeMenus();
    if (placement) {
      placement = null;
      renderTools();
      return;
    }
    if ($("#map-stage").classList.contains("fullscreen-fallback"))
      $("#map-stage").classList.remove("fullscreen-fallback");
    else if (tool !== "inspect") {
      tool = "inspect";
      category = "Terreno";
      renderTools();
    } else if (selected != null && state.mode === "creator") inspect(null);
    return;
  }
  if (e.code === "Space" && e.target.tagName !== "BUTTON") {
    e.preventDefault();
    if (!e.repeat) togglePause();
  } else if (["+", "=", "-", "0"].includes(e.key)) {
    e.preventDefault();
    map.setZoom(
      e.key === "0" ? 1 : e.key === "-" ? map.zoom / 1.4 : map.zoom * 1.4,
    );
  } else if (/^\d$/.test(e.key) && state.mode === "creator") {
    const item = $$("#tools [data-action=tool]")[+e.key - 1];
    if (item) pickTool(item.dataset.val);
  } else if (e.key.toLowerCase() === "f") expand();
  else if (e.key.toLowerCase() === "b") $('[data-action="brush"]')?.click();
  else if (e.key.startsWith("Arrow")) {
    const dx = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0,
      dy = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
    if (dx || dy) {
      e.preventDefault();
      map.ox += ((dx * W) / map.zoom) * 0.08;
      map.oy += ((dy * H) / map.zoom) * 0.08;
      map.constrain();
      map.dirty = true;
    }
  }
});
window.addEventListener("resize", () => {
  shelfArrows();
  closeMenus();
});
window.addEventListener("pagehide", () => save());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) save();
});
let last = performance.now();
setInterval(() => {
  const now = performance.now(),
    dt = Math.min(1000, now - last);
  last = now;
  if (state.paused || document.hidden || $("#window").open) return;
  ticks += dt * state.speed;
  if (ticks < 18000) return;
  ticks -= 18000;
  const n = state.marks.length;
  advance(state, geo);
  growFrontiers(state);
  const delta = state.marks.slice(n);
  if (delta.length) {
    let box = null;
    for (const m of delta) {
      markTerrain(geo, m);
      if (m.kind === "settle") continue;
      const r = m.r + 24;
      box = box
        ? [
            Math.min(box[0], m.x - r),
            Math.min(box[1], m.y - r),
            Math.max(box[2], m.x + r),
            Math.max(box[3], m.y + r),
          ]
        : [m.x - r, m.y - r, m.x + r, m.y + r];
    }
    survey(state, geo, true);
    if (box) map.refreshTerrain(box, true);
    else {
      map.buildBounds();
      map.local.clear();
    }
    map.selectionOverlay(selected);
  }
  if (state.mode === "kingdom" && !state.realms[state.ruler]?.pop) {
    creator();
    toast("Tu reino ha caído. Puedes fundar otro o elegir una nueva corona.");
  }
  update();
  save();
}, 400);
