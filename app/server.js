/* ============================================================
   SolUno — Backend (Node, sin dependencias)
   WhatsApp -> IA (n8n) con MEMORIA -> operador (equipo tecnico).
   Incidentes: menu de estado + recomendacion tecnica de la IA +
   al resolver: avisa al cliente, actualiza el playbook y genera
   un informe ASFI editable/aprobable (se guarda en /informes).
   ============================================================ */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const N8N = process.env.N8N_URL || "http://localhost:5678";
const VERIFY_TOKEN = process.env.WA_VERIFY_TOKEN || "soluno_verify_123";
const PUBLIC_DIR = path.join(__dirname, "public");
const INFORMES_DIR = path.join(__dirname, "informes");
try { if (!fs.existsSync(INFORMES_DIR)) fs.mkdirSync(INFORMES_DIR); } catch (e) {}

const store = {
  casos: [], inbox: [],
  incidentes: {},        // caso_id -> { estado, producto, categoria, mensaje, ts, users, recomendacion_tecnica, nombre }
  conversaciones: {},    // from -> [{de:'cliente'|'agente', texto}] (memoria para la IA)
  sesiones: {},          // from -> sesion ABIERTA actual (una "queja"/charla)
  sesionesList: [],      // todas las conversaciones cerradas+abiertas (bandeja + metricas)
  informes: {},          // caso_id -> { caso_id, texto, aprobado, ts, users }
  metricas: { total: 0, quejas: 0, incidentes: 0, consultas: 0, afectados: 0 },
  // Playbooks RÍGIDOS por tipo de problema predefinido. El "tipo de problema" es fijo;
  // la SOLUCIÓN (pasos) es lo editable/actualizable. QUEJA -> la resuelve la IA sola.
  // INCIDENTE -> se deriva al equipo responsable.
  playbooks: {
    // ===== INCIDENTES (se derivan al equipo de TI) =====
    fallo_pagos_qr:       { clave: "fallo_pagos_qr",       titulo: "Fallo en pagos / QR",            tipo: "incidente", categoria: "transacciones", equipo: "Equipo Pagos/QR",        pasos: ["Verificar el estado del servicio de pagos/QR", "Revisar los logs del gateway de transacciones", "Validar cobros de prueba en varios dispositivos"], version: 1, origen: "base", actualizado: null },
    error_transferencia:  { clave: "error_transferencia",  titulo: "Error en transferencias",        tipo: "incidente", categoria: "transacciones", equipo: "Equipo Pagos/QR",        pasos: ["Confirmar disponibilidad del core transaccional", "Revisar la cola de transferencias pendientes", "Reprocesar y conciliar las operaciones afectadas"], version: 1, origen: "base", actualizado: null },
    fallo_ach:            { clave: "fallo_ach",            titulo: "Fallo ACH / interbancario",      tipo: "incidente", categoria: "transacciones", equipo: "Equipo Pagos/QR",        pasos: ["Verificar la conexión con la cámara de compensación", "Revisar los lotes ACH rechazados", "Reenviar el lote y notificar a operaciones"], version: 1, origen: "base", actualizado: null },
    caida_login:          { clave: "caida_login",          titulo: "Caída de login / acceso",        tipo: "incidente", categoria: "acceso",        equipo: "Equipo Seguridad/Accesos", pasos: ["Revisar el servicio de autenticación", "Validar la emisión de tokens y sesiones", "Restablecer el nodo de acceso y monitorear"], version: 1, origen: "base", actualizado: null },
    app_no_carga:         { clave: "app_no_carga",         titulo: "App no carga / se cae",          tipo: "incidente", categoria: "general",       equipo: "DevOps Aplicaciones",     pasos: ["Revisar el despliegue y los healthchecks de la app", "Verificar errores en el backend móvil", "Hacer rollback o redeploy si corresponde"], version: 1, origen: "base", actualizado: null },
    lentitud_servicio:    { clave: "lentitud_servicio",    titulo: "Lentitud del servicio",          tipo: "incidente", categoria: "rendimiento",   equipo: "Infraestructura/TI",      pasos: ["Revisar la carga de servidores y red", "Identificar el cuello de botella (BD/red/CPU)", "Escalar recursos o balancear la carga"], version: 1, origen: "base", actualizado: null },
    // ===== QUEJAS (las resuelve la IA, autónomo) =====
    cambio_dispositivo:   { clave: "cambio_dispositivo",   titulo: "Cambio de dispositivo / celular", tipo: "queja", categoria: "acceso",  equipo: null, pasos: ["Confirmar la identidad del cliente", "Indicar reactivar los tokens en el nuevo dispositivo", "Guiar el reescaneo del carnet si hace falta"], version: 1, origen: "base", actualizado: null },
    deuda_no_actualizada: { clave: "deuda_no_actualizada", titulo: "Pagué y aún figura la deuda",     tipo: "queja", categoria: "datos",   equipo: null, pasos: ["Pedir el comprobante de pago", "Explicar el plazo de conciliación del día", "Si no se refleja, escalar a soporte de datos"], version: 1, origen: "base", actualizado: null },
    datos_no_actualizados:{ clave: "datos_no_actualizados",titulo: "Saldo o movimiento no actualizado", tipo: "queja", categoria: "datos", equipo: null, pasos: ["Pedir refrescar la pantalla", "Indicar esperar unos minutos por la actualización", "Si persiste, registrar para revisión de datos"], version: 1, origen: "base", actualizado: null },
    duda_configuracion:   { clave: "duda_configuracion",   titulo: "Duda de configuración / uso",     tipo: "queja", categoria: "general", equipo: null, pasos: ["Identificar la función consultada", "Explicar el paso a paso de configuración", "Confirmar que el cliente pudo realizarlo"], version: 1, origen: "base", actualizado: null },
    duda_limite:          { clave: "duda_limite",          titulo: "Consulta de límites / montos",    tipo: "queja", categoria: "general", equipo: null, pasos: ["Informar el límite vigente del producto", "Explicar cómo solicitar un aumento si aplica", "Derivar a agencia si requiere firma"], version: 1, origen: "base", actualizado: null }
  }
};

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8" };

