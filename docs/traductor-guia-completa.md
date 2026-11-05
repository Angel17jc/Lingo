# Traductor web gratuito: guía completa de construcción

Stack: Next.js + TypeScript + Tailwind + Neon (Postgres) + Upstash (Redis) + DeepL Free, desplegado en Vercel.

## Cómo usar esta guía

1. Pega el **Super Prompt** (sección 1) una sola vez como contexto base en Claude Code, Cursor o tu asistente de código.
2. Sigue las fases en orden (0 a 6). En cada fase: ejecuta los comandos, pega el prompt de la fase y revisa el checklist.
3. Haz un commit al terminar cada fase y no avances hasta que el checklist pase completo.
4. Nunca pegues tus claves reales en el chat con la IA. Ponlas solo en `.env.local` y en Vercel.

---

## 1. Super Prompt (contexto base)

````markdown
# ROL
Actúa como un ingeniero de software senior full-stack. Vas a construir una aplicación web de traducción, gratuita de operar, desplegada en Vercel, con arquitectura modular, código limpio y listo para crecer.

# OBJETIVO
Web app donde el usuario escribe texto, elige idioma origen (o autodetección) y destino, y obtiene la traducción. Debe ser rápida, segura y proteger las cuotas gratuitas de los servicios externos.

# STACK (obligatorio)
- Framework: Next.js (App Router) + TypeScript en modo estricto
- UI: Tailwind CSS (sin librerías de componentes pesadas)
- Validación: Zod (entradas de API y variables de entorno)
- Base de datos: Neon (Postgres serverless) con Drizzle ORM y el driver @neondatabase/serverless
- Rate limiting: Upstash Redis + @upstash/ratelimit (capa gratuita)
- Motor de traducción: DeepL API Free por defecto, intercambiable
- Tests: Vitest (unitarios) y un test e2e mínimo con Playwright
- Calidad: ESLint, Prettier, husky + lint-staged
- Despliegue: Vercel (Hobby) con CI en GitHub Actions
- Gestor de paquetes: pnpm

# ARQUITECTURA (por capas, con dependencias en una sola dirección)

```
src/
├── app/                      # Capa de presentación y rutas (Next.js)
│   ├── page.tsx
│   ├── layout.tsx
│   └── api/translate/route.ts   # Controlador delgado: valida, llama al servicio, responde
├── features/
│   └── translator/
│       ├── components/       # TranslatorForm, LanguageSelect, OutputBox
│       ├── hooks/            # useTranslate (estado, debounce, errores)
│       └── schemas.ts        # Zod: request/response compartidos cliente-servidor
├── server/
│   ├── services/
│   │   └── translation.service.ts   # Orquesta: caché → proveedor → guardar
│   ├── providers/            # Patrón Adapter
│   │   ├── translation-provider.ts  # Interfaz TranslationProvider
│   │   ├── deepl.provider.ts
│   │   ├── azure.provider.ts        # (stub para el futuro)
│   │   └── index.ts                 # Selección por env TRANSLATION_PROVIDER
│   ├── cache/
│   │   └── translation-cache.ts     # Lectura/escritura en Neon por hash
│   ├── db/
│   │   ├── schema.ts         # Tablas Drizzle
│   │   ├── client.ts
│   │   └── migrations/
│   ├── ratelimit.ts
│   └── errors.ts             # Errores de dominio tipados (RateLimitError, ProviderError...)
├── lib/
│   ├── env.ts                # Variables de entorno validadas con Zod (falla al arrancar si faltan)
│   ├── languages.ts          # Catálogo de idiomas único (fuente de verdad)
│   ├── hash.ts               # sha256 de (texto normalizado + origen + destino)
│   └── logger.ts
└── tests/
```

Reglas de dependencia:
- `app/` → `features/` y `server/services`. Nunca importa de `providers` o `db` directamente.
- `services` dependen de interfaces (`TranslationProvider`, `Cache`), no de implementaciones concretas (inversión de dependencias, facilita los tests con mocks).
- Cambiar de DeepL a otro motor debe requerir tocar solo `providers/` y una variable de entorno.

