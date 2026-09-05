import { json, cookie, makeToken } from "../_common.js";

export async function onRequestPost({ request, env }) {
  try {
    if (!env.ADMIN_PASSWORD) {
      return json(
        { error: "ADMIN_PASSWORD no está configurada en Cloudflare." },
        500
      );
    }

    const { password = "" } = await request.json();

    if (!password || password !== env.ADMIN_PASSWORD) {
      return json({ error: "Contraseña incorrecta." }, 401);
    }

    const token = await makeToken(env);

    return json(
      {
        ok: true,
        sessionMinutes: 30,
        idleMinutes: 15
      },
      200,
      {
        "Set-Cookie": cookie("vm_admin", token, 1800)
      }
    );
  } catch (error) {
    return json(
      { error: "No fue posible iniciar sesión.", detail: error.message },
      500
    );
  }
}
