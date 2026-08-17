/** Page tools. Keep each export self-contained for executeScript. */

export function togglePasswords(show: boolean) {
  let n = 0;
  if (show) {
    for (const el of document.querySelectorAll('input[type="password"]')) {
      const input = el as HTMLInputElement;
      input.dataset.bugbriefPass = "1";
      input.type = "text";
      n += 1;
    }
  } else {
    for (const el of document.querySelectorAll("input[data-bugbrief-pass]")) {
      const input = el as HTMLInputElement;
      input.type = "password";
      delete input.dataset.bugbriefPass;
      n += 1;
    }
  }
  return n;
}

export function toggleClickableOutline(on: boolean) {
  document.getElementById("bugbrief-clickables")?.remove();
  if (!on) return 0;
  const style = document.createElement("style");
  style.id = "bugbrief-clickables";
  style.textContent = `
    a, button, input, select, textarea, [role="button"], [onclick] {
      outline: 1px dashed #4f46e5 !important;
      outline-offset: 1px !important;
    }
  `;
  document.documentElement.appendChild(style);
  return document.querySelectorAll('a, button, input, select, textarea, [role="button"]').length;
}

export function toggleStylesheets(disabled: boolean) {
  let n = 0;
  for (const node of document.querySelectorAll('link[rel="stylesheet"], style')) {
    const el = node as HTMLLinkElement & { disabled?: boolean };
    el.disabled = disabled;
    n += 1;
  }
  return n;
}

export function clearSiteStorage() {
  const localCount = localStorage.length;
  const sessionCount = sessionStorage.length;
  localStorage.clear();
  sessionStorage.clear();
  return { localCount, sessionCount };
}

export function collectHrefs() {
  return [...document.querySelectorAll("a[href]")]
    .map((a) => (a as HTMLAnchorElement).href)
    .filter(Boolean)
    .slice(0, 200);
}

export function envSnapshot() {
  return {
    url: location.href,
    title: document.title,
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    dpr: window.devicePixelRatio || 1,
    lang: document.documentElement.lang || "(none)",
    userAgent: navigator.userAgent,
    cookies: document.cookie ? document.cookie.split(";").length : 0,
    localStorage: localStorage.length,
    sessionStorage: sessionStorage.length,
  };
}
