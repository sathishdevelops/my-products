(() => {
  const metaIds = [];
  const gtmIds = [];
  const ga4Ids = [];
  const adsIds = [];
  const tiktokIds = [];
  const linkedinIds = [];
  const consentHints = [];
  const w = window;

  try {
    const pixels = w.fbq && w.fbq.instance && w.fbq.instance.pixelsByID;
    if (pixels) metaIds.push(...Object.keys(pixels));
  } catch (e) {
    /* ignore */
  }

  try {
    if (w.google_tag_manager) {
      gtmIds.push(
        ...Object.keys(w.google_tag_manager).filter((k) => String(k).startsWith("GTM-")),
      );
    }
  } catch (e) {
    /* ignore */
  }

  try {
    if (w._linkedin_partner_id) linkedinIds.push(String(w._linkedin_partner_id));
    else if (w.lintrk) linkedinIds.push("present");
  } catch (e) {
    /* ignore */
  }

  try {
    if (w.ttq) tiktokIds.push("present");
  } catch (e) {
    /* ignore */
  }

  const dataLayer = Array.isArray(w.dataLayer) ? w.dataLayer : [];
  const dataLayerPreview = dataLayer.slice(0, 40).map((item) => {
    try {
      return JSON.stringify(item);
    } catch (e) {
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

  w.__PIXELCHECK_MAIN = {
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
})();
