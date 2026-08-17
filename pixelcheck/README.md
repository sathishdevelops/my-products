# PixelCheck

Chrome extension: one-click tracking audit of the current tab, then a client-ready PDF.

## Load unpacked

```bash
npm install
npm run icons
npm run build
```

Chrome → `chrome://extensions` → Developer mode → Load unpacked → select the `dist/` folder.

Run `npm run demo` and open `http://localhost:4173/landing/demo.html`. Click the toolbar icon. You should see duplicate Meta pixels (fail) and a cookie banner without Consent Mode.

## License keys

Trial scans work. PDFs are watermarked until a key is pasted.

```bash
npm run license -- buyer@agency.com
```

Change `shared/license-config.json` `secret` before you sell real keys, then rebuild.

## Chrome Web Store (free)

Do not add ads. Google forbids AdSense in extensions and forbids injecting ads into websites. PixelCheck would be removed.

Free listing + optional $19 watermark-removal key is the allowed revenue path.

```bash
npm run pack
```

Upload `store/pixelcheck.zip` at [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole). Copy-paste fields from [`store/LISTING.md`](store/LISTING.md). Host [`landing/privacy.html`](landing/privacy.html) on HTTPS and paste that URL in the Privacy tab.

Put the same checkout URL in `landing/config.js` and `src/lib/commerce.ts`, then pack again.
