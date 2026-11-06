# Cómo trabajamos en Lingo

Cada avance parte de un issue, se desarrolla en una rama y se revisa mediante un pull request (PR). Mantenemos el plan por fases y avances pequeños.

## Ramas

| Rama                        | Propósito                                   | Recibe cambios desde       |
| --------------------------- | ------------------------------------------- | -------------------------- |
| main                        | Versiones estables destinadas a producción  | PR desde develop           |
| develop                     | Integración de avances verificados          | PR desde una rama de tarea |
| feat/<issue>-<descripcion>  | Funcionalidad de un issue                   | develop                    |
| fix/<issue>-<descripcion>   | Corrección de un issue                      | develop                    |
| chore/<issue>-<descripcion> | Herramientas, mantenimiento o documentación | develop                    |

main sigue siendo la rama predeterminada de GitHub. Reservar main para producción no despliega por sí solo la aplicación: Vercel se configurará en la fase 6.

## Un avance de principio a fin

1. Crear un issue con problema, alcance y criterios de aceptación. Elegir un cambio que se pueda revisar en un solo PR.
2. Actualizar develop y crear la rama de tarea:

   ```powershell
   git switch develop
   git pull --ff-only origin develop
   git switch -c feat/3-contratos-traduccion
   ```

3. Implementar el alcance del issue en commits convencionales pequeños: feat:, fix:, chore:, docs: o test:.
4. Ejecutar las verificaciones que correspondan y actualizar docs/avance.md.
5. Publicar la rama y abrir un PR con base develop. Usar borrador mientras falte trabajo.
6. Revisar el diff, comprobar el CI y resolver las conversaciones. Si el trabajo está listo, convertir el PR en listo para revisión.
7. Fusionar con squash después de la revisión. El título del PR será el mensaje del commit integrado.
8. Cerrar explícitamente el issue cuando sus criterios estén completos y su PR esté integrado. Se puede borrar únicamente la rama de tarea; main y develop se conservan.

No hacemos commits ni pushes directos a main o develop, ni fusionamos un PR sin revisión. En las sesiones con el asistente, el usuario revisa el resultado antes de autorizar la fusión.

Las plantillas de issues se muestran desde la rama predeterminada: estarán disponibles en la interfaz de GitHub cuando se promueva este avance a main.

## Relación entre issues y PRs

Usar Refs #<numero> en la descripción de los PRs hacia develop. GitHub solo procesa las palabras de cierre automático, como Closes, cuando el PR se dirige a la rama predeterminada. Por eso cerramos los issues explícitamente al integrar el trabajo en develop.

Referencia: [vincular PRs e issues en GitHub](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue).

Si un issue necesita varios PRs, los criterios permanecen abiertos hasta que todos estén integrados. No marcar un criterio como hecho solo por crear un commit.

## Verificaciones

El check obligatorio se llama quality y ejecuta:

```powershell
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint --max-warnings 0
pnpm typecheck
pnpm test
pnpm build
```

En PowerShell se puede usar pnpm.cmd si la política local bloquea pnpm.ps1. El hook de pre-commit complementa estas verificaciones; el CI comprueba el repositorio completo en Linux.

El CI usa valores de prueba para la configuración, sin claves reales ni conexiones a DeepL, Neon o Redis. Las pruebas unitarias deben sustituir los servicios externos. Los e2e de la interfaz se adelantaron desde fase 6 para revisar la fase 3 y se ejecutan en local.

Se adelanta este CI desde la fase 6 para que el flujo de PRs tenga verificaciones desde el inicio. Las fases funcionales mantienen su orden.

## Protecciones

main y develop requieren PR, el check quality actualizado respecto a la base y conversaciones resueltas. Las reglas también se aplican a administradores y bloquean force-push y borrado.

Con un solo colaborador no se exige una aprobación de una segunda cuenta. La revisión del usuario sigue siendo parte del procedimiento. Cuando se incorpore otro mantenedor, se podrá exigir una aprobación en GitHub.

La configuración de estas protecciones reside en GitHub; crear archivos de workflow no activa las reglas por sí solo. Los resultados de su aplicación quedan en docs/avance.md.

## Entregas a producción

1. Completar y revisar los avances previstos en develop.
2. Abrir un PR develop → main con resumen de cambios y verificaciones.
3. El CI rechaza PRs hacia main cuyo origen no sea develop.
4. Revisar y autorizar la entrega; después fusionar mediante merge commit, conservando la relación entre las dos ramas.
5. Cuando exista despliegue en Vercel, main será la rama de producción y los demás entornos se configurarán como previews.

No usar squash en develop → main: conservar los commits de integración evita que la siguiente entrega vuelva a incluir commits anteriores.

## Próximo avance del plan

Las fases 1, 2 y 3 están integradas en develop. El usuario aprobó la interfaz y el PR #10 se fusionó como 32ab8aa. Para retomar, leer primero docs/continuidad.md. Se adelantaron sus comprobaciones de navegador desde la fase 6 para verificar los flujos, la accesibilidad y el diseño responsive.

Cada avance mantiene commits pequeños y un PR asociado a su issue. El siguiente trabajo funcional será la fase 4, caché con Neon, mediante PRs separados cuando el usuario pida continuar.

Cada PR incluye pruebas apropiadas para su comportamiento. Las credenciales reales se configuran únicamente en .env.local y, más adelante, en Vercel.
