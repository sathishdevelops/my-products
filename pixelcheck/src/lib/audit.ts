import type { DomSignals, MainWorldProbe } from "./inject";

export type Severity = "pass" | "warn" | "fail" | "info";

export type Finding = {
  id: string;
  vendor: string;
  severity: Severity;
  title: string;
  detail: string;
};

export type UtmReport = {
  present: Record<string, string>;
  missing: string[];
  broken: string[];
};

export type AuditResult = {
  url: string;
  host: string;
  title: string;
  scannedAt: string;
  findings: Finding[];
  utm: UtmReport;
  ids: {
    meta: string[];
    gtm: string[];
    ga4: string[];
    ads: string[];
    tiktok: string[];
    linkedin: string[];
  };
};

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function matchesFromText(text: string, re: RegExp) {
  const out: string[] = [];
  const copy = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
  let m: RegExpExecArray | null;
  while ((m = copy.exec(text))) {
    out.push(m[1] || m[0]);
  }
  return out;
}

function blob(main: MainWorldProbe, dom: DomSignals) {
  const srcs = dom.scripts.map((s) => s.src).join("\n");
  const inline = dom.scripts.map((s) => s.inline).join("\n");
  return `${srcs}\n${inline}\n${dom.htmlHead}\n${main.dataLayerPreview.join("\n")}`;
}

export function analyzeUtm(url: string): UtmReport {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { present: {}, missing: [...UTM_KEYS], broken: ["Invalid URL"] };
  }
  const present: Record<string, string> = {};
  const broken: string[] = [];
  for (const key of UTM_KEYS) {
    if (!parsed.searchParams.has(key)) continue;
    const value = parsed.searchParams.get(key) ?? "";
    const all = parsed.searchParams.getAll(key);
    if (!value.trim()) broken.push(`${key} is empty`);
    else if (all.length > 1) broken.push(`${key} is duplicated (${all.join(", ")})`);
    else present[key] = value;
  }
  const missing = UTM_KEYS.filter((k) => !(k in present) && !broken.some((b) => b.startsWith(k)));
  return { present, missing: [...missing], broken };
}

