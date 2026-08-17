import { captureFullPagePng, captureViewportPng, copyPng, downloadPng } from "../lib/capture";
import { buildPdf } from "../lib/pdf";
import {
  clearSiteStorage,
  collectHrefs,
  envSnapshot,
  toggleClickableOutline,
  togglePasswords,
  toggleStylesheets,
} from "../lib/qatools";
import { buildMarkdown } from "../lib/report";
import {
  buildScan,
  clearHighlights,
  collectDomScan,
  fillFocusedField,
  highlightIssues,
  readConsoleProbe,
  type PageScan,
} from "../lib/scan";
import { DATA_BUTTONS, generate, type DataKind } from "../lib/testdata";

const subtitle = document.getElementById("subtitle") as HTMLParagraphElement;
const errorEl = document.getElementById("error") as HTMLElement;
const toastEl = document.getElementById("toast") as HTMLElement;
const summaryEl = document.getElementById("summary") as HTMLElement;
const findingsEl = document.getElementById("findings") as HTMLUListElement;
const exportBtn = document.getElementById("export") as HTMLButtonElement;
const rescanBtn = document.getElementById("rescan") as HTMLButtonElement;
const highlightBtn = document.getElementById("highlight") as HTMLButtonElement;
const copyBriefBtn = document.getElementById("copy-brief") as HTMLButtonElement;
const copyMdBtn = document.getElementById("copy-md") as HTMLButtonElement;
const stepsEl = document.getElementById("steps") as HTMLTextAreaElement;
const expectedEl = document.getElementById("expected") as HTMLTextAreaElement;
const actualEl = document.getElementById("actual") as HTMLTextAreaElement;
const dataGrid = document.getElementById("data-grid") as HTMLDivElement;
const dataPreview = document.getElementById("data-preview") as HTMLParagraphElement;
const copyDataBtn = document.getElementById("copy-data") as HTMLButtonElement;
const fillDataBtn = document.getElementById("fill-data") as HTMLButtonElement;
const shotViewBtn = document.getElementById("shot-view") as HTMLButtonElement;
const shotFullBtn = document.getElementById("shot-full") as HTMLButtonElement;
const shotCopyBtn = document.getElementById("shot-copy") as HTMLButtonElement;
const shotSaveBtn = document.getElementById("shot-save") as HTMLButtonElement;
const shotPreview = document.getElementById("shot-preview") as HTMLImageElement;
const toolGrid = document.getElementById("tool-grid") as HTMLDivElement;

let latest: PageScan | null = null;
let lastData = "";
let lastShot = "";
let highlighted = false;
let passwordsOn = false;
let clickablesOn = false;
let cssOff = false;

function notes() {
  return { steps: stepsEl.value, expected: expectedEl.value, actual: actualEl.value };
}

function showError(message: string) {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function clearError() {
  errorEl.textContent = "";
  errorEl.classList.add("hidden");
}

function toast(message: string) {
  toastEl.textContent = message;
  toastEl.classList.remove("hidden");
  window.setTimeout(() => toastEl.classList.add("hidden"), 1800);
}

function fileHost() {
  return (latest?.host || "page").replace(/[^\w.-]+/g, "_");
}

function setShot(dataUrl: string) {
  lastShot = dataUrl;
  shotPreview.src = dataUrl;
  shotPreview.classList.remove("hidden");
  shotCopyBtn.disabled = false;
  shotSaveBtn.disabled = false;
}

function renderScan(scan: PageScan) {
  latest = scan;
  subtitle.textContent = scan.host;
  const fail = scan.findings.filter((f) => f.severity === "fail").length;
  const warn = scan.findings.filter((f) => f.severity === "warn").length;
  const pass = scan.findings.filter((f) => f.severity === "pass").length;
  summaryEl.classList.remove("hidden");
  summaryEl.innerHTML = `
    <div class="stat"><b>${fail}</b><span>Fail</span></div>
    <div class="stat"><b>${warn}</b><span>Warn</span></div>
    <div class="stat"><b>${pass}</b><span>Pass</span></div>
  `;
  findingsEl.innerHTML = scan.findings
    .map(
      (f) => `
      <li class="finding">
        <header>
          <span class="badge ${f.severity}">${f.severity}</span>
          <span>${f.title}</span>
        </header>
        <p>${f.detail}</p>
      </li>`,
    )
    .join("");
  exportBtn.disabled = false;
  copyBriefBtn.disabled = false;
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab");
  if (!tab.url || !/^https?:/.test(tab.url)) {
    throw new Error("Open an http(s) page first. Chrome pages and the Web Store cannot be scanned.");
  }
  return tab;
}

async function scan() {
  clearError();
  exportBtn.disabled = true;
  subtitle.textContent = "Scanning this tab…";
  findingsEl.innerHTML = "";
  summaryEl.classList.add("hidden");
  highlighted = false;
  highlightBtn.textContent = "Highlight";
  try {
    const tab = await activeTab();
    const [domExec] = await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: collectDomScan,
    });
    const [consoleExec] = await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      world: "MAIN",
      func: readConsoleProbe,
    });
    if (!domExec?.result) {
      throw new Error("Could not read this page. Reload the tab and try again.");
    }
    renderScan(buildScan(domExec.result, consoleExec?.result ?? { errors: [], rejections: [] }));
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err));
  }
}

