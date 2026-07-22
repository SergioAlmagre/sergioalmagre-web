function normalizeString(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getRichTextProp(properties, possibleNames) {
  const normalizedPossibles = possibleNames.map(normalizeString);
  for (const key of Object.keys(properties)) {
    if (normalizedPossibles.includes(normalizeString(key))) {
      const prop = properties[key];
      if (prop.type === "rich_text" && prop.rich_text) {
        return prop.rich_text.map((t) => t.plain_text).join("") || "";
      }
      if (prop.type === "url" && prop.url) {
        return prop.url;
      }
      if (prop.type === "title" && prop.title) {
        return prop.title.map((t) => t.plain_text).join("") || "";
      }
    }
  }
  return "";
}

function getNumberProp(properties, possibleNames) {
  const normalizedPossibles = possibleNames.map(normalizeString);
  for (const key of Object.keys(properties)) {
    if (normalizedPossibles.includes(normalizeString(key))) {
      const prop = properties[key];
      if (prop.type === "number" && prop.number !== undefined && prop.number !== null) {
        return prop.number;
      }
      if (prop.type === "rich_text" && prop.rich_text) {
        const textVal = prop.rich_text.map((t) => t.plain_text).join("").trim();
        const parsed = parseFloat(textVal.replace(/[^0-9.,-]/g, "").replace(",", "."));
        return isNaN(parsed) ? 0 : parsed;
      }
    }
  }
  return 0;
}

function getCheckboxProp(properties, possibleNames) {
  const normalizedPossibles = possibleNames.map(normalizeString);
  for (const key of Object.keys(properties)) {
    if (normalizedPossibles.includes(normalizeString(key))) {
      const prop = properties[key];
      if (prop.type === "checkbox") {
        return prop.checkbox || false;
      }
    }
  }
  return false;
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
    // 1. Consultar el esquema de Notion para saber si existe la columna de publicación
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

    let hasPublishColumn = false;
    if (schemaRes.ok) {
      const schemaData = await schemaRes.json();
      const properties = schemaData.properties || {};
      const publishPossibles = ["publicar", "publicar web"];
      for (const key of Object.keys(properties)) {
        if (publishPossibles.includes(normalizeString(key)) && properties[key].type === "checkbox") {
          hasPublishColumn = true;
          break;
        }
      }
    }

    // 2. Consultar todos los artículos con un bucle de paginación
    let hasMore = true;
    let startCursor = undefined;
    let allResults = [];

    while (hasMore) {
      const body = {
        sorts: [
          {
            timestamp: "last_edited_time",
            direction: "descending",
          },
        ],
      };

      if (startCursor) {
        body.start_cursor = startCursor;
      }

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
        const errorDetails = await response.text();
        console.error("Error al consultar Notion (público):", errorDetails);
        return new Response(
          JSON.stringify({ error: "No se pudieron obtener los artículos del catálogo." }),
          { status: response.status, headers: { "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      allResults = allResults.concat(data.results);
      hasMore = data.has_more;
      startCursor = data.next_cursor || undefined;
    }
    
    // Mapear y extraer
    const rawItems = allResults
      .map((page) => {
        let originalTitle = "Sin título";
        let naturaleza = "";
        let fabricante = "";

        for (const key in page.properties) {
          const prop = page.properties[key];
          if (prop.type === "title") {
            originalTitle = prop.title?.map((t) => t.plain_text).join("") || "Sin título";
          } else if (normalizeString(key) === "naturaleza" && prop.type === "select") {
            naturaleza = prop.select?.name || "";
          } else if (normalizeString(key) === "fabricante" && prop.type === "select") {
            fabricante = prop.select?.name || "";
          }
        }

        const saleTitle = getRichTextProp(page.properties, ["Titulo Venta", "Título Venta", "Title Venta"]);
        const retailPrice = getNumberProp(page.properties, ["Precio Original", "Precio Retail", "Original Price"]);
        const secondHandPrice = getNumberProp(page.properties, ["Precio Venta", "Precio Wallapop", "Sale Price", "Precio"]);
        const description = getRichTextProp(page.properties, ["Descripcion Wallapop", "Descripción Wallapop", "Descripcion"]);
        const imageUrl = getRichTextProp(page.properties, ["Imagen URL", "Imagen", "Url Imagen"]);
        const publicar = getCheckboxProp(page.properties, ["Publicar", "Publicar Web"]);
        const vendido = getCheckboxProp(page.properties, ["Vendido", "Sold"]);
        const noVender = getCheckboxProp(page.properties, ["No vender", "No_vender"]);
        const pageCantidad = getNumberProp(page.properties, ["Cantidad", "Stock", "Unidades", "Qty", "Quantity"]);

        const parts = [];
        if (naturaleza) parts.push(naturaleza);
        if (fabricante) parts.push(fabricante);
        if (originalTitle && originalTitle !== "Sin título") parts.push(originalTitle);
        const composedTitle = parts.join(" ") || originalTitle;

        return {
          id: page.id,
          title: saleTitle || composedTitle.trim(),
          retailPrice,
          secondHandPrice,
          savingsPercentage: retailPrice > 0 ? Math.round(((retailPrice - secondHandPrice) / retailPrice) * 100) : 0,
          description,
          imageUrl,
          publicar,
          vendido,
          noVender,
          pageCantidad,
          lastEdited: page.last_edited_time,
          naturaleza,
        };
      })
      .filter((item) => {
        // En catálogo público solo mostramos los marcados como Publicar, que NO estén marcados como No Vender y NO estén vendidos
        return item.publicar && !item.noVender && !item.vendido && item.title !== "Sin título" && item.title !== "";
      });

    // AGRUPAR POR NOMBRE COMERCIAL COMPUESTO (Ignorar diferencias menores)
    const groupedMap = {};

    for (const item of rawItems) {
      const groupKey = item.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

      if (!groupedMap[groupKey]) {
        groupedMap[groupKey] = {
          ...item,
          cantidad: item.pageCantidad > 0 ? item.pageCantidad : 1,
        };
      } else {
        const group = groupedMap[groupKey];
        group.cantidad += item.pageCantidad > 0 ? item.pageCantidad : 1;
        
        if (new Date(item.lastEdited) > new Date(group.lastEdited)) {
          group.lastEdited = item.lastEdited;
        }

        if (item.imageUrl && !group.imageUrl) {
          group.imageUrl = item.imageUrl;
        }
        if (item.description && !group.description) {
          group.description = item.description;
        }
      }
    }

    const items = Object.values(groupedMap);

    return new Response(
      JSON.stringify({ items }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60" // Cache por 60 segundos
        }
      }
    );
  } catch (error) {
    console.error("Excepción en public items API:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Error interno al conectar con Notion." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