function proxyToN8n(webhookPath, payload) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(payload || {}));
    const u = new URL(N8N + webhookPath);
    const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": data.length } }, (res) => {
      let body = ""; res.on("data", (c) => (body += c));
      res.on("end", () => { try { resolve(JSON.parse(body)); } catch (e) { resolve({ raw: body }); } });
    });
    req.on("error", reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error("timeout n8n")); });
    req.write(data); req.end();
  });
}
function readBody(req) { return new Promise((resolve) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { try { resolve(b ? JSON.parse(b) : {}); } catch (e) { resolve({}); } }); }); }
function json(res, code, obj) { const s = JSON.stringify(obj); res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" }); res.end(s); }
function recalcMetricas() {
  // metricas POR CONVERSACION (no por mensaje). Una "queja" = una charla completa.
  const m = { total: store.sesionesList.length, quejas: 0, incidentes: 0, consultas: 0, abiertas: 0, afectados: 0, resueltos: 0 };
  for (const s of store.sesionesList) {
    if (s.tipo === "INCIDENTE") { m.incidentes++; if (s.estado_incidente === "Resuelto") m.resueltos++; }
    else if (s.tipo === "QUEJA") m.quejas++;
    else m.consultas++;
    if (s.abierta) m.abiertas++;
  }
  for (const k in store.incidentes) m.afectados += (store.incidentes[k].users || []).length;
  store.metricas = m;
}
async function enviarWA(payload) { try { const r = await proxyToN8n("/webhook/test-wa", payload); return !!(r && r.messages && r.messages[0] && r.messages[0].id); } catch (e) { return false; } }

// ---- memoria de conversacion ----
function recordar(from, de, texto) { store.conversaciones[from] = store.conversaciones[from] || []; store.conversaciones[from].push({ de, texto }); if (store.conversaciones[from].length > 20) store.conversaciones[from] = store.conversaciones[from].slice(-20); }
function historialDe(from) { const h = store.conversaciones[from] || []; return h.slice(-6).map(x => (x.de === "cliente" ? "Cliente" : "Agente") + ": " + x.texto).join(" || "); }

// ---- sesiones: una "queja" = una conversacion completa (cierra cuando el cliente agradece) ----
const RANK = { CONSULTA: 1, QUEJA: 2, INCIDENTE: 3 };
function esCierre(t) {
  const s = (t || "").toLowerCase().trim();
  if (s.length > 70) return false;
  if (/(pero|sigue|sigo|todav|aun|aún|no func|no anda|no me|no puedo|problema|otra cosa|una mas|una más|consulta|ademas|además)/.test(s)) return false;
  return /\bgracias\b/.test(s) || /(eso es todo|eso seria todo|eso sería todo|nada mas|nada más|listo gracias|chau|adios|adiós|hasta luego|todo bien|perfecto gracias|de una gracias)/.test(s);
}
let _sid = 0;
function nuevaSesion(from, nombre) {
  const s = { id: "S-" + (Date.now()) + "-" + (++_sid), from, nombre: nombre || from, abierta: true, tipo: "CONSULTA", caso_id: null, equipo_asignado: null, recomendacion_tecnica: null, severidad: null, afectados: null, categoria: null, clasificado_por: null, estado_incidente: null, mensajes: [], inicio: new Date().toISOString(), fin: null };
  store.sesiones[from] = s; store.sesionesList.unshift(s); if (store.sesionesList.length > 300) store.sesionesList.pop();
  return s;
}
function sesionPorCaso(casoId) { return store.sesionesList.find(s => s.caso_id === casoId); }

// ---- catalogo de problemas: codigo PRB-### + auto-alta cuando llega un problema nuevo ----
(function () { let n = 0; for (const k in store.playbooks) { n++; if (!store.playbooks[k].codigo) store.playbooks[k].codigo = "PRB-" + String(n).padStart(3, "0"); } })();
function siguienteCodigo() { let mx = 0; for (const k in store.playbooks) { const m = /(\d+)\s*$/.exec(store.playbooks[k].codigo || ""); if (m) mx = Math.max(mx, parseInt(m[1])); } return "PRB-" + String(mx + 1).padStart(3, "0"); }
function tituloDeFirma(firma, data) {
  const f = String(firma || "").trim();
  if (!f || f === "otro" || f.indexOf("_") < 0) return "Incidente · " + ((data && data.categoria) || "general") + (data && data.producto && data.producto !== "desconocido" ? " (" + data.producto + ")" : "");
  return f.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase());
}
// Cargar SOLUCIONES DETALLADAS paso a paso (runbooks completos) si existe el archivo.
try {
  const det = JSON.parse(fs.readFileSync(path.join(__dirname, "playbooks_detallados.json"), "utf8"));
  for (const k in det) {
    const d = det[k]; const pasos = Array.isArray(d) ? d : d.pasos;
    if (store.playbooks[k]) { if (pasos && pasos.length) store.playbooks[k].pasos = pasos; if (d.titulo) store.playbooks[k].titulo = d.titulo; if (d.objetivo) store.playbooks[k].objetivo = d.objetivo; }
    else { store.playbooks[k] = { clave: k, codigo: siguienteCodigo(), titulo: d.titulo || k, tipo: d.tipo || "incidente", categoria: d.categoria || "general", equipo: d.equipo || null, objetivo: d.objetivo || null, pasos: pasos || [], version: 1, origen: "catálogo", actualizado: null }; }
  }
  console.log("Playbooks detallados cargados.");
} catch (e) { /* aún no existe el archivo: se usan los pasos base */ }

