# Chrome Web Store listing (free)

BugBrief is **free to install and free to use**. Do **not** add AdSense, page-injected ads, or affiliate injection.

A paid license can come later. Do not mention checkout in the listing until that ships.

## Upload package

Built zip: `store/bugbrief.zip` (`npm run pack` from `bugbrief/`).

Dashboard: https://chrome.google.com/webstore/devconsole → New item → upload the zip.

Distribution / pricing: **Free**.

## Store listing tab

- **Name:** BugBrief
- **Summary:** Scan the current tab, capture screenshots, copy a Jira-ready bug brief, and run everyday QA tools.
- **Category:** Developer Tools
- **Language:** English
- **Visibility:** Public

**Description:**

```
BugBrief is a free daily toolkit for QA on the tab you have open.

Scan for broken images, unlabeled form fields, empty buttons, duplicate IDs, mixed content, failed resources, and console errors. Highlight failing elements on the page.

Capture a viewport screenshot or a stitched full-page PNG. Copy the image, download it, or include it in a PDF bug report.

Copy a markdown bug brief (URL, viewport, user-agent, steps, findings) for Jira, Linear, or GitHub. Generate test emails, phones, names, and Stripe test cards, then fill the focused field.

Everyday tools: copy URL / environment / all links, duplicate tab, hard reload, show password fields, outline clickable controls, disable CSS, clear localStorage and sessionStorage for this origin, and resize the window to phone, tablet, or desktop.

BugBrief reads the current tab after you click. Console errors are collected in-page so they can appear in the scan. Screenshots stay on your computer. It does not crawl other pages and does not inject ads. No account required.
```

## Privacy tab (copy exactly)

- **Single purpose:** Help QA testers scan the current tab, capture screenshots, write a bug report, and run common tester tools.
- **Remote code:** No
- **Data use:** Check **Website content** (DOM, console errors, URL, and optional screenshots on the active tab after the user clicks). Do not check location, health, or web history.
- **Certification:** Not sold, not used for unrelated ads, limited use.
- **Privacy policy URL:** after GitHub Pages is live, paste `https://<you>.github.io/my-products/privacy.html`. Host `landing/privacy.html` on HTTPS. Reviewers open it in Incognito.

## Permission justifications

- **activeTab / scripting:** Read the current page and inject scan/screenshot/tool scripts after the user clicks BugBrief.
- **storage:** Remember the previous Chrome window size so Restore window works.
- **windows:** Resize the current window to phone/tablet/desktop presets used in visual QA.

## Test instructions

```
Install. Open any https website. Click BugBrief. Confirm fail/warn/pass rows. Shot tab: Viewport and Full page, then Copy image / Download PNG. Tools: Copy URL, Show passwords, Outline controls, Phone 390. Report: Export PDF. No login. No payment.
```
