// send-push — Supabase Edge Function
// Sends web push notifications to a coach when triggered (e.g. by a database webhook)
//
// Expected payload (from DB webhook on messages INSERT):
// {
//   type: "INSERT",
//   record: { sender_id, receiver_id, content, sender_name?, ... }
// }
//
// Or direct call:
// { user_id: "...", title: "...", body: "...", url?: "/messages", tag?: "message" }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:contact@fitcore.tech";

// ── Web Push crypto helpers (VAPID + payload encryption) ──

function base64UrlDecode(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importVapidPrivateKey(base64Url: string): Promise<CryptoKey> {
  const raw = base64UrlDecode(base64Url);
  // VAPID private key is 32-byte raw → wrap as JWK for P-256
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: base64UrlEncode(raw),
    // Public key will be derived; we need x, y — import as JWK with d only won't work
    // So we'll use the public key from env
    x: "", // placeholder — filled below
    y: "", // placeholder — filled below
  };
  // Actually, we need the full key. Let's import raw private + derive public.
  // Simpler: use the VAPID_PUBLIC_KEY to get x,y
  const pubBytes = base64UrlDecode(Deno.env.get("VAPID_PUBLIC_KEY")!);
  // Uncompressed EC point: 0x04 || x (32 bytes) || y (32 bytes)
  const x = pubBytes.slice(1, 33);
  const y = pubBytes.slice(33, 65);
  jwk.x = base64UrlEncode(x);
  jwk.y = base64UrlEncode(y);

  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

async function createVapidAuthHeader(
  endpoint: string,
  privateKeyBase64: string
): Promise<{ Authorization: string; "Crypto-Key": string }> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const expiry = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12h

  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud: audience, exp: expiry, sub: VAPID_SUBJECT };

  const enc = new TextEncoder();
  const headerB64 = base64UrlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(enc.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const key = await importVapidPrivateKey(privateKeyBase64);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc.encode(unsignedToken)
  );

  // Convert DER signature to raw r||s (64 bytes)
  const sigBytes = new Uint8Array(signature);
  let r: Uint8Array, s: Uint8Array;
  if (sigBytes.length === 64) {
    r = sigBytes.slice(0, 32);
    s = sigBytes.slice(32, 64);
  } else {
    // DER encoded — parse
    const rLen = sigBytes[3];
    const rStart = 4 + (rLen > 32 ? 1 : 0);
    r = sigBytes.slice(rStart, rStart + 32);
    const sLenOffset = 4 + rLen;
    const sLen = sigBytes[sLenOffset + 1];
    const sStart = sLenOffset + 2 + (sLen > 32 ? 1 : 0);
    s = sigBytes.slice(sStart, sStart + 32);
  }
  const rawSig = new Uint8Array(64);
  rawSig.set(r, 0);
  rawSig.set(s, 32);

  const jwt = `${unsignedToken}.${base64UrlEncode(rawSig)}`;
  const publicKeyB64 = Deno.env.get("VAPID_PUBLIC_KEY")!;

  return {
    Authorization: `vapid t=${jwt}, k=${publicKeyB64}`,
    "Crypto-Key": `p256ecdsa=${publicKeyB64}`,
  };
}

// ── Payload encryption (RFC 8291 / aes128gcm) ──

