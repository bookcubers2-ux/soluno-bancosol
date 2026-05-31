# 📘 SolUno — Documento Maestro del Proyecto
### Sistema operativo de incidencias y comunicación para BancoSol · InnovaHack 2026
*Versión integrada · 30 de mayo de 2026 · Equipo SolUno*

> Documento único que integra: el problema completo, el Problem Statement validado por el banco,
> el diseño definitivo de la solución, los canales del MVP, los criterios de privacidad, los plus,
> el alcance de 48h, el mapeo a la rúbrica y los datos con fuentes (ver `SolUno_Banco_de_Datos.md`).

---

## 0. Resumen ejecutivo

**SolUno** es un **punto único** que recibe cada queja e incidente desde todos los canales de BancoSol,
**reconoce de qué se trata, a cuántos clientes afecta y con qué datos reproducirlo**, entrega una
**respuesta única y correcta**, rutea los incidentes al equipo técnico de forma **estructurada y formal**
(reemplazando los grupos de WhatsApp informales), y **devuelve la solución a un manual vivo** que mantiene
a call center y clientes hablando el mismo idioma — todo **sin que un dato confidencial salga del banco**.

**En una frase:** *Un punto. Una respuesta. Todos los canales.*

---

## 1. El problema completo de BancoSol

### 1.1 Quién es BancoSol
Institución **pionera y líder mundial en microfinanzas** de Bolivia. **+2,5 millones de clientes**,
**+1.801 puntos de atención**, **#1 del ranking CAMEL 10 años seguidos**, cartera de **USD 2.712 millones**,
con fuerte misión social y de equidad de género (programa Avanza Mujer, **USD 52M en bonos de género**).
Opera bajo **supervisión estricta de ASFI**.

### 1.2 El detonante: el éxito digital se volvió problema operativo
- 2023: moderniza su infraestructura con la **plataforma de APIs de Sensedia**.
- Mayo 2024: lanza **altoke** (billetera QR para microempresarios). Crecimiento exponencial:
  **0 → 800 mil usuarios en el 1er año (12% de la PEA)**, hoy **1,2 millones**, abriendo
  **20.000–25.000 cuentas por semana**.
- Ese éxito disparó el **tráfico de API en +2.000% en menos de 6 meses**, tensionando los sistemas
  y **multiplicando incidencias y reclamos** en todos los canales.

### 1.3 El dolor real (lo que sangra)
**a) Canales fragmentados:** los reclamos llegan por **9 vías distintas** (WhatsApp, FonoSol, appSol,
Solnet, altoke, sucursales, chatbot, redes sociales, Punto de Reclamo web), **cada una con su propio
playbook y ritmo de actualización**.

**b) Respuestas inconsistentes:** un mismo problema recibe **respuestas distintas según el canal**.

**c) Call Center cuello de botella:** tercerizado, sin conocimiento técnico profundo; solo atiende casos
pre-mapeados y **deriva el resto a desarrollo en lotes diarios** → los **devs hacen soporte en vez de
desarrollar**, los casos no se atienden de inmediato y el análisis es masivo, no personalizado.

**d) Comunicación interna informal (lo que el banco recalcó):** *"No hay nada centralizado… y ese es el
problema que tenemos. Está ligado a la comunicación."* Los incidentes se reportan en **grupos de Teams/
WhatsApp informales**. El equipo técnico **no sabe a cuántos usuarios afecta** ni **recibe datos para
replicar el error** en ambientes de desarrollo. Y al resolver, **la solución no vuelve ordenada al playbook**.

**e) El cliente no tiene a dónde ir:** no existe un punto único para reportar, consultar estado o
auto-resolver → toda la presión cae en el Call Center, con picos de llamadas en los momentos críticos.

### 1.4 La capa regulatoria (lo que lo vuelve crítico)
ASFI obliga a operar un **"Punto de Reclamo"** con respuesta en **máximo 5 días hábiles**, escrita,
íntegra y comprensible; cada reclamante exige un **expediente individual**; y el uso de IA en la nube
tropieza con el requisito de **soberanía del dato** (la información del cliente no puede salir del banco).

