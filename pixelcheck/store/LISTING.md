# Chrome Web Store listing (free)

PixelCheck stays **free to install and free to scan**. Do **not** add AdSense, page-injected ads, or affiliate injection. Google forbids AdSense in Chrome extensions, forbids bundling “audit tool + inject ads,” and will remove listings that put ads on other people’s sites.

Revenue that stays policy-safe: optional **$19 license** to remove the PDF watermark (already in the popup). That is a paid feature, not an ad.

## Upload package

Built zip: `store/pixelcheck.zip` (`npm run pack` from `pixelcheck/`).

Dashboard: https://chrome.google.com/webstore/devconsole → New item → upload the zip.

## Store listing tab

- **Name:** PixelCheck
- **Summary:** One-click audit of GTM, GA4, Meta, TikTok, LinkedIn, and UTMs. Export a client-ready PDF.
- **Category:** Productivity
- **Language:** English
- **Visibility:** Public
- **Distribution / pricing:** Free (all regions you want)

**Description:**

```
PixelCheck audits advertising and analytics tags on the tab you have open.

Click the toolbar icon to see whether GTM, GA4, Meta Pixel, Google Ads, TikTok, and LinkedIn tags are present, whether Meta pixels are duplicated, whether Consent Mode shows up next to a cookie banner, and whether the current URL has broken or missing UTMs.

Export a one-page PDF you can send to a client. Scanning is free. Optional paid license removes the trial watermark on the PDF.

PixelCheck reads the current tab only after you click. It does not crawl other pages, does not call ad-network APIs, and does not inject ads.
```

## Privacy tab (copy exactly)

- **Single purpose:** Audit advertising and analytics tags on the current tab and export a PDF report.
- **Remote code:** No
- **Data use:** Check **Website content** (scripts and URL on the active tab after the user clicks). Do not check location, health, or web history.
- **Certification:** Not sold, not used for unrelated ads, limited use.
- **Privacy policy URL:** host `landing/privacy.html` on HTTPS (GitHub Pages / Netlify) and paste that URL. Reviewers open it in Incognito.

## Test instructions

```
Install. Open any https website. Click the PixelCheck icon. Confirm pass/warn/fail rows for tags and UTMs. Click Export PDF — free copies are watermarked. License key field is optional. No login required.
```

## After it is live

Put the store URL on `landing/index.html`. Keep selling the watermark-removal key off-store. Do not add ads later without a separate, ads-only extension (almost never worth it).