# MODELO DE DATOS (Neon + Drizzle)
Tabla `translation_cache`:
- `id` (uuid, pk), `hash` (text, unique, indexado), `source_lang`, `target_lang`,
  `source_text`, `translated_text`, `provider`, `hits` (int), `created_at`, `last_used_at`
- Política: límite de longitud de texto cacheado y limpieza de entradas antiguas.
- No guardar datos personales ni IPs en claro.

# FLUJO DE LA PETICIÓN
1. Cliente → `POST /api/translate` con `{ text, source?, target }`
2. Rate limit por IP (p. ej. 20 peticiones/min); si excede, responde 429 con `Retry-After`
3. Validación con Zod (máx. 3000 caracteres, idiomas válidos, texto no vacío)
4. Calcular hash → buscar en caché (Neon). Si existe, devolver y sumar `hits`
5. Si no existe, llamar al proveedor con timeout y 1 reintento con backoff
6. Guardar en caché y responder `{ translation, detectedSource, cached }`
7. Errores mapeados a códigos HTTP claros con mensajes seguros (sin filtrar detalles internos)

# SEGURIDAD
- API keys solo en variables de entorno del servidor; nunca en el cliente ni en el repo
- `.env.example` documentado; `.env` en `.gitignore`
- Validar y sanear toda entrada; límites de tamaño de body
- Cabeceras de seguridad (CSP, X-Content-Type-Options, Referrer-Policy)
- Sin `dangerouslySetInnerHTML`; renderizar la traducción como texto plano
- Contador de caracteres consumidos al mes; si se acerca al tope del plan gratuito, degradar con un mensaje claro en vez de fallar

# UX Y ACCESIBILIDAD
- Diseño responsive, mobile-first, modo claro/oscuro
- Autodetección de idioma, botón para intercambiar idiomas, copiar al portapapeles
- Contador de caracteres, estados de carga y error claros
- Accesibilidad: etiquetas, foco visible, `aria-live` para el resultado, navegación por teclado
- Textos de la interfaz preparados para i18n (aunque inicialmente solo español)

# BUENAS PRÁCTICAS DE CÓDIGO
- TypeScript estricto, sin `any`; tipos inferidos desde los esquemas Zod
- Funciones pequeñas con una sola responsabilidad; nombres descriptivos
- Manejo de errores explícito con errores de dominio, no `try/catch` vacíos
- Logging estructurado sin datos sensibles
- Commits convencionales (feat:, fix:, chore:)
- Tests: unitarios del servicio (con proveedor y caché mockeados), del hash y de los esquemas; e2e del flujo principal
- README con instrucciones de instalación, variables de entorno, arquitectura y despliegue

# VARIABLES DE ENTORNO
```
TRANSLATION_PROVIDER=deepl
DEEPL_API_KEY=
DATABASE_URL=            # Neon (cadena pooled)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

# FASES DE TRABAJO
Trabaja por fases y detente al final de cada una para que yo revise:
1. **Base:** scaffold de Next.js + TS + Tailwind + ESLint/Prettier + `lib/env.ts` + estructura de carpetas
2. **Motor:** interfaz `TranslationProvider` + `DeepLProvider` + `translation.service` + ruta `/api/translate` + tests
3. **UI:** feature `translator` completa, accesible y responsive
4. **Caché:** esquema Drizzle, migraciones en Neon, `translation-cache` integrada al servicio
5. **Protección:** rate limiting con Upstash, contador de cuota, manejo de errores
6. **Calidad y despliegue:** tests e2e, CI en GitHub Actions, configuración de Vercel y README final

# FORMA DE RESPONDER
- Antes de escribir código en cada fase, resume en pocas líneas lo que vas a hacer
- Entrega archivos completos, no fragmentos sueltos
- Si una decisión tiene alternativas relevantes, explica brevemente por qué elegiste una
- No añadas dependencias fuera del stack sin justificarlo
- Espera mi indicación para empezar cada fase
````

---

## Fase 0: Preparación (antes de escribir código)

### Cuentas gratuitas

1. **GitHub**: repositorio.
2. **Vercel**: despliegue.
3. **DeepL API Free**: clave en deepl.com/pro-api (pide tarjeta para verificar, pero no cobra en el plan Free).
4. **Neon**: neon.tech, crea un proyecto y copia la cadena de conexión **pooled**.
5. **Upstash**: upstash.com, crea una base Redis y copia `REST URL` y `REST TOKEN`.

### Herramientas locales

```bash
node -v                      # necesitas Node 20 o superior
npm i -g pnpm
pnpm -v
git --version
```

---

## Fase 1: Base

### Comandos

```bash
pnpm create next-app@latest traductor --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
cd traductor

