// VM Legal · Formularios del sitio → correo vía Resend a CONTACT_TO (info@).
//   tipo "contacto":  solicitud de asesoría.
//   tipo "hoja_vida": aplicación a práctica o vacante, con la hoja de vida adjunta.
// Secretos (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY  clave de Resend (re_…)
//   CONTACT_TO      correo que recibe las solicitudes
//   CONTACT_FROM    remitente; sin dominio verificado: "VM Legal <onboarding@resend.dev>"
// Es público (el sitio no tiene sesión), así que se protege con: lista de
// orígenes permitidos, campo trampa contra bots, validación y límites de largo.

const ORIGINS = [
  "https://feliperpovera.github.io",
  "https://vmlegal01-hub.github.io",
  "https://www.vmlegal.com.co",
  "https://vmlegal.com.co",
  "http://localhost:4173",
];

const LIMITS: Record<string, number> = {
  nombre: 120, empresa: 120, email: 160, telefono: 40, area: 80, mensaje: 4000,
  universidad: 160, semestre: 60, aplicacion: 40,
};

// Hoja de vida: PDF o Word, máximo 5 MB. Se comprueba la firma real del archivo,
// no solo la extensión, para no reenviar ejecutables disfrazados.
const MAX_FILE = 5 * 1024 * 1024;
const SIGNATURES: [RegExp, number[]][] = [
  [/\.pdf$/i, [0x25, 0x50, 0x44, 0x46]],              // %PDF
  [/\.docx$/i, [0x50, 0x4b, 0x03, 0x04]],             // ZIP (Office moderno)
  [/\.doc$/i, [0xd0, 0xcf, 0x11, 0xe0]],              // OLE (Word 97-2003)
];

function checkFile(a: unknown): { filename: string; content: string } | null {
  if (!a || typeof a !== "object") return null;
  const { nombre, contenido } = a as Record<string, unknown>;
  if (typeof nombre !== "string" || typeof contenido !== "string") return null;
  const filename = nombre.replace(/[^\w.\- ]+/g, "_").slice(0, 120);
  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(atob(contenido), (c) => c.charCodeAt(0)); } catch { return null; }
  if (!bytes.length || bytes.length > MAX_FILE) return null;
  const sig = SIGNATURES.find(([re]) => re.test(filename));
  if (!sig || !sig[1].every((b, i) => bytes[i] === b)) return null;
  return { filename, content: contenido };
}

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && ORIGINS.includes(origin) ? origin : ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Vary": "Origin",
  };
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = { ...cors(origin), "Content-Type": "application/json" };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });

  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return reply(405, { error: "method" });
  if (!origin || !ORIGINS.includes(origin)) return reply(403, { error: "origin" });

  let data: Record<string, unknown>;
  try { data = await req.json(); } catch { return reply(400, { error: "json" }); }

  // Campo trampa: invisible para personas; si llega lleno es un bot. Se responde
  // "ok" para no darle pistas, pero no se envía nada.
  if (typeof data.sitio_web === "string" && data.sitio_web.trim()) return reply(200, { ok: true });

  const f: Record<string, string> = {};
  for (const [k, max] of Object.entries(LIMITS)) {
    const v = typeof data[k] === "string" ? (data[k] as string).trim() : "";
    if (v.length > max) return reply(400, { error: "largo", campo: k });
    f[k] = v;
  }
  const cv = data.tipo === "hoja_vida";
  if (!f.nombre || (cv ? !f.universidad : !f.mensaje)) return reply(400, { error: "faltan" });
  const adjunto = cv ? checkFile(data.adjunto) : null;
  if (cv && !adjunto) return reply(400, { error: "archivo" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) return reply(400, { error: "email" });
  if (data.habeas !== true) return reply(400, { error: "habeas" });

  const key = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("CONTACT_TO");
  const from = Deno.env.get("CONTACT_FROM") ?? "VM Legal <onboarding@resend.dev>";
  if (!key || !to) return reply(500, { error: "config" });

  const fila = (k: string, v: string) =>
    v ? `<tr><td style="padding:6px 12px 6px 0;color:#706F6F;vertical-align:top">${k}</td><td style="padding:6px 0">${esc(v)}</td></tr>` : "";
  const html = `<div style="font-family:Arial,sans-serif;color:#232323;max-width:560px">
    <h2 style="font-weight:400;color:#04748f;margin:0 0 16px">${cv ? "Nueva hoja de vida" : "Nueva solicitud de asesoría"}</h2>
    <table style="border-collapse:collapse;font-size:14px">
      ${fila("Nombre", f.nombre)}${fila("Empresa", f.empresa)}${fila("Correo", f.email)}
      ${fila("Teléfono", f.telefono)}${fila("Aplica a", f.aplicacion)}${fila("Universidad", f.universidad)}
      ${fila("Semestre / experiencia", f.semestre)}${fila("Área", f.area)}
    </table>
    ${f.mensaje ? `<p style="font-size:14px;line-height:1.6;white-space:pre-wrap;border-top:1px solid #E4E9EE;margin-top:16px;padding-top:16px">${esc(f.mensaje)}</p>` : ""}
    ${adjunto ? `<p style="font-size:14px">Hoja de vida adjunta: <b>${esc(adjunto.filename)}</b></p>` : ""}
    <p style="font-size:12px;color:#706F6F">Enviado desde el formulario del sitio. El remitente autorizó el tratamiento de sus datos. Responder a este correo le escribe directamente.</p>
  </div>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to: [to], reply_to: f.email,
      subject: cv
        ? `Hoja de vida · ${f.aplicacion || "Aplicación"} · ${f.nombre}`
        : `Solicitud de asesoría · ${f.nombre}${f.area ? " · " + f.area : ""}`,
      html,
      ...(adjunto ? { attachments: [adjunto] } : {}),
    }),
  });
  if (!r.ok) {
    console.error("Resend", r.status, await r.text());
    return reply(502, { error: "envio" });
  }
  return reply(200, { ok: true });
});
