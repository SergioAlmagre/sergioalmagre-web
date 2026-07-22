// Public endpoint to get categories with images
// Returns all categories derived from items + any custom image selections

function normalizeString(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export async function onRequestGet(context) {
  const { env } = context;
  const notionToken = env.NOTION_TOKEN?.trim().replace(/^["']|["']$/g, "");
  const databaseId = env.NOTION_DATABASE_ID?.trim().replace(/^["']|["']$/g, "").split("?")[0].replace(/-/g, "");

  if (!notionToken || !databaseId) {
    return new Response(
      JSON.stringify({ error: "Configuración de Notion incompleta en el servidor." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // 1. Get the schema to understand property types
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

    // Find property names
    let naturalezaKey = "";
    let imageUrlKey = "";
    let publicarKey = "";
    let vendidoKey = "";
    let noVenderKey = "";
    let cantidadKey = "";
    let descriptionKey = "";
    let configDescKey = ""; // rich_text property to store config JSON

    for (const key of Object.keys(properties)) {
      const normKey = normalizeString(key);
      const prop = properties[key];
      if (normKey === "naturaleza" && prop.type === "select") {
        naturalezaKey = key;
      } else if ((normKey === "imagen url" || normKey === "imagen" || normKey === "url imagen") && (prop.type === "url" || prop.type === "rich_text")) {
        imageUrlKey = key;
      } else if ((normKey === "publicar" || normKey === "publicar web") && prop.type === "checkbox") {
        publicarKey = key;
      } else if ((normKey === "vendido" || normKey === "sold") && prop.type === "checkbox") {
        vendidoKey = key;
      } else if ((normKey === "no vender" || normKey === "no_vender" || normKey === "no vender") && prop.type === "checkbox") {
        noVenderKey = key;
      } else if ((normKey === "cantidad" || normKey === "stock" || normKey === "unidades" || normKey === "qty" || normKey === "quantity") && prop.type === "number") {
        cantidadKey = key;
      }
    }

    // Pick a rich_text key to store config
    for (const key of Object.keys(properties)) {
      const prop = properties[key];
      if (prop.type === "rich_text" && normalizeString(key) !== "descripcion wallapop" && normalizeString(key) !== "descripcion" && normalizeString(key) !== "description") {
        configDescKey = key;
        break;
      }
    }
    // Fallback to any rich_text
    if (!configDescKey) {
      for (const key of Object.keys(properties)) {
        const prop = properties[key];
        if (prop.type === "rich_text") {
          configDescKey = key;
          break;
        }
      }
    }

    // Find primary title key
    let titleKey = "";
    for (const key of Object.keys(properties)) {
      if (properties[key].type === "title") {
        titleKey = key;
        break;
      }
    }

    // 2. Query all items
    let hasMore = true;
    let startCursor = undefined;
    let allResults = [];

    while (hasMore) {
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
      allResults = allResults.concat(data.results);
      hasMore = data.has_more;
      startCursor = data.next_cursor || undefined;
    }

    // 3. Parse items and extract categories
    const categoriesMap = {};
    let configJson = {};

    for (const page of allResults) {
      const props = page.properties;
      let naturaleza = "";
      let imageUrl = "";
      let title = "";
      let isPublicar = false;
      let isVendido = false;
      let isNoVender = false;
      let cantidad = 1;
      let isConfigPage = false;

      for (const key of Object.keys(props)) {
        const prop = props[key];
        if (prop.type === "title") {
          title = prop.title?.map(t => t.plain_text).join("") || "";
        }
      }

      // Check if this is the config page
      if (title.includes("⚙️ Category Images Config")) {
        isConfigPage = true;
        // Try to read config from a rich_text property
        if (configDescKey) {
          const configProp = props[configDescKey];
          if (configProp?.type === "rich_text" && configProp.rich_text) {
            try {
              const raw = configProp.rich_text.map(t => t.plain_text).join("");
              configJson = JSON.parse(raw);
            } catch (_) {}
          }
        }
        continue;
      }

      // Read properties
      for (const key of Object.keys(props)) {
        const prop = props[key];
        if (naturalezaKey && normalizeString(key) === normalizeString(naturalezaKey) && prop.type === "select") {
          naturaleza = prop.select?.name || "";
        }
        if (imageUrlKey && normalizeString(key) === normalizeString(imageUrlKey)) {
          if (prop.type === "url") imageUrl = prop.url || "";
          else if (prop.type === "rich_text") imageUrl = prop.rich_text?.map(t => t.plain_text).join("") || "";
        }
        if (publicarKey && normalizeString(key) === normalizeString(publicarKey) && prop.type === "checkbox") {
          isPublicar = prop.checkbox || false;
        }
        if (vendidoKey && normalizeString(key) === normalizeString(vendidoKey) && prop.type === "checkbox") {
          isVendido = prop.checkbox || false;
        }
        if (noVenderKey && normalizeString(key) === normalizeString(noVenderKey) && prop.type === "checkbox") {
          isNoVender = prop.checkbox || false;
        }
        if (cantidadKey && normalizeString(key) === normalizeString(cantidadKey) && prop.type === "number") {
          cantidad = prop.number || 1;
        }
      }

      if (!naturaleza) continue;

      // Solo mostrar categorías con artículos publicados
      if (!isPublicar || isVendido || isNoVender) continue;

      // Add to categories
      if (!categoriesMap[naturaleza]) {
        categoriesMap[naturaleza] = {
          name: naturaleza,
          images: [],
          itemCount: 0,
        };
      }
      categoriesMap[naturaleza].itemCount += cantidad;
      if (imageUrl && !categoriesMap[naturaleza].images.includes(imageUrl)) {
        categoriesMap[naturaleza].images.push(imageUrl);
      }
    }

    // 4. Build response (sorted alphabetically by name)
    const categories = Object.values(categoriesMap)
      .map(cat => ({
        name: cat.name,
        imageUrl: configJson[cat.name] || cat.images[0] || "",
        images: cat.images,
        itemCount: cat.itemCount,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));

    return new Response(
      JSON.stringify({ categories, configJson }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60"
        }
      }
    );
  } catch (error) {
    console.error("Excepción en public category-images API:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Error interno." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
