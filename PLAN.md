# Marshall Web Co. — Business Plan

Running record of decisions made phase by phase.

## Basics
- **Location:** Warrnambool, VIC, Australia (selling across the South West and online)
- **Budget:** $0 to start. Pay for things only from the first client's deposit.
- **Available hours:** Mon, Tue, Thu, Fri 5–10pm · Sat & Sun 4–11pm (to be confirmed)
- **Target market:** any local business. Calling starts with trades, hospitality/tourism and health & beauty.

## Phase 1: Brand ✅
- **Name:** Marshall Web Co.
- **Tagline:** Get found. Get called.
- **Colours:** Navy `#14213D` · Brass `#C9A227` · Off-white `#F7F5F0` · Charcoal `#2B2B2B` · CTA green `#2E9E5B`
- **Fonts:** Plus Jakarta Sans (headings) · Inter (body)
- **Logo:** "MARSHALL" wordmark with "WEB CO." in small brass caps; "M" monogram shaped like a browser window
- **Voice:** plain English, confident, talks about results (calls, bookings, jobs)

## Phase 2: Offer & pricing ✅ (AUD, no GST until turnover reaches $75k)

### Packages
| | **Starter** | **Growth** ⭐ | **Premium** |
|---|---|---|---|
| Pages | 1 long page | Up to 5 | Up to 10 |
| Mobile-first design, click-to-call, contact form, Google Map | ✅ | ✅ | ✅ |
| Basic on-page SEO + Google Search Console | ✅ | ✅ | ✅ |
| Google Business Profile setup/optimisation | — | ✅ | ✅ |
| Photo gallery, reviews section | — | ✅ | ✅ |
| Booking or quote-request system | — | — | ✅ |
| Copywriting written for them | Basic | ✅ | ✅ |
| Logo tidy-up | — | — | ✅ |
| Turnaround | 7 days | 14 days | 21 days |
| **Pay upfront** | **$590** | **$1,290** | **$2,490** |
| **Or $0 upfront** (12-month minimum, hosting & care included) | **$59/mo** | **$99/mo** | **$179/mo** |

### Care plans (for clients who paid upfront)
- **Basic: $29/mo.** Hosting, SSL, backups, uptime monitoring, 30 min of edits per month.
- **Plus: $59/mo.** Everything in Basic, plus 1 hr of edits per month, a monthly Google Business post and a monthly report.
- No lock-in. Cancel with 30 days' notice.

### Add-ons
| Add-on | Price |
|---|---|
| Google Business Profile setup (on its own) | $149 |
| Extra page | $99 |
| Simple logo | $149 |
| Review QR card design (for counter/van) | $49 |
| Online booking setup | $199 |
| Monthly local SEO | $149/mo |

### Founding client offer (first 5 clients only)
40% off any package in exchange for: a written testimonial, permission to show the site in the portfolio, and a Google review once they're happy.

### Risk reversal (say this on calls)
"I'll design your homepage for free first. If you don't love it, you don't pay a cent."
After that: 50% deposit to start, balance due on launch. Monthly plans: first month on launch.

### Why this pricing
- Below typical regional agency prices ($2k–$5k+), so it's an easy yes for a small business taking a call from a newcomer.
- The $0-upfront monthly option removes the biggest objection ("too expensive") and builds recurring income.
- Hosting static sites costs close to nothing, so monthly plans are almost pure margin.
- Example: 20 clients on $99/mo = **$1,980/mo recurring**, before any new sales.

### $0 startup stack
| Need | Free option | Pay later (from first deposit) |
|---|---|---|
| Business registration | ABN at abr.gov.au (free) | Business name with ASIC (~$45/yr). **Must be done before trading as Marshall Web Co.**, so it's the one early cost |
| Domain | Free subdomain (e.g. marshallweb.pages.dev) | marshallweb.com.au (~$20–30/yr, needs ABN) |
| Website hosting | Cloudflare Pages / GitHub Pages / Netlify free tier | — |
| Email | Gmail for now | Zoho Mail free plan on the custom domain |
| CRM | Google Sheets | — |
| Invoicing / payments | Zoho Invoice free plan + bank transfer, or Square/Stripe (per-transaction fees only) | — |
| Phone | Your own mobile (set up voicemail with the business name) | A second SIM or VoIP number |

## Phase 3: Agency website ✅
- Built in `docs/` (source in `site/`): Home, Packages, Work, About, Contact (free mockup form), Privacy, Terms, 404
- Mobile-first, sticky call bar on phones, local-business schema markup, sitemap, social sharing image
- 3 concept demos in `docs/demos/`: Saltbush Plumbing & Gas, Salt & Swell Café, Fern Lane Hair & Beauty (all fictional and labelled as concepts)
- Go-live steps: `kit/13-setup-checklist.md`

## Phase 4: Cold-calling system ✅
`kit/01`–`06`: lead sourcing and audit, call scripts, objections, follow-ups, Australian compliance, tracker and targets.
**Key constraint:** legal calling hours inside your availability are weekdays 5–8pm and Saturday 4–5pm only. Tradies on mobiles at 5–7pm are the best target; cold emails fill the rest.

## Phase 5: Delivery & operations ✅
`kit/07`–`11`: onboarding questionnaire, proposal, agreement outline (with ACL cooling-off), build process, payments.

## Phase 6: 30-day launch plan ✅
`kit/12-30-day-launch-plan.md`: Mon 26 Oct to Tue 24 Nov 2026.

## Phase 7: Premium redesign + owner panel ✅
- Cinematic dark design with frosted "liquid glass" panels, scroll-driven product showcase, Netflix-style rows and Top 5, Apple-style typography.
- **Supabase backend** (project `marshall-web-co`, Sydney): products & pricing, site settings and leads, protected by row level security.
- **Owner panel** at `/owner.html`: leads inbox (status, notes, CSV export), product & price editor with live preview, founding spots and announcement settings, password change.
- Website prices and founding spots update live from the owner panel.

## Phase 8: Client accounts ✅
- `/account.html`: sign in, create account, forgot/reset password. The owner is redirected to the owner panel.
- Client portal: their websites with a progress tracker (Mockup → Building → Your review → Live), mockup and live links, plan, price and next payment, notes from Declan, change requests with replies, profile and password.
- Owner panel: new **Clients** (add and edit websites per client) and **Change requests** (reply and update status) sections.
- Database: `profiles` (created automatically at sign-up), `sites`, `change_requests`, all with row level security.
