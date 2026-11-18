import { OBJECTS } from "./objects.js";
import { dimensions, worldSize } from "./worlds.js";
import {
  CONTINENTS,
  RACES,
  BIOMES,
  SEASONS,
  ELEMENTS,
  PANTHEON,
  RANKS,
  EVENTS,
  realmName,
  regionOf,
  biomeOf,
  fmt,
} from "./data.js";
import {
  liveRealms,
  totalPop,
  dominant,
  raceName,
  relation,
  diplomacy,
} from "./sim.js";
import { sprite } from "./art.js";
import { icon as i } from "./icons.js";
export function makeDialogs(g) {
  const { state: s, esc, asset } = g,
    el = document.querySelector("#window"),
    body = el.querySelector("#dialog-body");
  const countryName = (id) => realmName(s, id);
  let page = "",
    tab = "",
    cFilter = -1,
    query = "",
    dipType = "",
    origin = "",
    realmId = null;
  const button = (id, txt, ico = "", cl = "", val = "") =>
    `<button class="btn ${cl}" data-win="${id}" data-v="${esc(val)}">${ico ? i(ico, 14) : ""}${esc(txt)}</button>`;
  function head(id, title, kicker = "ARCHIVOS DE AETHORIA") {
    page = id;
    document.querySelector("#dialog-title").textContent = title;
    document.querySelector("#dialog-eyebrow").textContent = kicker;
    g.closeMenus();
    body.scrollTop = 0;
    if (!el.open) el.showModal();
  }
  function close() {
    if (el.open) el.close();
    page = "";
  }
  el.addEventListener("click", (e) => {
    if (e.target === el) {
      let r = el.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        close();
    }
  });
  el.addEventListener("close", () => {
    page = "";
  });
  const lookup = (v) =>
    String(v)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const divTabs = () =>
    `<div class="d-tabs" aria-label="Secciones del atlas">${["Reinos", "Continentes", "Razas", "Panteón"].map((t) => `<button data-win="tab" data-v="${t}" class="${t === tab ? "sel" : ""}">${t}</button>`).join("")}</div>`;
  const filterBar = () =>
    `<div class="input-row"><label class="searchbox">${i("search", 15)}<input type="search" id="realm-query" aria-label="Buscar reino" placeholder="Buscar un reino…" value="${esc(query)}" autocomplete="off"></label><select class="select-cont" id="continent-filter" aria-label="Filtrar continente"><option value="-1">Todos los continentes</option>${CONTINENTS.map((c, j) => `<option ${cFilter === j ? "selected" : ""} value="${j}">${c.name}</option>`).join("")}</select></div><p class="list-caption" id="list-total"></p><div class="realm-list" id="realm-results"></div>`;
  const realmRows = () => {
    const host = body.querySelector("#realm-results");
    if (!host) return;
    let realms = liveRealms(s).filter(
      (r) =>
        (cFilter < 0 || regionOf(s, r.id) === cFilter) &&
        lookup(countryName(r.id)).includes(lookup(query)),
    );
    if (page === "diplomacy")
      realms = realms.filter(
        (r) =>
          r.id !== s.ruler &&
          (dipType !== "peace" || relation(s, s.ruler, r.id) === "war"),
      );
    body.querySelector("#list-total").textContent =
      realms.length + " " + (realms.length === 1 ? "REINO" : "REINOS");
    host.innerHTML = realms.length
      ? realms
          .map((r) => {
            const c = CONTINENTS[regionOf(s, r.id)],
              dip = page === "diplomacy" ? relation(s, s.ruler, r.id) : null,
              dd = dip
                ? { neutral: "Neutral", alliance: "Aliado", war: "En guerra" }[
                    dip
                  ]
                : c.name;
            return `<button class="realm-card" data-win="realm-pick" data-v="${r.id}" style="--realmcolor:${c.color}"><span class="realm-flag">${i(r.id === s.ruler ? "crown" : "flag", 16)}</span><div><b>${esc(countryName(r.id))}</b><small>${esc(dd)} · ${fmt(r.pop)} hab.</small></div>${i("chevron-right", 13)}</button>`;
          })
          .join("")
      : '<div class="empty-message">' +
        (page === "diplomacy" && dipType === "peace"
          ? "Tu reino no tiene guerras activas."
          : "No hay reinos que coincidan. Si el mundo está vacío, crea tierra y añade habitantes.") +
        "</div>";
  };
  function atlas(t = "Reinos", reset = true) {
    head("atlas", "Atlas de " + s.name, "CARTOTECA DEL MUNDO");
    tab = t;
    if (reset) {
      cFilter = -1;
      query = "";
    }
    let h = divTabs();
    if (t === "Reinos") {
      h += `<p class="dialog-intro">Explora los territorios, sus biomas y las civilizaciones que los habitan.</p>${filterBar()}`;
    } else if (t === "Continentes") {
      h += `<div class="manual-grid">${CONTINENTS.map((c, id) => {
        const land = s.realms.filter((r) => r.pop && regionOf(s, r.id) === id);
        return `<button class="realm-card" data-win="continent" data-v="${id}" style="--realmcolor:${c.color}"><span class="realm-flag">${i("earth", 19)}</span><div><b>${c.name}</b><small>${land.length} reinos · ${fmt(land.reduce((n, r) => n + r.pop, 0))} hab.</small></div></button>`;
      }).join(
        "",
      )}</div><p class="field-hint" style="margin-top:12px">Elige un continente para consultar sus países.</p>`;
    } else if (t === "Razas") {
      h += `<div class="lore-note">${i("paw-print", 17)}<div><b>20 razas del mundo.</b> En un nacimiento al azar, la raza dios y la raza demonio tienen un 5% de probabilidad cada una. Elige una raza para colocarla con el pincel.</div></div><div class="manual-grid">${RACES.map((r) => `<button class="race-card" data-win="race-pick" data-v="${r.id}">${asset(r.id, "pixel")}<div><b>${r.name}</b><small>${fmt(s.realms.reduce((n, c) => n + (c.races[r.id] || 0), 0))} habitantes</small></div></button>`).join("")}</div>`;
    } else {
      h += `<div class="lore-note">${i("sparkles", 18)}<div><b>Dos órdenes, cuatro rangos.</b> Dioses y demonios pueden nacer en rango bajo, medio, alto o supremo. Cada orden tiene once identidades supremas únicas; la undécima domina todos los elementos.</div></div><table class="pantheon"><thead><tr><th>Elemento</th><th>Dios supremo</th><th>Demonio supremo</th></tr></thead><tbody>${PANTHEON.map((p, j) => `<tr><td><span class="index-num">${String(j + 1).padStart(2, "0")}</span>${p.element}</td><td>${p.god}${s.ascended.god.includes(p.god) ? " ✦" : ""}</td><td>${p.demon}${s.ascended.demon.includes(p.demon) ? " ✦" : ""}</td></tr>`).join("")}</tbody></table><span class="field-hint">✦ Identidad que ya ha despertado en este mundo.</span>`;
    }
    body.innerHTML = h;
    realmRows();
  }
  function kingdom() {
    head("kingdom", "Elige tu reino", "MODO REINO");
    origin = "kingdom";
    cFilter = -1;
    query = "";
    body.innerHTML = `<p class="dialog-intro">Toma la corona de uno de los países de ${esc(s.name)}. Administra su tesoro, forma magos y decide con quién compartir tus fronteras.</p>${filterBar()}`;
    realmRows();
  }
  const cultureStyle = (c) =>
    [
      "castle",
      "pagoda",
      "temple",
      "icecastle",
      "woodkeep",
      "palace",
      "lighthouse",
    ][c];
  function realm(id, from = "inspector") {
    if (id == null) return;
    realmId = id;
    origin = from;
    const r = s.realms[id],
      c = CONTINENTS[regionOf(s, id)],
      ci = regionOf(s, id),
      own = s.ruler === id && s.mode === "kingdom",
      units = s.objects.filter((o) => o.class === "unit" && o.realm === id),
      allies = [],
      wars = [];
    for (const q of s.realms) {
      const rel = relation(s, id, q.id);
      if (rel === "war") wars.push(countryName(q.id));
      else if (rel === "alliance") allies.push(countryName(q.id));
    }
    head("realm", countryName(id), `${c.name.toUpperCase()} / FICHA DEL REINO`);
    const cells = [
      ["Bioma", BIOMES[r.biome || biomeOf(id)]],
      ["Raza predominante", raceName(dominant(r))],
      ["Cultura", c.culture],
      ["Religión", c.faith],
      ["Tesoro", fmt(r.gold) + " oro"],
      ["Reserva arcana", r.mana + " maná"],
      ["Edificaciones", r.buildings],
      ["Alimentos", fmt(r.food)],
      ["Hierro", fmt(r.iron ?? 0)],
      [
        "Superficie",
        fmt((g.geo.areas?.[id] || 0) * g.geo.scale ** 2) + " celdas",
      ],
      ["Madera y piedra", r.wood + " / " + r.stone],
      ["Protección", r.shield ? r.shield + " estaciones" : "Sin escudo"],
    ];
    const output = {};
    for (const o of s.objects) {
      if (o.realm !== id || !o.objectId) continue;
      for (const [k, v] of Object.entries(OBJECTS[o.objectId]?.yield || {}))
        output[k] = (output[k] || 0) + v;
    }
    const products = {
      wood: "madera",
      stone: "piedra",
      iron: "hierro",
      gold: "oro",
      mana: "maná",
      food: "alimentos",
    };
    body.innerHTML = `<div class="realm-detail"><div class="detail-title"><img src="${spriteUrl(cultureStyle(ci))}" alt=""><div><h3>${own ? "Tu dominio" : "Territorio de " + c.name}</h3><p>${fmt(r.pop)} habitantes · ${r.harmony}% de armonía</p></div></div><div class="info-grid">${cells.map(([a, b]) => `<div class="info-cell"><small>${a}</small><b>${esc(b)}</b></div>`).join("")}</div>${
      Object.keys(output).length
        ? `<div class="lore-note">${i("package-open", 16)}<div><b>Producción de objetos por estación</b><br>${Object.entries(
            output,
          )
            .map(([k, n]) => "+" + n + " " + products[k])
            .join(" · ")}</div></div>`
        : ""
    }${s.mode === "creator" ? button("claim", "Dibujar fronteras", "land-plot", "", id) : ""}<h3 class="subhead">Relaciones</h3><div class="lore-note">${i("handshake", 17)}<div>Aliados: <b>${esc(allies.join(", ") || "Ningún pacto")}</b><br>En guerra: <b>${esc(wars.join(", ") || "Ningún conflicto")}</b></div></div>${
      units.length
        ? `<h3 class="subhead">Habitantes singulares</h3><div class="entity-list">${units
            .slice(-20)
            .reverse()
            .map(
              (o) =>
                `<button class="entity-row" data-win="inspect-unit" data-v="${o.uid}"><span>${esc(o.name)}${o.rank ? " · " + esc(o.rank) : ""}</span><small>${esc(o.element || raceName(o.kind))}${o.maxMana ? " · " + o.mana + " MP" : ""} ${i("chevron-right", 12)}</small></button>`,
            )
            .join("")}</div>`
        : ""
    }<div class="dialog-actions split">${button("back-to-list", from === "kingdom" ? "Otros reinos" : "Ver atlas", "arrow-left")}<div>${s.mode !== "kingdom" || own ? button("locate", "Localizar", "map-pin") : ""} ${!own ? button("govern", "Gobernar reino", "crown", "primary", id) : button("resume", "Volver al reino", "play", "primary")}</div></div></div>`;
  }
  function unit(uid) {
    const o = s.objects.find((u) => u.uid === +uid);
    if (!o) return;
    head("unit", o.name, "INSPECTOR / HABITANTE");
    body.innerHTML = `<div class="detail-title">${asset(o.kind, "pixel")}<div><h3>${esc(raceName(o.kind))}</h3><p>${esc(countryName(o.realm))} · ${o.age || 0} estaciones observadas</p></div></div><div class="info-grid">${[["Afinidad", o.element || "Sin afinidad"], ["Rango", o.rank || "Mortal"], ["Hechizo", o.spell || "Ninguno"], ["Maná", o.maxMana ? o.mana + " / " + o.maxMana : "—"], ...(o.presence ? [["Demonio vinculado", o.presence]] : [])].map(([k, v]) => `<div class="info-cell"><small>${k}</small><b>${esc(v)}</b></div>`).join("")}</div>${o.spell ? '<p class="field-hint">Cada hechizo consume 15 de maná. La reserva se regenera con las estaciones.</p>' : ""}<div class="dialog-actions">${button("unit-back", "Volver al reino", "arrow-left", "", o.realm)}${o.spell ? button("unit-cast", "Lanzar hechizo", "wand-sparkles", "primary", uid) : ""}</div>`;
  }
  function population() {
    head("population", "Censo del mundo", "OBSERVATORIO DE AETHORIA");
    let a = RACES.map((r) => [
      r.name,
      s.realms.reduce((v, q) => v + (q.races[r.id] || 0), 0),
    ]).sort((x, y) => y[1] - x[1]);
    body.innerHTML = `<p class="dialog-intro"><b>${fmt(totalPop(s))} habitantes</b> viven en ${liveRealms(s).length} reinos. La población cambia con las cosechas, la magia y los conflictos.</p><div class="pop-table">${a.map(([k, v]) => `<span>${k}</span><strong>${fmt(v)}</strong>`).join("")}</div><div class="dialog-actions">${button("tab", "Ver razas", "paw-print", "", "Razas")}</div>`;
  }
  function diplomacyPage(act) {
    head(
      "diplomacy",
      act === "pact"
        ? "Forjar una alianza"
        : act === "peace"
          ? "Negociar la paz"
          : "Declarar una guerra",
      "CONSEJO / DIPLOMACIA",
    );
    cFilter = -1;
    query = "";
    dipType = act;
    body.innerHTML = `<div class="realm-notice">${i(act === "hostility" ? "swords" : "handshake", 16)}<span>${act === "pact" ? "Los aliados comparten ingresos cada estación." : act === "peace" ? "Un tratado de paz detiene las pérdidas de ambos reinos." : "El conflicto reduce la población de ambos reinos hasta que se firme la paz."}</span></div>${filterBar()}`;
    realmRows();
  }
  function dipConfirm(id) {
    head(
      "dip-confirm",
      dipType === "pact"
        ? "Confirmar alianza"
        : dipType === "peace"
          ? "Confirmar tratado"
          : "Confirmar declaración",
      "DECRETO REAL",
    );
    body.innerHTML = `<div class="realm-notice">${i("scroll-text", 18)}<span><b>${esc(countryName(s.ruler))}</b> ${dipType === "pact" ? "ofrece una alianza a" : dipType === "peace" ? "firmará la paz con" : "declarará la guerra a"} <b>${esc(countryName(id))}</b>.</span></div><div class="dialog-actions">${button("dip-back", "Volver", "arrow-left")}${button("dip-apply", "Sellar decreto", "check", "primary", id)}</div>`;
  }
  function chronicles(f = "Todos") {
    head("chronicles", "Crónicas del mundo", "REGISTRO DE LA SIMULACIÓN");
    const types = [
      "Todos",
      "Diplomacia",
      "Vida",
      "Magia",
      "Recursos",
      "Desastres",
      "Reinos",
      "Mundo",
    ];
    const arr = s.events.filter(
      (e) => f === "Todos" || EVENTS[e.type]?.label === f,
    );
    body.innerHTML = `<p class="dialog-intro">Los últimos sucesos de ${esc(s.name)}, del más reciente al más antiguo.</p><div class="chron-filter">${types.map((t) => `<button class="filterchip ${t === f ? "sel" : ""}" data-win="chron-filter" data-v="${t}">${t}</button>`).join("")}</div><div class="full-feed">${arr.length ? arr.map(g.events).join("") : '<p class="empty-message">Todavía no hay sucesos de esta categoría.</p>'}</div>`;
  }
  function settings() {
    head("settings", "Ajustes del mundo", "CONFIGURACIÓN");
    body.innerHTML = `<p class="dialog-intro">Tu mundo se guarda automáticamente en este navegador. El tiempo se detiene mientras consultas un panel. Crear otro mundo no reemplaza esta partida.</p><div class="settings-row"><label for="world-name"><b>Nombre del mundo</b><small>Se muestra en el inspector.</small></label><input id="world-name" class="field" maxlength="40" value="${esc(s.name)}"></div><div class="settings-row"><label for="event-rate"><b>Ritmo de los sucesos</b><small>Frecuencia de magia, desastres y encuentros.</small></label><select id="event-rate">${[
      ["calm", "Tranquilo"],
      ["normal", "Equilibrado"],
      ["chaos", "Caótico"],
    ]
      .map(
        ([k, v]) =>
          `<option value="${k}" ${s.eventRate === k ? "selected" : ""}>${v}</option>`,
      )
      .join(
        "",
      )}</select></div><div class="settings-row"><div><b>Sonidos del juego</b><small>Señales suaves de creación e interacción.</small></div><button class="switch ${s.sound ? "on" : ""}" role="switch" aria-checked="${s.sound}" aria-label="Sonidos del juego" data-win="audio"></button></div><div class="settings-row"><div><b>Semilla del atlas</b><small>Identifica la geografía de este mundo.</small></div><span class="eyebrow">AET–${esc(s.seed)}</span></div><div class="settings-row"><div><b>Escala ${worldSize(s).name.toLowerCase()}</b><small>Dimensiones del terreno editable.</small></div><span class="eyebrow">${fmt(dimensions(s).width)} × ${fmt(dimensions(s).height)}</span></div><details class="guide"><summary>Guía rápida y controles</summary><ul><li>Elige una herramienta y pulsa o pinta sobre el mapa. Inspeccionar muestra el reino o la criatura.</li><li>Rueda, botones + / − o gesto de pinza para acercar hasta ${32 * (s.scale || 1)}×. Al acercarte aparecen aldeas y habitantes.</li><li>Arrastra con Inspeccionar para moverte. Mientras pintas, usa Mayús + arrastre o el botón derecho.</li><li>1–9: herramienta. B: pincel. Espacio: pausa. 0: vista global. F: pantalla completa. Flechas: mover cámara.</li><li>En Modo reino, las órdenes consumen oro o maná. Los pactos generan ingresos y las guerras afectan al censo.</li></ul></details><div class="dialog-actions split">${button("new-world", "Crear otro mundo", "globe")}${button("apply-settings", "Guardar ajustes", "check", "primary")}</div>`;
  }
  body.addEventListener("input", (e) => {
    if (e.target.id === "realm-query") {
      query = e.target.value;
      realmRows();
    }
  });
  body.addEventListener("change", (e) => {
    if (e.target.id === "continent-filter") {
      cFilter = +e.target.value;
      realmRows();
    }
  });
  body.addEventListener("click", (e) => {
    const b = e.target.closest("[data-win]");
    if (!b) return;
    const k = b.dataset.win,
      v = b.dataset.v;
    if (k === "tab") atlas(v);
    else if (k === "continent") {
      cFilter = +v;
      query = "";
      atlas("Reinos", false);
    } else if (k === "realm-pick") {
      if (page === "diplomacy") dipConfirm(+v);
      else realm(+v, page);
    } else if (k === "govern") g.govern(+v);
    else if (k === "claim") g.claim(+v);
    else if (k === "resume") close();
    else if (k === "locate") {
      close();
      g.inspect(realmId, null, true);
    } else if (k === "back-to-list") {
      if (origin === "kingdom") kingdom();
      else atlas("Reinos", false);
    } else if (k === "race-pick") {
      close();
      g.chooseRace(v);
    } else if (k === "inspect-unit") unit(+v);
    else if (k === "unit-back") realm(+v);
    else if (k === "unit-cast") {
      g.castUnit(+v);
      unit(+v);
    } else if (k === "dip-back") diplomacyPage(dipType);
    else if (k === "dip-apply") {
      const err = diplomacy(s, s.ruler, +v, dipType);
      if (err) {
        g.toast(err, true);
        diplomacyPage(dipType);
      } else {
        close();
        g.update();
        g.save();
        g.toast(s.events[0].title + ".");
      }
    } else if (k === "chron-filter") chronicles(v);
    else if (k === "audio") {
      g.sound();
      b.classList.toggle("on", s.sound);
      b.setAttribute("aria-checked", s.sound);
    } else if (k === "settings") settings();
    else if (k === "apply-settings") {
      const value = body.querySelector("#world-name").value.trim();
      if (!value) {
        body.querySelector("#world-name").focus();
        return;
      }
      s.name = value.slice(0, 40);
      s.eventRate = body.querySelector("#event-rate").value;
      close();
      g.update();
      g.save();
      g.toast("Ajustes guardados.");
    } else if (k === "new-world") g.newWorld();
  });
  return {
    close,
    atlas,
    kingdom,
    realm,
    chronicles,
    population,
    diplomacy: diplomacyPage,
    settings,
  };
}
const spriteUrl = (id) => sprite(id).toDataURL();
