# Registro de avances

## 2026-11-05 — Fase 3: interfaz y experiencia (issue #9)

- Fase 2 integrada mediante PR #8 en develop: 2cd0fe0. Issue #7 cerrado y traducción real verificada antes de comenzar esta fase.
- Rama de trabajo: feat/9-interfaz-traductor.
- Interfaz editorial en marfil y verde, con dos paneles en escritorio y disposición vertical en móvil. Tipografías del sistema, sin descargas externas ni librerías de componentes.
- TranslatorForm, LanguageSelect y OutputBox conectados a la API. Textos centralizados en lib/messages.ts y límite compartido con el esquema Zod.
- Autodetección, intercambio de variantes regionales, copia con alternativa manual, borrado, ejemplos que no envían peticiones y contador de 3000 caracteres.
- useTranslate valida, cancela solicitudes anteriores y descarta respuestas desactualizadas. Editar texto o idiomas limpia el resultado anterior.
- Mensajes específicos para cuota, red y errores del proveedor; 429 con cuenta atrás que no se reinicia al editar.
- Tema inicial según el sistema, control manual persistido y respeto a prefers-reduced-motion. No se guarda texto del usuario en almacenamiento local.
- Etiquetas, salto al formulario con foco, Ctrl/Cmd+Enter, salida de solo lectura, aria-live, idioma de lectura del resultado y texto plano sin HTML inyectado.
- 160 pruebas unitarias y 9 escenarios de Chromium correctos. Verificados teclado, portapapeles, errores, cancelación, variantes y límite de salida.
- Capturas revisadas en escritorio, móvil y oscuro. Sin desborde tras recalcular el layout en 320/390/768 px; contraste de colores de texto >= 4.5:1 en ambos temas. No sustituye una auditoría completa con lectores de pantalla o dispositivos físicos.
- Tipos, lint sin advertencias, formato y build correctos. Sin dependencias nuevas.
- Playwright se adelanta desde fase 6 para revisar esta UI. Sus pruebas usan respuestas simuladas y servidor Azure stub; no consumen cuota real. Los e2e se ejecutan en local, no en CI.
- Capturas de revisión en docs/images. Pendiente revisar el PR e integrar a develop.

## 2026-11-05 — Prueba real de DeepL (issue #7)

- Clave local aceptada por DeepL, sin mostrarla ni incluirla en Git.
- POST /api/translate probado contra el servidor local de producción y el proveedor real.
- Origen explícito ES: "Hola mundo" → "Hello, world", HTTP 200, detectedSource ES y cached false.
- Autodetección verificada con una frase española más larga: HTTP 200, traducción correcta y detectedSource ES.
- Respuestas correctas con Cache-Control: no-store. Texto vacío rechazado con HTTP 400.
- Servidor local cerrado tras las comprobaciones. Neon y Redis no se utilizaron.
- El checklist técnico de fase 2 está verificado; queda revisar e integrar el PR #8 antes de cerrar la fase.
- Sin cambios de código: este avance solo registra la comprobación real.

## 2026-11-05 — Fase 2, avance 3: servicio y API (issue #7)

- PR #6 autorizado y fusionado con squash a develop: 52e6abc. Issue #5 cerrado.
- Rama creada desde develop: feat/7-servicio-api-traduccion.
- createTranslationService recibe TranslationProvider por interfaz y devuelve translation, detectedSource y cached: false.
- Contrato TranslationCache definido con get/set y entrada tipada. Se acepta como dependencia opcional, sin consultar ni escribir caché hasta la fase 4.
- Composición del proveedor en services/index.ts, separada de la lógica del servicio y del controlador.
- POST /api/translate en runtime Node.js: JSON → validación Zod → servicio → respuesta JSON.
- JSON mal formado o entrada inválida devuelve 400 antes de crear el servicio. No hay acceso directo a proveedores ni base de datos desde la ruta.
- Errores con forma { error: { code, message, retryAfterSeconds? } }; 400/429/502/503 para errores de dominio y 500 genérico para inesperados.
- RateLimitError añade Retry-After; solo se registra un evento técnico con el status en errores 5xx. Todas las respuestas POST llevan Cache-Control: no-store.
- Verificación local: 141 pruebas en 9 archivos, tipos, formato, lint sin advertencias y build correctos. Incluye integración de todas las capas con DeepL simulado.
- Prueba HTTP del build de producción con Azure como stub: GET 405, JSON inválido 400, texto vacío 400 y solicitud válida 502 segura. Servidor de prueba cerrado al terminar; no se consumió cuota real.
- Sin dependencias nuevas. La página permanece provisional y la API todavía no tiene caché ni limitación de peticiones, previstas en las fases 4 y 5.
- El CI remoto se comprueba en el PR hacia develop. El avance queda pendiente de revisión e integración.

