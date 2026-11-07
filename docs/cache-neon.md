# Caché con Neon: configuración, uso y mantenimiento

El esquema y la migración se integraron mediante [PR #14](https://github.com/Angel17jc/Lingo/pull/14), commit 43d5e65. El [issue #15](https://github.com/Angel17jc/Lingo/issues/15) implementa cliente Neon HTTP, adaptador, servicio y limpieza. Su revisión e integración, así como la comprobación con credenciales reales, deben confirmarse en GitHub y en [avance.md](avance.md).

## Configurar Neon paso a paso

1. Entrar en [la consola de Neon](https://console.neon.tech/) y crear un proyecto llamado lingo. Elegir una región próxima al futuro servidor de la aplicación; conservar la versión de PostgreSQL ofrecida por defecto.
2. En Branches → New branch, crear una rama development para las pruebas. Seleccionar como padre la rama inicial del proyecto. La rama de Neon es independiente de las ramas de Git. [Documentación de ramas](https://neon.com/docs/manage/branches).
3. Pulsar Connect en la navegación de la consola. Seleccionar development, su compute, la base de datos y el rol. Se puede conservar la base neondb y el rol ofrecidos por Neon.
4. Activar Connection pooling y copiar la cadena PostgreSQL completa. El hostname de la conexión pooled incluye -pooler. Conservar los parámetros de seguridad de la URL generada. [Conexión](https://neon.com/docs/get-started/connect-neon) y [pooling](https://neon.com/docs/connect/connection-pooling).
5. Editar únicamente DATABASE_URL en C:\Traductor\.env.local:

   ```dotenv
   DATABASE_URL="pega_aqui_la_url_completa_de_Neon"
   ```

   El ejemplo es un marcador, no una URL funcional. Conservar DEEPL_API_KEY y el resto de variables del archivo. La URL real incluye contraseña: no pegarla en el chat, en GitHub ni en argumentos de comandos. No copiar .env.example encima de .env.local.

6. Guardar el archivo. Si la migración la realizará el asistente, confirmar que la conexión está lista e indicar solo proyecto, rama y nombre de base de datos. Eso permite confirmar el destino de desarrollo sin exponer la URL.

## Comportamiento de la caché

Para entradas de hasta 1000 unidades UTF-16, POST /api/translate calcula la clave y consulta Neon. Un acierto devuelve cached: true sin llamar al proveedor. Un miss traduce y guarda el resultado con cached: false. Entradas de 1001–3000 unidades se traducen directamente y no se guardan.

La lectura usa un único UPDATE ... RETURNING para incrementar hits y actualizar last_used_at atómicamente. La escritura usa ON CONFLICT (hash) DO NOTHING para tolerar peticiones simultáneas. Se conserva el idioma detectado incluso cuando source se omite. El adaptador valida las filas leídas antes de devolverlas.

Cada consulta HTTP de caché tiene un timeout de 3 segundos, con una señal nueva por petición, cache: no-store y redirecciones desactivadas. Un error de inicialización o lectura registra cache.unavailable y permite llamar al proveedor; esa petición omite también la escritura para evitar otra espera sobre una base caída. Un error al guardar conserva el resultado traducido. Los warnings solo contienen el evento técnico, sin textos, URL ni objetos de error.

La base almacena el texto de entrada y la traducción de las entradas cacheables, idiomas, proveedor, hash y métricas de uso de esa entrada. No se añaden IPs ni identificadores del usuario. El hash sirve como clave de búsqueda y no anonimiza los textos almacenados. La limpieza se ejecuta manualmente, como se indica abajo.

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

La [migración 0000_translation_cache.sql](../src/server/db/migrations/0000_translation_cache.sql) crea únicamente la tabla y sus dos índices. Los metadatos en migrations/meta se versionan junto al SQL. El adaptador aplica el límite de entrada y el script de limpieza usa last_used_at para borrar entradas sin uso durante más de 90 días.

## Clave de traducción

[createTranslationHash](../src/lib/hash.ts) conserva la clave v1 del primer avance si no se proporciona proveedor. El servicio usa v2: versión, proveedor, texto normalizado, origen solicitado o null y destino. Así, cambiar de motor genera claves independientes. La serialización JSON mantiene los campos separados aunque el texto contenga delimitadores.

Según la guía, se recortan los extremos y se colapsan los espacios, tabulaciones y saltos de línea. Se preservan mayúsculas, acentos y puntuación. La autodetección y el origen explícito generan claves distintas; también las variantes regionales de destino. La función calcula la clave sin modificar el texto recibido.

## Generar y revisar SQL localmente

```powershell
pnpm.cmd db:generate
pnpm.cmd db:check
```

[drizzle.config.ts](../drizzle.config.ts) contiene solamente dialecto y rutas. Estos comandos funcionan sin DATABASE_URL ni acceso a Neon; db:check comprueba el historial de migraciones, no su ejecución en PostgreSQL. Volver a generar el esquema actual debe indicar que no hay cambios.

La separación entre generación y aplicación sigue la [documentación de Drizzle Kit](https://orm.drizzle.team/docs/drizzle-kit-generate).

## Aplicar a Neon cuando corresponda

Revisar el SQL y confirmar que DATABASE_URL apunta a la rama de desarrollo antes de ejecutar:

1. Configurar DATABASE_URL con la conexión pooled del proyecto Neon en .env.local. Conservar el resto del archivo; no copiar .env.example encima ni publicar la URL en el chat o en Git.
2. Revisar el proyecto, rama y base de datos seleccionados en el panel de Neon y el SQL generado. Usar una base de desarrollo para la comprobación inicial.
3. Ejecutar desde la raíz del repositorio:

   ```powershell
   pnpm.cmd db:migrate
   ```

4. Comprobar en Neon la tabla translation_cache, sus índices y el registro de migraciones de Drizzle.

[drizzle.migrate.config.ts](../drizzle.migrate.config.ts) carga .env.local y luego .env con dotenv, sin sobrescribir variables ya definidas en el proceso. La migración solo requiere DATABASE_URL; valida el protocolo PostgreSQL y presenta un mensaje fijo si la URL es inválida. Las credenciales se consumen dentro del proceso, sin pasarlas como argumento. La generación usa una configuración independiente que no carga archivos de entorno.

## Verificar una traducción real

Arrancar o reiniciar la aplicación después de guardar .env.local:

```powershell
pnpm.cmd dev --hostname 127.0.0.1
```

Desde otra terminal en C:\Traductor, enviar dos veces una frase breve y no sensible:

```powershell
$body = @{ text = "La biblioteca abre a las nueve."; source = "ES"; target = "EN-US" } | ConvertTo-Json
$first = Invoke-RestMethod -Uri http://127.0.0.1:3000/api/translate -Method Post -ContentType 'application/json; charset=utf-8' -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
$second = Invoke-RestMethod -Uri http://127.0.0.1:3000/api/translate -Method Post -ContentType 'application/json; charset=utf-8' -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
$first
$second
```

Si la frase todavía no estaba guardada, la primera respuesta indica cached: false y la segunda cached: true. Si ambas son true, ya existía una entrada. En Neon, comprobar hits y last_used_at de la fila sin copiar sus textos al chat. Los parámetros, idioma detectado y traducción deben coincidir entre ambas respuestas.

La segunda petición con cached: true evita la llamada al proveedor. Una base no disponible permite seguir traduciendo y produce un warning seguro, pero no debe confundirse ese resultado con una comprobación correcta de la caché.

## Limpieza manual

Ver cuántas filas llevan más de 90 días sin uso, sin borrarlas:

```powershell
pnpm.cmd db:cleanup
```

Tras revisar el destino y el recuento, aplicar el borrado:

```powershell
pnpm.cmd db:cleanup --apply
```

El script usa el reloj de PostgreSQL y la condición last_used_at < now() - 90 días. Las filas usadas exactamente en el límite o más recientemente se conservan. La salida contiene solo modo, recuento y retención. Las credenciales se cargan como en la migración. El comando usa tsx y la condición react-server de Node para los módulos protegidos con server-only. No hay cron ni limpieza automática configurados.

## Verificaciones y estado

Las pruebas usan el driver y Drizzle reales con fetch simulado para inspeccionar SQL y parámetros; el servicio y la API prueban aciertos, misses, caída de lectura/escritura y propagación de errores del proveedor. Cubren el límite UTF-16, autodetección, separación por motor, señales de timeout y limpieza en modo consulta/aplicación. No equivalen a ejecutar SQL contra PostgreSQL real. El estado de la migración y del hit real se registra explícitamente en [avance.md](avance.md).