### 1.5 La distinción que dio el banco: Queja vs. Incidente
| | **QUEJA / CONSULTA** | **INCIDENTE** |
|---|---|---|
| Qué es | Problema particular, **bajo impacto**, error controlado | Afectación **grave**: falla función crítica |
| Ejemplos | Extranjero no transacciona tras update (0,5%), cambio de dispositivo → reactivar token, "pagué y sigue la deuda" | Falla **login, transferencia, QR, ACH** |
| Cómo se resuelve | **Operativo**: playbook actualizado, misma respuesta | Call center **compila + prioriza info** → equipo técnico |

---

## 2. Problem Statement final (validado por el banco)

> **El equipo de atención de BancoSol —call center y equipo de desarrollo— necesita recibir en un único
> punto y de forma estructurada cada queja e incidente que hoy llega disperso por todos los canales,
> sabiendo de qué se trata, a cuántos clientes afecta y con los datos necesarios para reproducirlo, para
> entregar una respuesta única, correcta y oportuna y, una vez resuelto, devolver esa solución a un manual
> vivo que mantenga a todos —call center y cliente— hablando el mismo idioma.**
>
> **Hoy no lo logran porque** no existe ni siquiera un canal interno formal: los incidentes se reportan en
> grupos de chat informales, el equipo técnico no sabe cuántos usuarios están afectados ni recibe datos para
> replicar el error, y las soluciones no vuelven de forma ordenada a los manuales, que quedan desactualizados
> y distintos en cada canal — por lo que un mismo problema recibe respuestas diferentes, los desarrolladores
> terminan haciendo soporte y el cliente queda sin certeza.
>
> **Una solución comercial existente no lo resuelve porque** no puede operar sin que la información del
> cliente salga del banco, no entiende la lógica específica de cada canal y producto, y no mantiene un único
> manual vivo y consistente que cumpla las exigencias de privacidad y de reporte individual del regulador boliviano.

*(La oración principal no menciona tecnología — cumple la regla de oro de la metodología Cyclix.)*

**Estado:** ✅ Validado por la persona del banco ("Está bien, está bien") en la sesión de validación.

---

## 3. Los 3 actores (metodología Cyclix · Paso 2)

| Actor | Rol | Éxito para él |
|---|---|---|
| **Quién ENCARGA** | BancoSol — área técnica/desarrollo + Eduardo Flores | Dejar de hacer soporte manual, comunicación consistente, cumplir ASFI |
| **Quién PADECE** | ① Agente Call Center · ② Equipo de desarrollo · ③ Cliente | Manual correcto a mano; solo la info necesaria; respuesta clara y única |
| **Quién USA el prototipo** | Vistas interna (call center + técnico) y cliente | — |

**A quién priorizamos:** al **operador interno** (call center + desarrollo). Ahí está el cuello de botella
de comunicación; si ellos tienen el playbook correcto y vigente, el cliente recibe la respuesta consistente
como consecuencia.

---

## 4. Viabilidad (Cyclix · Semáforo) → 🟢 Verde/Amarillo

Encuadramos el problema como **proceso interno ineficiente y conocido** (reporte informal + playbooks
inconsistentes) → **zona VERDE: "proceso ineficiente conocido → mockup que simula la mejora."**
La regulación ASFI es una **restricción a respetar** (privacidad, reporte individual), **NO el problema que
resolvemos** — así evitamos la zona ROJA (regulatoria). El propio banco confirmó: el informe ASFI es un *plus*,
el core es la comunicación.

---

## 5. Diseño definitivo de la solución

