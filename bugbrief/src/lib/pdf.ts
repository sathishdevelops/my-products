import { jsPDF } from "jspdf";
import type { Finding, PageScan } from "./scan";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;

function severityColor(severity: Finding["severity"]): [number, number, number] {
  switch (severity) {
    case "pass":
      return [22, 163, 74];
    case "fail":
      return [185, 28, 28];
    case "warn":
      return [180, 83, 9];
    default:
      return [71, 85, 105];
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildPdf(
  scan: PageScan,
  notes: { steps: string; expected: string; actual: string },
  opts: { licensed: boolean; licensedTo?: string; screenshot?: string },
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, PAGE_W, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("BugBrief", MARGIN, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("QA page report", MARGIN, 19);
  doc.setFontSize(9);
  doc.text(formatDate(scan.scannedAt), PAGE_W - MARGIN, 12, { align: "right" });
  doc.text(scan.viewport, PAGE_W - MARGIN, 19, { align: "right" });

  y = 38;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(scan.host || "Unknown host", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const urlLines = doc.splitTextToSize(scan.url, PAGE_W - MARGIN * 2);
  doc.text(urlLines, MARGIN, y);
  y += urlLines.length * 4 + 2;
  doc.text(`${scan.title} · lang ${scan.lang}`, MARGIN, y);
  y += 6;

  if (opts.licensedTo) {
    doc.text(`Licensed to ${opts.licensedTo}`, MARGIN, y);
    y += 6;
  }

  const fails = scan.findings.filter((f) => f.severity === "fail").length;
  const warns = scan.findings.filter((f) => f.severity === "warn").length;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(185, 28, 28);
  doc.text(`${fails} fail`, MARGIN, y);
  doc.setTextColor(180, 83, 9);
  doc.text(`${warns} warn`, MARGIN + 28, y);
  y += 8;

  const writeBlock = (label: string, body: string) => {
    if (y > PAGE_H - 24) {
      doc.addPage();
      y = MARGIN;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(label, MARGIN, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(body || "(empty)", PAGE_W - MARGIN * 2);
    doc.text(lines, MARGIN, y);
    y += lines.length * 4 + 4;
  };

  writeBlock("Steps", notes.steps.trim() || "Open the URL and observe.");
  writeBlock("Expected", notes.expected.trim() || "(not filled)");
  writeBlock("Actual", notes.actual.trim() || "(not filled)");

  if (opts.screenshot) {
    if (y > PAGE_H - 80) {
      doc.addPage();
      y = MARGIN;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Screenshot", MARGIN, y);
    y += 4;
    try {
      const imgW = PAGE_W - MARGIN * 2;
      const imgH = 70;
      doc.addImage(opts.screenshot, "PNG", MARGIN, y, imgW, imgH);
      y += imgH + 8;
    } catch {
      y += 4;
    }
  }

  for (const f of scan.findings) {
    if (y > PAGE_H - 22) {
      doc.addPage();
      y = MARGIN;
    }
    const [r, g, b] = severityColor(f.severity);
    doc.setFillColor(r, g, b);
    doc.roundedRect(MARGIN, y - 3.5, 16, 5, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(f.severity.toUpperCase(), MARGIN + 8, y, { align: "center" });
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.text(f.title, MARGIN + 20, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const detail = doc.splitTextToSize(f.detail, PAGE_W - MARGIN * 2 - 20);
    doc.text(detail, MARGIN + 20, y);
    y += detail.length * 3.6 + 4;
  }

  if (!opts.licensed) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(200, 200, 220);
    doc.text("BugBrief trial", PAGE_W / 2, PAGE_H / 2, {
      align: "center",
      angle: 32,
    });
  }

  const host = scan.host.replace(/[^\w.-]+/g, "_") || "page";
  return { doc, filename: `bugbrief-${host}.pdf` };
}
