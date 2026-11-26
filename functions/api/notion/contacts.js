import { verifySessionToken, getCookie, SESSION_COOKIE_NAME } from "../_auth.js";
import {
  ApiError,
  errorResponse,
  findDatabase,
  getContactFields,
  jsonResponse,
  normalizeString,
  notionRequest,
  parseContact,
  queryAll,
} from "../_notion.js";

async function requireSession({ request, env }) {
  const token = getCookie(request, SESSION_COOKIE_NAME);
  if (!(await verifySessionToken(token, env))) throw new ApiError("No autorizado", 401);
}

async function loadContacts(env) {
  const database = await findDatabase(env, "NOTION_CONTACTS_DATABASE_ID", "Contactos");
  const fields = getContactFields(database);
  const pages = await queryAll(env, database.id);
  const contacts = pages
    .map((page) => parseContact(page, fields))
    .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
  return { database, fields, contacts };
}

export async function onRequestGet(context) {
  try {
    await requireSession(context);
    const { fields, contacts } = await loadContacts(context.env);
    return jsonResponse({ contacts, fields: { phone: !!fields.phone, email: !!fields.email } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPost(context) {
  try {
    await requireSession(context);
    const payload = await context.request.json();
    const name = String(payload.name || "").trim();
    const phone = String(payload.phone || "").trim();
    const email = String(payload.email || "").trim();
    if (!name) throw new ApiError("El nombre del contacto es obligatorio.", 400);

    const { database, fields, contacts } = await loadContacts(context.env);

    if (!payload.force) {
      const digits = (value) => value.replace(/\D/g, "");
      const duplicate = contacts.find((c) =>
        normalizeString(c.name) === normalizeString(name) ||
        (email && normalizeString(c.email) === normalizeString(email)) ||
        (digits(phone) && digits(c.phone) === digits(phone))
      );
      if (duplicate) {
        throw new ApiError(`Ya existe un contacto parecido: ${duplicate.name}.`, 409, { duplicate });
      }
    }

    const properties = {
      [fields.name.key]: { title: [{ text: { content: name } }] },
    };
    for (const [field, value] of [[fields.phone, phone], [fields.email, email]]) {
      if (!field || !value) continue;
      if (field.type === "number") {
        const number = Number(value.replace(/[^0-9]/g, ""));
        if (!number) throw new ApiError(`"${field.key}" solo admite números.`, 400);
        properties[field.key] = { number };
      } else if (field.type === "rich_text") {
        properties[field.key] = { rich_text: [{ text: { content: value } }] };
      } else {
        properties[field.key] = { [field.type]: value };
      }
    }

    const page = await notionRequest(context.env, "pages", "POST", {
      parent: { database_id: database.id },
      properties,
    });
    return jsonResponse({ contact: parseContact(page, fields) }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
