function getImageUrl(items, itemId) {
  const item = (items || []).find((candidate) => candidate.id === itemId);
  if (!item?.imageUrl) return "";

  try {
    const imageUrl = new URL(item.imageUrl);
    return ["http:", "https:"].includes(imageUrl.protocol) ? imageUrl.href : "";
  } catch (_) {
    return "";
  }
}

export async function onRequestGet(context) {
  const requestUrl = new URL(context.request.url);
  const itemId = requestUrl.searchParams.get("item");

  if (!itemId) return new Response("Not found", { status: 404 });

  try {
    const itemsResponse = await fetch(new URL("/api/public/items", context.request.url));
    if (!itemsResponse.ok) return new Response("Not found", { status: 404 });

    const data = await itemsResponse.json();
    const imageUrl = getImageUrl(data.items, itemId);
    if (!imageUrl) return new Response("Not found", { status: 404 });

    const imageResponse = await fetch(imageUrl, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; SergioAlmagrePreview/1.0)",
      },
    });

    if (!imageResponse.ok || !imageResponse.body) {
      return new Response("Image unavailable", { status: 502 });
    }

    const headers = new Headers();
    headers.set("Content-Type", imageResponse.headers.get("Content-Type") || "image/jpeg");
    headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400");

    return new Response(imageResponse.body, { status: 200, headers });
  } catch (error) {
    console.error("No se pudo servir la imagen del artículo:", error);
    return new Response("Image unavailable", { status: 502 });
  }
}

export async function onRequestHead(context) {
  const response = await onRequestGet(context);
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
}
