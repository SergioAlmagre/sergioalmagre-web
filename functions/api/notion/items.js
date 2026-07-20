import { verifySessionToken, getCookie, SESSION_COOKIE_NAME } from "../_auth.js";

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
    // 2. Obtener el esquema de la base de datos de Notion
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
      const errText = await schemaRes.text();
      console.error("Fallo al leer esquema de Notion:", errText);
      return new Response(
        JSON.stringify({ error: "No se pudo leer el esquema de Notion." }),
        { status: schemaRes.status, headers: { "Content-Type": "application/json" } }
      );
    }

    let schemaData = await schemaRes.json();
    let properties = schemaData.properties || {};

    // 3. Comprobar cuáles de las columnas de venta faltan en Notion
    let hasPublicar = false;
    let hasTituloVenta = false;
    let hasPrecioVenta = false;
    let hasPrecioOriginal = false;
    let hasDescripcion = false;
    let hasImagenUrl = false;
    let hasNoVender = false;
    let hasUnidadesVendidas = false;
    let hasTotalIngresado = false;

    for (const key of Object.keys(properties)) {
      const norm = normalizeString(key);
      const prop = properties[key];

      if (norm === "publicar" && prop.type === "checkbox") hasPublicar = true;
      if (norm === "titulo venta" && prop.type === "rich_text") hasTituloVenta = true;
      if (norm === "precio venta" && (prop.type === "number" || prop.type === "rich_text")) hasPrecioVenta = true;
      if (norm === "precio original" && (prop.type === "number" || prop.type === "rich_text")) hasPrecioOriginal = true;
      if (norm === "descripcion wallapop" && prop.type === "rich_text") hasDescripcion = true;
      if (norm === "imagen url" && (prop.type === "url" || prop.type === "rich_text")) hasImagenUrl = true;
      if (norm === "no vender" && prop.type === "checkbox") hasNoVender = true;
      if (norm === "unidades vendidas" && prop.type === "number") hasUnidadesVendidas = true;
      if (norm === "total ingresado" && prop.type === "number") hasTotalIngresado = true;
    }

    // 4. Si falta alguna columna de venta, crearla de forma automática
    const propertiesToCreate = {};
    if (!hasPublicar) propertiesToCreate["Publicar"] = { checkbox: {} };
    if (!hasTituloVenta) propertiesToCreate["Titulo Venta"] = { rich_text: {} };
    if (!hasPrecioVenta) propertiesToCreate["Precio Venta"] = { number: { format: "number" } };
    if (!hasPrecioOriginal) propertiesToCreate["Precio Original"] = { number: { format: "number" } };
    if (!hasDescripcion) propertiesToCreate["Descripcion Wallapop"] = { rich_text: {} };
    if (!hasImagenUrl) propertiesToCreate["Imagen URL"] = { url: {} };
    if (!hasNoVender) propertiesToCreate["No vender"] = { checkbox: {} };
    if (!hasUnidadesVendidas) propertiesToCreate["Unidades Vendidas"] = { number: { format: "number" } };
    if (!hasTotalIngresado) propertiesToCreate["Total Ingresado"] = { number: { format: "euro" } };

    if (Object.keys(propertiesToCreate).length > 0) {
      console.log("Detectadas columnas faltantes. Creándolas en Notion:", Object.keys(propertiesToCreate));
      const patchSchemaRes = await fetch(
        `https://api.notion.com/v1/databases/${databaseId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${notionToken}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ properties: propertiesToCreate }),
        }
      );

      if (patchSchemaRes.ok) {
        console.log("Columnas de venta autogeneradas correctamente en Notion.");
        const reReadRes = await fetch(
          `https://api.notion.com/v1/databases/${databaseId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${notionToken}`,
              "Notion-Version": "2022-06-28",
            },
          }
        );
        if (reReadRes.ok) {
          schemaData = await reReadRes.json();
          properties = schemaData.properties || {};
        }
      } else {
        console.error("Fallo al autogenerar columnas en Notion:", await patchSchemaRes.text());
      }
    }

    // 5. Mapear columnas dinámicas del esquema
    const notionSchema = {};
    for (const key in properties) {
      const prop = properties[key];
      if (prop.type === "select") {
        notionSchema[key] = {
          type: "select",
          options: prop.select?.options?.map((o) => o.name) || [],
        };
      } else if (prop.type === "multi_select") {
        notionSchema[key] = {
          type: "multi_select",
          options: prop.multi_select?.options?.map((o) => o.name) || [],
        };
      } else if (prop.type === "status") {
        notionSchema[key] = {
          type: "status",
          options: prop.status?.options?.map((o) => o.name) || [],
        };
      } else if (prop.type === "checkbox") {
        notionSchema[key] = { type: "checkbox" };
      } else if (prop.type === "number") {
        notionSchema[key] = { type: "number" };
      } else if (prop.type === "rich_text") {
        notionSchema[key] = { type: "rich_text" };
      } else if (prop.type === "title") {
        notionSchema[key] = { type: "title" };
      } else if (prop.type === "relation") {
        notionSchema[key] = { type: "relation" };
      } else if (prop.type === "date") {
        notionSchema[key] = { type: "date" };
      } else if (prop.type === "formula") {
        notionSchema[key] = { type: "formula" };
      }
    }

    // 6. Consultar todos los items usando paginación
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
        console.error("Error al consultar Notion items:", errorDetails);
        return new Response(
          JSON.stringify({ error: `Error de la API de Notion: ${response.statusText}` }),
          { status: response.status, headers: { "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      allResults = allResults.concat(data.results);
      hasMore = data.has_more;
      startCursor = data.next_cursor || undefined;
    }

    // 7. Mapear y extraer los títulos y propiedades enriquecidas de forma dinámica
    const rawItems = allResults
      .map((page) => {
        let originalTitle = "Sin título";
        for (const key in page.properties) {
          const prop = page.properties[key];
          if (prop.type === "title") {
            originalTitle = prop.title?.map((t) => t.plain_text).join("") || "Sin título";
            break;
          }
        }

        const saleTitle = getRichTextProp(page.properties, ["Titulo Venta", "Título Venta", "Title Venta"]);
        const retailPrice = getNumberProp(page.properties, ["Precio Original", "Precio Retail", "Original Price"]);
        const secondHandPrice = getNumberProp(page.properties, ["Precio Venta", "Precio Wallapop", "Sale Price", "Precio"]);
        const purchasePrice = getNumberProp(page.properties, ["Precio Compra", "Precio_Compra", "Purchase Price", "Coste Compra", "Coste"]);
        const description = getRichTextProp(page.properties, ["Descripcion Wallapop", "Descripción Wallapop", "Descripcion"]);
        const imageUrl = getRichTextProp(page.properties, ["Imagen URL", "Imagen", "Url Imagen"]);
        const publicar = getCheckboxProp(page.properties, ["Publicar", "Publicar Web"]); 

        const rawProperties = {};
        for (const key in page.properties) {
          const prop = page.properties[key];
          if (prop.type === "select") {
            rawProperties[key] = prop.select?.name || null;
          } else if (prop.type === "multi_select") {
            rawProperties[key] = prop.multi_select?.map((s) => s.name) || [];
          } else if (prop.type === "status") {
            rawProperties[key] = prop.status?.name || null;
          } else if (prop.type === "checkbox") {
            rawProperties[key] = prop.checkbox || false;
          } else if (prop.type === "number") {
            rawProperties[key] = prop.number !== null && prop.number !== undefined ? prop.number : null;
          } else if (prop.type === "rich_text") {
            rawProperties[key] = prop.rich_text?.map((t) => t.plain_text).join("") || "";
          } else if (prop.type === "title") {
            rawProperties[key] = prop.title?.map((t) => t.plain_text).join("") || "";
          } else if (prop.type === "relation") {
            rawProperties[key] = prop.relation?.map((r) => r.id) || [];
          } else if (prop.type === "date") {
            rawProperties[key] = prop.date?.start || "";
          } else if (prop.type === "formula") {
            const f = prop.formula;
            if (f) {
              if (f.type === "string") rawProperties[key] = f.string || "";
              else if (f.type === "number") rawProperties[key] = f.number || 0;
              else if (f.type === "boolean") rawProperties[key] = f.boolean || false;
              else if (f.type === "date") rawProperties[key] = f.date?.start || "";
            } else {
              rawProperties[key] = "";
            }
          }
        }

        const vendido = getCheckboxProp(page.properties, ["Vendido", "Sold"]);
        const noVender = getCheckboxProp(page.properties, ["No vender", "No_vender"]);

        let unidadesVendidas = getNumberProp(page.properties, ["Unidades Vendidas", "UnidadesVendidas"]);
        let totalIngresado = getNumberProp(page.properties, ["Total Ingresado", "TotalIngresado"]);

        // Fallback para items antiguos marcados como Vendido (checkbox)
        if (vendido) {
          if (!unidadesVendidas || unidadesVendidas === 0) {
            unidadesVendidas = 1;
          }
          if (!totalIngresado || totalIngresado === 0) {
            totalIngresado = secondHandPrice || 0;
          }
        }

        return {
          id: page.id,
          title: originalTitle.trim(),
          lastEdited: page.last_edited_time,
          enriched: {
            title: saleTitle || originalTitle.trim(),
            retailPrice,
            secondHandPrice,
            purchasePrice,
            savingsPercentage: retailPrice > 0 ? Math.round(((retailPrice - secondHandPrice) / retailPrice) * 100) : 0,
            description,
            imageUrl,
            isAnalyzed: !!(secondHandPrice || description || imageUrl),
            publicar,
            vendido,
            noVender,
            unidadesVendidas,
            totalIngresado,
          },
          rawProperties,
        };
      })
      .filter((item) => item.title !== "Sin título" && item.title !== "");

    // 8. AGRUPAR FILAS DUPLICADAS por su Nombre Compuesto (Naturaleza + Fabricante + Modelo)
    const groupedMap = {};

    for (const item of rawItems) {
      const naturaleza = String(item.rawProperties["Naturaleza"] || "").trim();
      const fabricante = String(item.rawProperties["Fabricante"] || "").trim();
      const modelo = item.title.trim();
      const groupKey = [naturaleza, fabricante, modelo]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      const rawCant = item.rawProperties["Cantidad"] ?? item.rawProperties["cantidad"] ?? item.rawProperties["Stock"] ?? item.rawProperties["stock"] ?? item.rawProperties["Unidades"] ?? item.rawProperties["unidades"];
      const itemCant = (rawCant !== null && rawCant !== undefined && !isNaN(Number(rawCant)) && Number(rawCant) > 0) ? Number(rawCant) : 1;

      if (!groupedMap[groupKey]) {
        groupedMap[groupKey] = {
          ...item,
          itemIds: [item.id],
          cantidad: itemCant,
          unidadesVendidas: item.enriched.unidadesVendidas || 0,
          totalIngresado: item.enriched.totalIngresado || 0,
        };
      } else {
        const group = groupedMap[groupKey];
        group.cantidad = (group.cantidad || 0) + itemCant;
        group.unidadesVendidas = (group.unidadesVendidas || 0) + (item.enriched.unidadesVendidas || 0);
        group.totalIngresado = (group.totalIngresado || 0) + (item.enriched.totalIngresado || 0);
        group.itemIds.push(item.id);

        if (new Date(item.lastEdited) > new Date(group.lastEdited)) {
          group.lastEdited = item.lastEdited;
        }

        const currentIsAnalyzed = item.enriched.isAnalyzed;
        const groupIsAnalyzed = group.enriched.isAnalyzed;
        if (currentIsAnalyzed && !groupIsAnalyzed) {
          group.enriched = item.enriched;
        }
      }
    }

    const items = Object.values(groupedMap);

    return new Response(
      JSON.stringify({ items, schema: notionSchema }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Excepción en Notion API items endpoint:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Error interno al conectar con Notion." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
