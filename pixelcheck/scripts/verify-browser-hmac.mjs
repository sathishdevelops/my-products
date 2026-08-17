/** Browser-equivalent HMAC check so extension keys match `npm run license`. */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(join(root, "shared/license-config.json"), "utf8"));

function bytesToB64Url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

const key = process.argv[2];
if (!key) {
  console.error("Usage: node scripts/verify-browser-hmac.mjs PC1...");
  process.exit(1);
}

const parts = key.trim().split(".");
const payload = parts[1];
const sig = parts[2];

const nodeSig = bytesToB64Url(createHmac("sha256", config.secret).update(payload).digest()).slice(
  0,
  22,
);

const subtleKey = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(config.secret),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign"],
);
const subtleSigBuf = await crypto.subtle.sign(
  "HMAC",
  subtleKey,
  new TextEncoder().encode(payload),
);
const subtleSig = bytesToB64Url(Buffer.from(subtleSigBuf)).slice(0, 22);

if (nodeSig !== sig || subtleSig !== sig) {
  console.error({ nodeSig, subtleSig, sig });
  process.exit(1);
}
console.log("HMAC matches Node and Web Crypto");