# Dependencias de producción
pnpm add zod drizzle-orm @neondatabase/serverless @upstash/redis @upstash/ratelimit

# Dependencias de desarrollo
pnpm add -D drizzle-kit vitest @playwright/test prettier prettier-plugin-tailwindcss \
  husky lint-staged dotenv tsx

# Estructura de carpetas
mkdir -p src/features/translator/{components,hooks} \
  src/server/{services,providers,cache,db/migrations} \
  src/lib src/tests

# Husky + lint-staged
pnpm exec husky init
echo "pnpm lint-staged" > .husky/pre-commit
```

### Archivos de configuración

`.prettierrc`

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

Añade esto a `package.json`:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

`.env.example`

```
TRANSLATION_PROVIDER=deepl
DEEPL_API_KEY=
DATABASE_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

```bash
cp .env.example .env.local   # y rellena tus claves
```

### Prompt para la IA

```markdown
Ejecuta la FASE 1 (Base). El proyecto Next.js ya está creado con los comandos
de instalación. Tu tarea:

1. Verifica que tsconfig.json tiene "strict": true y añade
   "noUncheckedIndexedAccess": true.
2. Crea src/lib/env.ts: valida con Zod TRANSLATION_PROVIDER (enum "deepl"|"azure",
   default "deepl"), DEEPL_API_KEY, DATABASE_URL, UPSTASH_REDIS_REST_URL y
   UPSTASH_REDIS_REST_TOKEN. Debe lanzar un error claro si falta alguna.
   Exporta un objeto `env` tipado. Solo para uso en servidor.
3. Crea src/lib/languages.ts: catálogo único de idiomas (código DeepL, nombre
   en español, flag de si admite origen/destino). Incluye al menos ES, EN-US,
   EN-GB, FR, DE, IT, PT-BR, PT-PT. Exporta tipos derivados.
4. Crea src/lib/logger.ts: logger estructurado mínimo (info/warn/error en JSON)
   que nunca imprima el texto del usuario ni claves.
5. Crea vitest.config.ts con alias "@" a ./src y entorno node.
6. Añade cabeceras de seguridad en next.config.ts (Content-Security-Policy,
   X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy).
7. Limpia la página por defecto de create-next-app y deja un placeholder.
8. Crea README.md inicial con descripción, instalación y variables de entorno.

Entrega los archivos completos. Al terminar, indica cómo verificar con
`pnpm typecheck`, `pnpm lint` y `pnpm dev`. Detente y espera mi revisión.
```

### Checklist

- [ ] `pnpm typecheck` y `pnpm lint` pasan.
- [ ] `pnpm dev` abre sin errores.
- [ ] Si borras una variable de `.env.local`, la app falla con un mensaje claro.

### Commit y subida a GitHub

```bash
git add . && git commit -m "feat: base del proyecto"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/traductor.git
git push -u origin main
```

---

## Fase 2: Motor de traducción

### Comandos

No hay instalaciones nuevas.

### Prompt para la IA

