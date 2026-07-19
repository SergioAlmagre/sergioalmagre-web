import { verifySessionToken, getCookie, SESSION_COOKIE_NAME } from "./_auth.js";

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

  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title");
  const cantidad = parseInt(searchParams.get("cantidad") || "1", 10) || 1;
  const clientModel = searchParams.get("model");

  if (!title) {
    return new Response(
      JSON.stringify({ error: "Falta el parámetro requerido 'title'." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const rawGroqKey = (env.GROQ_API_KEY || env.XAI_API_KEY || "").trim().replace(/^["']|["']$/g, "");
  let groqApiKey = rawGroqKey;
  if (groqApiKey.includes("gsk_")) {
    const match = groqApiKey.match(/gsk_[a-zA-Z0-9_-]+/);
    if (match) {
      groqApiKey = match[0];
    }
  }

  const deepseekApiKey = (env.DEEPSEEK_API_KEY || "").trim().replace(/^["']|["']$/g, "");
  const customLlmKey = (env.LLM_KEY || "").trim().replace(/^["']|["']$/g, "");
  const hasKey = groqApiKey || deepseekApiKey || customLlmKey;

  const rawTavilyKey = env.TAVILY_API_KEY?.trim().replace(/^["']|["']$/g, "") || "";
  const tavilyApiKey = rawTavilyKey.startsWith("tvly-tvly-")
    ? rawTavilyKey.replace("tvly-tvly-", "tvly-")
    : rawTavilyKey;

  if (!hasKey) {
    return new Response(
      JSON.stringify({ error: "No se ha configurado ninguna API Key para el modelo de lenguaje (GROQ_API_KEY, DEEPSEEK_API_KEY, XAI_API_KEY o LLM_KEY)." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!tavilyApiKey) {
    return new Response(
      JSON.stringify({ error: "La variable de entorno TAVILY_API_KEY no está configurada." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Detección automática o explícita del proveedor, modelo y credenciales a usar
  let llmUrl = "https://api.xai.com/v1/chat/completions";
  let llmModel = clientModel || env.LLM_MODEL || "grok-2-latest";
  let llmAuthKey = groqApiKey;

  // Si el cliente seleccionó explícitamente un modelo, determinamos el proveedor
  if (clientModel) {
    if (clientModel.startsWith("deepseek-")) {
      llmUrl = "https://api.deepseek.com/chat/completions";
      llmAuthKey = deepseekApiKey || customLlmKey || groqApiKey;
    } else if (clientModel.includes("llama") || clientModel.includes("mixtral")) {
      llmUrl = "https://api.groq.com/openai/v1/chat/completions";
      llmAuthKey = groqApiKey || customLlmKey;
    } else {
      llmUrl = env.LLM_URL || "https://api.xai.com/v1/chat/completions";
      llmAuthKey = customLlmKey || groqApiKey;
    }
  } else {
    // Si no hay modelo del cliente, usamos la autodetección tradicional por variables de entorno
    if (env.LLM_URL) {
      llmUrl = env.LLM_URL;
      llmModel = env.LLM_MODEL || "llama-3.1-8b-instant";
      llmAuthKey = customLlmKey || groqApiKey || deepseekApiKey;
    } else if (deepseekApiKey) {
      llmUrl = "https://api.deepseek.com/chat/completions";
      llmModel = env.LLM_MODEL || "deepseek-chat";
      llmAuthKey = deepseekApiKey;
    } else if (groqApiKey) {
      if (groqApiKey.startsWith("gsk_")) {
        llmUrl = "https://api.groq.com/openai/v1/chat/completions";
        llmModel = env.LLM_MODEL || "llama-3.3-70b-versatile";
      } else {
        llmUrl = "https://api.xai.com/v1/chat/completions";
        llmModel = env.LLM_MODEL || "grok-2-latest";
      }
      llmAuthKey = groqApiKey;
    }
  }

  try {
    console.log(`Buscando en Internet via Tavily para: "${title}"`);

    const [tavilyResNew, tavilyResUsed] = await Promise.all([
      fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyApiKey,
          query: `${title} precio comprar nuevo tienda españa`,
          search_depth: "basic",
          include_images: true,
          max_results: 3,
        }),
      }),
      fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyApiKey,
          query: `${title} segunda mano precio wallapop ebay milanuncios`,
          search_depth: "basic",
          include_images: false,
          max_results: 3,
        }),
      }),
    ]);

    let tavilyContext = "No se encontraron resultados de búsqueda relevantes en tiempo real.";
    let imageUrl = "";
    const contextParts = [];

    if (tavilyResNew.ok) {
      const tavilyDataNew = await tavilyResNew.json();
      if (tavilyDataNew.results && tavilyDataNew.results.length > 0) {
        contextParts.push("=== PRECIO NUEVO (tiendas) ===");
        contextParts.push(
          tavilyDataNew.results
            .map((r) => `Fuente: ${r.title} (${r.url})\nContenido: ${r.content}`)
            .join("\n\n")
        );
      }
      if (tavilyDataNew.images && tavilyDataNew.images.length > 0) {
        imageUrl = tavilyDataNew.images[0];
      }
    } else {
      console.error("Error al consultar Tavily (precio nuevo):", await tavilyResNew.text());
    }

    if (tavilyResUsed.ok) {
      const tavilyDataUsed = await tavilyResUsed.json();
      if (tavilyDataUsed.results && tavilyDataUsed.results.length > 0) {
        contextParts.push("=== PRECIO SEGUNDA MANO (Wallapop/eBay/Milanuncios) ===");
        contextParts.push(
          tavilyDataUsed.results
            .map((r) => `Fuente: ${r.title} (${r.url})\nContenido: ${r.content}`)
            .join("\n\n")
        );
      }
    } else {
      console.error("Error al consultar Tavily (segunda mano):", await tavilyResUsed.text());
    }

    if (contextParts.length > 0) {
      tavilyContext = contextParts.join("\n\n");
    }

    // 2. Consultar el LLM
    console.log(`Consultando LLM (${llmModel}) con contexto recuperado...`);
    const grokRes = await fetch(llmUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${llmAuthKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: llmModel,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Eres un tasador experto de material audiovisual en España y un redactor estrella de anuncios de venta. Analiza los resultados de búsqueda de internet proporcionados para redactar un anuncio fiel y precios realistas. Responde exclusivamente con un objeto JSON válido. NUNCA confundas el artículo solicitado con modelos de gama superior o premium aunque aparezcan en los resultados de búsqueda."
          },
          {
            role: "user",
            content: `Artículo a tasar: "${title}"
            
Resultados de búsqueda en tiempo real de Internet:
${tavilyContext}

INSTRUCCIONES CRÍTICAS SOBRE PRECIOS (léelas con atención):
- Identifica EXACTAMENTE el modelo "${title}". NO uses precios de modelos similares de gama superior.
- TODOS los precios son SIEMPRE POR UNIDAD INDIVIDUAL. Si en los resultados aparecen precios de packs, lotes o kits (ej: "pack de 4 unidades por 120€"), divide entre el número de unidades para obtener el precio unitario.
- Si los resultados de búsqueda muestran precios muy dispares, usa el precio más bajo coherente para este modelo exacto vendido de forma individual.
- retailPrice DEBE ser el precio real por unidad del artículo nuevo. Si supera 3000€ es muy probable que hayas confundido el modelo.
- secondHandPrice SIEMPRE debe ser MENOR que retailPrice. Si no encuentras datos fiables de segunda mano, aplica un descuento del 30-50% sobre el retailPrice.

INSTRUCCIONES CRÍTICAS SOBRE EL TÍTULO:
- title: Título SEO en español, máx. 100 caracteres.
- Empieza con el nombre completo del producto tal como está en "${title}".
- Si quedan caracteres disponibles, añade 1-2 palabras clave técnicas específicas del artículo que un comprador podría buscar (ej: tipo de conector, tecnología, uso habitual, estándar técnico). 
- NUNCA uses palabras genéricas como "segunda mano", "buen estado", "usado", "oferta", "barato" o similares.
- Las palabras clave añadidas NO deben repetir palabras ya presentes en "${title}".
- NO incluyas el precio en el título.

Basándote en los resultados de búsqueda y en tu conocimiento, devuelve:
- title: Título SEO del anuncio (máx. 100 caracteres, sin precio, sin genéricos).
- retailPrice: Precio real POR UNIDAD del artículo nuevo en España en euros (entero).
- secondHandPrice: Precio de venta de segunda mano POR UNIDAD, el más alto posible pero coherente, SIEMPRE inferior a retailPrice, en euros (entero).
- savingsPercentage: Porcentaje entero de ahorro respecto a nuevo.
- description: Descripción de venta en español atractiva, profesional y estructurada. Sin markdown, solo saltos de línea y emojis. Incluye:
  1. Gancho comercial sobre el estado y rendimiento del producto.
  2. Características clave y especificaciones técnicas concretas extraídas de las fuentes.
  3. ${cantidad > 1 ? `Menciona que dispones de ${cantidad} unidades disponibles y que el precio indicado es POR UNIDAD.` : ""} Explicación de la oportunidad de ahorro (comparando el precio retail vs el de segunda mano).
  4. Cierre formal invitando a contactar ("¡Pregúntame sin compromiso!").

Devuelve estrictamente este formato JSON:
{
  "title": "Nombre técnico del producto + keyword específica",
  "retailPrice": 150,
  "secondHandPrice": 80,
  "savingsPercentage": 47,
  "description": "..."
}`
          }
        ],
        temperature: 0.4,
      }),
    });

    if (!grokRes.ok) {
      const errorText = await grokRes.text();
      console.error("Error al consultar el LLM:", errorText);
      
      let errMsg = `Error de la API de IA: ${grokRes.statusText || "Fallo en la consulta"}`;
      if (grokRes.status === 429) {
        errMsg = "Límite de peticiones de IA excedido (429). Por favor, espera un minuto antes de volver a intentarlo o revisa las cuotas/saldo de tus claves API en Groq o Tavily.";
      }
      
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: grokRes.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const grokData = await grokRes.json();
    const messageContent = grokData.choices?.[0]?.message?.content;

    if (!messageContent) {
      throw new Error("No se recibió contenido del modelo de IA.");
    }

    const parsedData = JSON.parse(messageContent);

    const parsePriceTolerant = (val) => {
      if (typeof val === "number") return val;
      if (!val) return 0;
      const cleaned = String(val).replace(/[^0-9.,-]/g, "").replace(",", ".");
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };

    const parsedRetail = parsePriceTolerant(parsedData.retailPrice);
    let parsedSecondHand = parsePriceTolerant(parsedData.secondHandPrice);

    const cappedRetail = parsedRetail > 3000 ? 0 : parsedRetail;

    if (cappedRetail > 0 && (parsedSecondHand <= 0 || parsedSecondHand >= cappedRetail)) {
      parsedSecondHand = Math.round(cappedRetail * 0.9);
      console.warn(`[enrich] secondHandPrice incoherente con retailPrice. Aplicando fallback 10% dto → ${parsedSecondHand}€`);
    }

    const savingsPercentage = cappedRetail > 0
      ? Math.round(((cappedRetail - parsedSecondHand) / cappedRetail) * 100)
      : parsePriceTolerant(parsedData.savingsPercentage);

    const generatedTitle = String(parsedData.title || title).trim().slice(0, 100);

    return new Response(
      JSON.stringify({
        title: generatedTitle,
        retailPrice: cappedRetail,
        secondHandPrice: parsedSecondHand,
        savingsPercentage,
        description: parsedData.description || "",
        imageUrl: imageUrl || "",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Excepción en API de enriquecimiento:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Error interno al procesar el artículo." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