// Busca el playbook del problema; si no existe en el catalogo, lo AÑADE con el siguiente codigo.
function playbookParaIncidente(data) {
  const firma = (data && data.firma) || (((data && data.producto) || "x") + "_" + ((data && data.categoria) || "general"));
  let pb = store.playbooks[firma];
  if (!pb) {
    pb = store.playbooks[firma] = { clave: firma, codigo: siguienteCodigo(), titulo: tituloDeFirma(firma, data), tipo: "incidente", categoria: (data && data.categoria) || "general", equipo: (data && data.equipo_asignado) || null, pasos: [], version: 1, origen: "detectado automáticamente (problema nuevo)", actualizado: null };
  }
  return pb;
}

function progresoTexto(casoId, estado) {
  const resuelto = estado === "Resuelto";
  return "📋 Estado de tu caso *" + casoId + "* en BancoSol:\n\n✅ 1. Recibido\n" +
    (resuelto ? "✅ 2. En proceso\n✅ 3. *Resuelto* ✔️\n\n¡Tu incidente fue resuelto! Ya podés usar el servicio con normalidad." : "🔵 2. En proceso  ← *acá estás*\n⬜ 3. Resuelto\n\nNuestro equipo está trabajando. Te avisaremos por acá apenas se resuelva.");
}
function menuEstado(casoId, equipo) {
  return { type: "button", body: { text: "📥 Tu solicitud fue *recibida* y derivada como *INCIDENTE* a " + (equipo || "el equipo técnico") + " de BancoSol (caso " + casoId + ").\n\nNuestro equipo ya está trabajando en ello. Cuando quieras, tocá el botón para ver el estado actual:" }, action: { buttons: [{ type: "reply", reply: { id: "estado:" + casoId, title: "📋 Ver estado" } }] } };
}

