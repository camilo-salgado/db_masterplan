import { json } from "../_common.js";

export function onRequestPost() {
  return json(
    { ok: true },
    200,
    {
      "Set-Cookie":
        "vm_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"
    }
  );
}