async function encryptPayload(
  subscription: { endpoint: string; keys_p256dh: string; keys_auth: string },
  payload: string
): Promise<{ body: Uint8Array; headers: Record<string, string> }> {
  const enc = new TextEncoder();
  const payloadBytes = enc.encode(payload);

  // Client public key and auth secret
  const clientPublicKeyBytes = base64UrlDecode(subscription.keys_p256dh);
  const authSecret = base64UrlDecode(subscription.keys_auth);

  // Generate ephemeral ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  // Import client public key
  const clientPublicKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientPublicKey },
      localKeyPair.privateKey,
      256
    )
  );

  // Export local public key
  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  // Salt (16 random bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF for IKM
  const authInfo = enc.encode("WebPush: info\0");
  const authInfoFull = new Uint8Array(authInfo.length + clientPublicKeyBytes.length + localPublicKeyRaw.length);
  authInfoFull.set(authInfo, 0);
  authInfoFull.set(clientPublicKeyBytes, authInfo.length);
  authInfoFull.set(localPublicKeyRaw, authInfo.length + clientPublicKeyBytes.length);

  const authHkdfKey = await crypto.subtle.importKey("raw", authSecret, { name: "HKDF" }, false, ["deriveBits"]);
  const prk = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: sharedSecret, info: authInfoFull },
      authHkdfKey,
      256
    )
  );

  // Derive CEK and nonce
  const prkKey = await crypto.subtle.importKey("raw", prk, { name: "HKDF" }, false, ["deriveBits"]);

  const cekInfo = enc.encode("Content-Encoding: aes128gcm\0");
  const cek = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: cekInfo },
      prkKey,
      128
    )
  );

  const nonceInfo = enc.encode("Content-Encoding: nonce\0");
  const nonce = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: nonceInfo },
      prkKey,
      96
    )
  );

  // Pad payload (add delimiter byte 0x02, then optional padding)
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes, 0);
  paddedPayload[payloadBytes.length] = 2; // delimiter

  // Encrypt with AES-128-GCM
  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, paddedPayload)
  );

  // Build aes128gcm body: salt (16) + rs (4) + idlen (1) + keyid (65) + encrypted
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, paddedPayload.length + 16); // +16 for GCM tag
  const idLen = new Uint8Array([localPublicKeyRaw.length]);

  const body = new Uint8Array(
    salt.length + recordSize.length + idLen.length + localPublicKeyRaw.length + encrypted.length
  );
  let offset = 0;
  body.set(salt, offset); offset += salt.length;
  body.set(recordSize, offset); offset += recordSize.length;
  body.set(idLen, offset); offset += idLen.length;
  body.set(localPublicKeyRaw, offset); offset += localPublicKeyRaw.length;
  body.set(encrypted, offset);

  return {
    body,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "Content-Length": String(body.length),
    },
  };
}

// ── Main handler ──

const ALLOWED_ORIGINS = [
  "https://app.fitcore.tech",
  "https://client.fitcore.tech",
  "https://fitcore.tech",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

/** Sanitize user-provided strings: strip HTML tags and limit length */
function sanitize(str: string, maxLen = 200): string {
  return str.replace(/<[^>]*>/g, "").substring(0, maxLen);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify the request comes from Supabase (webhook sends with service role Authorization header)
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) {
      console.error("SUPABASE_SERVICE_ROLE_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Server misconfigured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Accept requests from Supabase webhooks (Bearer service_role) or with matching apikey header
    const apiKey = req.headers.get("apikey");
    const bearerToken = authHeader?.replace("Bearer ", "");
    if (bearerToken !== serviceRoleKey && apiKey !== serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required env vars
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    if (!vapidPrivateKey || !vapidPublicKey) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "Server misconfigured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    // Determine target user and notification content
    let userId: string;
    let title: string;
    let notifBody: string;
    let url = "/";
    let tag = "fitcore";

    if (body.type === "INSERT" && body.record) {
      // Database webhook trigger — new message
      const record = body.record;
      userId = record.receiver_id;
      title = "New message";
      notifBody = record.content
        ? sanitize(record.content)
        : "You have a new message";
      url = "/messages";
      tag = "message";

      // Try to get sender name (sanitized)
      if (record.sender_name) {
        title = `Message from ${sanitize(record.sender_name, 50)}`;
      }
    } else if (body.user_id) {
      // Direct call
      userId = body.user_id;
      title = body.title || "FitCore";
      notifBody = body.body || "";
      url = body.url || "/";
      tag = body.tag || "fitcore";
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get subscriptions from Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: subscriptions, error: fetchErr } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (fetchErr) {
      console.error("Failed to fetch subscriptions:", fetchErr);
      return new Response(
        JSON.stringify({ error: "DB error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({ title, body: notifBody, url, tag });

    let sent = 0;
    const expired: string[] = [];

    for (const sub of subscriptions) {
      try {
        const vapidHeaders = await createVapidAuthHeader(sub.endpoint, vapidPrivateKey);
        const encrypted = await encryptPayload(sub, payload);

        const pushResponse = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            ...vapidHeaders,
            ...encrypted.headers,
            TTL: "86400",
            Urgency: "high",
          },
          body: encrypted.body,
        });

        if (pushResponse.status === 201 || pushResponse.status === 200) {
          sent++;
        } else if (pushResponse.status === 404 || pushResponse.status === 410) {
          // Subscription expired — mark for cleanup
          expired.push(sub.id);
        } else {
          console.warn(
            `Push failed for ${sub.id}: ${pushResponse.status} ${await pushResponse.text()}`
          );
        }
      } catch (err) {
        console.error(`Push error for sub ${sub.id}:`, err);
      }
    }

    // Clean up expired subscriptions
    if (expired.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", expired);
    }

    return new Response(
      JSON.stringify({ sent, expired: expired.length, total: subscriptions.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-push error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
