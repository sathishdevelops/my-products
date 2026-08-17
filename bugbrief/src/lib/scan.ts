export type Severity = "fail" | "warn" | "pass" | "info";

export type Finding = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
};

export type EnvInfo = {
  url: string;
  title: string;
  host: string;
  lang: string;
  viewport: string;
  dpr: number;
  userAgent: string;
  scannedAt: string;
};

export type ConsoleProbe = {
  errors: string[];
  rejections: string[];
};

export type PageScan = EnvInfo & {
  findings: Finding[];
  consoleErrors: string[];
  failedResources: string[];
};

/** Isolated-world DOM + resource scan. Helpers stay inside so executeScript can serialize this function. */
export function collectDomScan(): Omit<PageScan, "consoleErrors"> & { consoleErrors?: never } {
  const unique = (items: string[]) => [...new Set(items.filter(Boolean))];
  const hasAccessibleName = (el: Element) => {
    const labelled =
      el.getAttribute("aria-label") ||
      el.getAttribute("aria-labelledby") ||
      el.getAttribute("title");
    if (labelled?.trim()) return true;
    const id = el.getAttribute("id");
    if (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) return true;
    if (el.closest("label")) return true;
    return Boolean((el.textContent || "").replace(/\s+/g, " ").trim());
  };
  const labelForControl = (el: Element) => {
    if (el.getAttribute("aria-label")?.trim()) return true;
    if (el.getAttribute("aria-labelledby")?.trim()) return true;
    if (el.getAttribute("title")?.trim()) return true;
    const id = el.getAttribute("id");
    if (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) return true;
    return Boolean(el.closest("label"));
  };

  const findings: Finding[] = [];
  const failedResources: string[] = [];

  const images = [...document.images];
  const brokenImgs = images.filter((img) => img.complete && img.naturalWidth === 0 && img.src);
  if (brokenImgs.length) {
    findings.push({
      id: "broken-images",
      severity: "fail",
      title: "Broken images",
      detail: unique(brokenImgs.map((i) => i.src)).slice(0, 8).join(" · ") || `${brokenImgs.length} images failed to load`,
    });
  } else {
    findings.push({
      id: "broken-images",
      severity: "pass",
      title: "Images load",
      detail: `${images.length} <img> tags on this page.`,
    });
  }

  const missingAlt = images.filter((img) => img.src && !img.hasAttribute("alt"));
  if (missingAlt.length) {
    findings.push({
      id: "missing-alt",
      severity: "warn",
      title: "Images missing alt",
      detail: `${missingAlt.length} images have no alt attribute (decorative images should use alt="").`,
    });
  }

  const controls = [...document.querySelectorAll("input, select, textarea")].filter((el) => {
    const type = (el as HTMLInputElement).type;
    return !["hidden", "submit", "button", "reset", "image"].includes(type);
  });
  const unlabeled = controls.filter((el) => !labelForControl(el));
  if (unlabeled.length) {
    findings.push({
      id: "unlabeled-inputs",
      severity: "fail",
      title: "Unlabeled form fields",
      detail: `${unlabeled.length} inputs/selects/textareas have no label, aria-label, or wrapping <label>.`,
    });
  } else if (controls.length) {
    findings.push({
      id: "unlabeled-inputs",
      severity: "pass",
      title: "Form fields labeled",
      detail: `${controls.length} fields have an accessible name.`,
    });
  }

  const clickables = [...document.querySelectorAll("button, a[href], [role='button']")];
  const nameless = clickables.filter((el) => !hasAccessibleName(el));
  if (nameless.length) {
    findings.push({
      id: "empty-controls",
      severity: "fail",
      title: "Empty buttons or links",
      detail: `${nameless.length} interactive elements have no visible text or accessible name.`,
    });
  }

  const ids = [...document.querySelectorAll("[id]")].map((el) => el.id).filter(Boolean);
  const dupes = unique(ids.filter((id, i) => ids.indexOf(id) !== i));
  if (dupes.length) {
    findings.push({
      id: "duplicate-ids",
      severity: "fail",
      title: "Duplicate IDs",
      detail: dupes.slice(0, 8).join(", "),
    });
  }

  const blanks = [...document.querySelectorAll("a[target='_blank']")].filter(
    (a) => !/\bnoopener\b/i.test(a.getAttribute("rel") || ""),
  );
  if (blanks.length) {
    findings.push({
      id: "noopener",
      severity: "warn",
      title: "target=_blank without noopener",
      detail: `${blanks.length} links can leak window.opener. Add rel="noopener noreferrer".`,
    });
  }

  const htmlLang = document.documentElement.getAttribute("lang")?.trim() || "";
  if (!htmlLang) {
    findings.push({
      id: "lang",
      severity: "warn",
      title: "Missing html lang",
      detail: "Screen readers cannot guess the page language.",
    });
  }

  if (!document.title.trim()) {
    findings.push({
      id: "title",
      severity: "fail",
      title: "Empty document title",
      detail: "Tabs and bug reports will be harder to search.",
    });
  }

  const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => Number(h.tagName[1]));
  let skipped = false;
  for (let i = 1; i < headings.length; i++) {
    if (headings[i] - headings[i - 1] > 1) skipped = true;
  }
  if (!document.querySelector("h1")) {
    findings.push({
      id: "h1",
      severity: "warn",
      title: "No h1",
      detail: "Page has no top-level heading.",
    });
  } else if (skipped) {
    findings.push({
      id: "heading-skip",
      severity: "warn",
      title: "Skipped heading level",
      detail: `Heading sequence: ${headings.slice(0, 12).map((n) => `h${n}`).join(" → ")}`,
    });
  }

  try {
    for (const entry of performance.getEntriesByType("resource") as PerformanceResourceTiming[]) {
      const failed =
        entry.transferSize === 0 &&
        entry.decodedBodySize === 0 &&
        entry.duration > 0 &&
        !entry.name.startsWith("data:");
      if (failed) failedResources.push(entry.name);
    }
  } catch {
    /* ignore */
  }
  const failed = unique(failedResources).slice(0, 12);
  if (failed.length) {
    findings.push({
      id: "failed-resources",
      severity: "fail",
      title: "Failed network resources",
      detail: failed.slice(0, 6).join(" · "),
    });
  }

  if (location.protocol === "https:") {
    const mixed = [...document.querySelectorAll("img[src], script[src], link[href]")].filter((el) => {
      const url = el.getAttribute("src") || el.getAttribute("href") || "";
      return url.startsWith("http://");
    });
    if (mixed.length) {
      findings.push({
        id: "mixed-content",
        severity: "fail",
        title: "Mixed content",
        detail: `${mixed.length} http:// assets on an https page.`,
      });
    }
  }

  return {
    url: location.href,
    title: document.title,
    host: location.host,
    lang: htmlLang || "(none)",
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    dpr: window.devicePixelRatio || 1,
    userAgent: navigator.userAgent,
    scannedAt: new Date().toISOString(),
    findings,
    failedResources: failed,
  };
}