```markdown
Ejecuta la FASE 2 (Motor). Antes de escribir código, resume en pocas líneas
tu plan.

1. src/server/errors.ts: errores de dominio tipados que extiendan Error:
   ValidationError, RateLimitError (con retryAfterSeconds), ProviderError,
   QuotaExceededError. Cada uno con `code` y `httpStatus`.
2. src/features/translator/schemas.ts: esquemas Zod compartidos:
   - translateRequestSchema: text (trim, 1-3000 caracteres), source (opcional,
     código válido del catálogo), target (código válido del catálogo).
   - translateResponseSchema: translation, detectedSource, cached (boolean).
   Exporta los tipos con z.infer.
3. src/server/providers/translation-provider.ts: interfaz TranslationProvider
   con `translate({ text, source, target }): Promise<{ text, detectedSource }>`
   y propiedad `name`.
4. src/server/providers/deepl.provider.ts: implementación con fetch a
   https://api-free.deepl.com/v2/translate. Header Authorization
   "DeepL-Auth-Key", timeout de 8 s con AbortController, 1 reintento con
   backoff ante 5xx o errores de red, y mapeo de 429/456 a QuotaExceededError.
5. src/server/providers/azure.provider.ts: stub que lance "no implementado".
6. src/server/providers/index.ts: función getProvider() que elija según
   env.TRANSLATION_PROVIDER.
7. src/server/services/translation.service.ts: clase o función
   createTranslationService({ provider, cache? }) con inyección de
   dependencias. Por ahora solo llama al proveedor (la caché llega en la Fase 4,
   deja el puerto definido con una interfaz `TranslationCache`).
8. src/app/api/translate/route.ts: controlador delgado POST: parsea JSON,
   valida con Zod, llama al servicio, mapea errores de dominio a respuestas
   JSON con el código HTTP correcto y mensajes seguros. Nada de lógica de
   negocio aquí.
9. Tests con Vitest: el servicio con proveedor mockeado (éxito, error del
   proveedor), los esquemas Zod (casos válidos e inválidos) y el mapeo de errores.

Entrega archivos completos. Detente al final y espera mi revisión.
```

### Prueba manual

```bash
pnpm dev
curl -X POST http://localhost:3000/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text":"Hola mundo","target":"EN-US"}'
```

### Checklist

- [ ] Devuelve la traducción correcta.
- [ ] Un texto vacío da 400.
- [ ] Una clave inválida da 502 sin filtrar detalles.
- [ ] `pnpm test` pasa.

---

## Fase 3: Interfaz

### Comandos

Ninguno nuevo.

### Prompt para la IA

```markdown
Ejecuta la FASE 3 (UI). Resume tu plan antes de escribir código.

Construye la feature src/features/translator con:
- components/TranslatorForm.tsx (client component): dos áreas de texto
  (entrada y salida de solo lectura), selectores de idioma, botón de
  intercambiar idiomas, botón traducir, botón copiar, contador de caracteres
  (máx. 3000) y mensajes de error.
- components/LanguageSelect.tsx: select accesible alimentado por
  src/lib/languages.ts, con opción "Detectar idioma" solo en origen.
- components/OutputBox.tsx: muestra la traducción como texto plano
  (prohibido dangerouslySetInnerHTML) con aria-live="polite".
- hooks/useTranslate.ts: maneja estados (idle/loading/success/error),
  cancela peticiones anteriores con AbortController, valida con el esquema
  Zod antes de enviar y traduce los errores del servidor a mensajes en español.
- Modo claro/oscuro con Tailwind (respetando prefers-color-scheme).
- Diseño mobile-first y responsive.
- Accesibilidad: labels asociados, foco visible, navegación completa por
  teclado, atajo Ctrl/Cmd+Enter para traducir, contraste suficiente.
- Todos los textos de interfaz centralizados en un objeto (src/lib/messages.ts)
  para facilitar i18n futuro.
- Integra el formulario en src/app/page.tsx y define metadata y título en layout.tsx.

Entrega archivos completos. Detente y espera mi revisión.
```

### Checklist

- [ ] Funciona en móvil y escritorio.
- [ ] Se puede usar solo con teclado.
- [ ] El lector de pantalla anuncia el resultado.
- [ ] El modo oscuro se ve bien.

---

## Fase 4: Caché con Neon

### Comandos

Crea `drizzle.config.ts` en la raíz (o pídeselo a la IA en el prompt) y luego:

```bash
pnpm db:generate
pnpm db:migrate
```

`drizzle.config.ts`

