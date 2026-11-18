import { test, expect } from "@playwright/test";
import { createGeography } from "../../src/geography.js";
const URLS = { home: "/", original: "/?mundo=aethoria" };
const act = (p, k) => p.locator(`[data-action="${k}"]`),
  lobby = (p, k) => p.locator(`[data-lobby="${k}"]`),
  win = (p, k) => p.locator(`[data-win="${k}"]`);
const saved = (p) =>
  p.evaluate(() =>
    JSON.parse(
      localStorage.getItem(
        "aethoria.world.v2:" +
          new URLSearchParams(location.search).get("mundo"),
      ),
    ),
  );
const canvas = (p) => p.locator("canvas.world-canvas");
const category = (p, c) =>
  p.locator(`[data-action=category][data-val="${c}"]`).click();
const choose = async (p, c, t) => {
  await category(p, c);
  await p.locator(`[data-action=tool][data-val="${t}"]`).click();
};
const clickMap = async (p, x, y) => {
  const box = await canvas(p).boundingBox();
  await p.mouse.click(box.x + box.width * x, box.y + box.height * y);
};
const errors = new WeakMap();
test.beforeEach(async ({ page }) => {
  errors.set(page, []);
  page.on("pageerror", (e) => errors.get(page).push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.get(page).push(`${r.status()} ${r.url()}`);
  });
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

test("Portada, tres paisajes, códice y acceso directo a un reino del atlas original", async ({
  page: p,
}) => {
  await p.goto(URLS.home);
  await expect(
    p.getByRole("heading", { name: "Aethoria", exact: true }),
  ).toBeVisible();
  for (const place of [
    "Jardines de Akitsune",
    "El oasis de Azharim",
    "Valle de Valdoria",
  ]) {
    await p.locator("[data-scene=next]").click();
    await expect(p.locator(".scene-location")).toHaveText(place);
    await expect
      .poll(() =>
        p
          .locator("img.scene-frame.on")
          .evaluate((img) => img.complete && img.naturalWidth > 0),
      )
      .toBe(true);
  }
  await p.locator("[data-scene=pause]").click();
  await expect(p.locator(".hero-stage")).toHaveClass(/cinema-paused/);
  await lobby(p, "codex").first().click();
  await p.locator("[data-lobby=codex-tab][data-v=Objetos]").click();
  await expect(p.locator(".race-card")).toHaveCount(42);
  await p.keyboard.press("Escape");
  await lobby(p, "rule").click();
  await p.selectOption("#crown-filter", "1");
  await expect(lobby(p, "pick-crown")).toHaveCount(9);
  await p.fill("#crown-search", "Akitsune");
  await lobby(p, "pick-crown").click();
  await lobby(p, "crown-play").click();
  await expect(p.locator(".world-banner h3")).toHaveText("Akitsune");
  let s = await saved(p);
  expect(s.ruler).toBe(11);
  expect(s.realms.filter((r) => r.pop)).toHaveLength(63);
  await act(p, "pause").click();
  await p.locator("[data-action=policy][data-val=farm]").click();
  expect((await saved(p)).realms[11].pop).toBe(s.realms[11].pop + 18);
  await category(p, "Diplomacia");
  await p.locator("[data-action=policy][data-val=pact]").click();
  await win(p, "realm-pick").first().click();
  await win(p, "dip-apply").click();
  expect((await saved(p)).treaties["0:11"]).toBe("alliance");
  await p.reload();
  await expect(p.locator(".world-banner h3")).toHaveText("Akitsune");
  await act(p, "home").click();
  await lobby(p, "play").click();
  await expect(act(p, "creator")).toHaveAttribute("aria-pressed", "true");
});

test("Isla propia: fundación, materiales, archivo, obra real y creación no destructiva", async ({
  page: p,
}) => {
  await p.goto("/#crear");
  await p.fill("[name=name]", "Islas Celestes");
  await p.check("[name=template][value=ocean]");
  await p.selectOption("[name=materials]", "kit");
  await p.locator("[name=speed]").fill("3");
  await p.locator("#genesis [type=submit]").click();
  await canvas(p).waitFor();
  await act(p, "pause").click();
  let s = await saved(p);
  expect(s.speed).toBe(3);
  expect(s.realms.filter((r) => r.pop)).toHaveLength(0);
  const slot = s.slotId;
  await choose(p, "Terreno", "meadow");
  await clickMap(p, 0.48, 0.43);
  await choose(p, "Objetos", "windmill");
  await clickMap(p, 0.48, 0.43);
  s = await saved(p);
  expect(s.objects.at(-1).objectId).toBe("windmill");
  expect(s.supplies.wood).toBe(222);
  await choose(p, "Criaturas", "human");
  await clickMap(p, 0.48, 0.43);
  s = await saved(p);
  const realm = s.realms.find((r) => r.pop);
  expect(realm.name).toBeTruthy();
  expect(s.objects.find((o) => o.objectId === "windmill").realm).toBe(realm.id);
  await expect(p.locator(".world-banner h3")).toHaveText(realm.name);
  await act(p, "home").click();
  await lobby(p, "library").first().click();
  await expect(p.locator(".saved-world")).toHaveCount(2);
  await lobby(p, "close").click();
  await lobby(p, "rule").click();
  await p.selectOption("#crown-world", slot);
  await expect(lobby(p, "pick-crown")).toContainText(realm.name);
  await lobby(p, "pick-crown").click();
  await lobby(p, "crown-play").click();
  await canvas(p).waitFor();
  expect((await saved(p)).ruler).toBe(realm.id);
  await category(p, "Obras");
  await p.locator("[data-action=policy][data-val=well]").click();
  await clickMap(p, 0.5, 0.5);
  expect((await saved(p)).objects.some((o) => o.objectId === "well")).toBe(
    true,
  );
  await act(p, "realm-detail").last().click();
  await expect(p.locator(".realm-detail")).toContainText(
    "Producción de objetos por estación",
  );
  await act(p, "close-dialog").click();
  await act(p, "settings").click();
  await win(p, "new-world").click();
  await expect(p.locator("#genesis")).toBeVisible();
  await lobby(p, "close").click();
  await lobby(p, "library").first().click();
  await expect(p.locator(".saved-world")).toHaveCount(2);
  await lobby(p, "delete").click();
  await lobby(p, "library").last().click();
  await expect(p.locator(".saved-world")).toHaveCount(2);
  await lobby(p, "delete").click();
  await lobby(p, "confirm-delete").click();
  await expect(p.locator(".saved-world")).toHaveCount(1);
  await expect(p.locator(".saved-world")).toContainText("63 reinos");
});

test("Reloj y escala colosal: cambiar la velocidad, viajar, pintar en detalle y recargar", async ({
  page: p,
}) => {
  await p.goto(URLS.original);
  await canvas(p).waitFor();
  await act(p, "pause").click();
  await act(p, "pace").click();
  await p.locator("#pace-range").fill("6");
  expect((await saved(p)).speed).toBe(6);
  await p.locator('[data-action=speed][data-val="10"]').click();
  expect((await saved(p)).paused).toBe(true);
  const yy = (await saved(p)).year;
  await act(p, "pause").click();
  await expect(p.locator("#year")).toContainText(String(yy + 1), {
    timeout: 16000,
  });
  await act(p, "pause").click();
  await act(p, "pace").click();
  await p.locator('[data-action=speed][data-val="2"]').click();
  await act(p, "global").click();
  const cap = createGeography().caps[0];
  await clickMap(p, cap.x / 1060, cap.y / 600);
  await expect(p.locator(".world-banner h3")).toHaveText("Valdoria");
  await act(p, "realm-detail").last().click();
  await win(p, "locate").click();
  // One wheel gesture traverses LOD levels; the viewport at maximum covers ~33 physical cells.
  const box = await canvas(p).boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.mouse.wheel(0, -2300);
  await expect(p.locator("#zoom")).toHaveText("25600%");
  await choose(p, "Biomas", "cherry");
  await clickMap(p, 0.56, 0.6);
  let s = await saved(p);
  expect(s.marks.at(-1).detail).toBe(true);
  expect(s.marks.at(-1).kind).toBe("cherry");
  expect(s.camera.z).toBe(256);
  let x = s.camera.x;
  await p.locator(".mini-atlas").click({ position: { x: 90, y: 41 } });
  await act(p, "save").click();
  s = await saved(p);
  expect(Math.abs(s.camera.x - x)).toBeGreaterThan(100);
  await p.reload();
  await expect(p.locator("#zoom")).toHaveText("25600%");
  expect((await saved(p)).camera).toEqual(s.camera);
  expect((await saved(p)).speed).toBe(2);
  await act(p, "global").click();
  await expect(p.locator("#zoom")).toHaveText("100%");
});

test.describe("Pantalla táctil", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  test("Portada y taller sin desbordamiento, terreno y objetos con el dedo", async ({
    page: p,
  }) => {
    await p.goto("/");
    for (const width of [320, 390, 610, 768, 850, 1024, 1440]) {
      await p.setViewportSize({ width, height: 844 });
      expect(
        await p.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width + 1);
    }
    await p.setViewportSize({ width: 390, height: 844 });
    await lobby(p, "create").tap();
    await p.fill("[name=name]", "Mundo táctil");
    await p.locator("#genesis [type=submit]").tap();
    await canvas(p).waitFor();
    await act(p, "pause").tap();
    expect((await saved(p)).template).toBe("wild");
    for (const width of [320, 390, 610, 768, 850, 851, 1024, 1440]) {
      await p.setViewportSize({ width, height: 844 });
      expect(
        await p.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width + 1);
    }
    await p.setViewportSize({ width: 390, height: 844 });
    await choose(p, "Terreno", "meadow");
    await canvas(p).tap({ position: { x: 155, y: 127 } });
    expect((await saved(p)).marks.at(-1).kind).toBe("meadow");
    await category(p, "Objetos");
    await p.selectOption("#object-filter", "Fauna");
    await p.locator("[data-action=tool][data-val=duck]").tap();
    await canvas(p).tap({ position: { x: 155, y: 127 } });
    expect((await saved(p)).objects.at(-1).objectId).toBe("duck");
    await act(p, "remove-prop").tap();
    await canvas(p).tap({ position: { x: 155, y: 127 } });
    expect((await saved(p)).objects).toHaveLength(0);
    await act(p, "zoom-in").tap();
    await expect(p.locator("#zoom")).toHaveText("150%");
  });
});
