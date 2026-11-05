# Lingo

Aplicación web de traducción en construcción por fases y commits pequeños.

Repositorio: https://github.com/Angel17jc/Lingo

## Estado

Fase 1: base técnica. La página es provisional; el motor, el formulario, la caché y la protección se incorporarán en las siguientes fases. Consulta el [registro de avances](docs/avance.md) y la [guía original](docs/traductor-guia-completa.md).

## Instalación local

Requisitos: Node.js 22.13 o superior (se verificó con Node 24) y pnpm. La versión de pnpm está fijada en package.json.

```powershell
npm install --global pnpm
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
```

Completa .env.local con tus credenciales antes de arrancar. No las pegues en el chat ni las subas al repositorio.

| Variable                 | Uso                                                             |
| ------------------------ | --------------------------------------------------------------- |
| TRANSLATION_PROVIDER     | deepl por defecto; azure está reservado para una fase posterior |
| DEEPL_API_KEY            | Clave del proveedor DeepL                                       |
| DATABASE_URL             | URL PostgreSQL pooled de Neon                                   |
| UPSTASH_REDIS_REST_URL   | URL HTTPS de Redis REST                                         |
| UPSTASH_REDIS_REST_TOKEN | Token de Redis REST                                             |

Las variables se validan con Zod en el servidor al cargar la aplicación. Incluso en esta fase se requieren todas las credenciales para respetar el contrato de configuración; todavía no se contactan servicios externos. Los errores solo enumeran los nombres de las variables incorrectas.

## Comandos

```powershell
pnpm dev
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm start
```

Si PowerShell bloquea pnpm.ps1, usa pnpm.cmd en los comandos (por ejemplo, pnpm.cmd dev), sin cambiar la política de ejecución. La aplicación se abre en http://localhost:3000. El hook de pre-commit aplica ESLint y Prettier sobre los archivos preparados.

Vitest está configurado con entorno Node y alias @. Ejecuta pnpm test para las 14 pruebas de configuración del servidor. Las pruebas del motor llegarán en la fase 2; e2e y la configuración de Playwright corresponden a la fase 6.

## Arquitectura

- src/app: presentación y rutas de Next.js.
- src/features/translator: componentes, hooks y esquemas compartidos.
- src/server: servicios, proveedores, caché y base de datos.
- src/lib: configuración de servidor, catálogo de idiomas y logger.
- src/tests: pruebas unitarias de las siguientes fases.

La presentación dependerá de los servicios; los servicios dependerán de interfaces para permitir cambiar de proveedor. No se han implementado traducciones ni conexiones a Neon o Redis.

El logger solo admite eventos conocidos y campos técnicos explícitos. No recibe texto de traducciones, claves ni objetos de error.

Las cabeceras de seguridad están en next.config.ts. La CSP inicial permite scripts inline para el arranque de Next.js; en desarrollo permite además eval y WebSockets. Se evaluará una política con nonce al completar la interfaz.

Despliegue previsto en Vercel en la fase 6.
