#!/usr/bin/env node
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(
  readFileSync(join(root, "shared/license-config.json"), "utf8"),
);

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function issue(email) {
  const payload = b64url(
    JSON.stringify({ v: 1, e: email.trim().toLowerCase(), t: Date.now() }),
  );
  const sig = b64url(createHmac("sha256", config.secret).update(payload).digest()).slice(
    0,
    22,
  );
  return `BB1.${payload}.${sig}`;
}

function verify(key) {
  const parts = key.trim().split(".");
  if (parts.length !== 3 || parts[0] !== "BB1") return null;
  const expected = b64url(
    createHmac("sha256", config.secret).update(parts[1]).digest(),
  ).slice(0, 22);
  if (expected !== parts[2]) return null;
  const json = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  return json;
}

const arg = process.argv[2];
if (!arg) {
  console.error("Usage:");
  console.error("  npm run license -- buyer@qa.team");
  console.error("  npm run license -- --verify BB1.xxx.yyy");
  process.exit(1);
}

if (arg === "--verify") {
  const key = process.argv[3];
  const info = verify(key);
  if (!info) {
    console.error("Invalid key");
    process.exit(1);
  }
  console.log(JSON.stringify(info, null, 2));
} else {
  const key = issue(arg);
  console.log(key);
  console.log(`\nSend this to ${arg.trim().toLowerCase()} after payment.`);
}
