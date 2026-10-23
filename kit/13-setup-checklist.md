# 13 · Setup checklist: going live for $0

Tick these off in order. Total cost: **about $45** now (business name registration), then about **$25 a year** for the domain (paid from your first deposit).

## 1. Register the business (free)
- [ ] Apply for an **ABN** at **abr.gov.au** (sole trader, about 20 minutes). It usually arrives straight away or within days.
- [ ] Register **"Marshall Web Co."** as a business name at **asic.gov.au** (about $45 for 1 year; you need your ABN first). ⚠️ In Australia you must register a business name **before** you trade under it, and that includes introducing yourself on calls as "from Marshall Web Co." and running the website. **This is the one cost worth paying before your first sale.** If you truly can't spend anything yet, do your first outreach under your own name ("it's Jane, I build websites locally") and switch to the brand once it's registered.

## 2. Email and phone (free)
- [ ] Create a Gmail, e.g. **marshallwebco@gmail.com**.
- [ ] Set your mobile voicemail to a business greeting.
- [ ] Make sure your caller ID is **not** blocked.

## 3. Put your details into the website
Edit **`site/config.json`** (or ask Claude: *"Update my site config: name X, mobile Y, email Z"*):

| Field | Change to |
|---|---|
| `owner` | Your first name |
| `phone` | Your mobile, e.g. `0412 345 678` |
| `phoneIntl` | Same in international format, e.g. `+61412345678` |
| `email` | Your Gmail for now; `hello@marshallweb.com.au` once you buy the domain |
| `abn` | Your ABN |
| `domain` | Your live web address (see step 4) |
| `formspreeId` | From step 5 |
| `foundingSeatsLeft` | Count down as you sign clients |

Then rebuild the site: `node site/build.js` (or ask Claude to do it), commit and push.

## 4. Put the site online (free)
**Option A: GitHub Pages (easiest, since your code is already on GitHub)**
1. Go to your repository on github.com → **Settings → Pages**.
2. Under "Build and deployment", set **Source: Deploy from a branch**, **Branch: `master`**, **Folder: `/docs`**. Click Save.
3. After 1–2 minutes your site is live at **https://xdecstaryt.github.io/Idea1/**.
4. Put that address in `domain` in `site/config.json`, rebuild and push.
*(GitHub Pages is free for public repositories. If your repository is private, use option B.)*

**Option B: Cloudflare Pages or Netlify**
1. Sign up for free at pages.cloudflare.com or netlify.com.
2. Connect your GitHub repository, with **no build command** and the output folder set to **`docs`**.
3. You'll get a free address like `marshallweb.pages.dev` or `marshallweb.netlify.app`.

## 5. Make the contact form work (free)
1. Sign up at **formspree.io** (the free plan allows 50 submissions a month).
2. Create a new form and copy its ID (the part after `/f/`, e.g. `xyzabcd`).
3. Put it in `formspreeId` in `site/config.json`, rebuild and push.
4. Test it: fill in your own form and check your email.
*(Until you do this, the form opens the visitor's email app instead, so it still works.)*

## 6. Get found yourself (free)
- [ ] **Google Business Profile** for Marshall Web Co. (business.google.com) → choose "service area business" and list Warrnambool and nearby towns. Hide your home address.
- [ ] **Google Search Console** (search.google.com/search-console) → add your site → submit `sitemap.xml`.
- [ ] **Facebook page:** post your 3 demos.
- [ ] Join local business Facebook groups (Warrnambool and South West Victoria) and be helpful there. Don't spam.

## 7. Cold-calling setup (free)
- [ ] Register for Do Not Call washing at **donotcall.gov.au**.
- [ ] Import `kit/06-crm-tracker.csv` into Google Sheets.

## 8. Payments (free to set up)
- [ ] Open a separate no-fee bank account for the business.
- [ ] Sign up for **Zoho Invoice** (free) and **Stripe** (no monthly fee).

## 9. From your first deposit (~$25 a year)
- [ ] Buy **marshallweb.com.au** (needs your ABN; around $20–30 a year at VentraIP, Crazy Domains, etc.) and connect it to your hosting.
- [ ] Set up free email on your domain with **Zoho Mail's free plan** (hello@marshallweb.com.au), then update `email` in the config.
