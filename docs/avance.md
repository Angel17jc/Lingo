# Registro de avances

## 2026-11-05 — Fase 1: base técnica

- pnpm 12.16.1 instalado y fijado en package.json.
- Next.js 16.4.5, React 19, TypeScript estricto con noUncheckedIndexedAccess y Tailwind CSS.
- Estructura por capas preparada; página provisional en español con modo claro/oscuro.
- Variables de servidor validadas con Zod y protegidas con server-only.
- Catálogo de idiomas con tipos distintos para origen y destino.
- Logger JSON con eventos y campos técnicos limitados.
- ESLint, Prettier, Husky y lint-staged configurados.
- Vitest configurado para Node y alias @; las pruebas llegarán con el motor.
- Cinco cabeceras de seguridad configuradas.
- Dependencias de las fases siguientes instaladas según la guía.
- Next.js generó AGENTS.md al iniciar desarrollo; se conserva para futuras sesiones.

### Verificaciones realizadas

- pnpm typecheck: correcto.
- pnpm lint --max-warnings 0: correcto.
- pnpm format:check: correcto.
- pnpm build: correcto, con variables de prueba temporales y sin servicios externos.
- Servidor de desarrollo equivalente a pnpm dev en 127.0.0.1:3100: HTTP 200 y página provisional correcta; proceso cerrado al terminar.
- Comprobadas las cinco cabeceras HTTP de seguridad.
- Configuración completa aceptada; DEEPL_API_KEY ausente rechazada con mensaje claro y sin valores sensibles.
- Valores de credenciales de prueba ausentes del HTML.
- pnpm peers check: sin incompatibilidades.
- No se realizó inspección visual en navegador ni se probaron integraciones reales.

### Decisiones y pendientes

- TypeScript 6 y ESLint 9 mantienen compatibilidad con los plugins actuales. pnpm avisa que ESLint 9 está deprecado; ESLint 10 aún provoca incompatibilidades declaradas con tres plugins incluidos por Next.js.
- drizzle-kit incorpora dos subdependencias deprecadas (@esbuild-kit/core-utils y @esbuild-kit/esm-loader). Revisar su actualización en la fase de calidad.
- Se autorizó únicamente el script de instalación de esbuild en pnpm-workspace.yaml.
- La CSP inicial permite scripts inline para Next.js. Evaluar nonce con la interfaz final.
- No se han configurado credenciales reales ni creado .env.local. Para trabajar con credenciales reales, copiar .env.example y completar localmente.
- No hay pruebas unitarias/e2e todavía: corresponden a las fases 2 y 6.
- Falta revisar la fase 1 con el usuario antes de comenzar la fase 2.

## 2026-11-05 — Preparación inicial

- Repositorio vacío clonado desde https://github.com/Angel17jc/Lingo.git en C:\Traductor.
- Guía original guardada en docs/traductor-guia-completa.md.
- Node.js disponible: v24.13.0.
- Git disponible: 2.52.0.windows.1.
- Commit inicial: 8ebf2f3.

## Siguiente avance

Tras la revisión, comenzar la fase 2 en pasos pequeños: esquemas y errores de dominio, interfaz del proveedor, adaptador DeepL, servicio y endpoint con pruebas.

## Fases

- [ ] 0: completar cuentas y credenciales externas cuando correspondan.
- [x] 1: base técnica implementada y verificada con valores temporales; pendiente revisión del usuario.
- [ ] 2: motor de traducción.
- [ ] 3: interfaz.
- [ ] 4: caché con Neon.
- [ ] 5: protección y cuotas.
- [ ] 6: calidad y despliegue.
