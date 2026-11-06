import { expect, test, type Page } from "@playwright/test";

const input = (page: Page) =>
  page.getByRole("textbox", { name: "Texto para traducir" });
const output = (page: Page) =>
  page.getByRole("textbox", { name: "Traducción", exact: true });
const button = (page: Page) =>
  page.getByRole("button", { name: "Traducir", exact: true });

async function checkContrast(page: Page) {
  const ratios = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    function luminance(name: string) {
      let hex = style.getPropertyValue(name).trim().replace("#", "");
      if (hex.length === 3)
        hex = hex
          .split("")
          .map((character) => character + character)
          .join("");
      const channels = [0, 2, 4].map((offset) => {
        const channel =
          Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
        return channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return (
        channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
      );
    }
    return [
      ["--muted", "--page"],
      ["--muted", "--output"],
      ["--ink", "--surface"],
      ["--accent", "--page"],
    ].map(([foreground, background]) => {
      const a = luminance(foreground!);
      const b = luminance(background!);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
  });
  for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(4.5);
}

async function open(page: Page) {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    /light|dark/,
  );
}

test("traduce con teclado, anuncia el resultado, copia e intercambia la autodetección", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let requestBody: unknown;
  await page.route("**/api/translate", async (route) => {
    requestBody = route.request().postDataJSON();
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.fulfill({
      json: { translation: "Hello world", detectedSource: "ES", cached: false },
    });
  });
  await open(page);
  await expect(button(page)).toBeDisabled();
  await input(page).fill("Hola mundo");
  await input(page).press("Control+Enter");
  await expect(output(page)).toHaveValue("Hello world");
  expect(requestBody).toEqual({ text: "Hola mundo", target: "EN-US" });
  await expect(page.locator('[aria-live="polite"]')).toContainText(
    "Hello world",
  );
  await page.getByRole("button", { name: "Copiar traducción" }).click();
  await expect(
    page.getByRole("button", { name: "Copiado", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "Hello world",
  );
  await page.getByRole("button", { name: "Intercambiar idiomas" }).click();
  await expect(input(page)).toHaveValue("Hello world");
  await expect(
    page.getByLabel("Idioma de origen", { exact: true }),
  ).toHaveValue("EN");
  await expect(
    page.getByLabel("Idioma de destino", { exact: true }),
  ).toHaveValue("ES");
  await expect(output(page)).toHaveCount(0);
  await expect(input(page)).toBeFocused();
  await page.getByRole("button", { name: "Borrar texto" }).click();
  await expect(input(page)).toHaveValue("");
  await expect(button(page)).toBeDisabled();
  expect(errors).toEqual([]);
});

test("un ejemplo no envía peticiones y el contador respeta el límite", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/translate", async (route) => {
    calls += 1;
    await route.abort();
  });
  await open(page);
  await page
    .getByRole("button", { name: "Probar ejemplo: Mi próximo viaje" })
    .click();
  await expect(input(page)).toHaveValue(/reservar una mesa/);
  await expect(
    page.getByLabel("Idioma de origen", { exact: true }),
  ).toHaveValue("ES");
  await input(page).fill("a".repeat(3001));
  await expect(input(page)).toHaveValue("a".repeat(3000));
  await expect(page.locator("#character-count")).toHaveText("3000 / 3000");
  expect(calls).toBe(0);
});

test("no muestra una respuesta antigua después de editar o cambiar de idioma", async ({
  page,
}) => {
  let started = false;
  await page.route("**/api/translate", async (route) => {
    started = true;
    await new Promise((resolve) => setTimeout(resolve, 600));
    try {
      await route.fulfill({
        json: {
          translation: "Old response",
          detectedSource: "ES",
          cached: false,
        },
      });
    } catch {
      /* Petición cancelada por el usuario. */
    }
  });
  await open(page);
  await input(page).fill("Hola");
  await button(page).click();
  await expect.poll(() => started).toBe(true);
  await expect(
    page.getByRole("button", { name: "Traduciendo…" }),
  ).toBeDisabled();
  await input(page).fill("Texto nuevo");
  await page
    .getByLabel("Idioma de destino", { exact: true })
    .selectOption("FR");
  await page.waitForTimeout(750);
  await expect(output(page)).toHaveCount(0);
  await expect(input(page)).toHaveValue("Texto nuevo");
  await expect(button(page)).toBeEnabled();
});

test("el resultado se trata como texto y una nueva traducción no se sobrescribe", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/translate", async (route) => {
    calls += 1;
    const first = calls === 1;
    if (first) await new Promise((resolve) => setTimeout(resolve, 700));
    try {
      await route.fulfill({
        json: {
          translation: first
            ? "Old response"
            : '<img src=x onerror="alert(1)">',
          detectedSource: "ES",
          cached: false,
        },
      });
    } catch {
      /* Primera petición cancelada. */
    }
  });
  await open(page);
  await input(page).fill("Primero");
  await button(page).click();
  await expect.poll(() => calls).toBe(1);
  await input(page).fill("Segundo");
  await button(page).click();
  await expect(output(page)).toHaveValue('<img src=x onerror="alert(1)">');
  await page.waitForTimeout(800);
  await expect(output(page)).toHaveValue('<img src=x onerror="alert(1)">');
  await expect(page.locator(".output-panel img")).toHaveCount(0);
});

