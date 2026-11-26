// Recibe ofertas del catálogo público y avisa al propietario por correo.
import { ApiError, jsonResponse, notionRequest } from "../_notion.js";
import {
  OFFER_COLUMNS as C,
  OFFER_STATUS,
  buildOwnerNotification,
  emailConfig,
  ensureOfferSchema,
  findOffersDb,
  getTitleKey,
  sendEmail,
  siteOrigin,
} from "../_offers.js";
import { onRequestGet as getPublicItems } from "./items.js";

const MAX_OFFERS_PER_DAY = 5;
const fail = (code, status = 400) => jsonResponse({ code }, status);
const text = (value) => [{ text: { content: value } }];

async function findPublishedItem(context, itemId) {
  const request = new Request(new URL("/api/public/items", context.request.url));
  const response = await getPublicItems({ ...context, request });
  if (!response.ok) throw new ApiError("Catálogo no disponible", 502);
  const { items } = await response.json();
  return (items || []).find((item) => item.id === itemId);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (Number(request.headers.get("content-length") || 0) > 10000) return fail("invalid_data", 413);

  let payload;
  try {
    payload = await request.json();
  } catch (_) {
    return fail("invalid_data");
  }
  if (!payload || typeof payload !== "object") return fail("invalid_data");

  // Bots: campo trampa relleno o formulario enviado en menos de 3 segundos
  if (String(payload.website || "").trim() || Number(payload.elapsed) < 3000) return jsonResponse({ ok: true });

  const name = String(payload.name || "").trim().replace(/\s+/g, " ");
  const email = String(payload.email || "").trim().toLowerCase();
  const phone = String(payload.phone || "").trim();
  const message = String(payload.message || "").trim();
  const units = Number(payload.units);
  const price = Math.round(Number(payload.price) * 100) / 100;
  const lang = payload.lang === "en" ? "en" : "es";

  if (name.length < 2 || name.length > 80) return fail("invalid_data");
  // Longitud primero; partes separadas por "." sin solaparse para evitar retrocesos costosos
  if (email.length > 254 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)) return fail("invalid_data");
  if (phone && !/^[+\d][\d\s().-]{5,24}$/.test(phone)) return fail("invalid_data");
  if (message.length > 1000) return fail("invalid_data");
  if (!Number.isInteger(units) || units < 1 || units > 99) return fail("invalid_data");
  if (!Number.isFinite(price) || price <= 0 || price > 1000000) return fail("invalid_data");
  if (payload.consent !== true) return fail("consent_required");

  try {
    const item = await findPublishedItem(context, String(payload.itemId || ""));
    const available = item ? item.cantidad - (item.reservedUnits || 0) : 0;
    if (!item || item.reserved || available < 1) return fail("unavailable", 409);
    if (units > available) return fail("too_many_units", 409);

    const db = await ensureOfferSchema(env, await findOffersDb(env));

    // Límite por email y sin ofertas pendientes repetidas para el mismo artículo
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recent = await notionRequest(env, `databases/${db.id}/query`, "POST", {
      page_size: 20,
      filter: {
        and: [
          { property: C.email, email: { equals: email } },
          { property: C.date, date: { on_or_after: since } },
        ],
      },
    });
    if (recent.results.length >= MAX_OFFERS_PER_DAY) return fail("rate_limited", 429);
    const duplicate = recent.results.some((page) =>
      page.properties[C.status]?.select?.name === OFFER_STATUS.new &&
      (page.properties[C.product]?.relation || []).some((r) => r.id.replace(/-/g, "") === item.id.replace(/-/g, ""))
    );
    if (duplicate) return fail("duplicate", 409);

    const offer = {
      name,
      email,
      phone,
      message,
      units,
      offerPrice: price,
      listPrice: item.secondHandPrice || 0,
      item: item.title,
      lang,
    };

    await notionRequest(env, "pages", "POST", {
      parent: { database_id: db.id },
      properties: {
        [getTitleKey(db)]: { title: text(name) },
        [C.product]: { relation: [{ id: item.id }] },
        [C.item]: { rich_text: text(item.title) },
        [C.email]: { email },
        [C.phone]: { phone_number: phone || null },
        [C.units]: { number: units },
        [C.listPrice]: { number: offer.listPrice },
        [C.offerPrice]: { number: price },
        [C.message]: { rich_text: message ? text(message) : [] },
        [C.status]: { select: { name: OFFER_STATUS.new } },
        [C.date]: { date: { start: new Date().toISOString() } },
        [C.lang]: { select: { name: lang } },
        [C.emailSent]: { checkbox: false },
      },
    });

    // El aviso no retrasa la respuesta ni hace fallar la oferta ya guardada
    const config = emailConfig(env);
    if (config.canNotify) {
      const mail = buildOwnerNotification(offer, siteOrigin(env, request.url));
      context.waitUntil(
        sendEmail(env, { to: config.notifyTo, replyTo: email, ...mail })
          .catch((error) => console.error("Aviso de oferta no enviado:", error.message))
      );
    }

    return jsonResponse({ ok: true }, 201);
  } catch (error) {
    console.error("Error al guardar la oferta:", error.message);
    return fail("server", 500);
  }
}
