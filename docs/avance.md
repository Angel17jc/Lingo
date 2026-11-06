# Registro de avances

## 2026-11-05 — Flujo de colaboración (issue #1)

- La fase 1 ya está publicada en origin/main hasta 1fc6c33.
- develop creada y publicada desde main, sin cambios de la aplicación.
- Rama de tarea: chore/1-flujo-colaborativo.
- Issue: https://github.com/Angel17jc/Lingo/issues/1.
- Procedimiento documentado en CONTRIBUTING.md y resumido en AGENTS.md y README.md.
- Plantillas de tareas, errores y PRs preparadas. Los formularios de issues aparecerán en GitHub cuando lleguen a main, la rama predeterminada.
- CI básico adelantado desde la fase 6: formato, lint, tipos, pruebas y build en Linux con Node 24 y pnpm fijado por package.json. Acciones oficiales fijadas por SHA.
- GitHub confirmó las protecciones de main y develop: PR obligatorio, quality con base actualizada, conversaciones resueltas, reglas aplicadas a administradores, sin force-push ni borrado.
- Con un solo colaborador se requieren cero aprobaciones de otra cuenta; la revisión del usuario se mantiene antes de autorizar una fusión.
- Squash disponible para ramas de tarea; merge commit para entregas develop → main. Rebase y borrado automático de ramas deshabilitados para conservar las ramas permanentes.
- Verificación local del cambio: formato, lint sin advertencias, tipos, 14 pruebas y build correctos con valores temporales.
- El resultado remoto de quality se verifica en el PR antes de su revisión.
- La fase 2 se mantiene como siguiente avance, empezando por contratos y errores de dominio. Esta configuración del flujo no implementa el motor.

## 2026-11-05 — Revisión de la fase 1

- Los commits iniciales de la fase 1 ya existían: b867b03 (base) y a7d26fc (documentación).
- Se reprodujo un fallo: una URL mal formada lanzaba TypeError dentro del refinamiento e impedía el mensaje seguro de configuración.
- Corrección: usar la validación nativa de protocolo de Zod para PostgreSQL y Redis HTTPS.
- Se añadieron 14 pruebas de regresión para configuración válida, proveedor por defecto, protocolos, URLs mal formadas y variables ausentes. Se comprueba que los errores no muestran credenciales.
- Se declaró type=module en package.json para que Vitest interprete la configuración ESM sin advertencias.
- Verificación posterior: pnpm test (14 pruebas), lint --max-warnings 0, typecheck, format:check y build correctos.
- El build usa valores temporales sin acceder a servicios externos. Credenciales reales, revisión visual y conexiones reales siguen pendientes.
- next-env.d.ts queda fuera de Git por ser generado; typecheck ejecuta next typegen antes de tsc para preparar los tipos en un checkout nuevo.
- Revisión técnica de fase 1 terminada. La fase 2 no se ha iniciado.
- Commits locales; no se realizó push a GitHub.

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
- La revisión añadió pruebas unitarias de configuración; las del motor y los e2e corresponden a las fases 2 y 6.
- Revisión técnica completada; esperar la indicación del usuario para comenzar la fase 2.

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
- [x] 1: base técnica implementada, revisada y verificada con valores temporales.
- [ ] 2: motor de traducción.
- [ ] 3: interfaz.
- [ ] 4: caché con Neon.
- [ ] 5: protección y cuotas.
- [ ] 6: calidad y despliegue.
