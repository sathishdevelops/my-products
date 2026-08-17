(() => {
  const scripts = [...document.scripts].map((s) => ({
    src: s.src || "",
    inline: s.src ? "" : (s.textContent || "").slice(0, 8000),
  }));
  const htmlHead = document.head ? document.head.innerHTML.slice(0, 80000) : "";
  window.__PIXELCHECK_DOM = {
    scripts,
    htmlHead,
    cookieBanner: Boolean(
      document.getElementById("onetrust-banner-sdk") ||
        document.getElementById("CybotCookiebotDialog") ||
        document.querySelector("[id*='cookie'][class*='banner' i]") ||
        document.querySelector(".cc-window, #iubenda-cs-banner"),
    ),
  };
})();