// ---- generar informe ASFI (editable) ----
function generarInforme(casoId, inc, sol) {
  const fecha = new Date().toISOString().slice(0, 10);
  const users = (inc && inc.users) || [];
  return [
    "INFORME DE INCIDENCIA — BancoSol (para ASFI)",
    "============================================",
    "Código único de caso: " + casoId,
    "Fecha de emisión: " + fecha,
    "Tipo: INCIDENTE",
    "Canal de ingreso: WhatsApp",
    "Producto: " + ((inc && inc.producto) || "no especificado"),
    "Categoría / tipología: " + ((inc && inc.categoria) || "general"),
    "Clientes afectados: " + users.length,
    "",
    "1. CONTEXTO (reportado por el cliente):",
    "   " + ((inc && inc.mensaje) || "(sin detalle)"),
    "",
    "2. DATOS DEL CLIENTE:",
    "   Nombre: " + ((inc && inc.nombre) || "—"),
    "   Teléfono(s) afectado(s): " + (users.length ? users.join(", ") : "—"),
    "",
    "3. SOLUCIÓN APLICADA (equipo técnico de BancoSol):",
    "   " + sol,
    "",
    "4. ACCIONES PREVENTIVAS:",
    "   La solución fue incorporada al manual operativo (playbook) para resolución",
    "   automática de casos similares en el futuro.",
    "",
    "Estado del caso: RESUELTO",
    "Aprobación: PENDIENTE — editar y aprobar para archivar y enviar a ASFI."
  ].join("\n");
}

