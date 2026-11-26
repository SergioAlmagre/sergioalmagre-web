// Gestión de ofertas desde el dashboard: listar, previsualizar y responder.
import { verifySessionToken, getCookie, SESSION_COOKIE_NAME } from "../_auth.js";
import { ApiError, errorResponse, jsonResponse, notionRequest, queryAll } from "../_notion.js";
import {
  OFFER_COLUMNS as C,
  OFFER_STATUS,
  buildReplyEmail,
  emailConfig,
  ensureOfferSchema,
  findOffersDb,
  getTitleKey,
  parseOffer,
  sendEmail,
  siteOrigin,
} from "../_offers.js";

async function requireSession({ request, env }) {
  const token = getCookie(request, SESSION_COOKIE_NAME);
  if (!(await verifySessionToken(token, env))) throw new ApiError("No autorizado", 401);
}

const loadDb = async (env) => ensureOfferSchema(env, await findOffersDb(env));

export async function onRequestGet(context) {
  try {
    await requireSession(context);
    const { env } = context;
    const db = await loadDb(env);
    const titleKey = getTitleKey(db);
    const pages = await queryAll(env, db.id, { sorts: [{ property: C.date, direction: "descending" }] });
    const config = emailConfig(env);
    return jsonResponse({
      offers: pages.map((page) => parseOffer(page, titleKey)),
      email: { canReply: config.canReply, canNotify: config.canNotify },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

async function loadOffer(env, db, offerId) {
  if (!/^[0-9a-f-]{32,36}$/i.test(offerId)) throw new ApiError("Oferta no válida.", 400);
  const page = await notionRequest(env, `pages/${offerId}`);
  if (page.parent?.database_id?.replace(/-/g, "") !== db.id.replace(/-/g, "")) {
    throw new ApiError("La oferta no pertenece a la base Ofertas.", 400);
  }
  if (page.archived) throw new ApiError("La oferta ya no existe.", 404);
  return parseOffer(page, getTitleKey(db));
}

function readDecision(payload, offer) {
  const decision = String(payload.decision || "");
  if (!["accepted", "countered", "rejected", "new"].includes(decision)) throw new ApiError("Respuesta no válida.", 400);
  const counterPrice = decision === "countered" ? Math.round(Number(payload.counterPrice) * 100) / 100 : null;
  if (decision === "countered" && !(counterPrice > 0)) throw new ApiError("Indica el precio de la contraoferta.", 400);
  const note = String(payload.note || "").trim().slice(0, 2000);
  return { decision, counterPrice, note, offer };
}

export async function onRequestPost(context) {
  try {
    await requireSession(context);
    const { env, request } = context;
    const payload = await request.json();
    const db = await loadDb(env);
    const offer = await loadOffer(env, db, String(payload.offerId || ""));
    const origin = siteOrigin(env, request.url);

    if (payload.action === "archive") {
      await notionRequest(env, `pages/${offer.id}`, "PATCH", { archived: true });
      return jsonResponse({ success: true });
    }

    const { decision, counterPrice, note } = readDecision(payload, offer);

    if (payload.action === "preview") {
      if (decision === "new") throw new ApiError("No hay correo para este estado.", 400);
      return jsonResponse(buildReplyEmail(offer, decision, counterPrice, note, origin));
    }

    if (payload.action !== "respond") throw new ApiError("Acción no reconocida.", 400);

    const send = payload.send === true && decision !== "new";
    if (send) {
      if (!offer.email) throw new ApiError("La oferta no tiene email.", 400);
      const mail = buildReplyEmail(offer, decision, counterPrice, note, origin);
      const { notifyTo } = emailConfig(env);
      await sendEmail(env, { to: offer.email, replyTo: notifyTo || undefined, ...mail });
    }

    const statusName = OFFER_STATUS[decision];
    try {
      await notionRequest(env, `pages/${offer.id}`, "PATCH", {
        properties: {
          [C.status]: { select: { name: statusName } },
          [C.counterPrice]: { number: counterPrice },
          [C.reply]: { rich_text: note ? [{ text: { content: note } }] : [] },
          [C.replyDate]: { date: decision === "new" ? null : { start: new Date().toISOString() } },
          // Al volver a "Nueva" se olvida el envío; si no, se marca si este o uno anterior salió
          [C.emailSent]: { checkbox: decision === "new" ? false : send || offer.emailSent },
        },
      });
    } catch (error) {
      if (send) throw new ApiError("El correo se envió, pero no se pudo guardar la respuesta en Notion. Actualízala a mano.", 502);
      throw error;
    }

    return jsonResponse({ success: true, sent: send });
  } catch (error) {
    return errorResponse(error);
  }
}
