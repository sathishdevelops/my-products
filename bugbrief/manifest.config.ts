import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "BugBrief",
  version: "1.1.0",
  description:
    "Daily QA toolkit: scan, screenshot, bug brief, test data, and common tester tools.",
  icons: {
    16: "icons/16.png",
    48: "icons/48.png",
    128: "icons/128.png",
  },
  action: {
    default_title: "BugBrief",
    default_popup: "src/popup/index.html",
    default_icon: {
      16: "icons/16.png",
      48: "icons/48.png",
    },
  },
  permissions: ["activeTab", "scripting", "storage", "windows"],
  content_scripts: [
    {
      matches: ["http://*/*", "https://*/*"],
      js: ["src/content/errors.ts"],
      run_at: "document_start",
      world: "MAIN",
    },
  ],
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
});
