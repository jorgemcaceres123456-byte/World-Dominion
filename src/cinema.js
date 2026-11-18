import { icon } from "./icons.js";
export const SCENES = [
  { file: "valdoria", name: "Valle de Valdoria", region: "Eldoria" },
  { file: "kaizhan", name: "Jardines de Akitsune", region: "Kaizhan" },
  { file: "zarynth", name: "El oasis de Azharim", region: "Zarynth" },
];
export const crest = `<svg viewBox="0 0 46 46" fill="none" aria-hidden="true" class="atlas-crest"><path d="m23 2 17 21-17 21L6 23Z" stroke="#ba9860" stroke-width="1.1"/><path d="m23 7 12 16-12 16-12-16Z" stroke="#6d604a"/><path d="m23 6 3.5 13 12.5 4-12.5 3.6L23 41l-3.7-14.4L7 23l12.3-4Z" fill="#efcc84"/><path d="m23 6 .1 17-3.8-4Zm.1 17 15.9 0-12.5 3.6ZM23 41l.1-18L19.3 26.6Z" fill="#9b783f"/><path d="m23.1 23-16.1 0 12.3-4Z" fill="#c29751"/><path d="m23 18.9 3.2 4.1-3.2 4.1-3.2-4.1Z" fill="#fff2b9"/><path d="m3 20 2.2 3L3 26 .8 23Zm40 0 2.2 3-2.2 3-2.2-3Z" fill="#c6a05f"/></svg>`;
const prefsKey = "aethoria.lobby.preferences";
export function prefs() {
  try {
    return {
      motion: !matchMedia("(prefers-reduced-motion: reduce)").matches,
      sound: false,
      ...JSON.parse(localStorage.getItem(prefsKey) || "{}"),
    };
  } catch {
    return { motion: false, sound: false };
  }
}
export function savePrefs(p) {
  try {
    localStorage.setItem(prefsKey, JSON.stringify(p));
  } catch {}
}
export function cinematic(root, options) {
  const frames = [...root.querySelectorAll(".scene-frame")],
    canvas = root.querySelector("canvas"),
    ctx = canvas.getContext("2d"),
    pause = root.querySelector("[data-scene=pause]");
  let active = 0,
    elapsed = 0,
    clock = 0,
    last = 0,
    frame = 0,
    enabled = options.motion,
    raf = 0,
    hidden = false,
    w = 1,
    h = 1;
  const time = 42000;
  const ro = new ResizeObserver(() => {
    const r = root.getBoundingClientRect();
    w = Math.ceil(r.width / 2);
    h = Math.ceil(r.height / 2);
    canvas.width = w;
    canvas.height = h;
  });
  ro.observe(root);
  const toggleUI = () => {
    root.classList.toggle("cinema-paused", !enabled);
    pause.innerHTML = icon(enabled ? "pause" : "play", 13);
    pause.setAttribute(
      "aria-label",
      enabled ? "Pausar cinemática" : "Reproducir cinemática",
    );
    pause.title = pause.getAttribute("aria-label");
    if (!enabled) ctx.clearRect(0, 0, w, h);
  };
  let wanted = 0;
  const select = async (j) => {
    const next = (j + SCENES.length) % SCENES.length;
    wanted = next;
    elapsed = 0;
    const img = frames[next];
    if (!img.src) img.src = `/art/menu-${SCENES[next].file}.webp`;
    if (!img.complete || !img.naturalWidth) {
      try {
        await img.decode();
      } catch {
        return;
      }
    }
    if (wanted !== next) return;
    active = next;
    frames.forEach((el, n) => el.classList.toggle("on", n === active));
    root.querySelector(".scene-count").textContent =
      `ESCENA 0${active + 1} / 03`;
    root.querySelector(".scene-location").textContent = SCENES[active].name;
    root.querySelectorAll(".scene-dot").forEach((e, n) => {
      e.classList.toggle("on", n === active);
      e.setAttribute("aria-pressed", n === active);
    });
  };
  function paint(t) {
    raf = requestAnimationFrame(paint);
    const dt = last ? Math.min(t - last, 100) : 0;
    last = t;
    if (
      !enabled ||
      document.hidden ||
      document.querySelector("dialog[open]") ||
      hidden
    )
      return;
    elapsed += dt;
    clock += dt;
    if (elapsed >= time) select(active + 1);
    if (t - frame < 55) return;
    frame = t;
    ctx.clearRect(0, 0, w, h);
    const s = clock / 1000;
    for (let j = 0; j < 28; j++) {
      const x = (j * 0.13753 + s * 0.004 * (1 + (j % 4))) % 1,
        y =
          0.22 +
          ((((j * 0.19847 - s * 0.008 + Math.sin(j + s * 0.14) * 0.021) % 1) +
            1) %
            1) *
            0.75;
      const a = (0.5 + 0.5 * Math.sin(s * 1.08 + j * 6)) * 0.55;
      ctx.fillStyle =
        active === 1 ? `rgba(235,183,215,${a})` : `rgba(255,218,139,${a})`;
      ctx.fillRect(Math.floor(x * w), Math.floor(y * h), j % 5 ? 1 : 2, 1);
    }
    // Distant birds circle the valley, not the UI layer.
    for (let j = 0; j < 5; j++) {
      let x = ((s * 0.006 + j * 0.015 + 0.46) % 1) * w,
        y = (0.27 + Math.sin(s * 0.22 + j) * 0.011 + j * 0.008) * h;
      let f = Math.sin(s * 2.8 + j) > 0.05 ? -1 : 0;
      ctx.fillStyle = "rgba(30,37,55,.55)";
      ctx.fillRect(x | 0, y | 0, 2, 1);
      ctx.fillRect((x - 1) | 0, (y + f) | 0, 1, 1);
      ctx.fillRect((x + 2) | 0, (y + f) | 0, 1, 1);
    }
  }
  const visibility = new IntersectionObserver(
    (entries) => (hidden = !entries[0].isIntersecting),
  );
  visibility.observe(root);
  raf = requestAnimationFrame(paint);
  select(0);
  toggleUI();
  const motion = (v) => {
    enabled = v;
    options.motion = v;
    savePrefs(options);
    toggleUI();
  };
  root.addEventListener("click", (e) => {
    let a = e.target.closest("[data-scene]")?.dataset.scene;
    if (!a) return;
    if (a === "pause") motion(!enabled);
    else if (a === "prev") select(active - 1);
    else if (a === "next") select(wanted + 1);
    else select(+a);
  });
  addEventListener(
    "pagehide",
    () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      visibility.disconnect();
    },
    { once: true },
  );
  return { motion };
}
