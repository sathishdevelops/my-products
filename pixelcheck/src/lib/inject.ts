/** Page probes. Keep public/inject/main.js and public/inject/dom.js in sync — those are what Chrome injects. */
export function probeMainWorld() {
  const metaIds: string[] = [];
  const gtmIds: string[] = [];
  const ga4Ids: string[] = [];
  const adsIds: string[] = [];
  const tiktokIds: string[] = [];
  const linkedinIds: string[] = [];
  const consentHints: string[] = [];

  const w = window as Window & {
    fbq?: { instance?: { pixelsByID?: Record<string, unknown> } } & ((
      ...args: unknown[]
    ) => void);
    google_tag_manager?: Record<string, unknown>;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    ttq?: { _i?: unknown[]; methods?: unknown };
    lintrk?: unknown;
    _linkedin_partner_id?: string | number;
    google_tag_data?: unknown;
  };

  try {
    const pixels = w.fbq?.instance?.pixelsByID;
    if (pixels) metaIds.push(...Object.keys(pixels));
  } catch {
    /* ignore */
  }

  try {
    if (w.google_tag_manager) {
      gtmIds.push(
        ...Object.keys(w.google_tag_manager).filter((k) => k.startsWith("GTM-")),
      );
    }
  } catch {
    /* ignore */
  }

  try {
    const partner = w._linkedin_partner_id;
    if (partner) linkedinIds.push(String(partner));
    if (w.lintrk && linkedinIds.length === 0) linkedinIds.push("present");
  } catch {
    /* ignore */
  }

  try {
    if (w.ttq) tiktokIds.push("present");
  } catch {
    /* ignore */
  }

  const dataLayer = Array.isArray(w.dataLayer) ? w.dataLayer : [];
  const dataLayerPreview = dataLayer.slice(0, 40).map((item) => {
    try {
      return JSON.stringify(item);
    } catch {
      return String(item);
    }
  });

  for (const row of dataLayerPreview) {
    if (/consent/i.test(row)) consentHints.push(row.slice(0, 180));
    const gtm = row.match(/GTM-[A-Z0-9]+/g);
    if (gtm) gtmIds.push(...gtm);
    const ga = row.match(/G-[A-Z0-9]+/g);
    if (ga) ga4Ids.push(...ga);
    const aw = row.match(/AW-[0-9]+/g);
    if (aw) adsIds.push(...aw);
  }

  return {
    url: location.href,
    title: document.title,
    host: location.host,
    hasFbq: typeof w.fbq === "function",
    hasGtag: typeof w.gtag === "function",
    hasDataLayer: Array.isArray(w.dataLayer),
    hasTtq: Boolean(w.ttq),
    hasLintrk: Boolean(w.lintrk || w._linkedin_partner_id),
    metaIds: [...new Set(metaIds)],
    gtmIds: [...new Set(gtmIds)],
    ga4Ids: [...new Set(ga4Ids)],
    adsIds: [...new Set(adsIds)],
    tiktokIds: [...new Set(tiktokIds)],
    linkedinIds: [...new Set(linkedinIds)],
    consentHints,
    dataLayerPreview,
  };
}

export type MainWorldProbe = ReturnType<typeof probeMainWorld>;

/** Runs in the isolated world. Collects script URLs and inline snippets. */
export function collectDomSignals() {
  const scripts = [...document.scripts].map((s) => ({
    src: s.src || "",
    inline: s.src ? "" : (s.textContent || "").slice(0, 8000),
  }));
  const htmlHead = document.head ? document.head.innerHTML.slice(0, 80000) : "";
  return {
    scripts,
    htmlHead,
    cookieBanner:
      Boolean(document.getElementById("onetrust-banner-sdk")) ||
      Boolean(document.getElementById("CybotCookiebotDialog")) ||
      Boolean(document.querySelector("[id*='cookie'][class*='banner' i]")) ||
      Boolean(document.querySelector(".cc-window, #iubenda-cs-banner")),
  };
}

export type DomSignals = ReturnType<typeof collectDomSignals>;
