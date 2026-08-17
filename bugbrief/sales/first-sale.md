# Close the first BugBrief license

Do not add features until this checklist produces one paid key.

## 1. Wire payment

1. Create a $19 USD product on Gumroad or Lemon Squeezy.
2. Set the thank-you URL to your hosted `landing/thanks.html`.
3. Put the checkout URL in `landing/config.js` and `src/lib/commerce.ts`.
4. Host `landing/` (GitHub Pages, Netlify, or `npm run demo` locally).

## 2. Demo

Open `landing/demo.html`, click BugBrief, copy the brief into a dummy Jira ticket. That is the sales motion.

## 3. After they pay

```
npm run license -- tester@company.com
```

Paste the `BB1.…` key. Unwatermarked PDF with screenshot is the deliverable.
