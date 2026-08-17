# BugBrief

Chrome extension for daily QA: scan the current tab, capture screenshots, copy a Jira-ready bug brief, fill test data, and run common tester tools.

Currently **free**.

## Load unpacked

```bash
npm install
npm run icons
npm run build
```

Chrome → `chrome://extensions` → Developer mode → Load unpacked → select the `dist/` folder.

If you already loaded v1.0, click **Reload** on the extension card after rebuild.

Run `npm run demo` and open `http://localhost:4174/landing/demo.html`.

## Daily loop

1. **Scan** — broken images, unlabeled inputs, empty controls, duplicate IDs, mixed content, console errors. Highlight leftovers.
2. **Shot** — viewport PNG or stitched full page. Copy image or download. Last shot is used in the PDF.
3. **Report** — steps / expected / actual, copy markdown or export PDF.
4. **Tools** — copy URL/env/links, duplicate tab, hard reload, show passwords, outline controls, disable CSS, clear storage, phone/tablet/desktop window, test data fill.

## Chrome Web Store

```bash
npm run pack
```

Upload `store/bugbrief.zip`. Copy-paste fields from [`store/LISTING.md`](store/LISTING.md). Host [`landing/privacy.html`](landing/privacy.html) on HTTPS.
