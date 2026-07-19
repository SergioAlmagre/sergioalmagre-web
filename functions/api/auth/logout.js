import { SESSION_COOKIE_NAME } from "../_auth.js";

export async function onRequestPost(context) {
  const { env } = context;
  const secure = env.NODE_ENV === "production" ? "Secure;" : "";
  const cookie = `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT; ${secure}`;

  return new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookie
      }
    }
  );
}