### 5.1 El ciclo que resolvemos
```
        ┌──────────────────── PUNTO ÚNICO (SolUno) ────────────────────┐
  CLIENTE / CANALES                                                     │
        │  (disperso, informal)                                        │
        ▼                                                              │
  ① INGESTA + CLASIFICACIÓN ──────► ¿queja o incidente? canal/producto │
        │                                                              │
   ┌────┴───────────────┐                                              │
   ▼ QUEJA              ▼ INCIDENTE                                     │
  ② PLAYBOOK CORRECTO  ③ PAQUETE DE INCIDENTE                          │
   respuesta única      (# afectados + datos para replicar)            │
   al cliente               │                                          │
                            ▼                                          │
                     EQUIPO DESARROLLO ◄── canal interno FORMAL        │
                            │           (ya no grupos WhatsApp)        │
                            ▼                                          │
                       RESOLUCIÓN                                      │
                            │                                          │
        ┌──── ④ PLAYBOOK VIVO ◄─┘  (la solución vuelve al manual)      │
        ▼                                                              │
   CLIENTE recibe estado + respuesta consistente                       │
        └──────────────────────────────────────────────────────────────┘
   🔒 Toda la PII tokenizada on-premise · el LLM nunca ve datos reales
```

### 5.2 Arquitectura ("qué corre dónde")
- 🟢 **On-premise:** n8n (orquestador) · vault de identidad · módulo de tokenización/re-hidratación ·
  base de playbooks **versionada** · base de incidentes · registro auditable.
- 🔵 **Cloud (solo texto tokenizado, Zero Data Retention):** el LLM que clasifica, redacta y genera
  informes — **ve "usuario 1", nunca "Fernando Alén".**

### 5.3 Los 3 mandamientos del banco (esqueleto del diseño)
1. *Centralizar, PERO identificar de qué reportan y servir el playbook específico y correcto.*
2. *En incidentes, priorizar qué info pasar al equipo técnico (no toda es necesaria).*
3. *Al resolver, automatizar la actualización del playbook.*
+ Regla de oro: *mismo problema en distinto canal → misma respuesta.*

### 5.4 El CORE — 4 componentes

**① Punto Único de Ingesta + Clasificación.** Recibe los canales en n8n y etiqueta en 3 dimensiones:
¿queja o incidente? · ¿qué canal/producto? (appSol ≠ altoke ≠ Solnet) · ¿nuevo o ya existe? (agrupa y
**cuenta afectados**).

**② Playbook Correcto → Respuesta Única (camino QUEJA).** Sirve la respuesta estandarizada y vigente →
**misma respuesta en todos los canales**. El agente aprueba y envía (o automática en casos simples).

**③ Paquete de Incidente → Canal Interno Formal (camino INCIDENTE).** *La pieza que el banco dijo que
faltaba.* Reemplaza los grupos de WhatsApp por un canal formal hacia Desarrollo. Cada incidente llega como
un paquete: **qué falla · a cuántos afecta · datos para replicar (tokenizados) · severidad/prioridad · solo
lo necesario.**

**④ Playbook Vivo → Retorno de la Solución (cierra el ciclo).** El dev resuelve → SolUno convierte la
solución en **pasos 1-2-3-4** que cualquiera siga → **publica al playbook** → **se propaga a todos los
canales** al instante. Versionado y trazable.

---

## 6. Criterios de información sensible (privacidad — core)

Premisa del banco: *"Toda información del cliente tiene que quedarse en el banco."*
Tokenización **inteligente** por tipo de dato:

| Dato | Acción | Por qué |
|---|---|---|
| Nombre completo | 🟡 Tokenizar al LLM, visible al revisor | El revisor lo necesita; el LLM no |
| CI / Carnet | 🟡 Tokenizar al LLM, visible al revisor | Suficiente para identificar internamente |
| Nº de cuenta | 🔴 Tokenizar y ocultar | Irrelevante para resolver |
| Saldo / montos | 🔴 Tokenizar y ocultar | Sensible, no necesario |
| Teléfono / correo / dirección | 🔴 Tokenizar y ocultar | Irrelevante para la revisión |
| Texto del problema | 🟢 Pasa tokenizado al LLM | Lo necesario para clasificar |

