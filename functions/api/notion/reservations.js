import { verifySessionToken, getCookie, SESSION_COOKIE_NAME } from "../_auth.js";
import {
  ApiError,
  RESERVATION_COLUMNS,
  STATUS_SOLD,
  ensureReservationSchema,
  errorResponse,
  fetchReservedRows,
  findDatabase,
  getContactFields,
  getInventoryId,
  groupReservations,
  jsonResponse,
  notionRequest,
  parseContact,
  queryAll,
  readInventoryPage,
  reservationProperties,
  sameId,
} from "../_notion.js";

const MAX_ITEM_PAGES = 40; // Límite de filas por petición

async function requireSession({ request, env }) {
  const token = getCookie(request, SESSION_COOKIE_NAME);
  if (!(await verifySessionToken(token, env))) throw new ApiError("No autorizado", 401);
}

const findContactsDb = (env) => findDatabase(env, "NOTION_CONTACTS_DATABASE_ID", "Contactos");
const loadInventoryDb = (env) => notionRequest(env, `databases/${getInventoryId(env)}`);
const patchPage = (env, id, properties) => notionRequest(env, `pages/${id}`, "PATCH", { properties });

const roundMoney = (value) => Math.round(value * 100) / 100;

function readItemIds(payload) {
  const itemIds = Array.isArray(payload.itemIds) ? payload.itemIds : [];
  if (itemIds.length === 0) throw new ApiError("Falta el artículo.", 400);
  if (itemIds.length > MAX_ITEM_PAGES) throw new ApiError("Demasiadas filas en una sola reserva.", 400);
  return itemIds;
}

async function loadInventoryPages(env, itemIds) {
  const inventoryId = getInventoryId(env);
  const pages = [];
  // En serie para respetar el límite de peticiones de Notion
  for (const id of itemIds) {
    if (!/^[0-9a-f-]{32,36}$/i.test(id)) throw new ApiError("Identificador de artículo no válido.", 400);
    const page = await notionRequest(env, `pages/${id}`);
    if (!sameId(page.parent?.database_id, inventoryId)) {
      throw new ApiError("El artículo no pertenece al inventario.", 400);
    }
    if (!page.archived) pages.push(readInventoryPage(page));
  }
  if (pages.length === 0) throw new ApiError("No se ha encontrado el artículo.", 404);
  return pages;
}

export async function onRequestGet(context) {
  try {
    await requireSession(context);
    const { env } = context;
    const rows = await fetchReservedRows(env, await loadInventoryDb(env));
    const reservations = groupReservations(rows);

    if (reservations.length > 0) {
      const contactsDb = await findContactsDb(env);
      const fields = getContactFields(contactsDb);
      const contacts = (await queryAll(env, contactsDb.id)).map((page) => parseContact(page, fields));
      for (const reservation of reservations) {
        const contact = contacts.find((c) => sameId(c.id, reservation.contactId));
        reservation.contact = contact || { id: reservation.contactId, name: "Contacto eliminado", phone: "", email: "" };
      }
    }

    return jsonResponse({ reservations });
  } catch (error) {
    return errorResponse(error);
  }
}

// Cada fila admite una reserva: se ocupa la fila más ajustada y, si no basta una, las más grandes.
function allocateUnits(freeRows, units) {
  const exactFit = freeRows
    .filter((row) => row.stock >= units)
    .sort((a, b) => a.stock - b.stock)[0];
  if (exactFit) return [{ row: exactFit, units }];

  const allocation = [];
  let remaining = units;
  for (const row of [...freeRows].sort((a, b) => b.stock - a.stock)) {
    const taken = Math.min(row.stock, remaining);
    allocation.push({ row, units: taken });
    remaining -= taken;
    if (remaining === 0) break;
  }
  return allocation;
}

