# Continuidad de Lingo

Corte de sesión: **2026-11-05**, zona America/Guayaquil. El usuario pidió detener el trabajo después de completar y aprobar la fase 3.

## Leer primero

1. [AGENTS.md](../AGENTS.md): instrucciones del repositorio y documentación local de Next.js.
2. Este documento: estado actual y cómo retomar.
3. [CONTRIBUTING.md](../CONTRIBUTING.md): flujo de issues, ramas, PRs y revisiones.
4. [Registro de avances](avance.md): historial de implementación y verificaciones.
5. [Guía original](traductor-guia-completa.md): alcance de cada fase. Se conserva como referencia, no como prueba de qué ya existe.

El estado resumido aquí prevalece sobre anotaciones históricas del registro que digan “pendiente” antes de una fusión posterior. Confirmar siempre Git y GitHub antes de repetir acciones.

## Punto de corte

- Repositorio: https://github.com/Angel17jc/Lingo
- Workspace compartido: C:\Traductor, Windows/PowerShell.
- Último commit funcional integrado: **32ab8aa**, PR [#10](https://github.com/Angel17jc/Lingo/pull/10).
- **Fases 1, 2 y 3 completadas, revisadas por el usuario e integradas en develop.**
- El usuario revisó la UI y la aprobó expresamente. Conservar su diseño al trabajar en las fases siguientes.
- **La fase 4 (caché con Neon) no ha comenzado.**
- main sigue en **1fc6c33**, la base inicial. No contiene todavía el motor ni la UI integrada en develop.
- No hay despliegue en Vercel ni una URL pública de producción. main está reservada para producción, pero no se ha hecho la entrega develop → main.
- Antes de este cierre no había issues ni PRs funcionales abiertos.
- Este cierre se documenta en el [issue #11](https://github.com/Angel17jc/Lingo/issues/11), rama **chore/11-cierre-sesion**, mediante un PR hacia develop. Si ese PR sigue abierto al retomar, revisar su estado primero; no darlo por fusionado.

## Estado por fases

| Fase                   | Estado real                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------- |
| 0 — Preparación        | Herramientas disponibles; servicios externos se configuran cuando correspondan.     |
| 1 — Base               | Completa: Next.js, TypeScript, Tailwind, Zod, estructura, herramientas y cabeceras. |
| 2 — Motor              | Completa: contratos, DeepL, selector, servicio y API; traducción real aprobada.     |
| 3 — UI/UX              | Completa: formulario responsive y accesible, aprobado por el usuario y fusionado.   |
| 4 — Caché              | Pendiente: hash, Drizzle/Neon, migración, implementación de caché y limpieza.       |
| 5 — Protección         | Pendiente: rate limiting real, contador/cuota y límite de bytes del body.           |
| 6 — Calidad/despliegue | Parcialmente adelantada: CI y e2e ya existen; faltan cierre de calidad y Vercel.    |

## Historial integrado importante

| PR                                                | Cambio                         | Commit squash en develop |
| ------------------------------------------------- | ------------------------------ | ------------------------ |
| [#2](https://github.com/Angel17jc/Lingo/pull/2)   | Flujo de colaboración y CI     | 28d9f70                  |
| [#4](https://github.com/Angel17jc/Lingo/pull/4)   | Contratos y errores de dominio | c79e9af                  |
| [#6](https://github.com/Angel17jc/Lingo/pull/6)   | Proveedor DeepL y selector     | 52e6abc                  |
| [#8](https://github.com/Angel17jc/Lingo/pull/8)   | Servicio, API y prueba real    | 2cd0fe0                  |
| [#10](https://github.com/Angel17jc/Lingo/pull/10) | Interfaz y experiencia         | 32ab8aa                  |

Issues #1, #3, #5, #7 y #9 cerrados tras verificar sus fusiones. Las ramas antiguas siguen existiendo; son historial, no el punto de partida de nuevas tareas.

## Flujo acordado con el usuario

- Trabajar en avances pequeños y commits convencionales, conservando el progreso en docs/avance.md.
- Cada tarea parte de un issue y una rama creada desde develop.
- Abrir PRs hacia develop; no hacer commits ni pushes directos a develop o main.
- El usuario revisa el resultado y autoriza cada fusión. No interpretar la aprobación de un PR como aprobación de los siguientes.
- Integrar ramas de tarea con squash. Las entregas develop → main usan merge commit para preservar su relación.
- Cerrar explícitamente el issue al integrar su trabajo: main sigue como rama predeterminada y los PRs hacia develop no cierran issues automáticamente.
- main y develop están protegidas: PR obligatorio, quality en verde y actualizado con la base, conversaciones resueltas, reglas para administradores, sin force-push ni borrado.
- Solo hay un colaborador. No se exige una aprobación de otra cuenta; se mantiene la revisión del usuario.
- Rebase de PRs y borrado automático de ramas deshabilitados.
- Las plantillas de issues están en develop; aparecerán en la interfaz de GitHub al llegar a main.

## Qué funciona

### Traducción y API

- POST /api/translate, runtime Node.js.
- Entrada: { text, source?, target }. Origen omitido = autodetección.
- Texto con trim en extremos y límite de 1–3000 unidades UTF-16; idiomas desde el catálogo y rechazo de campos inesperados.
- Respuesta: { translation, detectedSource, cached }. **cached siempre es false por ahora.**
- Errores: { error: { code, message, retryAfterSeconds? } }.
- Estados de dominio: validación 400, límite por usuario 429, proveedor 502 y cuota 503; inesperados 500 con mensaje genérico.
- Retry-After está preparado para RateLimitError. **No hay limitador real todavía.**
- Todas las respuestas POST llevan Cache-Control: no-store.
- Azure es un stub que falla con ProviderError. Solo DeepL es funcional.
- DeepL Free: endpoint fijo, clave solo en Authorization, sin redirecciones ni caché de fetch, timeout de 8 s por intento y un reintento tras 300 ms ante red/5xx.
- Decisión de la guía conservada: DeepL 429 y 456 se tratan como cuota agotada. La documentación actual de DeepL recomienda reintentar 429; la diferencia está registrada y no se cambió silenciosamente.

### Interfaz aprobada

- Marfil y verde profundo, tipografía editorial y fuentes del sistema.
- Dos paneles en escritorio y disposición vertical en móvil.
- Autodetección, selectores, intercambio, copiar, borrar, ejemplos y contador.
- Los ejemplos no envían peticiones; traducir requiere botón o Ctrl/Cmd+Enter.
- Editar texto o idiomas cancela la espera del cliente y descarta resultados antiguos.
- Mensajes de red/proveedor/cuota y cuenta atrás para 429, preservada al editar.
- Tema por sistema con control manual persistido; solo se guarda el tema, no textos.
- Etiquetas, foco visible, enlace de salto, salida de solo lectura y aria-live con idioma de lectura del resultado.
- Destinos regionales: EN-US/EN-GB → origen EN; PT-BR/PT-PT → origen PT. Al convertir origen a destino se usan EN-US y PT-BR como variantes predeterminadas.
- Capturas aprobadas: [escritorio](images/lingo-desktop.png), [móvil](images/lingo-mobile.png), [oscuro](images/lingo-dark.png).

## Mapa de código

| Ubicación                                                   | Responsabilidad                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------------- |
| src/app/page.tsx, globals.css, layout.tsx                   | Página, diseño y metadatos.                                         |
| src/features/translator/components                          | Formulario, selectores, resultado, tema e iconos.                   |
| src/features/translator/hooks/useTranslate.ts               | Peticiones, cancelación, estados y cuenta atrás.                    |
| src/features/translator/schemas.ts                          | Contratos Zod y MAX_TRANSLATION_CHARACTERS.                         |
| src/features/translator/client-errors.ts, language-utils.ts | Mensajes seguros y conversiones de idioma.                          |
| src/lib/messages.ts, languages.ts                           | Textos de UI y catálogo único.                                      |
| src/lib/env.ts, logger.ts                                   | Configuración solo de servidor y logs técnicos limitados.           |
| src/server/providers                                        | Interfaz, DeepL, Azure stub y selector por entorno.                 |
| src/server/services/translation.service.ts                  | Lógica con proveedor inyectado.                                     |
| src/server/services/index.ts                                | Composición de la implementación, fuera del controlador.            |
| src/server/services/translation-cache.ts                    | **Puerto tipado get/set reservado**, sin implementación ni uso aún. |
| src/server/http/translation-error-response.ts               | Respuestas HTTP de error seguras.                                   |
| src/app/api/translate/route.ts                              | Controlador delgado; no importa proveedores ni DB directamente.     |
| src/tests                                                   | 160 pruebas unitarias/de integración simulada en 10 archivos.       |
| e2e/translator.spec.ts, playwright.config.ts                | 9 escenarios de Chromium.                                           |
| .github/workflows/ci.yml                                    | Check quality en PRs y pushes a develop/main.                       |

Drizzle, Neon y Upstash ya están instalados. Aún no existen esquema real de DB, cliente Neon, migración generada, hash ni implementación de caché. Los scripts db:generate y db:migrate de la guía **no se han añadido** a package.json.

## Configuración local y secretos

- Existe .env.local y Git lo ignora. No leer ni imprimir sus valores en respuestas, logs, commits o argumentos de comandos.
- TRANSLATION_PROVIDER está en deepl y la clave real está configurada.
- La clave se verificó con una traducción real por nuestra API: Hola mundo → Hello, world, HTTP 200, detectedSource ES, cached false.
- También pasó la autodetección con una frase española más larga y el rechazo de texto vacío con HTTP 400.
- DATABASE_URL sigue siendo un valor local de prueba. **No es una conexión a Neon.**
- URL/token de Upstash siguen siendo valores de prueba. **No existe integración Redis activa.**
- No sobrescribir .env.local con .env.example: se perdería la configuración del usuario.
- Para Neon y Upstash, pedir al usuario que configure los valores en su archivo local cuando llegue la fase correspondiente; nunca pedir que los pegue en el chat.
- Los campos se validan todos al cargar el servidor, aunque los servicios aún no se utilicen. No eliminar la validación para ocultar errores de configuración.

## Herramientas y verificaciones

- Node 24 verificado; pnpm **12.16.1** fijado en package.json.
- Next.js **16.4.5**, React 19, TypeScript 6, Tailwind 4 y Zod 4.
- TypeScript estricto con noUncheckedIndexedAccess. Alias @ → src.
- Windows/PowerShell puede bloquear pnpm.ps1. Usar **pnpm.cmd**, sin cambiar la política del sistema.
- .gitattributes fija LF; next-env.d.ts y .next se generan y no se versionan.
- pnpm typecheck ejecuta next typegen antes de tsc.
- Husky/lint-staged verifican los archivos preparados; no sustituyen al CI.
- Para APIs/convenios de esta versión de Next.js, consultar node_modules/next/dist/docs antes de escribir código.

Últimos resultados funcionales verificados:

- **160 pruebas unitarias, 9 escenarios de Chromium, tipos, lint, formato y build correctos.**
- CI del commit integrado 32ab8aa: https://github.com/Angel17jc/Lingo/actions/runs/42153255959, aprobado.
- E2e: teclado, copia/fallback, intercambio, límites, cancelación, respuestas antiguas, errores, cuenta atrás, tema y layout.
- Layout comprobado en 320/390/768 px y escritorio; contraste de combinaciones principales >= 4.5:1 en ambos temas.
- El test de resize espera el recálculo de layout; no volver a introducir una lectura inmediata que produzca falsos desbordes transitorios.
- Esto no equivale a una auditoría completa con lector de pantalla o dispositivos físicos.
- Se comprobó que la clave local no estaba en los 11 archivos JS del cliente del build inspeccionado.
- El CI ejecuta formato, lint, tipos, unitarios y build. **Los e2e se ejecutan en local.**
- Playwright usa el build de producción en **127.0.0.1:3100**, API interceptada y Azure como stub de respaldo con valores de prueba, sin gastar cuota.
- La vista manual usa normalmente **127.0.0.1:3000**. Un servidor temporal no es un despliegue persistente; comprobar si sigue activo o arrancarlo de nuevo.

Comandos útiles:

```powershell
Set-Location C:\Traductor
git status --short
git fetch origin
gh pr list --repo Angel17jc/Lingo
gh issue list --repo Angel17jc/Lingo

# Solo si el trabajo actual está limpio y se conoce el estado del PR de cierre:
git switch develop
git pull --ff-only origin develop

pnpm.cmd dev --hostname 127.0.0.1
pnpm.cmd typecheck
pnpm.cmd lint --max-warnings 0
pnpm.cmd format:check
pnpm.cmd test

# Para e2e, detener primero el servidor dev propio: comparte .next con el build.
pnpm.cmd build
pnpm.cmd e2e
```

En un equipo sin Chromium instalado: pnpm.cmd exec playwright install chromium.

## Siguiente fase, cuando el usuario pida continuar

**Fase 4: caché con Neon**, siguiendo la guía y usando nuevos issues/ramas/PRs pequeños.

Orden sugerido:

1. Comprobar primero el PR de documentación de este cierre y el estado remoto. Si sigue pendiente, conservarlo y solicitar revisión antes de fusionar.
2. Crear el primer issue acotado de fase 4 y una rama desde develop actualizado. No rehacer la base, el motor ni la UI.
3. Preparar esquema Drizzle, configuración y SQL de migración; implementar hash con pruebas. Usar el puerto TranslationCache que ya existe, en vez de inventar otro incompatible.
4. Implementar caché e integración del servicio con pruebas de hit, miss y caída. Límite de texto cacheado y limpieza según la guía; si Neon falla, la traducción debe continuar con un warning seguro.
5. Configurar la conexión pooled real de Neon localmente y aplicar la migración solo después de revisar el SQL y el destino. Verificar tabla y segunda traducción con cached true.
6. No iniciar fase 5 ni alterar la UI aprobada como parte de la caché.

No se ha creado todavía un issue funcional de fase 4 ni hay una conexión real de Neon configurada para esta aplicación.

## Pendientes y decisiones que no hay que perder

- Protección real de cuotas/IP, contador mensual y límite de bytes del body: fase 5. La cuenta atrás del cliente no sustituye estas protecciones.
- Cierre de calidad, auditoría de dependencias, endpoint health y Vercel: fase 6.
- CSP inicial permite scripts inline para Next.js; nonce pendiente de evaluar en la fase de calidad.
- ESLint 9 conserva compatibilidad con los plugins actuales, aunque genera aviso de deprecación al instalar. ESLint 10 presentó incompatibilidades declaradas.
- drizzle-kit incorpora subdependencias deprecadas de esbuild-kit; revisar al cerrar calidad.
- Verificar los límites/planes vigentes de servicios antes del despliegue, sin asumir que los valores de la guía siguen actuales.
- No fusionar develop a main ni publicar automáticamente: es una entrega distinta, todavía no autorizada.

## Texto para abrir la siguiente sesión

```text
Retomemos Lingo en C:\Traductor. Lee AGENTS.md, docs/continuidad.md,
CONTRIBUTING.md y docs/avance.md antes de actuar. Las fases 1–3 están
integradas en develop y la UI ya fue aprobada. Comprueba el PR de
documentación de cierre; después continuaremos con la fase 4, caché
con Neon, mediante issues, ramas y PRs pequeños. No muestres secretos,
no rehagas lo completado y no fusiones PRs sin mi autorización.
```
