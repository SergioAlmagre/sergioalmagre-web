import { verifySessionToken, getCookie, SESSION_COOKIE_NAME } from "./_auth.js";

function normalizeString(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // Auth check
  const sessionToken = getCookie(request, SESSION_COOKIE_NAME);
  const isAuthenticated = await verifySessionToken(sessionToken, env);
  if (!isAuthenticated) {
    return new Response(
      JSON.stringify({ error: "No autorizado" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const notionToken = env.NOTION_TOKEN?.trim().replace(/^["']|["']$/g, "");
  const databaseId = env.NOTION_DATABASE_ID?.trim().replace(/^["']|["']$/g, "").split("?")[0].replace(/-/g, "");

  if (!notionToken || !databaseId) {
    return new Response(
      JSON.stringify({ error: "Configuración incompleta." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const payload = await request.json();
    const { category, imageUrl, fullConfig } = payload;

    // 1. Get database schema to find property names
    const schemaRes = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${notionToken}`,
          "Notion-Version": "2022-06-28",
        },
      }
    );

    if (!schemaRes.ok) {
      return new Response(
        JSON.stringify({ error: "No se pudo obtener el esquema de Notion." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const schemaData = await schemaRes.json();
    const properties = schemaData.properties || {};

    // Find title key, publicar key, and a rich_text key for config storage
    let titleKey = "";
    let publicarKey = "";
    let configDescKey = "";

    for (const key of Object.keys(properties)) {
      const prop = properties[key];
      if (prop.type === "title") titleKey = key;
      else if (prop.type === "rich_text" && !configDescKey) configDescKey = key;
      else if ((normalizeString(key) === "publicar" || normalizeString(key) === "publicar web") && prop.type === "checkbox") publicarKey = key;
    }

    if (!titleKey || !configDescKey) {
      return new Response(
        JSON.stringify({ error: "La base de datos debe tener una columna de título y al menos una de texto." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Query all pages to find the config page
    const CONFIG_TITLE = "⚙️ Category Images Config";
    let configPageId = null;

    let hasMore = true;
    let startCursor = undefined;

    while (hasMore && !configPageId) {
      const body = { page_size: 100 };
      if (startCursor) body.start_cursor = startCursor;

      const response = await fetch(
        `https://api.notion.com/v1/databases/${databaseId}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${notionToken}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: "Error al consultar Notion." }),
          { status: response.status, headers: { "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      for (const page of data.results) {
        const titleProp = page.properties[titleKey];
        const pageTitle = titleProp?.title?.map(t => t.plain_text).join("") || "";
        if (pageTitle === CONFIG_TITLE) {
          configPageId = page.id;
          break;
        }
      }

      hasMore = data.has_more;
      startCursor = data.next_cursor || undefined;
    }

    // 3. Read existing config or start fresh
    let currentConfig = {};
    if (configPageId) {
      // Read existing config from the config page
      const pageRes = await fetch(`https://api.notion.com/v1/pages/${configPageId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${notionToken}`,
          "Notion-Version": "2022-06-28",
        },
      });

      if (pageRes.ok) {
        const pageData = await pageRes.json();
        const configProp = pageData.properties[configDescKey];
        if (configProp?.type === "rich_text" && configProp.rich_text) {
          try {
            const raw = configProp.rich_text.map(t => t.plain_text).join("");
            currentConfig = JSON.parse(raw);
          } catch (_) {}
        }
      }
    }

    // 4. Update config
    if (fullConfig && typeof fullConfig === "object") {
      currentConfig = fullConfig;
    } else if (category) {
      currentConfig[category] = imageUrl || "";
    }

    const configJson = JSON.stringify(currentConfig);

    // 5. Save to Notion
    const configProperties = {
      [titleKey]: { title: [{ text: { content: CONFIG_TITLE } }] },
      [configDescKey]: { rich_text: [{ text: { content: configJson } }] },
    };

    // Also uncheck publicar so it doesn't show in public items
    if (publicarKey) {
      configProperties[publicarKey] = { checkbox: false };
    }

    if (configPageId) {
      // Update existing page
      const updateRes = await fetch(`https://api.notion.com/v1/pages/${configPageId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${notionToken}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ properties: configProperties }),
      });

      if (!updateRes.ok) {
        const errText = await updateRes.text();
        throw new Error(`Error al actualizar: ${errText}`);
      }
    } else {
      // Create new config page
      const createRes = await fetch(`https://api.notion.com/v1/pages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${notionToken}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties: configProperties,
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        throw new Error(`Error al crear: ${errText}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, config: currentConfig }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Excepción en category-images POST:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Error interno." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
