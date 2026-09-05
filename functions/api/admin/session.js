import { json, isAdmin } from "../_common.js";

export async function onRequestGet({ request, env }) {
  try {
    if (!await isAdmin(request, env)) {
      return json(
        { error: "Sesión vencida o no autorizada." },
        401,
        {
          "Set-Cookie":
            "vm_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"
        }
      );
    }

    return json({
      ok: true,
      sessionMinutes: 30,
      idleMinutes: 15
    });
  } catch (error) {
    return json(
      { error: "No fue posible validar la sesión.", detail: error.message },
      500
    );
  }
}
