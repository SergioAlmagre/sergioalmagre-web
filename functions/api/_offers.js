// Ofertas del público: base "Ofertas" de Notion y correos enviados con Resend.
import { ApiError, findDatabase, getInventoryId, notionRequest, plainText, sameId } from "./_notion.js";

export const OFFER_STATUS = {
  new: "Nueva",
  accepted: "Aceptada",
  countered: "Contraoferta",
  rejected: "Rechazada",
};
const STATUS_TO_DECISION = Object.fromEntries(Object.entries(OFFER_STATUS).map(([k, v]) => [v, k]));

export const OFFER_COLUMNS = {
  product: "Producto",
  item: "Artículo",
  email: "Email",
  phone: "Teléfono",
  units: "Unidades",
  listPrice: "Precio Publicado",
  offerPrice: "Precio Ofertado",
  message: "Mensaje",
  status: "Estado",
  counterPrice: "Contraoferta",
  reply: "Respuesta",
  date: "Fecha",
  replyDate: "Fecha Respuesta",
  lang: "Idioma",
  emailSent: "Email Enviado",
  discount: "Descuento %",
};

export const findOffersDb = (env) => findDatabase(env, "NOTION_OFFERS_DATABASE_ID", "Ofertas");

export function getTitleKey(db) {
  return Object.keys(db.properties).find((k) => db.properties[k].type === "title");
}

// Crea en "Ofertas" las columnas que falten. Devuelve la base actualizada.
export async function ensureOfferSchema(env, db) {
  const c = OFFER_COLUMNS;
  const euro = { number: { format: "euro" } };
  const base = {
    [c.product]: { relation: { database_id: getInventoryId(env), type: "single_property", single_property: {} } },
    [c.item]: { rich_text: {} },
    [c.email]: { email: {} },
    [c.phone]: { phone_number: {} },
    [c.units]: { number: { format: "number" } },
    [c.listPrice]: euro,
    [c.offerPrice]: euro,
    [c.message]: { rich_text: {} },
    [c.status]: {
      select: {
        options: [
          { name: OFFER_STATUS.new, color: "blue" },
          { name: OFFER_STATUS.accepted, color: "green" },
          { name: OFFER_STATUS.countered, color: "orange" },
          { name: OFFER_STATUS.rejected, color: "red" },
        ],
      },
    },
    [c.counterPrice]: euro,
    [c.reply]: { rich_text: {} },
    [c.date]: { date: {} },
    [c.replyDate]: { date: {} },
    [c.lang]: { select: { options: [{ name: "es", color: "default" }, { name: "en", color: "default" }] } },
    [c.emailSent]: { checkbox: {} },
  };
  const formulas = {
    [c.discount]: {
      formula: {
        expression: `if(prop("${c.listPrice}") > 0, round((prop("${c.listPrice}") - prop("${c.offerPrice}")) / prop("${c.listPrice}") * 1000) / 10, 0)`,
      },
    },
  };

  const missing = (columns) => {
    const result = {};
    for (const [name, definition] of Object.entries(columns)) {
      const expected = Object.keys(definition)[0];
      const current = db.properties[name];
      if (!current) result[name] = definition;
      else if (current.type !== expected) {
        throw new ApiError(`La columna "${name}" de Ofertas debe ser de tipo ${expected} y es ${current.type}.`, 424);
      } else if (expected === "relation" && !sameId(current.relation.database_id, getInventoryId(env))) {
        throw new ApiError(`La relación "${name}" de Ofertas apunta a otra base de datos.`, 424);
      }
    }
    return result;
  };

  let changed = false;
  for (const columns of [missing(base), missing(formulas)]) {
    if (Object.keys(columns).length > 0) {
      db = await notionRequest(env, `databases/${db.id}`, "PATCH", { properties: columns });
      changed = true;
    }
  }
  return changed ? notionRequest(env, `databases/${db.id}`) : db;
}

export function parseOffer(page, titleKey) {
  const p = page.properties;
  const c = OFFER_COLUMNS;
  const status = p[c.status]?.select?.name || OFFER_STATUS.new;
  return {
    id: page.id,
    name: plainText(p[titleKey]?.title) || "Sin nombre",
    productId: p[c.product]?.relation?.[0]?.id || "",
    item: plainText(p[c.item]?.rich_text),
    email: p[c.email]?.email || "",
    phone: p[c.phone]?.phone_number || "",
    units: p[c.units]?.number || 1,
    listPrice: p[c.listPrice]?.number ?? 0,
    offerPrice: p[c.offerPrice]?.number ?? 0,
    message: plainText(p[c.message]?.rich_text),
    status,
    decision: STATUS_TO_DECISION[status] || "new",
    counterPrice: p[c.counterPrice]?.number ?? null,
    reply: plainText(p[c.reply]?.rich_text),
    date: p[c.date]?.date?.start || page.created_time,
    replyDate: p[c.replyDate]?.date?.start || "",
    lang: p[c.lang]?.select?.name === "en" ? "en" : "es",
    emailSent: !!p[c.emailSent]?.checkbox,
  };
}