async function copyBrief() {
  if (!latest) return;
  await navigator.clipboard.writeText(buildMarkdown(latest, notes()));
  toast("Markdown copied");
}

async function exportPdf() {
  if (!latest) return;
  let screenshot = lastShot || undefined;
  if (!screenshot) {
    try {
      screenshot = await captureViewportPng();
    } catch {
      screenshot = undefined;
    }
  }
  const { doc, filename } = buildPdf(latest, notes(), {
    licensed: true,
    screenshot,
  });
  doc.save(filename);
}

async function toggleHighlight() {
  clearError();
  try {
    const tab = await activeTab();
    if (highlighted) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id! },
        func: clearHighlights,
      });
      highlighted = false;
      highlightBtn.textContent = "Highlight";
      return;
    }
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: highlightIssues,
    });
    highlighted = true;
    highlightBtn.textContent = "Clear";
    toast(`${result?.result ?? 0} elements outlined`);
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err));
  }
}

async function takeViewport() {
  clearError();
  try {
    await activeTab();
    setShot(await captureViewportPng());
    toast("Viewport captured");
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err));
  }
}

async function takeFullPage() {
  clearError();
  shotFullBtn.disabled = true;
  shotFullBtn.textContent = "Capturing…";
  try {
    const tab = await activeTab();
    setShot(await captureFullPagePng(tab.id!));
    toast("Full page captured");
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err));
  } finally {
    shotFullBtn.disabled = false;
    shotFullBtn.textContent = "Full page";
  }
}

async function saveShot() {
  if (!lastShot) return;
  downloadPng(lastShot, `bugbrief-${fileHost()}.png`);
}

async function copyShot() {
  if (!lastShot) return;
  try {
    await copyPng(lastShot);
    toast("Image copied");
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err));
  }
}

function setData(kind: DataKind) {
  lastData = generate(kind);
  dataPreview.textContent = lastData;
}

async function copyData() {
  if (!lastData) setData("email");
  await navigator.clipboard.writeText(lastData);
  toast("Copied");
}

async function fillData() {
  clearError();
  if (!lastData) setData("email");
  try {
    const tab = await activeTab();
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: fillFocusedField,
      args: [lastData],
    });
    toast(result?.result ? "Filled focused field" : "Focus an input on the page first");
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err));
  }
}

async function rememberWindow(win: chrome.windows.Window) {
  await chrome.storage.local.set({
    bugbriefWindow: {
      id: win.id,
      width: win.width,
      height: win.height,
      state: win.state,
    },
  });
}

async function resizeWindow(width: number, height: number) {
  const tab = await activeTab();
  if (!tab.windowId) throw new Error("No window");
  const win = await chrome.windows.get(tab.windowId);
  await rememberWindow(win);
  await chrome.windows.update(tab.windowId, { state: "normal", width, height });
  toast(`${width}×${height}`);
}

async function restoreWindow() {
  const { bugbriefWindow } = await chrome.storage.local.get("bugbriefWindow");
  if (!bugbriefWindow?.id) {
    toast("No saved window size");
    return;
  }
  await chrome.windows.update(bugbriefWindow.id, {
    state: bugbriefWindow.state || "normal",
    width: bugbriefWindow.width,
    height: bugbriefWindow.height,
  });
  toast("Window restored");
}

