import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "PixelCheck",
  version: "1.0.0",
  description:
    "One-click tracking audit. Client-ready PDF for GTM, GA4, Meta, TikTok, LinkedIn, and UTMs.",
  icons: {
    16: "icons/16.png",
    48: "icons/48.png",
    128: "icons/128.png",
  },
  action: {
    default_title: "PixelCheck",
    default_popup: "src/popup/index.html",
    default_icon: {
      16: "icons/16.png",
      48: "icons/48.png",
    },
  },
  permissions: ["activeTab", "scripting", "storage"],
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
});
