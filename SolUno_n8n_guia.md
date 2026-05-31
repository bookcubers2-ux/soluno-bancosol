# 🔧 SolUno — Guía del Workflow n8n (v1, reglas)

Archivo a importar: `SolUno_n8n_workflow.json`

## Cómo levantar n8n (local, sin Docker)
```
npx n8n start
```
Abrir: http://localhost:5678 (la primera vez se crea el usuario owner).

## Cómo importar el workflow
1. En n8n: menú **⋯ (arriba derecha) → Import from File**.
2. Elegí `SolUno_n8n_workflow.json`.
3. Guardá (Save) y activá (Active) o usá "Test workflow".

## Los nodos (paso a paso)

| Nodo | Qué hace |
|---|---|
| **1. Webhook (Ingesta)** | Recibe `POST` a `/webhook/soluno-reporte` con `{canal, producto, mensaje, cliente:{nombre,ci,cuenta,telefono}}` |
| **2. Tokenizar (PII)** | Reemplaza nombre/CI/cuenta/teléfono por tokens; conserva nombre+CI visibles solo para el revisor |
| **3. Clasificar (reglas)** | Por palabras clave: queja vs incidente, producto, categoría, severidad |
| **4. ¿Es Incidente?** | Bifurca: incidente → 5a · queja → 5b |
| **5a. Paquete de Incidente** | Arma paquete para Desarrollo: qué falla, # afectados, datos para reproducir, equipo, estado |
| **5b. Respuesta Queja (Playbook)** | Trae la misma respuesta + pasos del playbook según categoría |
| **6. Responder** | Devuelve el JSON final |

## Ejemplos para probar (POST al webhook)

**Incidente:**
```json
{"canal":"WhatsApp","producto":"altoke","agencia":"Plan 3000",
 "mensaje":"no puedo transferir por QR, me da error",
 "cliente":{"nombre":"Juana Mamani","ci":"8472351","cuenta":"4001-2289","telefono":"700123"}}
```
Esperado: `INC-xxxxx`, equipo "Equipo Pagos/QR", estado "En análisis".

**Queja:**
```json
{"canal":"Instagram","producto":"appSol",
 "mensaje":"cambié de celular y no me deja iniciar sesión",
 "cliente":{"nombre":"Luis Roca","ci":"123","telefono":"701"}}
```
Esperado: `QJA-xxxxx`, categoría "acceso", pasos de reactivación de tokens.

## Próximos workflows (roadmap)
- **#2**: agrupar incidentes iguales y **contar afectados** (Postgres / pgvector).
- **#3**: reemplazar la clasificación por reglas con **Claude** (nodo AI / HTTP a la API de Anthropic).
- **#4**: **cierre del ciclo** → publicar la solución al Playbook Vivo (versionado).
- **#5**: **informe ASFI** automático (plus).
- **Frontend**: 2 vistas + status (3 estados) + métricas (React / v0 / Lovable) consumiendo estos webhooks.

## Nota de seguridad
La API key de Anthropic (cuando sumemos Claude) se pega **dentro de n8n** (Credentials), nunca en el chat ni en el código del repo.