**Flujo:** PII → tokens **on-premise** → el LLM opera sobre *"usuario 1"* → **re-hidratación local** dentro
del banco. Como el LLM externo no recibe datos identificables, **no hay cesión a terceros** → simplifica el
cumplimiento de privacidad y de tercerización de ASFI.

---

## 7. ➕ PLUS #1 — Generación automática de documentos (informe ASFI)
Al cerrar un incidente, el LLM redacta el **informe individualizado/post-mortem** (qué pasó, en qué servidor,
cómo se resolvió, qué acciones para que no se repita). El humano **revisa y aprueba**. Doble valor: cumple el
reporte regulatorio **y** alimenta el playbook. *(El banco: "sería un plus… aporta más que la traducción.")*

## 8. ➕ PLUS #2 — Motor de traducción (área rural + extranjero)
Traduce el reporte del cliente (**quechua, aymara, guaraní** o extranjero) → español para el operador, y la
respuesta del playbook → idioma del cliente. Encaja con la misión social de BancoSol e inclusión (ESG / EU-LAC).
*Plus secundario: se demuestra si sobra tiempo.*

---

## 9. Canales del MVP — altoke + Meta

| | **altoke** | **Meta** (WhatsApp · Facebook · Instagram) |
|---|---|---|
| Tipo | Canal **interno / transaccional** | Canales **externos / públicos / conversacionales** |
| Por qué | La plataforma **más usada** del banco (1,2M usuarios, QR) | Los 3 canales que el banco **ya tiene conectados** vía Meta |
| Qué llega | Incidentes **críticos** (QR, transferencias) + contexto transaccional | Quejas en **texto libre**, a veces otro idioma, **públicas** |
| Ingesta | Webhook / API interna de altoke | Una capa **Meta Business** → WhatsApp Cloud API + Messenger + Instagram Graph API |

**Por qué es la combinación ideal:** son dos mundos opuestos (transaccional interno vs. público
conversacional) → demuestran que SolUno da **la misma respuesta consistente sin importar el canal**.
*El gancho del demo:* un cliente reporta "QR no funciona" en **altoke** y otro por **WhatsApp/Instagram**, y
ambos reciben **la misma respuesta**, mientras el dev ve **"2 afectados, mismo incidente"**.

> *Nota honesta para el pitch:* en el demo se **simulan/mockean** las APIs con datos asumidos (el banco no da
> datos reales ni accesos a producción). En producción: altoke por su API interna, Meta por la API de Meta Business.

---

## 10. Las dos vistas del prototipo
- 👤 **Cliente:** reporta por su canal → respuesta **consistente** → estado en 3 etapas
  **Recibido → En análisis → Resuelto** (en su idioma, si aplica el plus).