// ---------------------------------------------------------------------------
// Correo (Resend)
// ---------------------------------------------------------------------------

const clean = (v) => String(v || "").trim().replace(/^["']|["']$/g, "");

export function emailConfig(env) {
  const apiKey = clean(env.RESEND_API_KEY);
  const from = clean(env.OFFERS_EMAIL_FROM) || "Sergio Almagre <info@sergioalmagre.com>";
  const notifyTo = clean(env.OFFERS_NOTIFY_EMAIL);
  return { apiKey, from, notifyTo, canNotify: !!(apiKey && notifyTo), canReply: !!apiKey };
}

export async function sendEmail(env, { to, subject, html, text, replyTo }) {
  const { apiKey, from } = emailConfig(env);
  if (!apiKey) throw new ApiError("El envío de correos no está configurado (falta RESEND_API_KEY).", 424);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!response.ok) {
    const details = await response.text();
    console.error("Resend", response.status, details);
    let message = "";
    try {
      message = JSON.parse(details).message || "";
    } catch (_) {}
    throw new ApiError(`No se pudo enviar el correo: ${message || response.statusText}`, 502);
  }
}

export function siteOrigin(env, requestUrl) {
  return clean(env.SITE_URL).replace(/\/$/, "") || new URL(requestUrl).origin;
}

export function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "articulo";
}

const esc = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const money = (value, lang = "es") =>
  `${Number(value || 0).toLocaleString(lang === "en" ? "en-GB" : "es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;

const discountPct = (list, price) => (list > 0 ? Math.round(((list - price) / list) * 1000) / 10 : 0);

function shell(heading, inner) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e4e4e7;">
<tr><td style="background:#a5261a;color:#ffffff;padding:18px 24px;font-size:18px;font-weight:700;">${esc(heading)}</td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.55;">${inner}</td></tr>
<tr><td style="padding:14px 24px;background:#fafafa;color:#71717a;font-size:12px;border-top:1px solid #e4e4e7;">Sergio Almagre · sergioalmagre.com</td></tr>
</table></td></tr></table></body></html>`;
}

function table(rows) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:18px 0;font-size:14px;">${rows
    .map(([label, value, style = ""], i) => `<tr style="background:${i % 2 ? "#ffffff" : "#fafafa"};">
<td style="padding:10px 12px;border:1px solid #e4e4e7;color:#52525b;width:45%;">${esc(label)}</td>
<td style="padding:10px 12px;border:1px solid #e4e4e7;font-weight:600;${style}">${value}</td></tr>`)
    .join("")}</table>`;
}

const STATUS_STYLE = {
  accepted: "color:#15803d;",
  countered: "color:#b45309;",
  rejected: "color:#b91c1c;",
};

const REPLY_TEXT = {
  es: {
    labels: {
      item: "Artículo", units: "Unidades", listed: "Precio publicado (ud.)", yours: "Tu oferta (ud.)",
      status: "Respuesta", agreed: "Precio acordado (ud.)", counter: "Mi contraoferta (ud.)", total: "Total",
    },
    status: { accepted: "Aceptada ✅", countered: "Contraoferta 🔄", rejected: "No aceptada ❌" },
    subject: {
      accepted: (i) => `Oferta aceptada: ${i}`,
      countered: (i) => `Contraoferta por ${i}`,
      rejected: (i) => `Sobre tu oferta por ${i}`,
    },
    hello: (n) => `Hola ${n},`,
    intro: {
      accepted: (i) => `¡Buenas noticias! He aceptado tu oferta por <strong>${i}</strong>.`,
      countered: (i) => `Gracias por tu oferta por <strong>${i}</strong>. No puedo aceptarla tal cual, pero te propongo este precio:`,
      rejected: (i) => `Gracias por tu interés en <strong>${i}</strong>. Lamentablemente no puedo aceptar tu oferta.`,
    },
    next: {
      accepted: "Responde a este correo y acordamos el pago y la entrega o recogida.",
      countered: "Si te encaja, responde a este correo y lo cerramos.",
      rejected: "Si quieres, puedes hacerme una nueva oferta desde la web:",
    },
    note: "Mensaje de Sergio",
    view: "Ver el artículo",
    bye: "Un saludo,<br>Sergio",
  },
  en: {
    labels: {
      item: "Item", units: "Units", listed: "Listed price (unit)", yours: "Your offer (unit)",
      status: "Response", agreed: "Agreed price (unit)", counter: "My counteroffer (unit)", total: "Total",
    },
    status: { accepted: "Accepted ✅", countered: "Counteroffer 🔄", rejected: "Not accepted ❌" },
    subject: {
      accepted: (i) => `Offer accepted: ${i}`,
      countered: (i) => `Counteroffer for ${i}`,
      rejected: (i) => `About your offer for ${i}`,
    },
    hello: (n) => `Hi ${n},`,
    intro: {
      accepted: (i) => `Good news! I have accepted your offer for <strong>${i}</strong>.`,
      countered: (i) => `Thanks for your offer for <strong>${i}</strong>. I can't accept it as is, but I can offer you this price:`,
      rejected: (i) => `Thanks for your interest in <strong>${i}</strong>. Unfortunately I can't accept your offer.`,
    },
    next: {
      accepted: "Reply to this email and we'll arrange payment and delivery or pickup.",
      countered: "If it works for you, reply to this email and we'll close the deal.",
      rejected: "If you like, you can make a new offer on the website:",
    },
    note: "Message from Sergio",
    view: "View the item",
    bye: "Best regards,<br>Sergio",
  },
};

