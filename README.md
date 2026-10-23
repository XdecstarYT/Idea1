# Marshall Web Co.

**Get found. Get called.** A web design business for Warrnambool and South West Victoria, built to sell websites through cold calls, cold emails and walk-ins.

## What's in here

| Folder / file | What it is |
|---|---|
| [`PLAN.md`](PLAN.md) | The business plan: brand, packages, pricing, $0 startup stack |
| [`kit/`](kit/) | **The sales and operations kit.** Start with [`kit/13-setup-checklist.md`](kit/13-setup-checklist.md), then follow [`kit/12-30-day-launch-plan.md`](kit/12-30-day-launch-plan.md) |
| [`docs/`](docs/) | **The live website** (this folder is what gets published) |
| [`docs/demos/`](docs/demos/) | Three concept sites (tradie, café, salon) to show prospects and use as templates |
| [`site/`](site/) | The source for the agency website: `config.json` (your details), `data.json` (fallback prices), `pages/`, `layout.html` and `build.js` |
| [`docs/account.html`](docs/account.html) | **Login & sign-up for everyone.** Clients get their portal; the owner is sent to the owner panel |
| [`docs/owner.html`](docs/owner.html) | **The owner panel**: leads, clients, change requests, products, pricing and founding spots |
| [`supabase/schema.sql`](supabase/schema.sql) | The database setup (Supabase project `marshall-web-co`, Sydney) |
| [`MASTER_PROMPT.md`](MASTER_PROMPT.md) | The prompt this was all built from |

## The kit
1. [Finding leads + 2-minute website audit](kit/01-lead-sourcing.md)
2. [Call scripts: opener, hook, pitch, close, voicemail, walk-in](kit/02-call-scripts.md)
3. [Objection handling](kit/03-objection-handling.md)
4. [Email and SMS follow-up templates](kit/04-follow-up-templates.md)
5. [Staying legal in Australia: calls, DNC, Spam Act, cooling-off](kit/05-compliance-australia.md) ⚠️ read before your first call
6. [Tracker](kit/06-crm-tracker.csv) and [targets](kit/06-tracking-and-targets.md)
7. [Client onboarding questionnaire](kit/07-client-onboarding-questionnaire.md)
8. [Proposal template](kit/08-proposal-template.md)
9. [Service agreement outline](kit/09-service-agreement-outline.md) ⚠️ get it reviewed
10. [Repeatable build process](kit/10-build-process.md)
11. [Payments and invoicing](kit/11-payments-and-invoicing.md)
12. [30-day launch plan](kit/12-30-day-launch-plan.md)
13. [Setup checklist](kit/13-setup-checklist.md)

## Logging in
Everyone signs in at **/account.html** (the "Log in" link in the site's top menu).
- **Clients** create an account there and get their own portal: their websites, progress, mockup links, notes from you, and change requests.
- **You (the owner)** sign in on the same page and are taken straight to the owner panel. `/owner.html` also still works directly.

## Owner panel

- **Leads:** every free-mockup request lands here. Update status, add notes, export to CSV.
- **Clients:** everyone with an account. Add a website to a client (status, mockup link, plan, price, next payment, a note) and it appears in their portal instantly.
- **Change requests:** what clients have asked for. Reply and update the status; they see it in their portal.
- **Products & pricing:** edit prices, features and badges, or add new packages. **Changes go live on the website instantly**, with no rebuild needed.
- **Site settings:** founding spots left, discount and the announcement bar.
- **Account:** change your password.

The data lives in Supabase. Security is enforced by the database itself: visitors can only read prices and submit leads; clients can only see their own websites and requests; only accounts listed in the `admins` table can see leads, all clients, or change anything.

## Updating the website
1. Change your details in `site/config.json`, or edit a page in `site/pages/`.
2. Run `node site/build.js` to rebuild the pages in `docs/`.
3. Commit and push. The live site updates in a minute or two.

Or just ask Claude: *"Update my phone number to 0412 345 678 and rebuild the site."*

## Details still to add
In `site/config.json`: `phone` and `abn` are left empty, so the site hides them until you fill them in. Update `domain` if you buy marshallweb.com.au. See [setup checklist](kit/13-setup-checklist.md), step 3.
