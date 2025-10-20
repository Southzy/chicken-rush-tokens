async function hmacSHA256(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function pfHash(serverSeed: string, clientSeed: string, nonce: number, salt: string) {
  return await hmacSHA256(serverSeed, `${clientSeed}:${nonce}:${salt}`);
}

export function hexToModInt(hex: string, mod: number): number {
  const slice = hex.slice(0, 8);
  const num = parseInt(slice, 16);
  return num % mod;
}