- 🏢 **Interna:** *Call Center* (bandeja unificada + respuesta sugerida del playbook lista para aprobar) ·
  *Desarrollo* (Paquete de Incidente: qué falla, # afectados, datos para replicar, prioridad) ·
  *Cierre del ciclo* (convertir solución en pasos → publicar al playbook).

---

## 11. Qué queda FUERA del MVP (roadmap)
❌ Detección de fraude · ❌ Geoanalítica Haversine · ❌ Integración real con core/Sensedia ·
❌ Los 9 canales completos (demo con altoke + Meta). Se trabaja con **datos asumidos**
(~2,5M clientes, picos <2%).

---

## 12. El MVP de 48h (golden path)
1. **2 canales**: altoke + Meta (al menos WhatsApp; Facebook/Instagram como parte del mismo conector).
2. **Clasificación** queja/incidente + canal/producto + **conteo de afectados** (agrupando altoke + Meta).
3. **Camino queja**: playbook correcto → **misma respuesta** en ambos canales.
4. **Camino incidente**: **Paquete de Incidente** (# afectados + datos para replicar, con contexto
   transaccional de altoke) → equipo de desarrollo.
5. **Ciclo de retorno**: solución → pasos → **publicada al playbook** → ambos canales.
6. **Tokenización** con los criterios de info sensible (§6).
7. **2 vistas** (cliente con 3 estados + interna).
8. **Plus #1**: borrador de informe ASFI generado.
9. *(Si sobra)* **Plus #2**: traducción (ideal con un caso de cliente rural por WhatsApp).

---

## 13. Datos clave para el pitch (resumen)
*(Detalle completo y todas las fuentes en `SolUno_Banco_de_Datos.md`.)*

- **Escala:** BancoSol +2,5M clientes, #1 CAMEL 10 años. · altoke 0→1,2M usuarios, **+2.000% de API en 6 meses**.
- **El dolor:** **32%** de llamadas son repetidas · devs pierden **17h/semana** en soporte (Stripe) ·
  cada hora de caída cuesta **+USD 300K** (ITIC).
- **Presión legal:** ASFI exige responder en **5 días hábiles**; **75.805 reclamos** en 2024 (⚠ verificar).
- **La causa raíz:** **75%** de clientes espera la **misma respuesta en todo canal** (Zendesk); **66%** debe
  repetir su info (Salesforce).
- **La solución:** GenAI ahorra **30–45%** de los costos de atención (McKinsey); privacidad por tokenización.
- **Plus social:** **2,2M** de bolivianos hablan lenguas originarias (quechua 1,39M, aymara 774.874, guaraní 43.870).

---

## 14. Mapeo a la rúbrica (100 pts)
| Criterio | Pts | Por qué ganamos |
|---|---|---|
| Impacto y alineación estratégica | 25 | Resolvemos el problema **validado por el banco en su voz** (comunicación + ciclo Call Center↔Dev) |
| Viabilidad técnica y escalabilidad | 25 | Arquitectura simple, on-prem, privacidad clara, sin sobre-promesas |
| Innovación y diferenciación | 20 | Paquete de Incidente + Playbook Vivo auto-actualizable + tokenización inteligente + informe automático |
| Validación usuario + UX | 15 | Diseñado con el cliente real; 2 vistas + status; problem statement validado; datos reales |
| Pitch y trabajo en equipo | 15 | Narrativa nítida + presentación rica en datos citados |

*Desempate: mayor puntaje en "Impacto y alineación" → es donde somos más fuertes.*

---

## 15. Identidad / branding (insumo para los logos)
- **Nombre:** SolUno — *un solo punto, una sola respuesta, un solo idioma.*
- **Tagline:** **"Un punto. Una respuesta. Todos los canales."**
- **Metáfora visual:** canales que convergen en **un sol/punto único** → del que sale **una sola voz** + un
  **ciclo** que vuelve al playbook.
- **Tono:** confiable, bancario, humano, boliviano. · **Paleta:** índigo (confianza) + naranja/dorado sol
  (BancoSol) + acento que conecte los canales.

---

## 16. Entregables del hackathon (checklist TDR)
- [ ] Repositorio de código + README (instalación, dependencias, licencias)
- [ ] Demo funcional navegable (golden path §12)
- [ ] Pitch deck 6–8 slides (problema · solución · valor · demo · KPIs · próximos pasos · necesidades)
- [ ] Mockups de alta fidelidad de las 2 vistas + status page
- [ ] Licencias abiertas (MIT/Apache-2.0) en componentes genéricos

---

## Anexos / fuentes del proyecto
- `SolUno_Banco_de_Datos.md` — todos los datos con URLs de fuente.
- `AUDIO-2026-05-30-09-46-35_transcripcion.txt` — 1ª reunión con BancoSol.
- `audio_nuevo_transcripcion.txt` — sesión de recomendaciones del banco.
- `audio_3_transcripcion.txt` — validación del Problem Statement.
- `BancoSol problema.pdf` — ficha oficial del reto.
- `INNOVAHACK2026_GuiaRapida_Consuelo (1).pdf` — metodología Cyclix.
- `TDRequipos (2).pdf` — bases y rúbrica del InnovaHack.
- `Categorización simple (1).xlsx` — taxonomía operativa de incidencias.
