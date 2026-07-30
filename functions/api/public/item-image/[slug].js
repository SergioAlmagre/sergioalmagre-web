import { onRequestGet as getItemImage } from "../item-image.js";

export async function onRequestGet(context) {
  const slug = String(context.params.slug || "").replace(/\.jpe?g$/i, "");
  const imageRequestUrl = new URL("/api/public/item-image", context.request.url);
  imageRequestUrl.searchParams.set("item", slug);

  return getItemImage({
    ...context,
    request: new Request(imageRequestUrl, context.request),
  });
}

export async function onRequestHead(context) {
  const response = await onRequestGet(context);
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
}