async function runTool(name: string) {
  clearError();
  const tab = await activeTab();
  const tabId = tab.id!;

  switch (name) {
    case "copy-url":
      await navigator.clipboard.writeText(tab.url || latest?.url || "");
      toast("URL copied");
      return;
    case "copy-env": {
      const [exec] = await chrome.scripting.executeScript({
        target: { tabId },
        func: envSnapshot,
      });
      const env = exec?.result;
      const text = env
        ? [
            `URL: ${env.url}`,
            `Title: ${env.title}`,
            `Viewport: ${env.viewport} @ ${env.dpr}x`,
            `Lang: ${env.lang}`,
            `Cookies: ${env.cookies} · localStorage ${env.localStorage} · session ${env.sessionStorage}`,
            `UA: ${env.userAgent}`,
          ].join("\n")
        : tab.url || "";
      await navigator.clipboard.writeText(text);
      toast("Env copied");
      return;
    }
    case "copy-links": {
      const [exec] = await chrome.scripting.executeScript({
        target: { tabId },
        func: collectHrefs,
      });
      const links = exec?.result ?? [];
      await navigator.clipboard.writeText(links.join("\n"));
      toast(`${links.length} links copied`);
      return;
    }
    case "duplicate":
      await chrome.tabs.duplicate(tabId);
      toast("Tab duplicated");
      return;
    case "hard-reload":
      await chrome.tabs.reload(tabId, { bypassCache: true });
      toast("Hard reload");
      return;
    case "passwords": {
      passwordsOn = !passwordsOn;
      const [exec] = await chrome.scripting.executeScript({
        target: { tabId },
        func: togglePasswords,
        args: [passwordsOn],
      });
      toast(passwordsOn ? `Showing ${exec?.result ?? 0} passwords` : "Passwords hidden");
      return;
    }
    case "clickables": {
      clickablesOn = !clickablesOn;
      const [exec] = await chrome.scripting.executeScript({
        target: { tabId },
        func: toggleClickableOutline,
        args: [clickablesOn],
      });
      toast(clickablesOn ? `${exec?.result ?? 0} controls outlined` : "Outline off");
      return;
    }
    case "css": {
      cssOff = !cssOff;
      await chrome.scripting.executeScript({
        target: { tabId },
        func: toggleStylesheets,
        args: [cssOff],
      });
      toast(cssOff ? "CSS disabled" : "CSS restored");
      return;
    }
    case "clear-storage": {
      const [exec] = await chrome.scripting.executeScript({
        target: { tabId },
        func: clearSiteStorage,
      });
      const r = exec?.result;
      toast(`Cleared local ${r?.localCount ?? 0} · session ${r?.sessionCount ?? 0}`);
      return;
    }
    case "phone":
      await resizeWindow(390, 844);
      return;
    case "tablet":
      await resizeWindow(768, 1024);
      return;
    case "desktop":
      await resizeWindow(1440, 900);
      return;
    case "restore-window":
      await restoreWindow();
      return;
  }
}

for (const tabBtn of document.querySelectorAll<HTMLButtonElement>(".tab")) {
  tabBtn.addEventListener("click", () => {
    for (const b of document.querySelectorAll(".tab")) b.classList.remove("on");
    tabBtn.classList.add("on");
    const name = tabBtn.dataset.tab;
    for (const panel of document.querySelectorAll(".panel")) {
      panel.classList.toggle("hidden", panel.id !== `panel-${name}`);
    }
  });
}

dataGrid.innerHTML = DATA_BUTTONS.map(
  (b) => `<button type="button" data-kind="${b.kind}">${b.label}</button>`,
).join("");
dataGrid.addEventListener("click", (event) => {
  const btn = (event.target as HTMLElement).closest("button[data-kind]");
  if (!btn) return;
  setData((btn as HTMLButtonElement).dataset.kind as DataKind);
});

toolGrid.addEventListener("click", (event) => {
  const btn = (event.target as HTMLElement).closest("button[data-tool]");
  if (!btn) return;
  void runTool((btn as HTMLButtonElement).dataset.tool || "");
});

rescanBtn.addEventListener("click", () => void scan());
highlightBtn.addEventListener("click", () => void toggleHighlight());
copyBriefBtn.addEventListener("click", () => void copyBrief());
copyMdBtn.addEventListener("click", () => void copyBrief());
exportBtn.addEventListener("click", () => void exportPdf());
copyDataBtn.addEventListener("click", () => void copyData());
fillDataBtn.addEventListener("click", () => void fillData());
shotViewBtn.addEventListener("click", () => void takeViewport());
shotFullBtn.addEventListener("click", () => void takeFullPage());
shotSaveBtn.addEventListener("click", () => saveShot());
shotCopyBtn.addEventListener("click", () => void copyShot());

setData("email");

void scan();
