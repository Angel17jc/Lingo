<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Flujo del repositorio

Lee CONTRIBUTING.md antes de implementar cambios. Cada avance parte de un issue y una rama de tarea creada desde develop. Abre PRs hacia develop; las entregas a main proceden de develop. No hagas commits ni pushes directos a main o develop. Conserva main como rama de producción y develop como integración. El usuario revisa el resultado antes de autorizar una fusión. Actualiza docs/avance.md y ejecuta las verificaciones correspondientes a cada cambio.

## Continuidad entre sesiones

Antes de retomar trabajo, lee docs/continuidad.md y docs/avance.md. Las fases 1–3 y el cierre documental (PR #12) están integrados. La fase 4 comenzó con el issue #13: esquema, migración y hash; su integración y la caché funcional deben confirmarse en GitHub. Verifica los PRs y las ramas antes de repetir acciones. No sobrescribas .env.local ni muestres sus valores. Mantén la revisión del usuario antes de cada fusión.