async function createReservation(env, payload) {
  const units = Number(payload.units);
  const agreedPrice = Number(payload.agreedPrice);
  const contactId = String(payload.contactId || "");
  const itemIds = readItemIds(payload);

  if (!contactId) throw new ApiError("Selecciona un contacto.", 400);
  if (!Number.isInteger(units) || units < 1) throw new ApiError("Las unidades deben ser un número entero mayor que 0.", 400);
  if (payload.agreedPrice === "" || payload.agreedPrice === null || !Number.isFinite(agreedPrice) || agreedPrice < 0) {
    throw new ApiError("Indica el precio acordado.", 400);
  }
  if (!/^[0-9a-f-]{32,36}$/i.test(contactId)) throw new ApiError("Contacto no válido.", 400);

  const contactsDb = await findContactsDb(env);
  const contactPage = await notionRequest(env, `pages/${contactId}`);
  if (!sameId(contactPage.parent?.database_id, contactsDb.id)) {
    throw new ApiError("El contacto no pertenece a la base Contactos.", 400);
  }
  const contact = parseContact(contactPage, getContactFields(contactsDb));

  await ensureReservationSchema(env, await loadInventoryDb(env), contactsDb.id);
  const pages = await loadInventoryPages(env, itemIds);

  const freeRows = pages.filter((row) => !row.reservation.active && row.stock > 0);
  const reservable = freeRows.reduce((sum, row) => sum + row.stock, 0);
  if (units > reservable) {
    throw new ApiError(
      `Solo puedes reservar ${reservable} unidades más. Cada fila del inventario admite una única reserva activa.`,
      409
    );
  }

  const listPrice = (pages.find((p) => p.price > 0) || pages[0]).price;
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
  const reservation = { contactId: contact.id, agreedPrice: roundMoney(agreedPrice), listPrice, date };
  const allocation = allocateUnits(freeRows, units);

  const written = [];
  try {
    for (const { row, units: rowUnits } of allocation) {
      await patchPage(env, row.id, reservationProperties({ ...reservation, units: rowUnits }));
      written.push(row.id);
    }
  } catch (error) {
    // No dejar la reserva a medias
    for (const id of written) await patchPage(env, id, reservationProperties(null));
    throw error;
  }

  const usedUnits = allocation.reduce((sum, a) => sum + a.row.stock, 0);
  return {
    reservation: { ...reservation, id: written[0], itemIds: written, units, contact },
    reservableUnits: reservable - usedUnits,
  };
}

// Comprueba que las filas siguen reservadas para el mismo contacto que veía el dashboard
async function loadActiveRows(env, payload) {
  const rows = await loadInventoryPages(env, readItemIds(payload));
  const contactId = String(payload.contactId || "");
  if (rows.some((row) => !row.reservation.active || !sameId(row.reservation.contactId, contactId))) {
    throw new ApiError("Esta reserva ya no está activa. Recarga el dashboard.", 409);
  }
  return rows;
}

async function cancelReservation(env, rows) {
  for (const row of rows) await patchPage(env, row.id, reservationProperties(null));
}

// Cada fila se actualiza en una sola llamada (stock, ventas y estado), así que
// repetir una venta interrumpida solo procesa las filas que siguen reservadas.
async function sellReservation(env, rows) {
  const missingStock = rows.find((row) => row.reservation.units > row.stock);
  if (missingStock) {
    throw new ApiError(
      `No hay stock suficiente: una fila tiene ${missingStock.stock} unidades y ${missingStock.reservation.units} reservadas. Revísalo en Notion.`,
      409
    );
  }

  let applied = 0;
  for (const row of rows) {
    const { units, agreedPrice } = row.reservation;
    const { quantityKey, quantityType, soldKey, soldUnitsKey, incomeKey } = row.keys;
    const newStock = row.stock - units;
    const properties = { [RESERVATION_COLUMNS.status]: { select: { name: STATUS_SOLD } } };
    if (quantityKey) {
      properties[quantityKey] = quantityType === "rich_text"
        ? { rich_text: [{ text: { content: String(newStock) } }] }
        : { number: newStock };
    }
    if (soldUnitsKey) properties[soldUnitsKey] = { number: row.soldUnits + units };
    if (incomeKey) properties[incomeKey] = { number: roundMoney(row.income + units * agreedPrice) };
    if (soldKey && newStock === 0) properties[soldKey] = { checkbox: true };

    try {
      await patchPage(env, row.id, properties);
    } catch (error) {
      if (applied === 0) throw error;
      throw new ApiError(
        `Venta registrada en ${applied} de ${rows.length} filas. El resto sigue reservado: vuelve a pulsar "Convertir en venta".`,
        502
      );
    }
    applied += 1;
  }
}

export async function onRequestPost(context) {
  try {
    await requireSession(context);
    const { env } = context;
    const payload = await context.request.json();

    if (payload.action === "create") {
      return jsonResponse(await createReservation(env, payload), 201);
    }
    if (payload.action === "cancel" || payload.action === "sell") {
      const rows = await loadActiveRows(env, payload);
      if (payload.action === "cancel") await cancelReservation(env, rows);
      else await sellReservation(env, rows);
      return jsonResponse({ success: true });
    }
    throw new ApiError("Acción no reconocida.", 400);
  } catch (error) {
    return errorResponse(error);
  }
}
