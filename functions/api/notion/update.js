import { verifySessionToken, getCookie, SESSION_COOKIE_NAME } from "../_auth.js";

function normalizeString(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Validar autenticación
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
      JSON.stringify({ error: "Configuración incompleta: NOTION_TOKEN o NOTION_DATABASE_ID no definidos." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const payload = await request.json();
    const { itemId, itemIds, title, retailPrice, secondHandPrice, purchasePrice, description, imageUrl, publicar, vendido, noVender, rawProperties, archived, isCreate, itemTitle, cantidad } = payload;

    const idsToUpdate = Array.isArray(itemIds) ? itemIds : [itemId].filter(Boolean);

    if (!isCreate && idsToUpdate.length === 0) {
      return new Response(
        JSON.stringify({ error: "Falta el parámetro requerido 'itemId' o 'itemIds'." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Obtener el esquema de la base de datos de Notion
    const dbResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Notion-Version": "2022-06-28",
      },
    });

    if (!dbResponse.ok) {
      const errorDetails = await dbResponse.text();
      console.error("Error al leer el esquema de la base de datos de Notion:", errorDetails);
      return new Response(
        JSON.stringify({ error: "No se pudo obtener el esquema de la base de datos de Notion." }),
        { status: dbResponse.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const dbSchema = await dbResponse.json();
    const properties = dbSchema.properties;

    // 3. Construir el payload de actualización para Notion
    const propertiesToUpdate = {};

    // 3.1 Procesar propiedades explícitas para compatibilidad con controles rápidos
    let saleTitleKey = "";
    let retailPriceKey = "";
    let retailPriceType = "";
    let secondHandPriceKey = "";
    let secondHandPriceType = "";
    let descriptionKey = "";
    let imageUrlKey = "";
    let publicarKey = "";
    let vendidoKey = "";
    let noVenderKey = "";
    let purchasePriceKey = "";
    let purchasePriceType = "";

    const saleTitlePossibles = ["titulo venta", "titulo_venta", "title venta"];
    const retailPricePossibles = ["precio original", "precio retail", "original price"];
    const secondHandPricePossibles = ["precio venta", "precio wallapop", "sale price", "precio"];
    const descriptionPossibles = ["descripcion wallapop", "descripcion", "description"];
    const imageUrlPossibles = ["imagen url", "imagen", "url imagen"];
    const publicarPossibles = ["publicar", "publicar web"];
    const vendidoPossibles = ["vendido", "sold"];
    const noVenderPossibles = ["no vender", "no_vender", "dont sell"];
    const purchasePricePossibles = ["precio compra", "precio_compra", "purchase price", "coste compra", "coste"];

    for (const key of Object.keys(properties)) {
      const normKey = normalizeString(key);
      const prop = properties[key];

      if (saleTitlePossibles.includes(normKey) && (prop.type === "rich_text" || prop.type === "title")) {
        saleTitleKey = key;
      } else if (retailPricePossibles.includes(normKey) && (prop.type === "number" || prop.type === "rich_text")) {
        retailPriceKey = key;
        retailPriceType = prop.type;
      } else if (secondHandPricePossibles.includes(normKey) && (prop.type === "number" || prop.type === "rich_text")) {
        secondHandPriceKey = key;
        secondHandPriceType = prop.type;
      } else if (descriptionPossibles.includes(normKey) && prop.type === "rich_text") {
        descriptionKey = key;
      } else if (imageUrlPossibles.includes(normKey) && (prop.type === "url" || prop.type === "rich_text")) {
        imageUrlKey = key;
      } else if (publicarPossibles.includes(normKey) && prop.type === "checkbox") {
        publicarKey = key;
      } else if (vendidoPossibles.includes(normKey) && prop.type === "checkbox") {
        vendidoKey = key;
      } else if (noVenderPossibles.includes(normKey) && prop.type === "checkbox") {
        noVenderKey = key;
      } else if (purchasePricePossibles.includes(normKey) && (prop.type === "number" || prop.type === "rich_text")) {
        purchasePriceKey = key;
        purchasePriceType = prop.type;
      }
    }

    if (saleTitleKey && title !== undefined) {
      const type = properties[saleTitleKey].type;
      if (type === "rich_text") {
        propertiesToUpdate[saleTitleKey] = { rich_text: [{ text: { content: title } }] };
      } else if (type === "title") {
        propertiesToUpdate[saleTitleKey] = { title: [{ text: { content: title } }] };
      }
    }

    if (retailPriceKey && retailPrice !== undefined) {
      const val = retailPrice === null || isNaN(Number(retailPrice)) ? null : Number(retailPrice);
      if (retailPriceType === "rich_text") {
        propertiesToUpdate[retailPriceKey] = { rich_text: [{ text: { content: val !== null ? String(val) : "" } }] };
      } else {
        propertiesToUpdate[retailPriceKey] = { number: val };
      }
    }

    if (secondHandPriceKey && secondHandPrice !== undefined) {
      const val = secondHandPrice === null || isNaN(Number(secondHandPrice)) ? null : Number(secondHandPrice);
      if (secondHandPriceType === "rich_text") {
        propertiesToUpdate[secondHandPriceKey] = { rich_text: [{ text: { content: val !== null ? String(val) : "" } }] };
      } else {
        propertiesToUpdate[secondHandPriceKey] = { number: val };
      }
    }

    if (descriptionKey && description !== undefined) {
      propertiesToUpdate[descriptionKey] = { rich_text: [{ text: { content: description } }] };
    }

    if (imageUrlKey && imageUrl !== undefined) {
      const type = properties[imageUrlKey].type;
      if (type === "url") {
        propertiesToUpdate[imageUrlKey] = { url: imageUrl || null };
      } else if (type === "rich_text") {
        propertiesToUpdate[imageUrlKey] = { rich_text: [{ text: { content: imageUrl } }] };
      }
    }

    if (publicarKey && publicar !== undefined) {
      propertiesToUpdate[publicarKey] = { checkbox: !!publicar };
    }

    if (vendidoKey && vendido !== undefined) {
      propertiesToUpdate[vendidoKey] = { checkbox: !!vendido };
    }

    if (noVenderKey && noVender !== undefined) {
      propertiesToUpdate[noVenderKey] = { checkbox: !!noVender };
    }

    if (purchasePriceKey && purchasePrice !== undefined) {
      const val = purchasePrice === null || isNaN(Number(purchasePrice)) ? null : Number(purchasePrice);
      if (purchasePriceType === "rich_text") {
        propertiesToUpdate[purchasePriceKey] = { rich_text: [{ text: { content: val !== null ? String(val) : "" } }] };
      } else {
        propertiesToUpdate[purchasePriceKey] = { number: val };
      }
    }

    // 3.2 Procesar propiedades arbitrarias del configurador de columnas
    if (rawProperties && typeof rawProperties === "object") {
      for (const col of Object.keys(rawProperties)) {
        const val = rawProperties[col];
        const prop = properties[col];
        if (!prop) continue;

        // Omitir columnas de solo lectura de Notion para evitar errores API
        if (prop.type === "formula" || prop.type === "relation" || prop.type === "rollup" || prop.type === "created_time" || prop.type === "last_edited_time") {
          continue;
        }

        if (prop.type === "checkbox") {
          propertiesToUpdate[col] = { checkbox: !!val };
        } else if (prop.type === "number") {
          propertiesToUpdate[col] = { number: val === "" || val === null || isNaN(Number(val)) ? null : Number(val) };
        } else if (prop.type === "select") {
          propertiesToUpdate[col] = { select: val ? { name: String(val) } : null };
        } else if (prop.type === "status") {
          propertiesToUpdate[col] = { status: val ? { name: String(val) } : null };
        } else if (prop.type === "multi_select") {
          const arr = Array.isArray(val) ? val : (val ? [String(val)] : []);
          propertiesToUpdate[col] = { multi_select: arr.map(name => ({ name })) };
        } else if (prop.type === "url") {
          propertiesToUpdate[col] = { url: val || null };
        } else if (prop.type === "rich_text") {
          propertiesToUpdate[col] = { rich_text: [{ text: { content: String(val || "") } }] };
        } else if (prop.type === "title") {
          propertiesToUpdate[col] = { title: [{ text: { content: String(val || "") } }] };
        } else if (prop.type === "date") {
          propertiesToUpdate[col] = { date: val ? { start: String(val) } : null };
        }
      }
    }

    // 3.3 Si es creación de un nuevo registro
    if (isCreate === true) {
      let primaryTitleKey = "";
      for (const key of Object.keys(properties)) {
        if (properties[key].type === "title") {
          primaryTitleKey = key;
          break;
        }
      }

      if (!primaryTitleKey) {
        return new Response(
          JSON.stringify({ error: "No se pudo encontrar la columna de título principal en tu base de datos de Notion." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Añadir la propiedad de título principal
      propertiesToUpdate[primaryTitleKey] = {
        title: [{ text: { content: itemTitle || "Nuevo Artículo" } }]
      };

      // Si existe columna de cantidad, establecer valor inicial
      let cantidadKey = "";
      for (const key of Object.keys(properties)) {
        if (normalizeString(key) === "cantidad" && properties[key].type === "number") {
          cantidadKey = key;
          break;
        }
      }
      if (cantidadKey) {
        propertiesToUpdate[cantidadKey] = { number: Number(cantidad || 1) };
      }

      const createResponse = await fetch(`https://api.notion.com/v1/pages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${notionToken}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties: propertiesToUpdate,
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error("Error al crear la página en Notion:", errorText);
        return new Response(
          JSON.stringify({ error: `Notion API Error: ${errorText}` }),
          { status: createResponse.status, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (Object.keys(propertiesToUpdate).length === 0 && archived !== true) {
      return new Response(
        JSON.stringify({
          error: "No se encontraron columnas en Notion donde guardar los datos."
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Actualizar o archivar (eliminar) los datos en Notion
    const promises = idsToUpdate.map(async (id) => {
      const bodyPayload = archived === true ? { archived: true } : { properties: propertiesToUpdate };

      const updateResponse = await fetch(`https://api.notion.com/v1/pages/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${notionToken}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyPayload),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Error en Notion al actualizar/eliminar la página ${id}: ${errorText}`);
      }
    });

    await Promise.all(promises);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Excepción en Notion update API:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Error interno al procesar los datos." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