test("429 muestra cuenta atrás, conserva el bloqueo al editar y permite reintentar", async ({
  page,
}) => {
  await page.route("**/api/translate", (route) =>
    route.fulfill({
      status: 429,
      headers: { "Retry-After": "2" },
      json: { error: { code: "RATE_LIMIT_EXCEEDED", message: "private-key" } },
    }),
  );
  await open(page);
  await input(page).fill("Hola");
  await button(page).click();
  await expect(
    page
      .getByRole("form", { name: "Tu espacio para traducir" })
      .getByRole("alert"),
  ).toContainText("cuenta atrás");
  await expect(
    page.getByRole("button", { name: /Reintentar en/ }),
  ).toBeDisabled();
  await input(page).fill("Otra frase");
  await expect(
    page.getByRole("button", { name: /Reintentar en/ }),
  ).toBeDisabled();
  await expect(button(page)).toBeEnabled({ timeout: 5000 });
  await expect(page.locator("body")).not.toContainText("private-key");
});

test("cuota, error de red y respuesta inválida tienen mensajes controlados", async ({
  page,
}) => {
  let mode = "quota";
  await page.route("**/api/translate", async (route) => {
    if (mode === "network") return route.abort("failed");
    if (mode === "invalid")
      return route.fulfill({ json: { raw: "private-key" } });
    return route.fulfill({
      status: 503,
      json: { error: { code: "QUOTA_EXCEEDED", message: "private-key" } },
    });
  });
  await open(page);
  await input(page).fill("Hola");
  await button(page).click();
  await expect(
    page
      .getByRole("form", { name: "Tu espacio para traducir" })
      .getByRole("alert"),
  ).toContainText("cuota de traducción");
  mode = "network";
  await button(page).click();
  await expect(
    page
      .getByRole("form", { name: "Tu espacio para traducir" })
      .getByRole("alert"),
  ).toContainText("Comprueba tu conexión");
  mode = "invalid";
  await button(page).click();
  await expect(
    page
      .getByRole("form", { name: "Tu espacio para traducir" })
      .getByRole("alert"),
  ).toContainText("No pudimos completar");
  await expect(page.locator("body")).not.toContainText("private-key");
});

test("intercambio regional y límite de salida no pierden datos", async ({
  page,
}) => {
  await page.route("**/api/translate", (route) =>
    route.fulfill({
      json: {
        translation: "a".repeat(3001),
        detectedSource: "PT",
        cached: false,
      },
    }),
  );
  await open(page);
  await page.getByLabel("Idioma de origen", { exact: true }).selectOption("PT");
  await page
    .getByLabel("Idioma de destino", { exact: true })
    .selectOption("EN-GB");
  await page.getByRole("button", { name: "Intercambiar idiomas" }).click();
  await expect(
    page.getByLabel("Idioma de origen", { exact: true }),
  ).toHaveValue("EN");
  await expect(
    page.getByLabel("Idioma de destino", { exact: true }),
  ).toHaveValue("PT-BR");
  await input(page).fill("Hello");
  await button(page).click();
  await expect(output(page)).toHaveValue("a".repeat(3001));
  await page.getByRole("button", { name: "Intercambiar idiomas" }).click();
  await expect(page.getByRole("status")).toContainText("supera el límite");
  await expect(input(page)).toHaveValue("Hello");
  await expect(output(page)).toHaveValue("a".repeat(3001));
});

test("permite recorrer la UI con teclado y usar la copia manual si falla el portapapeles", async ({
  page,
}) => {
  await page.route("**/api/translate", (route) =>
    route.fulfill({
      json: { translation: "Hello", detectedSource: "ES", cached: false },
    }),
  );
  await open(page);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Ir al traductor" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#traductor")).toBeFocused();
  await page.getByLabel("Idioma de origen", { exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Intercambiar idiomas" }),
  ).toBeFocused();
  await input(page).fill("Hola");
  await input(page).press("Meta+Enter");
  await expect(output(page)).toHaveValue("Hello");
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "writeText", {
      configurable: true,
      value: () => Promise.reject(new Error("blocked")),
    });
  });
  await page.getByRole("button", { name: "Copiar traducción" }).click();
  await expect(page.getByRole("status")).toContainText("copiarlo manualmente");
  await expect(output(page)).toHaveAttribute("readonly", "");
});

test("escritorio y móvil no desbordan y el tema sigue el sistema y se puede cambiar", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await open(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Tus ideas",
  );
  await checkContrast(page);
  await page.screenshot({
    path: testInfo.outputPath("desktop.png"),
    fullPage: true,
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await checkContrast(page);
  await page.screenshot({
    path: testInfo.outputPath("dark.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Activar modo claro" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Activar modo oscuro" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Activar modo claro" }).click();
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(async () => {
      const overflow = await page.evaluate(() => ({
        viewport: window.innerWidth,
        width: document.documentElement.scrollWidth,
        elements: [...document.querySelectorAll("body *")]
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.right > window.innerWidth + 1;
          })
          .map((element) => ({
            tag: element.tagName,
            className: element.className,
            right: element.getBoundingClientRect().right,
          })),
      }));
      expect(overflow.width, JSON.stringify(overflow)).toBeLessThanOrEqual(
        overflow.viewport,
      );
    }).toPass({ timeout: 3000, intervals: [50, 100, 250] });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await checkContrast(page);
  await page.screenshot({
    path: testInfo.outputPath("mobile.png"),
    fullPage: true,
  });
});
