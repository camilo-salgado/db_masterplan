export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      ...headers
    }
  });
}

export function cookie(name, value, maxAge = 1800) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

function base64UrlEncode(text) {
  return btoa(unescape(encodeURIComponent(text)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(value) {
  const normalized = value
    .replaceAll("-", "+")
    .replaceAll("_", "/");

  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return decodeURIComponent(escape(atob(padded)));
}

async function hmac(secret, value) {
  if (!secret) {
    throw new Error("Falta configurar la clave de sesión administrativa.");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function constantTimeEqual(a, b) {
  const left = String(a ?? "");
  const right = String(b ?? "");

  if (left.length !== right.length) return false;

  let diff = 0;
  for (let i = 0; i < left.length; i++) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}

function sessionSecret(env) {
  /*
   * SESSION_SECRET es recomendado.
   * ADMIN_PASSWORD también participa para que al cambiar la contraseña
   * todas las sesiones anteriores queden invalidadas automáticamente.
   */
  return `${env.SESSION_SECRET || "vm-session"}:${env.ADMIN_PASSWORD || ""}`;
}

export async function makeToken(env) {
  if (!env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD no está configurada.");
  }

  const now = Date.now();
  const payload = {
    iat: now,
    exp: now + (30 * 60 * 1000),
    nonce: crypto.randomUUID(),
    v: 3
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await hmac(sessionSecret(env), encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export async function isAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) return false;

  const cookieHeader = request.headers.get("Cookie") || "";
  const token = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("vm_admin="))
    ?.slice("vm_admin=".length);

  if (!token) return false;

  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra) return false;

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    return false;
  }

  if (
    payload?.v !== 3 ||
    !Number.isFinite(payload?.iat) ||
    !Number.isFinite(payload?.exp)
  ) {
    return false;
  }

  const now = Date.now();

  // No aceptar tokens futuros ni sesiones mayores a 30 minutos.
  if (
    payload.iat > now + 60_000 ||
    payload.exp <= now ||
    payload.exp - payload.iat > 30 * 60 * 1000
  ) {
    return false;
  }

  const expected = await hmac(sessionSecret(env), encodedPayload);
  return constantTimeEqual(signature, expected);
}

export function cleanText(value, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}
