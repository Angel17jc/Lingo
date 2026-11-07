# Caché con Neon: preparación y migración

Base de fase 4 integrada mediante [PR #14](https://github.com/Angel17jc/Lingo/pull/14), commit 43d5e65; issue #13 cerrado. La implementación de TranslationCache, servicio y limpieza está publicada en el [PR #16](https://github.com/Angel17jc/Lingo/pull/16), todavía en borrador. En develop la API continúa respondiendo cached: false. El usuario cerró la sesión antes de configurar y verificar Neon real; retomar cuando indique continuar.

## Preparar Neon al retomar

1. Entrar en [Neon](https://console.neon.tech/) y crear un proyecto llamado lingo.
2. En Branches → New branch, crear una rama development para las pruebas. [Guía de ramas](https://neon.com/docs/manage/branches).
3. Pulsar Connect y seleccionar esa rama, la base de datos (se puede conservar neondb) y el rol ofrecido. Activar Connection pooling y copiar solo la URL PostgreSQL completa, sin el comando psql. [Guía de conexión](https://neon.com/docs/get-started/connect-neon).
4. Cambiar únicamente DATABASE_URL en C:\Traductor\.env.local, entre comillas, conservando el resto del archivo y los parámetros de la URL. La cadena contiene contraseña; no compartirla en el chat ni en GitHub.
5. Confirmar que el archivo está guardado e indicar solo proyecto, rama y base de datos para revisar el destino de desarrollo antes de migrar.

La [guía completa de la implementación pendiente](https://github.com/Angel17jc/Lingo/blob/feat/15-cache-neon/docs/cache-neon.md) incluye segunda traducción y limpieza. Esos pasos requieren la rama del PR #16 o su integración; db:cleanup aún no existe en develop. Revisar primero [continuidad.md](continuidad.md) y el estado remoto para evitar repetir trabajo.

## Esquema preparado

[schema.ts](../src/server/db/schema.ts) declara translation_cache:

- id UUID generado en PostgreSQL y clave primaria.
- hash único, con un índice B-tree que también sirve para las búsquedas.
- source_lang nullable: NULL representa el origen omitido para autodetección.
- target_lang y detected_source separados, para reconstruir el contrato de respuesta incluso con autodetección.
- source_text, translated_text y provider.
- hits con valor inicial 0.
- created_at y last_used_at con zona horaria, inicializados con now().
- Índice sobre last_used_at para la futura limpieza por antigüedad.

La [migración 0000_translation_cache.sql](../src/server/db/migrations/0000_translation_cache.sql) crea únicamente la tabla y sus dos índices. Los metadatos en migrations/meta se versionan junto al SQL. El contador de hits, el límite de 1000 caracteres y la limpieza tras 90 días sin uso están implementados en la rama de #16, pendientes de prueba real e integración.

## Clave de traducción

[createTranslationHash](../src/lib/hash.ts) calcula SHA-256 en el servidor sobre una tupla JSON versionada: versión, texto normalizado, origen solicitado o null y destino. La serialización mantiene los campos separados aunque el texto contenga delimitadores.

Según la guía, se recortan los extremos y se colapsan los espacios, tabulaciones y saltos de línea. Se preservan mayúsculas, acentos y puntuación. La autodetección y el origen explícito generan claves distintas; también las variantes regionales de destino. La función calcula la clave sin modificar el texto recibido.

## Generar y revisar SQL localmente

```powershell
pnpm.cmd db:generate
pnpm.cmd db:check
```

[drizzle.config.ts](../drizzle.config.ts) contiene solamente dialecto y rutas. Estos comandos funcionan sin DATABASE_URL ni acceso a Neon; db:check comprueba el historial de migraciones, no su ejecución en PostgreSQL. Volver a generar el esquema actual debe indicar que no hay cambios.

La separación entre generación y aplicación sigue la [documentación de Drizzle Kit](https://orm.drizzle.team/docs/drizzle-kit-generate).

## Aplicar a Neon cuando corresponda

La aplicación de SQL a una base real queda pendiente de revisar esta entrega y confirmar la conexión de destino.

1. Configurar DATABASE_URL con la conexión pooled del proyecto Neon en .env.local. Conservar el resto del archivo; no copiar .env.example encima ni publicar la URL en el chat o en Git.
2. Revisar el proyecto, rama y base de datos seleccionados en el panel de Neon y el SQL generado. Usar una base de desarrollo para la comprobación inicial.
3. Ejecutar desde la raíz del repositorio:

   ```powershell
   pnpm.cmd db:migrate
   ```

4. Comprobar en Neon la tabla translation_cache, sus índices y el registro de migraciones de Drizzle.

[drizzle.migrate.config.ts](../drizzle.migrate.config.ts) carga .env.local y luego .env con dotenv, sin sobrescribir variables ya definidas en el proceso. La migración solo requiere DATABASE_URL; valida el protocolo PostgreSQL y presenta un mensaje fijo si la URL es inválida. Las credenciales se consumen dentro del proceso, sin pasarlas como argumento. La generación usa una configuración independiente que no carga archivos de entorno.

## Siguiente avance

Retomar el cliente Neon HTTP, el adaptador y el servicio ya implementados en feat/15-cache-neon (#16). Completar la configuración y verificación con Neon real: tabla y segunda traducción idéntica con cached: true sin llamar de nuevo a DeepL. Registrar el resultado y revisar el PR antes de autorizar su fusión. El cierre de sesión no inicia esa comprobación.
