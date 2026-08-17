/** Injected helpers for screenshots. Keep self-contained for executeScript. */

export type PageMetrics = {
  scrollY: number;
  innerHeight: number;
  innerWidth: number;
  scrollHeight: number;
  dpr: number;
};

export function pageMetrics(): PageMetrics {
  const el = document.documentElement;
  const body = document.body;
  return {
    scrollY: window.scrollY,
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth,
    scrollHeight: Math.max(el.scrollHeight, body?.scrollHeight || 0, el.clientHeight),
    dpr: window.devicePixelRatio || 1,
  };
}

export function scrollPage(y: number) {
  window.scrollTo(0, y);
  return {
    scrollY: window.scrollY,
    innerHeight: window.innerHeight,
    scrollHeight: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0),
  };
}

export function hideFixedForCapture() {
  const w = window as Window & { __BUGBRIEF_FIXED__?: [HTMLElement, string][] };
  w.__BUGBRIEF_FIXED__ = [];
  for (const node of document.querySelectorAll("body *")) {
    const el = node as HTMLElement;
    const pos = getComputedStyle(el).position;
    if (pos !== "fixed" && pos !== "sticky") continue;
    w.__BUGBRIEF_FIXED__.push([el, el.style.visibility]);
    el.style.setProperty("visibility", "hidden", "important");
  }
  return w.__BUGBRIEF_FIXED__.length;
}

export function restoreFixed() {
  const w = window as Window & { __BUGBRIEF_FIXED__?: [HTMLElement, string][] };
  for (const [el, vis] of w.__BUGBRIEF_FIXED__ || []) {
    if (vis) el.style.visibility = vis;
    else el.style.removeProperty("visibility");
  }
  w.__BUGBRIEF_FIXED__ = [];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read screenshot"));
    img.src = src;
  });
}

export async function captureViewportPng() {
  return chrome.tabs.captureVisibleTab({ format: "png" });
}

export async function captureFullPagePng(tabId: number) {
  const [metricsExec] = await chrome.scripting.executeScript({
    target: { tabId },
    func: pageMetrics,
  });
  const metrics = metricsExec?.result;
  if (!metrics) throw new Error("Could not measure this page.");

  const startY = metrics.scrollY;
  await chrome.scripting.executeScript({
    target: { tabId },
    func: hideFixedForCapture,
  });

  const slices: { y: number; url: string }[] = [];
  try {
    let y = 0;
    let guard = 0;
    while (y < metrics.scrollHeight - 2 && guard < 24) {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: scrollPage,
        args: [y],
      });
      await sleep(220);
      const url = await chrome.tabs.captureVisibleTab({ format: "png" });
      slices.push({ y, url });
      y += metrics.innerHeight;
      guard += 1;
    }
  } finally {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: restoreFixed,
    });
    await chrome.scripting.executeScript({
      target: { tabId },
      func: scrollPage,
      args: [startY],
    });
  }

  if (!slices.length) throw new Error("No screenshot slices captured.");

  const images = await Promise.all(slices.map((s) => loadImage(s.url)));
  const scale = images[0].height / metrics.innerHeight;
  const width = images[0].width;
  const height = Math.min(Math.ceil(metrics.scrollHeight * scale), 16000);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not stitch screenshot.");

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const destY = Math.round(slices[i].y * scale);
    const remaining = height - destY;
    const srcH = Math.min(img.height, remaining);
    if (srcH <= 0) break;
    ctx.drawImage(img, 0, 0, img.width, srcH, 0, destY, width, srcH);
  }

  return canvas.toDataURL("image/png");
}

export function downloadPng(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export async function copyPng(dataUrl: string) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
}
