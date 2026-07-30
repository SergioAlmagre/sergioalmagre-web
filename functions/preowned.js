const SITE_NAME = "Sergio Almagre";
const FALLBACK_IMAGE = "/favicon.png";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function absoluteUrl(value, requestUrl) {
  if (!value) return new URL(FALLBACK_IMAGE, requestUrl).href;

  try {
    const url = new URL(value, requestUrl);
    return ["http:", "https:"].includes(url.protocol)
      ? url.href
      : new URL(FALLBACK_IMAGE, requestUrl).href;
  } catch (_) {
    return new URL(FALLBACK_IMAGE, requestUrl).href;
  }
}

function cleanDescription(value) {
  const description = String(value || "").replace(/\s+/g, " ").trim();
  return description || "Artículo audiovisual de segunda mano disponible en Sergio Almagre.";
}

function replaceOrInsertMeta(html, attributes, content) {
  const escapedContent = escapeHtml(content);
  const attributePattern = attributes
    .map((attribute) => attribute.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const tagPattern = new RegExp(
    `<meta\\s+(?:property|name)=[\\\"'](?:${attributePattern})[\\\"'][^>]*>\\s*`,
    "gi"
  );
  const tag = `<meta property="${attributes[0]}" content="${escapedContent}" />\n`;

  if (tagPattern.test(html)) {
    return html.replace(tagPattern, tag);
  }

  return html.replace("</head>", `  ${tag}</head>`);
}

function addItemMetadata(html, item, requestUrl) {
  const title = item.title || "Material audiovisual de segunda mano";
  const description = cleanDescription(item.description);
  const image = absoluteUrl(item.imageUrl, requestUrl);
  const itemUrl = new URL(`/preowned?item=${encodeURIComponent(item.id)}`, requestUrl).href;

  let result = html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)} — ${SITE_NAME}</title>`);

  const metadata = [
    [["description"], description],
    [["og:type"], "product"],
    [["og:url"], itemUrl],
    [["og:title"], title],
    [["og:description"], description],
    [["og:image"], image],
    [["og:image:alt"], title],
    [["og:site_name"], SITE_NAME],
    [["twitter:card"], "summary_large_image"],
    [["twitter:url"], itemUrl],
    [["twitter:title"], title],
    [["twitter:description"], description],
    [["twitter:image"], image],
    [["twitter:image:alt"], title],
  ];

  for (const [attributes, content] of metadata) {
    result = replaceOrInsertMeta(result, attributes, content);
  }

  return result;
}

async function getBasePage(context) {
  // Pages asset bindings resolve the pretty URL to preowned.html.
  const assetPath = context.env.ASSETS?.fetch ? "/preowned" : "/preowned.html";
  const assetUrl = new URL(assetPath, context.request.url);
  const assetRequest = new Request(assetUrl, { method: "GET" });

  if (context.env.ASSETS?.fetch) {
    return context.env.ASSETS.fetch(assetRequest);
  }

  return fetch(assetRequest);
}

export async function onRequestGet(context) {
  const itemId = new URL(context.request.url).searchParams.get("item");
  const basePageResponse = await getBasePage(context);

  if (!itemId) {
    return basePageResponse;
  }

  try {
    const itemsResponse = await fetch(new URL("/api/public/items", context.request.url));
    if (!itemsResponse.ok) return basePageResponse;

    const data = await itemsResponse.json();
    const item = (data.items || []).find((candidate) => candidate.id === itemId);
    if (!item) return basePageResponse;

    const html = await basePageResponse.text();
    const page = addItemMetadata(html, item, context.request.url);

    return new Response(page, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    });
  } catch (error) {
    console.error("No se pudieron generar los metadatos del artículo:", error);
    return basePageResponse;
  }
}