// Correo de respuesta al ofertante. decision: accepted | countered | rejected
export function buildReplyEmail(offer, decision, counterPrice, note, origin) {
  const lang = offer.lang === "en" ? "en" : "es";
  const t = REPLY_TEXT[lang];
  const L = t.labels;
  const item = esc(offer.item);
  const finalPrice = decision === "accepted" ? offer.offerPrice : decision === "countered" ? counterPrice : null;
  const link = `${origin}/preowned?item=${encodeURIComponent(slugify(offer.item))}`;

  const rows = [
    [L.item, item],
    [L.units, String(offer.units)],
    [L.listed, money(offer.listPrice, lang)],
    [L.yours, money(offer.offerPrice, lang)],
    [L.status, esc(t.status[decision]), STATUS_STYLE[decision]],
  ];
  if (finalPrice !== null) {
    rows.push([decision === "accepted" ? L.agreed : L.counter, money(finalPrice, lang), "font-size:16px;"]);
    rows.push([L.total, money(finalPrice * offer.units, lang), "font-size:16px;color:#a5261a;"]);
  }

  const noteHtml = note
    ? `<div style="margin:16px 0;padding:12px 14px;background:#fafafa;border-left:3px solid #a5261a;border-radius:4px;">
<div style="font-size:12px;color:#71717a;margin-bottom:4px;">${esc(t.note)}</div>${esc(note).replace(/\n/g, "<br>")}</div>`
    : "";
  const button = `<p style="margin:18px 0;"><a href="${esc(link)}" style="display:inline-block;background:#a5261a;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;">${esc(t.view)}</a></p>`;

  const inner = `<p style="margin:0 0 12px;">${esc(t.hello(offer.name))}</p>
<p style="margin:0;">${t.intro[decision](item)}</p>
${table(rows)}${noteHtml}
<p style="margin:0;">${esc(t.next[decision])}</p>${decision === "rejected" ? button : ""}
<p style="margin:18px 0 0;">${t.bye}</p>`;

  const textRows = rows.map(([label, value]) => `${label}: ${String(value).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&")}`);
  const text = [
    t.hello(offer.name),
    "",
    t.intro[decision](offer.item).replace(/<[^>]+>/g, ""),
    "",
    ...textRows,
    ...(note ? ["", `${t.note}:`, note] : []),
    "",
    t.next[decision],
    ...(decision === "rejected" ? [link] : []),
    "",
    t.bye.replace("<br>", "\n"),
  ].join("\n");

  return { subject: t.subject[decision](offer.item), html: shell(t.subject[decision](offer.item), inner), text };
}

// Aviso al propietario cuando llega una oferta nueva
export function buildOwnerNotification(offer, origin) {
  const pct = discountPct(offer.listPrice, offer.offerPrice);
  const rows = [
    ["Artículo", esc(offer.item)],
    ["Precio publicado (ud.)", money(offer.listPrice)],
    ["Oferta (ud.)", money(offer.offerPrice), "color:#a5261a;font-size:16px;"],
    ["Descuento pedido", `${pct.toLocaleString("es-ES")} %`],
    ["Unidades", String(offer.units)],
    ["Total ofertado", money(offer.offerPrice * offer.units)],
    ["Nombre", esc(offer.name)],
    ["Email", `<a href="mailto:${esc(offer.email)}">${esc(offer.email)}</a>`],
    ["Teléfono", esc(offer.phone || "—")],
    ["Idioma", offer.lang === "en" ? "Inglés" : "Español"],
  ];
  const message = offer.message
    ? `<p style="margin:0 0 4px;color:#71717a;font-size:13px;">Mensaje</p><p style="margin:0 0 16px;white-space:pre-wrap;">${esc(offer.message)}</p>`
    : "";
  const inner = `<p style="margin:0;">Has recibido una oferta nueva desde la web.</p>${table(rows)}${message}
<p style="margin:18px 0 0;"><a href="${esc(origin)}/dashboard#ofertas" style="display:inline-block;background:#a5261a;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;">Responder desde el panel</a></p>`;
  const subject = `Nueva oferta: ${offer.item} — ${money(offer.offerPrice)}/ud`;
  const text = [
    "Has recibido una oferta nueva desde la web.",
    "",
    ...rows.map(([l, v]) => `${l}: ${String(v).replace(/<[^>]+>/g, "")}`),
    ...(offer.message ? ["", "Mensaje:", offer.message] : []),
    "",
    `Panel: ${origin}/dashboard#ofertas`,
  ].join("\n");
  return { subject, html: shell("Nueva oferta recibida", inner), text };
}