### Checklist de fase 2

- [x] Texto vacío devuelve 400 (prueba unitaria y HTTP local).
- [x] Clave rechazada devuelve 502 sin detalles internos (DeepL 403 simulado).
- [x] pnpm test pasa: 141 pruebas.
- [x] Traducción real verificada con DeepL y credenciales locales, con origen explícito y autodetección.
- [x] PR #8 revisado e integrado a develop con autorización del usuario.

## 2026-11-05 — Fase 2, avance 2: proveedores (issue #5)

- PR #4 autorizado por el usuario y fusionado con squash a develop: c79e9af. Issue #3 cerrado.
- Rama creada desde develop: feat/5-proveedor-deepl.
- Interfaz TranslationProvider con TranslationInput y TranslationResult tipados a partir del catálogo de idiomas.
- Adaptador DeepL API Free con fetch inyectable para pruebas. La clave se envía solo en Authorization, sin caché de Next.js ni redirecciones.
- Timeout de 8 segundos con AbortController por intento, cubriendo cabeceras y lectura del cuerpo. Máximo dos intentos, con espera de 300 ms ante errores de red o HTTP 5xx.
- Respuesta externa validada con Zod: exactamente una traducción con texto e idioma detectado. Se toleran campos adicionales del proveedor.
- Errores seguros: 429/456 → QuotaExceededError según la guía; otros errores definitivos o intentos agotados → ProviderError. No se incluyen cuerpos de error, claves ni texto del usuario.
- getProvider selecciona por TRANSLATION_PROVIDER; AzureProvider es un stub que falla de forma controlada sin acceder a la red.
- Verificación local: 111 pruebas en 5 archivos, tipos, formato, lint sin advertencias y build correctos. Pruebas con fetch y tiempo simulados; no se añadieron dependencias ni consumió cuota real.
- El CI remoto se comprobará en el PR hacia develop. Pendiente revisión e integración del avance.
- Próximo paso: servicio con inyección de dependencias y endpoint POST /api/translate. La página provisional aún no envía traducciones.

### Referencias y decisión de compatibilidad

- [Contrato de traducción de DeepL](https://developers.deepl.com/api-reference/translate/request-translation).
- [Manejo de errores de DeepL](https://developers.deepl.com/docs/best-practices/error-handling).
- La documentación actual recomienda reintentar HTTP 429. La guía de Lingo pide agrupar 429 y 456 como cuota agotada; se conserva ese contrato explícito en este avance. Se podrá revisar esta decisión en un issue posterior.

## 2026-11-05 — Fase 2, avance 1: contratos (issue #3)

- PR #2 autorizado por el usuario y fusionado con squash a develop: 28d9f70.
- Issue #1 cerrado después de verificar su integración. main conserva la fase 1.
- Rama de trabajo creada desde develop: feat/3-contratos-traduccion.
- Esquemas Zod compartidos para solicitud/respuesta y tipos inferidos TranslateRequest y TranslateResponse.
- Entrada: trim en los extremos, 1–3000 unidades UTF-16 (la longitud estándar de JavaScript), origen opcional y destino obligatorio, códigos derivados del catálogo y rechazo de campos inesperados.
- El origen acepta EN/PT y el destino sus variantes regionales. La autodetección se solicita omitiendo source.
- La respuesta conserva el texto traducido, permite que supere la longitud de entrada y admite idiomas detectados fuera de los selectores.
- Errores con mensajes públicos fijos: ValidationError (400), RateLimitError (429), ProviderError (502) y QuotaExceededError (503), sobre DomainError.
- RateLimitError exige retryAfterSeconds entero positivo seguro para la futura cabecera Retry-After.
- Ajuste de .gitattributes a LF en archivos de texto: evita fallos locales de Prettier tras cambiar de rama en Windows.
- Verificación local: 78 pruebas en 3 archivos, tipos, formato, lint sin advertencias y build correctos. No se añadieron dependencias.
- El CI remoto se comprueba en el PR hacia develop antes de solicitar revisión.
- Pendiente integrar este PR; el issue #3 permanece abierto hasta entonces. El adaptador DeepL, el servicio y la API son los siguientes avances.

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

Revisar la interfaz de la fase 3 e integrar su PR a develop. Después, comenzar fase 4: esquema Drizzle y caché con Neon, en issues y PRs pequeños.

## Fases

- [ ] 0: completar cuentas y credenciales externas cuando correspondan.
- [x] 1: base técnica implementada, revisada y verificada con valores temporales.
- [x] 2: motor de traducción integrado y prueba real aprobada.
- [ ] 3: interfaz.
- [ ] 4: caché con Neon.
- [ ] 5: protección y cuotas.
- [ ] 6: calidad y despliegue.