export function buildAudit(main: MainWorldProbe, dom: DomSignals): AuditResult {
  const text = blob(main, dom);
  const srcs = dom.scripts.map((s) => s.src);

  const meta = unique([
    ...main.metaIds,
    ...matchesFromText(text, /fbq\(\s*['"]init['"]\s*,\s*['"](\d{5,})['"]/g),
    ...matchesFromText(text, /facebook\.com\/tr\?id=(\d{5,})/g),
  ]);
  const gtm = unique([
    ...main.gtmIds,
    ...matchesFromText(text, /(GTM-[A-Z0-9]+)/g),
  ]);
  const ga4 = unique([
    ...main.ga4Ids,
    ...matchesFromText(text, /(G-[A-Z0-9]{6,})/g),
  ]);
  const ads = unique([
    ...main.adsIds,
    ...matchesFromText(text, /(AW-\d{5,})/g),
  ]);
  const tiktok = unique([
    ...main.tiktokIds.filter((id) => id !== "present"),
    ...matchesFromText(text, /ttq\.load\(\s*['"]([A-Z0-9]+)/g),
  ]);
  const linkedin = unique([
    ...main.linkedinIds.filter((id) => id !== "present"),
    ...matchesFromText(text, /_linkedin_partner_id\s*=\s*["'](\d+)/g),
  ]);

  const hasMetaScript = srcs.some((s) => /connect\.facebook\.net|fbevents\.js/i.test(s));
  const hasGtmScript = srcs.some((s) => /googletagmanager\.com\/gtm\.js/i.test(s));
  const hasGaScript = srcs.some((s) => /gtag\/js|google-analytics\.com|googletagmanager\.com\/gtag/i.test(s));
  const hasTikTokScript = srcs.some((s) => /analytics\.tiktok\.com|tiktok\.com\/i18n\/pixel/i.test(s));
  const hasLinkedInScript = srcs.some((s) => /snap\.licdn\.com|licdn\.com\/li\.lms-analytics/i.test(s));
  const hasAdsScript = srcs.some((s) => /googleads|doubleclick\.net|googlesyndication/i.test(s));

  const consentVendor = srcs.some((s) =>
    /cookiebot|onetrust|cookielaw|iubenda|termly|sourcepoint|didomi/i.test(s),
  );
  const hasConsentMode =
    main.consentHints.length > 0 || /gtag\(\s*['"]consent['"]/i.test(text);

  const findings: Finding[] = [];

  if (meta.length || hasMetaScript || main.hasFbq) {
    if (meta.length > 1) {
      findings.push({
        id: "meta-dup",
        vendor: "Meta",
        severity: "fail",
        title: "Duplicate Meta pixels",
        detail: `Found ${meta.length} pixel IDs: ${meta.join(", ")}. Duplicate pixels inflate events and break optimization.`,
      });
    } else {
      findings.push({
        id: "meta-ok",
        vendor: "Meta",
        severity: "pass",
        title: "Meta Pixel detected",
        detail: meta.length ? `Pixel ID ${meta[0]}` : "fbevents.js / fbq is present (ID not readable).",
      });
    }
  } else {
    findings.push({
      id: "meta-missing",
      vendor: "Meta",
      severity: "warn",
      title: "No Meta Pixel",
      detail: "No fbevents.js or fbq('init') on this page.",
    });
  }

  if (gtm.length || hasGtmScript) {
    findings.push({
      id: "gtm-ok",
      vendor: "GTM",
      severity: "pass",
      title: "Google Tag Manager detected",
      detail: gtm.length ? gtm.join(", ") : "gtm.js is present (container ID not readable).",
    });
  } else {
    findings.push({
      id: "gtm-missing",
      vendor: "GTM",
      severity: "info",
      title: "No GTM container",
      detail: "No GTM- ID or gtm.js on this page. Tags may be hardcoded.",
    });
  }

  if (ga4.length || hasGaScript || main.hasGtag) {
    findings.push({
      id: "ga4-ok",
      vendor: "GA4",
      severity: "pass",
      title: "GA4 / gtag detected",
      detail: ga4.length ? ga4.join(", ") : "gtag is present (measurement ID not readable).",
    });
  } else {
    findings.push({
      id: "ga4-missing",
      vendor: "GA4",
      severity: "warn",
      title: "No GA4",
      detail: "No G- measurement ID or gtag.js on this page.",
    });
  }

  if (ads.length || hasAdsScript) {
    findings.push({
      id: "ads-ok",
      vendor: "Google Ads",
      severity: "pass",
      title: "Google Ads tag detected",
      detail: ads.length ? ads.join(", ") : "Google Ads / DoubleClick script present.",
    });
  } else {
    findings.push({
      id: "ads-missing",
      vendor: "Google Ads",
      severity: "info",
      title: "No Google Ads tag",
      detail: "No AW- ID on this page.",
    });
  }

  if (tiktok.length || hasTikTokScript || main.hasTtq) {
    findings.push({
      id: "tiktok-ok",
      vendor: "TikTok",
      severity: "pass",
      title: "TikTok Pixel detected",
      detail: tiktok.length ? tiktok.join(", ") : "TikTok pixel script / ttq present.",
    });
  } else {
    findings.push({
      id: "tiktok-missing",
      vendor: "TikTok",
      severity: "info",
      title: "No TikTok Pixel",
      detail: "No analytics.tiktok.com or ttq.load on this page.",
    });
  }

  if (linkedin.length || hasLinkedInScript || main.hasLintrk) {
    findings.push({
      id: "li-ok",
      vendor: "LinkedIn",
      severity: "pass",
      title: "LinkedIn Insight Tag detected",
      detail: linkedin.length ? `Partner ${linkedin.join(", ")}` : "Insight tag script present.",
    });
  } else {
    findings.push({
      id: "li-missing",
      vendor: "LinkedIn",
      severity: "info",
      title: "No LinkedIn Insight Tag",
      detail: "No snap.licdn.com or partner ID on this page.",
    });
  }

  if (consentVendor || dom.cookieBanner) {
    if (hasConsentMode) {
      findings.push({
        id: "consent-ok",
        vendor: "Consent",
        severity: "pass",
        title: "Cookie banner + Consent Mode signals",
        detail: "A consent vendor/banner is present and Consent Mode (or dataLayer consent) was found.",
      });
    } else {
      findings.push({
        id: "consent-gap",
        vendor: "Consent",
        severity: "fail",
        title: "Banner present, Consent Mode not found",
        detail:
          "A cookie banner is on the page but gtag('consent') / dataLayer consent was not detected. Tags may fire before consent.",
      });
    }
  } else if (hasConsentMode) {
    findings.push({
      id: "consent-mode-only",
      vendor: "Consent",
      severity: "info",
      title: "Consent Mode without a visible banner",
      detail: "Consent Mode snippets were found; no common banner SDK detected.",
    });
  } else {
    findings.push({
      id: "consent-none",
      vendor: "Consent",
      severity: "warn",
      title: "No consent tooling detected",
      detail: "No OneTrust/Cookiebot/Didomi (etc.) and no Consent Mode. Risky for EU/UK traffic.",
    });
  }

  const utm = analyzeUtm(main.url);
  if (utm.broken.length) {
    findings.push({
      id: "utm-broken",
      vendor: "UTM",
      severity: "fail",
      title: "Broken UTM parameters",
      detail: utm.broken.join("; "),
    });
  } else if (Object.keys(utm.present).length === 0) {
    findings.push({
      id: "utm-none",
      vendor: "UTM",
      severity: "warn",
      title: "No UTMs on this URL",
      detail:
        "Current URL has no utm_source / utm_medium / utm_campaign. Open a paid-ad landing URL to verify click tracking.",
    });
  } else if (utm.missing.includes("utm_source") || utm.missing.includes("utm_medium")) {
    findings.push({
      id: "utm-partial",
      vendor: "UTM",
      severity: "warn",
      title: "Incomplete UTM set",
      detail: `Present: ${Object.keys(utm.present).join(", ") || "none"}. Missing core: ${utm.missing.filter((k) => k === "utm_source" || k === "utm_medium").join(", ")}.`,
    });
  } else {
    findings.push({
      id: "utm-ok",
      vendor: "UTM",
      severity: "pass",
      title: "UTMs present",
      detail: Object.entries(utm.present)
        .map(([k, v]) => `${k}=${v}`)
        .join(", "),
    });
  }

  const fbeventCount = srcs.filter((s) => /fbevents\.js/i.test(s)).length;
  if (fbeventCount > 1 && meta.length <= 1) {
    findings.push({
      id: "meta-script-dup",
      vendor: "Meta",
      severity: "warn",
      title: "Meta script loaded more than once",
      detail: `${fbeventCount} fbevents.js tags. Even with one ID this can double-count PageView.`,
    });
  }

  return {
    url: main.url,
    host: main.host,
    title: main.title,
    scannedAt: new Date().toISOString(),
    findings,
    utm,
    ids: { meta, gtm, ga4, ads, tiktok, linkedin },
  };
}
