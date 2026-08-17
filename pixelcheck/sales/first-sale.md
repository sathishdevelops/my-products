# Close the first PixelCheck license

Do not add features until this checklist produces one paid key.

## 1. Wire payment (5 minutes)

1. Create a $19 USD product on [Gumroad](https://gumroad.com/) or [Lemon Squeezy](https://www.lemonsqueezy.com/).
2. Set the thank-you URL to your hosted `landing/thanks.html` (or leave default and email the key yourself).
3. Put the checkout URL in [landing/config.js](landing/config.js):

```js
window.PIXELCHECK_CHECKOUT = "https://yourname.gumroad.com/l/pixelcheck";
```

4. Host `landing/` (GitHub Pages, Netlify, or `python3 -m http.server` for local demos).

## 2. Reply to the 20 DMs

Use the same list in [outreach/tracker.csv](outreach/tracker.csv).

```
Beta is ready. $19 here: {checkout}

Or reply with your email and I’ll send a key after payment.
Demo: open any client site, click PixelCheck, Export PDF.
```

## 3. After they pay

```
npm run license -- client@agency.com
```

Paste the `PC1.…` key in email/WhatsApp. They unlock in the popup. Unwatermarked PDF is the deliverable.

If they stall: “Trial already scans. The $19 is only to drop the watermark on the client PDF.”

## 4. Stop here

Week-1 success is **1 paid license**. No Firefox, no site crawl, no subscription until that happens.
