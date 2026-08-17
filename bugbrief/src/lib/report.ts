import type { PageScan } from "./scan";

export function buildMarkdown(scan: PageScan, notes: { steps: string; expected: string; actual: string }) {
  const fails = scan.findings.filter((f) => f.severity === "fail");
  const warns = scan.findings.filter((f) => f.severity === "warn");
  return `## Bug brief
**URL:** ${scan.url}
**Title:** ${scan.title || "(empty)"}
**When:** ${scan.scannedAt}
**Viewport:** ${scan.viewport} @ ${scan.dpr}x
**Lang:** ${scan.lang}

### Steps
${notes.steps.trim() || "1. Open the URL\n2. Observe the issue"}

### Expected
${notes.expected.trim() || "(not filled)"}

### Actual
${notes.actual.trim() || "(not filled)"}

### Environment
- User-Agent: \`${scan.userAgent}\`

### Page scan
- Fail: ${fails.length} · Warn: ${warns.length}
${scan.findings
  .filter((f) => f.severity === "fail" || f.severity === "warn")
  .map((f) => `- **${f.severity.toUpperCase()}** ${f.title}: ${f.detail}`)
  .join("\n") || "- No fail/warn findings"}

### Console
${scan.consoleErrors.map((e) => `- ${e}`).join("\n") || "- none captured"}
`;
}