export function readConsoleProbe(): ConsoleProbe {
  const w = window as Window & { __BUGBRIEF__?: ConsoleProbe };
  const probe = w.__BUGBRIEF__;
  return {
    errors: probe?.errors?.slice(-20) ?? [],
    rejections: probe?.rejections?.slice(-10) ?? [],
  };
}

export function buildScan(dom: ReturnType<typeof collectDomScan>, consoleProbe: ConsoleProbe): PageScan {
  const findings = [...dom.findings];
  const consoleErrors = [...new Set([...consoleProbe.errors, ...consoleProbe.rejections].filter(Boolean))];
  if (consoleErrors.length) {
    findings.unshift({
      id: "console",
      severity: "fail",
      title: "Console errors",
      detail: consoleErrors.slice(0, 5).join(" · "),
    });
  } else {
    findings.unshift({
      id: "console",
      severity: "pass",
      title: "No console errors captured",
      detail: "BugBrief records errors after this tab loaded. Reload once if you opened the page before installing.",
    });
  }
  return { ...dom, findings, consoleErrors };
}

export function highlightIssues() {
  document.getElementById("bugbrief-highlight")?.remove();
  const style = document.createElement("style");
  style.id = "bugbrief-highlight";
  style.textContent = `
    [data-bugbrief] { outline: 2px solid #dc2626 !important; outline-offset: 2px !important; }
  `;
  document.documentElement.appendChild(style);

  const mark = (el: Element) => el.setAttribute("data-bugbrief", "1");

  for (const img of document.images) {
    if (img.complete && img.naturalWidth === 0 && img.src) mark(img);
    if (img.src && !img.hasAttribute("alt")) mark(img);
  }
  for (const el of document.querySelectorAll("input, select, textarea")) {
    const type = (el as HTMLInputElement).type;
    if (["hidden", "submit", "button", "reset", "image"].includes(type)) continue;
    const labelled =
      el.getAttribute("aria-label") ||
      el.getAttribute("aria-labelledby") ||
      el.getAttribute("title") ||
      (el.getAttribute("id") && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) ||
      el.closest("label");
    if (!labelled) mark(el);
  }
  for (const el of document.querySelectorAll("button, a[href], [role='button']")) {
    const name =
      el.getAttribute("aria-label") ||
      el.getAttribute("title") ||
      (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!name) mark(el);
  }
  return document.querySelectorAll("[data-bugbrief]").length;
}

export function clearHighlights() {
  document.getElementById("bugbrief-highlight")?.remove();
  for (const el of document.querySelectorAll("[data-bugbrief]")) el.removeAttribute("data-bugbrief");
}

export function fillFocusedField(value: string) {
  const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el || !("value" in el) || el instanceof HTMLButtonElement) return false;
  el.focus();
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}
