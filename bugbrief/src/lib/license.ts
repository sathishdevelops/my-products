import licenseConfig from "../../shared/license-config.json";

const KEY_PREFIX = "BB1";

function bytesToB64Url(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hmac(message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(licenseConfig.secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return bytesToB64Url(sig).slice(0, 22);
}

export type LicenseInfo = {
  email: string;
  issuedAt: number;
};

export async function verifyLicenseKey(key: string): Promise<LicenseInfo | null> {
  const trimmed = key.trim();
  const parts = trimmed.split(".");
  if (parts.length !== 3 || parts[0] !== KEY_PREFIX) return null;
  const [, payload, sig] = parts;
  const expected = await hmac(payload);
  if (expected !== sig) return null;
  try {
    const padded =
      payload.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (payload.length % 4)) % 4);
    const json = JSON.parse(atob(padded));
    if (json.v !== 1 || typeof json.e !== "string") return null;
    return { email: json.e, issuedAt: Number(json.t) || 0 };
  } catch {
    return null;
  }
}

export async function getStoredLicense(): Promise<{
  key: string;
  info: LicenseInfo;
} | null> {
  const { licenseKey } = await chrome.storage.local.get("licenseKey");
  if (!licenseKey || typeof licenseKey !== "string") return null;
  const info = await verifyLicenseKey(licenseKey);
  if (!info) return null;
  return { key: licenseKey, info };
}

export async function saveLicenseKey(key: string) {
  const info = await verifyLicenseKey(key);
  if (!info) throw new Error("Invalid license key");
  await chrome.storage.local.set({ licenseKey: key.trim() });
  return info;
}
