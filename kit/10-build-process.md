# 10 · Repeatable build process

**Target:** Starter in 7 days, Growth in 14 days, Premium in 21 days, working evenings and weekends only.

The three demo sites in `docs/demos/` are your **starting templates**. Each client site starts as a copy of the closest demo.

---

## Stage 1 · Free mockup (2–3 hours, an evening)
1. Copy the closest demo: `docs/demos/tradie/` → `docs/mockups/[client-name]/`.
2. Change the name, colours (from their logo, van or shop sign), services, towns and phone number. Use photos from their Google or Facebook page **for the mockup only**; ask permission before using them on the real site.
3. Remove the "Concept site by Marshall Web Co." banner and replace it with: *"Draft mockup prepared for [Business name] by Marshall Web Co."*
4. Commit and push. The mockup appears at `your-site/mockups/[client-name]/`. (Mockups have `noindex` so Google won't list them.)
5. Check it on your phone, then send it using template **B** in `04-follow-up-templates.md`.

> 💡 **Fastest option:** ask Claude: *"Make a mockup for [business] in [town]. They do [services]. Their colours are [x]. Base it on the tradie demo."*

## Stage 2 · Signed → kick-off (day 0)
- [ ] Agreement signed (cooling-off period noted in the tracker if it applies)
- [ ] Onboarding questionnaire sent (`07-client-onboarding-questionnaire.md`)
- [ ] Deposit invoice scheduled for **after** cooling-off (or first monthly payment due on launch)
- [ ] Calendar reminders set: content due, first draft, launch

## Stage 3 · Build (days 1–5 after content arrives)
- [ ] Copy the mockup into the client's own folder or repository
- [ ] Write the copy: headline = what you do + where; subheading = why choose you; one clear call to action
- [ ] Pages: Home, Services (or one page per main service for Growth), About, Gallery, Contact
- [ ] Tap-to-call in the header **and** a sticky bar on mobile
- [ ] Quote/contact form → Formspree (free plan), sent to the client's email
- [ ] Google Map embed and opening hours
- [ ] Compress photos (squoosh.app, free) to under 300KB each
- [ ] `<title>` and meta description on every page: "[Service] in [Town] | [Business]"
- [ ] LocalBusiness schema (copy from `site/layout.html` and edit)
- [ ] Favicon, social sharing image, privacy page

## Stage 4 · Quality check (1 hour)
- [ ] Tested on your phone, and on a desktop or laptop
- [ ] Every button and link works; tap-to-call dials the right number
- [ ] The form actually arrives in the client's inbox
- [ ] pagespeed.web.dev mobile score of 85+
- [ ] Spelling checked: business name, phone, address, licence numbers
- [ ] No leftover demo text or "Example" content

## Stage 5 · Client review (2 rounds)
Send the link with: *"Have a look on your phone and reply with any changes as a list. You've got two rounds of changes included."*

## Stage 6 · Launch
1. **Hosting:** create a free Cloudflare Pages (or Netlify) project for the client and upload their folder.
2. **Domain:** register it **in the client's name** (VentraIP, Crazy Domains, etc., around $20–30 a year for .com.au) and point it at the hosting.
3. **Google Search Console:** add the site and submit the sitemap.
4. **Google Business Profile** (Growth+): claim or verify it, add the website link, photos, hours, services and categories, plus a first post.
5. Send the final invoice or set up the monthly payment.
6. Send the launch email, with their **Google review link** for their own customers.

## Stage 7 · After launch
- [ ] Day 7: "How's it going? Any changes?" (and ask for **your** Google review and testimonial)
- [ ] Monthly: care plan changes, plus a Google post and report for Plus clients
- [ ] Every 3 months: suggest one upsell (review QR card, extra service page, local SEO)
- [ ] Ask for referrals: *"Know any other business owners who need a website? I'll give you a month free for every referral that signs up."*
