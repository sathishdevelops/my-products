import { BUY_URL } from "../lib/commerce";
import { buildAudit, type AuditResult } from "../lib/audit";
import type { DomSignals, MainWorldProbe } from "../lib/inject";
import { getStoredLicense, saveLicenseKey, type LicenseInfo } from "../lib/license";
import { buildPdf } from "../lib/pdf";

const subtitle = document.getElementById("subtitle") as HTMLParagraphElement;
const licensePill = document.getElementById("license-pill") as HTMLSpanElement;
const errorEl = document.getElementById("error") as HTMLElement;
const summaryEl = document.getElementById("summary") as HTMLElement;
const findingsEl = document.getElementById("findings") as HTMLUListElement;
const exportBtn = document.getElementById("export") as HTMLButtonElement;
const rescanBtn = document.getElementById("rescan") as HTMLButtonElement;
const unlockBtn = document.getElementById("unlock") as HTMLButtonElement;
const licenseInput = document.getElementById("license-key") as HTMLInputElement;
const licenseMsg = document.getElementById("license-msg") as HTMLParagraphElement;
const buyLink = document.getElementById("buy-link") as HTMLAnchorElement | null;

let latest: AuditResult | null = null;
let license: LicenseInfo | null = null;

function showError(message: string) {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function clearError() {
  errorEl.textContent = "";
  errorEl.classList.add("hidden");
}

function renderLicense() {
  if (buyLink) buyLink.href = BUY_URL;
  if (license) {
    licensePill.textContent = "Licensed";
    licensePill.classList.add("ok");
    licenseMsg.textContent = `Unlocked for ${license.email}`;
    buyLink?.classList.add("hidden");
  } else {
    licensePill.textContent = "Free";
    licensePill.classList.remove("ok");
    licenseMsg.textContent = "Free to scan. Optional $19 license removes the PDF watermark.";
    buyLink?.classList.remove("hidden");
  }
}

function renderAudit(audit: AuditResult) {
  latest = audit;
  subtitle.textContent = audit.host;
  const fail = audit.findings.filter((f) => f.severity === "fail").length;
  const warn = audit.findings.filter((f) => f.severity === "warn").length;
  const pass = audit.findings.filter((f) => f.severity === "pass").length;
  summaryEl.classList.remove("hidden");
  summaryEl.innerHTML = `
    <div class="stat"><b>${fail}</b><span>Fail</span></div>
    <div class="stat"><b>${warn}</b><span>Warn</span></div>
    <div class="stat"><b>${pass}</b><span>Pass</span></div>
  `;
  findingsEl.innerHTML = audit.findings
    .map(
      (f) => `
      <li class="finding">
        <header>
          <span class="badge ${f.severity}">${f.severity}</span>
          <span>${f.vendor} — ${f.title}</span>
        </header>
        <p>${f.detail}</p>
      </li>`,
    )
    .join("");
  exportBtn.disabled = false;
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab");
  if (!tab.url || !/^https?:/.test(tab.url)) {
    throw new Error("Open an http(s) page first. Chrome pages and the Web Store cannot be scanned.");
  }
  return tab.id;
}

async function scan() {
  clearError();
  exportBtn.disabled = true;
  subtitle.textContent = "Scanning this tab…";
  findingsEl.innerHTML = "";
  summaryEl.classList.add("hidden");
  try {
    const tabId = await activeTab();
    await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      files: ["inject/main.js"],
    });
    await chrome.scripting.executeScript({
      target: { tabId },
      world: "ISOLATED",
      files: ["inject/dom.js"],
    });
    const [mainExec] = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: () =>
        (window as Window & { __PIXELCHECK_MAIN?: MainWorldProbe }).__PIXELCHECK_MAIN,
    });
    const [domExec] = await chrome.scripting.executeScript({
      target: { tabId },
      world: "ISOLATED",
      func: () =>
        (window as Window & { __PIXELCHECK_DOM?: DomSignals }).__PIXELCHECK_DOM,
    });
    if (!mainExec?.result || !domExec?.result) {
      throw new Error("Could not read this page. Reload the tab and try again.");
    }
    renderAudit(buildAudit(mainExec.result, domExec.result));
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err));
  }
}

async function exportPdf() {
  if (!latest) return;
  const { doc, filename } = buildPdf(latest, {
    licensed: Boolean(license),
    licensedTo: license?.email,
  });
  doc.save(filename);
}

async function unlock() {
  clearError();
  try {
    license = await saveLicenseKey(licenseInput.value);
    renderLicense();
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err));
  }
}

rescanBtn.addEventListener("click", () => void scan());
exportBtn.addEventListener("click", () => exportPdf());
unlockBtn.addEventListener("click", () => void unlock());

void (async () => {
  const stored = await getStoredLicense();
  license = stored?.info ?? null;
  if (stored) licenseInput.value = stored.key;
  renderLicense();
  await scan();
})();