```ts
import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./src/server/db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

Nota: `drizzle-kit` con `dotenv/config` lee `.env` por defecto, no `.env.local`. Copia tu `DATABASE_URL` también a `.env` (que debe estar en `.gitignore`) o ejecuta:

```bash
DOTENV_CONFIG_PATH=.env.local pnpm db:migrate
```

### Prompt para la IA

```markdown
Ejecuta la FASE 4 (Caché). Resume tu plan primero.

1. src/server/db/schema.ts (Drizzle, Postgres): tabla translation_cache con
   id (uuid, default random), hash (text, unique), source_lang, target_lang,
   source_text, translated_text, provider, hits (integer, default 0),
   created_at, last_used_at. Índice sobre hash y otro sobre last_used_at.
2. src/server/db/client.ts: cliente con @neondatabase/serverless y
   drizzle-orm/neon-http usando env.DATABASE_URL.
3. src/lib/hash.ts: sha256 (node:crypto) de texto normalizado (trim, espacios
   colapsados) + origen + destino. Con tests.
4. src/server/cache/translation-cache.ts: implementa la interfaz
   TranslationCache: get(hash) que incrementa hits y actualiza last_used_at,
   y set(entry) con upsert (onConflictDoNothing). No cachear textos de más de
   1000 caracteres. No guardar IPs ni datos personales.
5. Integra la caché en translation.service.ts: caché → proveedor → guardar.
   Si Neon falla, registra un warning y continúa sin caché (degradación
   elegante, la traducción nunca debe fallar por la caché).
6. Añade un script src/server/db/cleanup.ts para borrar entradas con
   last_used_at de más de 90 días, ejecutable con tsx.
7. Tests: servicio con caché mockeada (hit, miss, caché caída) y el hash.

Entrega archivos completos, el SQL de migración generado y los comandos para
aplicarlo. Detente y espera mi revisión.
```

### Checklist

- [ ] La tabla aparece en el panel de Neon.
- [ ] La segunda traducción idéntica devuelve `cached: true` sin gastar caracteres de DeepL.
- [ ] Si apagas la base, el servicio sigue funcionando.

---

## Fase 5: Protección

### Comandos

Ninguno nuevo (Upstash ya se instaló en la Fase 1).

### Prompt para la IA

```markdown
Ejecuta la FASE 5 (Protección). Resume tu plan primero.

1. src/server/ratelimit.ts: Ratelimit de @upstash/ratelimit con ventana
   deslizante de 20 peticiones por minuto por IP (x-forwarded-for, con
   fallback seguro). Usa un prefijo propio para las claves. Si Upstash no
   responde, permitir la petición y registrar un warning (fail-open).
2. Contador mensual de caracteres enviados al proveedor, guardado en Redis
   con una clave por mes (ej. usage:deepl:2026-11) y expiración automática.
   Solo se suman caracteres de las traducciones que NO vinieron de caché.
3. Umbrales configurables: aviso al 80 % y bloqueo al 95 % del tope
   (DEEPL_MONTHLY_LIMIT, por defecto 500000). Al bloquear, lanzar
   QuotaExceededError con un mensaje claro para el usuario.
4. En la ruta: aplicar rate limit antes de validar; responder 429 con cabecera
   Retry-After. Añadir un límite máximo de tamaño del body (rechazar con 413).
5. Mapeo final de todos los errores de dominio a HTTP, verificando que ningún
   mensaje filtre claves, URLs internas ni trazas.
6. El frontend debe mostrar mensajes específicos para 429 (con segundos de
   espera) y para cuota agotada.
7. Tests: rate limit excedido, cuota al 95 %, Redis caído, y mapeo de errores.

Entrega archivos completos. Detente y espera mi revisión.
```

### Checklist

- [ ] Lanzar 25 peticiones seguidas produce un 429 con `Retry-After`.
- [ ] El contador de uso aumenta solo con traducciones nuevas.
- [ ] Ningún error expone secretos.

---

## Fase 6: Calidad y despliegue

### Comandos

```bash
pnpm exec playwright install --with-deps chromium
mkdir -p .github/workflows e2e
```

`playwright.config.ts`

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
  use: { baseURL: "http://localhost:3000" },
});
```

