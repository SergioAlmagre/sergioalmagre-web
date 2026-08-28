const NOTION_VERSION = "2022-06-28";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function cleanEnvValue(value) {
  return String(value || "").trim().replace(/^['"]|['"]$/g, "");
}

function cleanDatabaseId(value) {
  return cleanEnvValue(value).split("?")[0].replace(/-/g, "");
}

function normalizeString(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function findProperty(properties, aliases, types = []) {
  const normalizedAliases = aliases.map(normalizeString);
  for (const key of Object.keys(properties)) {
    const property = properties[key];
    if (!normalizedAliases.includes(normalizeString(key))) continue;
    if (!types.length || types.includes(property.type)) return { key, property };
  }
  return null;
}

function textValue(value) {
  return [{ type: "text", text: { content: String(value) } }];
}

function propertyValue(propertyInfo, value) {
  if (propertyInfo.property.type === "email") return { email: value };
  if (propertyInfo.property.type === "rich_text") return { rich_text: textValue(value) };
  return null;
}

function getNotionHeaders(token, includeContentType = false) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
  };
  if (includeContentType) headers["Content-Type"] = "application/json";
  return headers;
}

async function notionFetch(path, token, options = {}) {
  return fetch(`https://api.notion.com/v1${path}`, {
    ...options,
    headers: {
      ...getNotionHeaders(token, Boolean(options.body)),
      ...(options.headers || {}),
    },
  });
}

async function readDatabase(databaseId, token) {
  const response = await notionFetch(`/databases/${databaseId}`, token);
  if (!response.ok) {
    console.error("Newsletter: no se pudo leer la base de datos de Notion", response.status, await response.text());
    throw new Error("NOTION_DATABASE_READ");
  }
  return response.json();
}

async function ensureProperties(databaseId, token, database) {
  let properties = database.properties || {};
  const required = [
    { aliases: ["fecha suscripcion", "fecha de suscripcion", "subscribed at"], key: "Fecha suscripcion", definition: { date: {} }, types: ["date"] },
    { aliases: ["activo", "active", "suscrito", "is active"], key: "Activo", definition: { checkbox: {} }, types: ["checkbox"] },
  ];
  const missing = {};

  for (const item of required) {
    if (!findProperty(properties, item.aliases, item.types)) missing[item.key] = item.definition;
  }

  if (Object.keys(missing).length === 0) return { database, properties };

  const patchResponse = await notionFetch(`/databases/${databaseId}`, token, {
    method: "PATCH",
    body: JSON.stringify({ properties: missing }),
  });
  if (!patchResponse.ok) {
    console.error("Newsletter: no se pudieron crear las columnas de Notion", await patchResponse.text());
    throw new Error("NOTION_SCHEMA_UPDATE");
  }

  const updatedDatabase = await readDatabase(databaseId, token);
  properties = updatedDatabase.properties || {};
  return { database: updatedDatabase, properties };
}

function buildProperties(propertyMap, { email, now }) {
  const values = {};
  const titleProperty = propertyMap.title;
  const emailProperty = propertyMap.email;
  const subscribedAtProperty = propertyMap.subscribedAt;
  const activeProperty = propertyMap.active;

  if (titleProperty) values[titleProperty.key] = { title: textValue(email) };
  if (emailProperty && emailProperty.key !== titleProperty?.key) values[emailProperty.key] = propertyValue(emailProperty, email);
  if (subscribedAtProperty) values[subscribedAtProperty.key] = { date: { start: now } };
  if (activeProperty) values[activeProperty.key] = { checkbox: true };

  return values;
}

async function queryByEmail(databaseId, token, emailProperty, email) {
  const filterType = emailProperty.property.type === "email"
    ? "email"
    : emailProperty.property.type === "title"
      ? "title"
      : "rich_text";
  const response = await notionFetch(`/databases/${databaseId}/query`, token, {
    method: "POST",
    body: JSON.stringify({
      page_size: 1,
      filter: {
        property: emailProperty.key,
        [filterType]: { equals: email },
      },
    }),
  });
  if (!response.ok) {
    console.error("Newsletter: no se pudo buscar el email en Notion", response.status, await response.text());
    throw new Error("NOTION_QUERY");
  }
  const data = await response.json();
  return data.results?.[0] || null;
}

async function updatePage(pageId, token, properties) {
  const response = await notionFetch(`/pages/${pageId}`, token, {
    method: "PATCH",
    body: JSON.stringify({ properties }),
  });
  if (!response.ok) {
    console.error("Newsletter: no se pudo reactivar el registro en Notion", response.status, await response.text());
    throw new Error("NOTION_PAGE_UPDATE");
  }
}

async function createPage(databaseId, token, properties) {
  const response = await notionFetch("/pages", token, {
    method: "POST",
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  });
  if (!response.ok) {
    console.error("Newsletter: no se pudo crear el registro en Notion", response.status, await response.text());
    throw new Error("NOTION_PAGE_CREATE");
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 10000) return json({ error: "Payload demasiado grande." }, 413);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "JSON no válido." }, 400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return json({ error: "Datos no válidos." }, 400);
  }

  // Do not spend a Notion request on obvious bot submissions.
  if (String(payload.website || "").trim()) return json({ ok: true });

  const email = String(payload.email || "").trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
    return json({ code: "invalid_data", error: "Datos no válidos." }, 400);
  }
  if (payload.consent !== true) {
    return json({ code: "consent_required", error: "El consentimiento es obligatorio." }, 400);
  }

  const token = cleanEnvValue(env.NEWSLETTER_NOTION_TOKEN || env.NOTION_NEWSLETTER_TOKEN || env.NOTION_TOKEN);
  const databaseId = cleanDatabaseId(env.NEWSLETTER_DATABASE_ID || env.NOTION_NEWSLETTER_DATABASE_ID);
  if (!token || !databaseId) {
    console.error("Newsletter: faltan NEWSLETTER_NOTION_TOKEN/NOTION_TOKEN o NEWSLETTER_DATABASE_ID.");
    return json({ error: "Newsletter no configurada en el servidor." }, 503);
  }

  try {
    const initialDatabase = await readDatabase(databaseId, token);
    const { properties } = await ensureProperties(databaseId, token, initialDatabase);
    const titleEntry = Object.entries(properties).find(([, property]) => property.type === "title");
    const propertyMap = {
      title: titleEntry ? { key: titleEntry[0], property: titleEntry[1] } : null,
      email: findProperty(properties, ["email", "correo", "e-mail"], ["email", "rich_text"]),
      subscribedAt: findProperty(properties, ["fecha suscripcion", "fecha de suscripcion", "subscribed at"], ["date"]),
      active: findProperty(properties, ["activo", "active", "suscrito", "is active"], ["checkbox"]),
    };
    const identityProperty = propertyMap.email || propertyMap.title;

    if (!propertyMap.title || !identityProperty || !propertyMap.subscribedAt || !propertyMap.active) {
      throw new Error("NOTION_SCHEMA_INCOMPLETE");
    }

    const existingPage = await queryByEmail(databaseId, token, identityProperty, email);
    if (existingPage) {
      const isActive = existingPage.properties?.[propertyMap.active.key]?.checkbox === true;
      if (isActive) return json({ ok: true, alreadySubscribed: true });

      const updateProperties = buildProperties(propertyMap, { email, now: new Date().toISOString() });
      await updatePage(existingPage.id, token, updateProperties);
      return json({ ok: true, reactivated: true });
    }

    const now = new Date().toISOString();
    const pageProperties = buildProperties(propertyMap, { email, now });
    await createPage(databaseId, token, pageProperties);
    return json({ ok: true, alreadySubscribed: false });
  } catch (error) {
    console.error("Newsletter: error interno", error.message);
    return json({ error: "No se pudo completar la suscripción." }, 500);
  }
}