// ---- procesar mensaje de texto entrante ----
async function procesarEntrante({ from, nombre, texto }) {
  const ts = new Date().toISOString();
  recordar(from, "cliente", texto);

  // 1) Cierre de conversacion: el cliente agradece / dice "eso es todo".
  //    No abre una queja nueva: cierra la actual. Si vuelve a escribir luego, sera otra queja.
  if (esCierre(texto)) {
    const s = store.sesiones[from];
    const reply = "¡De nada! 😊 Fue un gusto ayudarte. Cualquier cosa, escribinos cuando quieras. — BancoSol";
    if (s && s.abierta) { s.mensajes.push({ de: "cliente", texto, ts }); s.mensajes.push({ de: "agente", texto: reply, ts }); s.abierta = false; s.fin = ts; }
    recordar(from, "agente", reply);
    await enviarWA({ to: from, text: reply });
    recalcMetricas();
    return;
  }

  // 2) Asegurar una sesion abierta (si la anterior se cerro, esta es una NUEVA queja).
  let s = store.sesiones[from];
  if (!s || !s.abierta) s = nuevaSesion(from, nombre);
  if (nombre) s.nombre = nombre;
  const historial = historialDe(from);

  try {
    let data = await proxyToN8n("/webhook/soluno-reporte", { canal: "WhatsApp", producto: "", agencia: "", mensaje: texto, cliente: { telefono: from, nombre: nombre || "" }, remitente: from, historial });
    if (Array.isArray(data)) data = data[0];
    const res = (data && data.resultado) || "CONSULTA";

    // anexar a la conversacion
    s.mensajes.push({ de: "cliente", texto, ts, resultado: res });
    if (data && data.respuesta_cliente) { s.mensajes.push({ de: "agente", texto: data.respuesta_cliente, ts }); recordar(from, "agente", data.respuesta_cliente); }

    // el tipo de la conversacion = el de mayor severidad visto (INCIDENTE > QUEJA > CONSULTA)
    if ((RANK[res] || 1) >= (RANK[s.tipo] || 1)) {
      s.tipo = res;
      s.categoria = (data && data.categoria) || s.categoria;
      s.clasificado_por = (data && data.clasificado_por) || s.clasificado_por;
      if (res === "INCIDENTE") {
        s.caso_id = data.caso_id; s.equipo_asignado = data.equipo_asignado;
        s.recomendacion_tecnica = data.recomendacion_tecnica;
        s.severidad = data.severidad || (data.paquete_para_desarrollo && data.paquete_para_desarrollo.severidad);
        s.afectados = data.afectados || (data.paquete_para_desarrollo && data.paquete_para_desarrollo.afectados);
        if (!s.estado_incidente) s.estado_incidente = "En proceso";
      }
    }
    if (data && data.resultado) { store.casos.unshift(data); if (store.casos.length > 500) store.casos.pop(); }
    recalcMetricas();

    // responder por WhatsApp
    if (res === "INCIDENTE") {
      const cid = data.caso_id;
      if (!store.incidentes[cid]) store.incidentes[cid] = { caso_id: cid, estado: "En proceso", producto: data.producto, categoria: data.categoria, firma: data.firma, severidad: s.severidad, equipo_asignado: data.equipo_asignado, mensaje: texto, ts, users: [], recomendacion_tecnica: data.recomendacion_tecnica, nombre: nombre || from };
      if (!store.incidentes[cid].users.includes(from)) store.incidentes[cid].users.push(from);
      if (data.firma) store.incidentes[cid].firma = data.firma;
      if (s.severidad) store.incidentes[cid].severidad = s.severidad;
      if (data.recomendacion_tecnica) store.incidentes[cid].recomendacion_tecnica = data.recomendacion_tecnica;
      s.firma = data.firma;
      // buscar el problema en el catalogo (o anadirlo si es nuevo) y vincular su codigo
      const pb = playbookParaIncidente(data);
      s.playbook_codigo = pb.codigo; s.playbook_titulo = pb.titulo; s.playbook_nuevo = (pb.version === 1 && (!pb.pasos || !pb.pasos.length));
      store.incidentes[cid].playbook_codigo = pb.codigo;
      s.estado_incidente = store.incidentes[cid].estado;
      s.respondido = await enviarWA({ to: from, interactive: menuEstado(cid, data.equipo_asignado) });
    } else if (data && data.respuesta_cliente) {
      s.respondido = await enviarWA({ to: from, text: data.respuesta_cliente });
    }
  } catch (e) { s.error = String(e.message); }
}

