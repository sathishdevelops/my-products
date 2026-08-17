type BugBriefLog = {
  errors: string[];
  rejections: string[];
};

const MAX = 40;

function store(): BugBriefLog {
  const w = window as Window & { __BUGBRIEF__?: BugBriefLog };
  if (!w.__BUGBRIEF__) w.__BUGBRIEF__ = { errors: [], rejections: [] };
  return w.__BUGBRIEF__;
}

function push(list: string[], message: string) {
  const line = message.slice(0, 400);
  if (!line || list.includes(line)) return;
  list.push(line);
  if (list.length > MAX) list.shift();
}

const log = store();

window.addEventListener("error", (event) => {
  const fromResource =
    event.target instanceof HTMLElement
      ? `${event.target.tagName.toLowerCase()} failed: ${(event.target as HTMLImageElement).src || (event.target as HTMLScriptElement).src || ""}`
      : "";
  const msg = event.message || fromResource;
  if (msg) push(log.errors, msg);
}, true);

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const msg = reason instanceof Error ? reason.message : String(reason);
  push(log.rejections, msg);
});

const nativeError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  push(log.errors, args.map((a) => String(a)).join(" ").slice(0, 400));
  nativeError(...args);
};
