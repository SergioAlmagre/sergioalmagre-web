const SITE_NAME = "Sergio Almagre";
const FALLBACK_IMAGE = "/assets/brand/vector_social_light_1080.png?v=1";
const FALLBACK_IMAGE_TYPE = "image/png";
const SHARE_VERSION = "9";

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

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "articulo";
}

function cleanDescription(value, item) {
  const description = String(value || "").replace(/\s+/g, " ").trim();
  if (description) return description;

  const price = Number(item?.secondHandPrice);
  return price > 0
    ? `${item.title} disponible de segunda mano por ${price} € en Sergio Almagre.`
    : "Artículo audiovisual de segunda mano disponible en Sergio Almagre.";
}

function replaceOrInsertMeta(html, key, content) {
  const escapedContent = escapeHtml(content);
  const attributePattern = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tagPattern = new RegExp(
    `<meta\\s+(?:property|name)=[\\\"'](?:${attributePattern})[\\\"'][^>]*>\\s*`,
    "gi"
  );
  const attributeName = key === "description" || key.startsWith("twitter:") ? "name" : "property";
  const tag = `<meta ${attributeName}="${key}" content="${escapedContent}" />\n`;

  if (tagPattern.test(html)) {
    return html.replace(tagPattern, tag);
  }

  return html.replace("</head>", `  ${tag}</head>`);
}

function addItemMetadata(html, item, requestUrl) {
  const title = item.title || "Material audiovisual de segunda mano";
  const description = cleanDescription(item.description, item);
  let image = absoluteUrl("", requestUrl);
  if (item.imageUrl) {
    image = new URL(
      `/api/public/item-image/${encodeURIComponent(slugify(item.title))}.jpg`,
      requestUrl
    ).href;
  }
  const itemUrlObject = new URL("/preowned", requestUrl);
  itemUrlObject.searchParams.set("item", slugify(item.title));
  itemUrlObject.searchParams.set("v", SHARE_VERSION);
  const itemUrl = itemUrlObject.href;

  let result = html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)} — ${SITE_NAME}</title>`);

  const metadata = [
    ["description", description],
    ["og:type", "product"],
    ["og:url", itemUrl],
    ["og:title", title],
    ["og:description", description],
    ["og:image", image],
    ["og:image:secure_url", image],
    ["og:image:type", image === new URL(FALLBACK_IMAGE, requestUrl).href ? FALLBACK_IMAGE_TYPE : "image/jpeg"],
    ["og:image:alt", title],
    ["og:site_name", SITE_NAME],
    ["twitter:card", "summary_large_image"],
    ["twitter:url", itemUrl],
    ["twitter:title", title],
    ["twitter:description", description],
    ["twitter:image", image],
    ["twitter:image:alt", title],
  ];

  for (const [key, content] of metadata) {
    result = replaceOrInsertMeta(result, key, content);
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
  const itemKey = new URL(context.request.url).searchParams.get("item");
  const basePageResponse = await getBasePage(context);

  if (!itemKey) {
    return basePageResponse;
  }

  try {
    const itemsResponse = await fetch(new URL("/api/public/items", context.request.url));
    if (!itemsResponse.ok) return basePageResponse;

    const data = await itemsResponse.json();
    const item = (data.items || []).find((candidate) => (
      candidate.id === itemKey || slugify(candidate.title) === itemKey
    ));
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