async function procesarBoton({ from, buttonId }) {
  let cid = null; const m = /:(.+)$/.exec(buttonId || ""); if (m) cid = m[1];
  if (!cid || !store.incidentes[cid]) { const mine = Object.values(store.incidentes).filter(i => i.users.includes(from)).sort((a, b) => (a.ts < b.ts ? 1 : -1)); if (mine[0]) cid = mine[0].caso_id; }
  const inc = cid && store.incidentes[cid]; const estado = inc ? inc.estado : "En proceso"; const cidShow = cid || "tu caso";
  const txt = progresoTexto(cidShow, estado);
  await enviarWA({ to: from, text: txt });
  // reflejar la consulta de estado dentro de la conversacion del cliente
  const ts = new Date().toISOString();
  const s = sesionPorCaso(cid) || store.sesiones[from];
  if (s) { s.mensajes.push({ de: "cliente", texto: "📋 (consultó el estado de su caso)", ts }); s.mensajes.push({ de: "agente", texto: txt, ts }); }
}

// ---- resolver incidente: playbook + aviso + informe ASFI ----
async function resolverIncidente({ caso_id, producto, categoria, solucion }) {
  const inc = store.incidentes[caso_id];
  const sol = (solucion && solucion.trim()) || (inc && inc.recomendacion_tecnica) || "El equipo técnico aplicó la corrección y validó el servicio.";
  try { let r = await proxyToN8n("/webhook/soluno-resolver", { caso_id, producto: producto || (inc && inc.producto) || "desconocido", categoria: categoria || (inc && inc.categoria) || "general", severidad: "alta", afectados: inc ? inc.users.length : 1, solucion: sol }); if (Array.isArray(r)) r = r[0]; } catch (e) {}
  // playbook vivo: actualiza la SOLUCIÓN del playbook del tipo de problema (por firma).
  const cat = categoria || (inc && inc.categoria) || "general";
  const firma = inc && inc.firma;
  let key = (firma && store.playbooks[firma]) ? firma
    : (Object.keys(store.playbooks).find(k => store.playbooks[k].categoria === cat && store.playbooks[k].tipo === "incidente") || firma || cat || "otro");
  const pasos = String(sol).split(/[\n.;]+/).map(s => s.trim()).filter(s => s.length > 3).map(s => s.charAt(0).toUpperCase() + s.slice(1));
  const prev = store.playbooks[key] || {};
  store.playbooks[key] = { clave: key, codigo: prev.codigo || siguienteCodigo(), titulo: prev.titulo || ("Solución · " + cat), tipo: prev.tipo || "incidente", categoria: prev.categoria || cat, equipo: prev.equipo || (inc && inc.equipo_asignado) || null, pasos: pasos.length ? pasos : (prev.pasos || []), version: (prev.version ? prev.version + 1 : 1), origen: "actualizado al resolver " + caso_id, actualizado: new Date().toISOString() };
  // marcar resuelto
  if (inc) inc.estado = "Resuelto";
  const c = store.casos.find(x => x && x.caso_id === caso_id); if (c) c.estado = "Resuelto";
  const ses = sesionPorCaso(caso_id); if (ses) ses.estado_incidente = "Resuelto";
  recalcMetricas();
  // informe ASFI editable
  store.informes[caso_id] = { caso_id, texto: generarInforme(caso_id, inc, sol), aprobado: false, ts: new Date().toISOString(), users: inc ? inc.users : [] };
  // avisar a los afectados por WhatsApp
  let avisados = 0;
  if (inc) for (const u of inc.users) { const ok = await enviarWA({ to: u, text: "✅ ¡Buenas noticias! Tu incidente *" + caso_id + "* en BancoSol fue *resuelto*. Ya podés usar el servicio con normalidad. Gracias por tu paciencia. — SolUno / BancoSol" }); if (ok) avisados++; }
  return { ok: true, caso_id, avisados, informe: store.informes[caso_id] };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://" + req.headers.host); const p = url.pathname;

  if (p === "/webhook/whatsapp" && req.method === "GET") {
    if (url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === VERIFY_TOKEN) { res.writeHead(200, { "Content-Type": "text/plain" }); return res.end(url.searchParams.get("hub.challenge") || ""); }
    res.writeHead(403); return res.end("forbidden");
  }
  if (p === "/webhook/whatsapp" && req.method === "POST") {
    const payload = await readBody(req); res.writeHead(200); res.end("EVENT_RECEIVED");
    try {
      const value = payload.entry && payload.entry[0] && payload.entry[0].changes && payload.entry[0].changes[0] && payload.entry[0].changes[0].value;
      const msg = value && value.messages && value.messages[0];
      if (msg) {
        const from = msg.from; const nombre = value.contacts && value.contacts[0] && value.contacts[0].profile && value.contacts[0].profile.name;
        if (msg.type === "text") procesarEntrante({ from, nombre, texto: msg.text.body });
        else if (msg.type === "interactive" && msg.interactive && msg.interactive.button_reply) procesarBoton({ from, buttonId: msg.interactive.button_reply.id });
      }
    } catch (e) { console.error("err webhook:", e.message); }
    return;
  }

  if (p === "/api/reporte" && req.method === "POST") { const b = await readBody(req); try { let d = await proxyToN8n("/webhook/soluno-reporte", b); if (Array.isArray(d)) d = d[0]; if (d && d.resultado) { store.casos.unshift(d); recalcMetricas(); } return json(res, 200, d); } catch (e) { return json(res, 502, { error: String(e.message) }); } }
  if (p === "/api/resolver" && req.method === "POST") { const b = await readBody(req); try { return json(res, 200, await resolverIncidente(b)); } catch (e) { return json(res, 502, { error: String(e.message) }); } }
  if (p === "/api/wa-send" && req.method === "POST") { const b = await readBody(req); try { return json(res, 200, await proxyToN8n("/webhook/test-wa", b)); } catch (e) { return json(res, 502, { error: String(e.message) }); } }
  if (p === "/api/informe" && req.method === "GET") { const c = url.searchParams.get("caso"); return json(res, 200, store.informes[c] || null); }
  if (p === "/api/informe/aprobar" && req.method === "POST") {
    const b = await readBody(req); const inf = store.informes[b.caso_id];
    if (!inf) return json(res, 404, { error: "informe no encontrado" });
    if (typeof b.texto === "string") inf.texto = b.texto;
    inf.aprobado = true; inf.aprobado_ts = new Date().toISOString();
    try { fs.writeFileSync(path.join(INFORMES_DIR, "ASFI-" + b.caso_id + ".txt"), inf.texto, "utf8"); inf.archivo = "informes/ASFI-" + b.caso_id + ".txt"; } catch (e) { inf.archivo_error = String(e.message); }
    return json(res, 200, inf);
  }
  if (p === "/api/informes" && req.method === "GET") return json(res, 200, Object.values(store.informes));
  if (p === "/api/playbooks" && req.method === "GET") return json(res, 200, Object.values(store.playbooks));
  if (p === "/api/conversaciones" && req.method === "GET") return json(res, 200, store.sesionesList);
  if (p === "/api/inbox" && req.method === "GET") return json(res, 200, store.sesionesList);
  if (p === "/api/casos" && req.method === "GET") return json(res, 200, store.casos);
  if (p === "/api/metrics" && req.method === "GET") { recalcMetricas(); return json(res, 200, store.metricas); }
  if (p === "/api/health" && req.method === "GET") return json(res, 200, { ok: true, n8n: N8N });

  let file = p === "/" ? "/index.html" : p;
  const safe = path.normalize(path.join(PUBLIC_DIR, file));
  if (!safe.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end("forbidden"); }
  fs.readFile(safe, (err, content) => { if (err) { res.writeHead(404); return res.end("no encontrado"); } res.writeHead(200, { "Content-Type": MIME[path.extname(safe)] || "application/octet-stream", "Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache", "Expires": "0" }); res.end(content); });
});
server.listen(PORT, () => { console.log("SolUno backend en http://localhost:" + PORT + " | n8n: " + N8N); });
