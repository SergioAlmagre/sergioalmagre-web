import { createSessionToken, SESSION_COOKIE_NAME } from "../_auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const password = body.password;
    
    const adminPassword = env.ADMIN_PASSWORD?.trim().replace(/^["']|["']$/g, "");

    if (!adminPassword) {
      return new Response(
        JSON.stringify({ error: "La variable de entorno ADMIN_PASSWORD no está configurada." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (password === adminPassword) {
      const token = await createSessionToken(env);
      
      const secure = env.NODE_ENV === "production" ? "Secure;" : "";
      const cookie = `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}; ${secure}`;
      
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

    return new Response(
      JSON.stringify({ error: "Contraseña incorrecta" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error en login endpoint:", error);
    return new Response(
      JSON.stringify({ error: "Petición inválida" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}