`.github/workflows/ci.yml`

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
        env:
          TRANSLATION_PROVIDER: deepl
          DEEPL_API_KEY: ci-placeholder
          DATABASE_URL: postgres://user:pass@localhost/db
          UPSTASH_REDIS_REST_URL: https://example.upstash.io
          UPSTASH_REDIS_REST_TOKEN: ci-placeholder
```

### Prompt para la IA

```markdown
Ejecuta la FASE 6 (Calidad y despliegue). Resume tu plan primero.

1. Test e2e con Playwright en e2e/translate.spec.ts del flujo principal:
   escribir texto, elegir idioma, traducir y comprobar el resultado.
   Intercepta /api/translate con page.route para no gastar cuota real.
   Añade un segundo test para el mensaje de error 429.
2. Revisa que .github/workflows/ci.yml funcione (lint, typecheck, tests,
   build) y ajústalo si hace falta. Los e2e se ejecutan en local, no en CI.
3. Revisa el build de producción: sin warnings, sin `any`, sin console.log.
4. Añade un endpoint GET /api/health que responda 200 sin tocar servicios
   externos.
5. Completa el README: descripción, capturas o descripción de uso, stack,
   diagrama de arquitectura en texto, estructura de carpetas, variables de
   entorno, comandos (dev, test, e2e, db:migrate), cómo cambiar de proveedor
   de traducción y guía de despliegue en Vercel.
6. Audita las dependencias con `pnpm audit` y lista cualquier hallazgo.

Entrega archivos completos. Al final, haz un resumen de deuda técnica y
mejoras futuras sugeridas.
```

### Despliegue en Vercel, paso a paso

1. Sube todo a GitHub con `git push`.
2. En vercel.com → **Add New → Project** → importa el repositorio. Vercel detecta Next.js automáticamente.
3. En **Storage / Integrations** conecta **Neon** (inyecta `DATABASE_URL`) y **Upstash Redis** (inyecta las variables REST). Así te ahorras copiarlas a mano.
4. En **Settings → Environment Variables** añade `TRANSLATION_PROVIDER=deepl` y `DEEPL_API_KEY` (y `DEEPL_MONTHLY_LIMIT` si lo usas), marcadas para Production, Preview y Development.
5. Aplica la migración a la base de producción desde tu equipo:
   ```bash
   DATABASE_URL="tu-cadena-neon" pnpm db:migrate
   ```
6. Pulsa **Deploy** y prueba la URL `tu-proyecto.vercel.app`.
7. Verifica `/api/health`, una traducción real y que la segunda idéntica salga con `cached: true`.

### Checklist final

- [ ] CI en verde en GitHub Actions.
- [ ] `/api/health` responde 200 en producción.
- [ ] Traducción real funcionando y caché activa.
- [ ] Rate limit y contador de cuota operativos.
- [ ] Ninguna clave en el repositorio.

---

## Cómo trabajar con la IA sin perder el control

- Una fase por conversación o por bloque, y haz **commit al terminar cada una** (`feat: fase 2 motor de traducción`). Si algo se rompe, vuelves atrás fácilmente.
- No avances de fase hasta que el checklist pase completo.
- Si la IA propone una dependencia nueva, pídele que la justifique.
- Nunca pegues tus claves reales en el chat con la IA.

## Antes de producción

- Revisa los límites vigentes de DeepL Free, Neon, Upstash y Vercel Hobby, porque cambian y afectan los valores de `DEEPL_MONTHLY_LIMIT` y del rate limit.
- Vercel Hobby es para uso personal y no comercial; si monetizas, necesitarás un plan de pago.
- El driver HTTP de Neon es suficiente para este caso, pero si más adelante necesitas transacciones, cambia al driver de WebSockets.
- Si quieres un motor 100 % gratuito sin límites, la capa `providers/` permite añadir un proveedor open source (por ejemplo LibreTranslate alojado en Render o un Hugging Face Space) sin tocar el resto del código.
