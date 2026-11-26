// Utilidades compartidas para contactos y reservas en Notion.

export const STATUS_RESERVED = "Reservado";
export const STATUS_SOLD = "Vendido";

export class ApiError extends Error {
  constructor(message, status = 500, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export function errorResponse(error) {
  if (error instanceof ApiError) {
    return jsonResponse({ error: error.message, ...error.extra }, error.status);
  }
  console.error("Error inesperado:", error);
  return jsonResponse({ error: "Error interno al conectar con Notion." }, 500);
}

export function normalizeString(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function cleanEnv(value) {
  return value?.trim().replace(/^["']|["']$/g, "") || "";
}

export function cleanId(value) {
  return cleanEnv(value).split("?")[0].replace(/-/g, "");
}

export async function notionRequest(env, path, method = "GET", body) {
  const token = cleanEnv(env.NOTION_TOKEN);
  if (!token) throw new ApiError("Configuración incompleta: NOTION_TOKEN no definido.");

  const response = await fetch(`https://api.notion.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const details = await response.text();
    console.error(`Notion ${method} ${path} -> ${response.status}:`, details);
    let message = "";
    try {
      message = JSON.parse(details).message || "";
    } catch (_) {}
    // Un 401 de Notion no debe confundirse con la sesión caducada del dashboard
    throw new ApiError(`Error de Notion: ${message || response.statusText}`, 502);
  }

  return response.json();
}

export async function queryAll(env, databaseId, body = {}) {
  const results = [];
  let cursor;
  do {
    const data = await notionRequest(env, `databases/${databaseId}/query`, "POST", {
      ...body,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    results.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return results;
}

export function plainText(fragments) {
  return (fragments || []).map((t) => t.plain_text).join("").trim();
}

// Busca una base por la variable de entorno o, si no existe, por su nombre exacto.
export async function findDatabase(env, envVar, name) {
  const configured = cleanId(env[envVar]);
  if (configured) return notionRequest(env, `databases/${configured}`);

  const data = await notionRequest(env, "search", "POST", {
    query: name,
    filter: { property: "object", value: "database" },
    page_size: 100,
  });
  const matches = data.results.filter(
    (db) => !db.archived && !db.in_trash && normalizeString(plainText(db.title)) === normalizeString(name)
  );

  if (matches.length === 0) {
    throw new ApiError(
      `No encuentro la base "${name}" en Notion. Ábrela en Notion → ··· → Conexiones → añade la integración de la web.`,
      424,
      { missingDatabase: name }
    );
  }
  if (matches.length > 1) {
    throw new ApiError(`Hay varias bases llamadas "${name}". Define ${envVar} para indicar cuál usar.`, 424);
  }
  // La búsqueda puede devolver un esquema desactualizado: se vuelve a leer la base
  return notionRequest(env, `databases/${matches[0].id}`);
}

export function getInventoryId(env) {
  const id = cleanId(env.NOTION_DATABASE_ID);
  if (!id) throw new ApiError("Configuración incompleta: NOTION_DATABASE_ID no definido.");
  return id;
}

export function sameId(a, b) {
  return String(a || "").replace(/-/g, "") === String(b || "").replace(/-/g, "");
}

// ---------------------------------------------------------------------------
// Inventario
// ---------------------------------------------------------------------------

export function findKey(properties, possibleNames, types) {
  for (const name of possibleNames) {
    const key = Object.keys(properties).find(
      (k) => normalizeString(k) === name && (!types || types.includes(properties[k].type))
    );
    if (key) return key;
  }
  return "";
}

export function readNumber(prop) {
  if (!prop) return null;
  if (prop.type === "number") return prop.number ?? null;
  if (prop.type === "rich_text") {
    const parsed = parseFloat(plainText(prop.rich_text).replace(/[^0-9.,-]/g, "").replace(",", "."));
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

const QUANTITY_NAMES = ["cantidad", "stock", "unidades", "qty", "quantity"];
const SALE_PRICE_NAMES = ["precio venta", "precio wallapop", "sale price", "precio"];

export function readInventoryPage(page) {
  const props = page.properties;
  const quantityKey = findKey(props, QUANTITY_NAMES, ["number", "rich_text"]);
  const priceKey = findKey(props, SALE_PRICE_NAMES, ["number", "rich_text"]);
  const soldKey = findKey(props, ["vendido", "sold"], ["checkbox"]);
  const soldUnitsKey = findKey(props, ["unidades vendidas"], ["number"]);
  const incomeKey = findKey(props, ["total ingresado"], ["number"]);

  const sold = soldKey ? !!props[soldKey].checkbox : false;
  const quantity = quantityKey ? readNumber(props[quantityKey]) : null;
  // Una fila sin cantidad cuenta como 1 unidad; un 0 explícito o "Vendido" no tienen stock
  const stock = sold ? 0 : Math.max(0, quantity ?? 1);

  const titleProp = Object.values(props).find((p) => p.type === "title");
  const name = [
    props["Naturaleza"]?.select?.name,
    props["Fabricante"]?.select?.name,
    plainText(titleProp?.title),
  ].filter(Boolean).join(" ");

  const c = RESERVATION_COLUMNS;
  const reservation = {
    contactId: props[c.contact]?.relation?.[0]?.id || "",
    status: props[c.status]?.select?.name || "",
    units: props[c.units]?.number || 0,
    agreedPrice: props[c.agreedPrice]?.number ?? 0,
    listPrice: props[c.listPrice]?.number ?? 0,
    date: props[c.date]?.date?.start || "",
  };
  const active = reservation.status === STATUS_RESERVED && reservation.units > 0;

  return {
    id: page.id,
    name: name || "Artículo",
    stock,
    reservation: { ...reservation, active },
    reservedUnits: active ? Math.min(reservation.units, stock) : 0,
    price: (priceKey ? readNumber(props[priceKey]) : 0) || 0,
    soldUnits: (soldUnitsKey ? readNumber(props[soldUnitsKey]) : 0) || 0,
    income: (incomeKey ? readNumber(props[incomeKey]) : 0) || 0,
    keys: { quantityKey, quantityType: props[quantityKey]?.type, soldKey, soldUnitsKey, incomeKey },
  };
}

// ---------------------------------------------------------------------------
// Reservas: columnas de la propia base de inventario (una reserva por fila)
// ---------------------------------------------------------------------------

export const RESERVATION_COLUMNS = {
  contact: "Reservado a",
  status: "Estado Reserva",
  units: "Unidades Reservadas",
  agreedPrice: "Precio Acordado",
  listPrice: "Precio Referencia",
  date: "Fecha Reserva",
  discountAmount: "Descuento €",
  discountPercent: "Descuento %",
};

const RESERVATION_COLUMN_NAMES = new Set(Object.values(RESERVATION_COLUMNS).map(normalizeString));

export function isReservationColumn(name) {
  return RESERVATION_COLUMN_NAMES.has(normalizeString(name));
}

// Valores para escribir una reserva en una fila; sin argumento, la deja libre.
export function reservationProperties(reservation) {
  const c = RESERVATION_COLUMNS;
  return {
    [c.contact]: { relation: reservation ? [{ id: reservation.contactId }] : [] },
    [c.status]: { select: reservation ? { name: STATUS_RESERVED } : null },
    [c.units]: { number: reservation ? reservation.units : null },
    [c.agreedPrice]: { number: reservation ? reservation.agreedPrice : null },
    [c.listPrice]: { number: reservation ? reservation.listPrice : null },
    [c.date]: { date: reservation ? { start: reservation.date } : null },
  };
}

// Una reserva que ocupa varias filas del mismo producto se muestra como una sola
export function groupReservations(rows) {
  const groups = new Map();
  for (const row of rows) {
    const { contactId, agreedPrice, listPrice, date, units } = row.reservation;
    const key = [normalizeString(row.name), contactId, agreedPrice, listPrice, date].join("|");
    const group = groups.get(key);
    if (group) {
      group.itemIds.push(row.id);
      group.units += units;
    } else {
      groups.set(key, { id: row.id, itemIds: [row.id], contactId, agreedPrice, listPrice, date, units });
    }
  }
  return [...groups.values()];
}

export async function fetchReservedRows(env, inventoryDb) {
  // Hasta la primera reserva las columnas no existen
  if (inventoryDb.properties[RESERVATION_COLUMNS.status]?.type !== "select") return [];
  const pages = await queryAll(env, inventoryDb.id, {
    filter: { property: RESERVATION_COLUMNS.status, select: { equals: STATUS_RESERVED } },
  });
  return pages.map(readInventoryPage).filter((row) => row.reservation.active);
}

// Crea en el inventario las columnas de reserva que falten, incluidas las fórmulas de descuento.
export async function ensureReservationSchema(env, inventoryDb, contactsDbId) {
  const c = RESERVATION_COLUMNS;
  const baseColumns = {
    // Relación de un solo sentido: no añade columnas en la base Contactos
    [c.contact]: { relation: { database_id: contactsDbId, type: "single_property", single_property: {} } },
    [c.status]: {
      select: {
        options: [
          { name: STATUS_RESERVED, color: "yellow" },
          { name: STATUS_SOLD, color: "green" },
        ],
      },
    },
    [c.units]: { number: { format: "number" } },
    [c.agreedPrice]: { number: { format: "euro" } },
    [c.listPrice]: { number: { format: "euro" } },
    [c.date]: { date: {} },
  };
  // El descuento se calcula sobre el precio de venta anunciado al hacer la reserva
  const formulaColumns = {
    [c.discountAmount]: {
      formula: {
        expression: `if(prop("${c.listPrice}") > 0, (prop("${c.listPrice}") - prop("${c.agreedPrice}")) * prop("${c.units}"), 0)`,
      },
    },
    [c.discountPercent]: {
      formula: {
        expression: `if(prop("${c.listPrice}") > 0, round((prop("${c.listPrice}") - prop("${c.agreedPrice}")) / prop("${c.listPrice}") * 1000) / 10, 0)`,
      },
    },
  };

  const existing = inventoryDb.properties;
  const missing = (columns) => {
    const result = {};
    for (const [name, definition] of Object.entries(columns)) {
      const expectedType = Object.keys(definition)[0];
      const current = existing[name];
      if (!current) {
        result[name] = definition;
      } else if (current.type !== expectedType) {
        throw new ApiError(`La columna "${name}" del inventario debe ser de tipo ${expectedType} y es ${current.type}.`, 424);
      } else if (expectedType === "relation" && !sameId(current.relation.database_id, definition.relation.database_id)) {
        throw new ApiError(`La relación "${name}" del inventario apunta a otra base de datos.`, 424);
      }
    }
    return result;
  };

  // Las fórmulas van en una segunda llamada porque dependen de las columnas base
  for (const columns of [missing(baseColumns), missing(formulaColumns)]) {
    if (Object.keys(columns).length > 0) {
      await notionRequest(env, `databases/${inventoryDb.id}`, "PATCH", { properties: columns });
    }
  }
}

// ---------------------------------------------------------------------------
// Contactos
// ---------------------------------------------------------------------------

// Detecta las columnas de la base de contactos por tipo y, si no, por nombre.
export function getContactFields(contactsDb) {
  const entries = Object.entries(contactsDb.properties);
  const find = (type, pattern, fallbackTypes) =>
    entries.find(([name, p]) => p.type === type && pattern.test(normalizeString(name))) ||
    entries.find(([, p]) => p.type === type) ||
    entries.find(([name, p]) => fallbackTypes.includes(p.type) && pattern.test(normalizeString(name)));
  const toField = (entry) => (entry ? { key: entry[0], type: entry[1].type } : null);

  return {
    name: toField(entries.find(([, p]) => p.type === "title")),
    phone: toField(find("phone_number", /tel|tlf|tfno|movil|phone|whatsapp/, ["rich_text", "number"])),
    email: toField(find("email", /mail|correo/, ["rich_text"])),
  };
}

function readContactValue(page, field) {
  const prop = field && page.properties[field.key];
  if (!prop) return "";
  if (prop.type === "title") return plainText(prop.title);
  if (prop.type === "rich_text") return plainText(prop.rich_text);
  if (prop.type === "number") return prop.number === null ? "" : String(prop.number);
  return prop[prop.type] || "";
}

export function parseContact(page, fields) {
  return {
    id: page.id,
    name: readContactValue(page, fields.name) || "Sin nombre",
    phone: readContactValue(page, fields.phone),
    email: readContactValue(page, fields.email),
  };
}
