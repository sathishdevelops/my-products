import { jsPDF } from "jspdf";
import type { AuditResult, Finding } from "./audit";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;

function severityColor(severity: Finding["severity"]): [number, number, number] {
  switch (severity) {
    case "pass":
      return [15, 118, 110];
    case "fail":
      return [185, 28, 28];
    case "warn":
      return [180, 83, 9];
    default:
      return [71, 85, 105];
  }
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildPdf(audit: AuditResult, opts: { licensed: boolean; licensedTo?: string }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, PAGE_W, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PixelCheck", MARGIN, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Tracking audit", MARGIN, 19);
  doc.setFontSize(9);
  doc.text(formatDate(audit.scannedAt), PAGE_W - MARGIN, 12, { align: "right" });
  doc.text("One page · client-ready", PAGE_W - MARGIN, 19, { align: "right" });

  y = 38;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(audit.host || "Unknown host", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const urlLines = doc.splitTextToSize(audit.url, PAGE_W - MARGIN * 2);
  doc.text(urlLines, MARGIN, y);
  y += urlLines.length * 4 + 4;

  if (opts.licensedTo) {
    doc.setFontSize(8);
    doc.text(`Licensed to ${opts.licensedTo}`, MARGIN, y);
    y += 6;
  }

  const fails = audit.findings.filter((f) => f.severity === "fail").length;
  const warns = audit.findings.filter((f) => f.severity === "warn").length;
  const passes = audit.findings.filter((f) => f.severity === "pass").length;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(185, 28, 28);
  doc.text(`${fails} fail`, MARGIN, y);
  doc.setTextColor(180, 83, 9);
  doc.text(`${warns} warn`, MARGIN + 28, y);
  doc.setTextColor(15, 118, 110);
  doc.text(`${passes} pass`, MARGIN + 56, y);
  y += 8;

  doc.setDrawColor(226, 232, 240);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  for (const finding of audit.findings) {
    if (y > PAGE_H - 28) break;
    const [r, g, b] = severityColor(finding.severity);
    doc.setFillColor(r, g, b);
    doc.roundedRect(MARGIN, y - 3.2, 18, 5.5, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(finding.severity.toUpperCase(), MARGIN + 9, y, { align: "center" });

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text(`${finding.vendor} — ${finding.title}`, MARGIN + 22, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const details = doc.splitTextToSize(finding.detail, PAGE_W - MARGIN * 2 - 22);
    doc.text(details, MARGIN + 22, y);
    y += details.length * 3.6 + 4;
  }

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "PixelCheck scans the current page only. It does not call ad-network APIs or crawl other URLs.",
    MARGIN,
    PAGE_H - 12,
  );

  if (!opts.licensed) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(36);
    doc.setTextColor(248, 215, 218);
    doc.text("PixelCheck trial", PAGE_W / 2, PAGE_H / 2, {
      align: "center",
      angle: 32,
    });
    doc.setFontSize(8);
    doc.setTextColor(185, 28, 28);
    doc.text(
      "Unlicensed copy — purchase at the PixelCheck landing page to remove this watermark.",
      MARGIN,
      PAGE_H - 8,
    );
  }

  const safeHost = (audit.host || "site").replace(/[^\w.-]+/g, "_");
  const stamp = audit.scannedAt.slice(0, 10);
  return { doc, filename: `PixelCheck-${safeHost}-${stamp}.pdf` };
}
