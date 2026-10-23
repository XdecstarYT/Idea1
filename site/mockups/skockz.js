// SKOCKZ redesign concept: a full multi-page site built with the site builder's sections.
// Products, prices, sold/available status, photos, policies and copy come from the client's current store (skockz.store).
// Usage: node site/mockups/skockz.js  → writes docs/mockups/skockz/{index.html,design.json}

const fs = require("fs");
const path = require("path");
const B = require("../../docs/assets/js/builder-render.js");

const SHOP = "https://skockz.store";
const img = (file, w) => `${SHOP}/cdn/shop/files/${file}&width=${w || 900}`;
const product = (handle) => `${SHOP}/products/${handle}`;
let n = 0;
const block = (type, fields) => Object.assign({ id: "sk" + (++n), type }, fields);

// ---------- Catalogue (snapshot of skockz.store) ----------
// [handle, name, price, sold, photo, detail]
const SKOCKSTERS = [
  ["skockster-001-blizzard-1-of-1", "001 BLIZZARD", 25, true, "skockster-001-blizzard-premium.png?v=1787482857", "Iced blue, gold horns and toes."],
  ["skockster-002-scorch-1-of-1", "002 SCORCH", 25, true, "skockster-002-scorch-premium.png?v=1787482867", "Deep red, hot-pink shift, gold horns."],
  ["skockster-003-venom-1-of-1", "003 VENOM", 25, true, "skockster-003-venom-premium.png?v=1787482865", "Purple, with its own hand-built deck."],
  ["skockster-004-emerald-1-of-1", "004 JADE", 25, true, "skockster-004-emerald-premium.png?v=1787902544", "Glow-green core, bronze-tipped bat wings."],
  ["skockster-005-shard-1-of-1", "005 SHARD", 25, true, "skockster-005-shard-premium.png?v=1787902564", "Deep blue dragon, teal wings, bronze horns."],
  ["skockster-006-tarnish-1-of-1", "006 TARNISH", 25, true, "skockster-006-tarnish-premium.png?v=1788043695", "Antique gold gone green at the edges."],
  ["skockster-007-riptide-1-of-1", "007 RIPTIDE", 25, true, "skockster-007-riptide-premium.png?v=1789273952", "Turquoise, silver horns and talons."],
  ["skockster-008-hazard-1-of-1", "008 HAZARD", 25, true, "skockster-008-hazard-premium.png?v=1789273960", "Three greens, deep to lime, one white fang."],
  ["skockster-009-glacier-1-of-1", "009 GLACIER", 25, true, "skockster-009-glacier-premium.png?v=1790069844", "Jade-teal with shimmer through the clay."],
  ["skockster-010-mirage-1-of-1", "010 MIRAGE", 25, true, "skockster-010-mirage-premium.png?v=1790389052", "Four greens, teal tail fin."],
  ["skockster-011-bloom-1-of-1", "011 BLOOM", 25, true, "skockster-011-bloom-premium.png?v=1790388258", "Deep violet with magenta spikes."],
  ["skockster-012-patina-1-of-1", "012 PATINA", 25, false, "skockster-012-patina-copper.png?v=1790393787", "Mint green and copper, like copper as it ages."],
  ["skockster-013-thrash-1-of-1", "013 THRASH", 25, true, "skockster-013-thrash-premium.png?v=1790477076", "Two-tone red. Rides its own board."],
  ["skockster-014-alloy-1-of-1", "014 ALLOY", 25, true, "skockster-014-alloy-premium.png?v=1790481796", "Four metallic clays on one piece."],
  ["skockster-015-crush-1-of-1", "015 CRUSH", 25, true, "skockster-015-crush-premium.png?v=1790725900", "The first one built all in SKOCKZ pink."],
];
const TRAYS = [
  ["skockz-tray-001-flare-1-of-1", "TRAY 001 FLARE", 20, true, "skockz-tray-001-flare-premium.png?v=1787969973", "Hot pink dish, tongue out."],
  ["skockz-tray-002-midas-1-of-1", "TRAY 002 MIDAS", 25, false, "skockz-tray-002-midas-premium.png?v=1787902573", "Gold dish, gritted teeth."],
  ["skockz-tray-003-oxide-1-of-1", "TRAY 003 OXIDE", 25, false, "ChatGPT_Image_Aug_31_2026_at_12_38_27_PM.png?v=1788143937", "Deep green, pale blue snout."],
  ["skockz-tray-005-sulfur-1-of-1", "TRAY 005 SULFUR", 25, false, "skockz-tray-005-sulfur-premium.png?v=1789297429", "Yellow, scalloped edge, brown studs."],
  ["skockz-tray-006-plasma-1-of-1", "TRAY 006 PLASMA", 25, false, "skockz-tray-006-plasma-premium.png?v=1789297437", "Magenta, pink fangs."],
  ["skockz-tray-007-furnace-1-of-1", "TRAY 007 FURNACE", 25, false, "skockz-tray-007-furnace-premium.png?v=1789297456", "Flecked red, gold teeth."],
  ["skockz-tray-008-oracle-1-of-1", "TRAY 008 ORACLE", 25, false, "skockz-tray-008-oracle-premium.png?v=1789297465", "Lavender with a spiralled third eye."],
];
const CASES = [
  ["skockz-case-001-cobalt-1-of-1", "CASE 001 COBALT", 25, false, "skockz-case-001-cobalt.jpg?v=1790835439", "Teal lighter case, cobalt visor."],
  ["skockz-case-002-eclipse-1-of-1", "CASE 002 ECLIPSE", 25, false, "skockz-case-002-eclipse.jpg?v=1790835439", "Deep violet, magenta horns."],
  ["skockz-case-003-narwhal-1-of-1", "CASE 003 NARWHAL", 25, false, "skockz-case-003-narwhal.jpg?v=1790835426", "Ocean blue, one horn, big pout."],
];
const SETS = [
  ["skockz-set-01-nugget-1-of-1", "SET 01 NUGGET", 30, true, "set-s01-nugget-together.png?v=1791698718", "Gold SKOCKSTER and matching worry stone."],
  ["skockz-set-02-goblin-1-of-1", "SET 02 GOBLIN", 30, false, "set-s02-goblin-together.png?v=1791700747", "Glitter-olive, curved horns, one white fang. Pale-green marble worry stone."],
  ["skockz-set-03-galah-1-of-1", "SET 03 GALAH", 40, false, "set-s03-galah-together.png?v=1791877423", "Pink and cheeky. Flip the keychain: SKO on one side, CKZ on the other."],
  ["skockz-set-04-bluebottle-1-of-1", "SET 04 BLUEBOTTLE", 40, false, "set-s04-bluebottle-together.png?v=1792192132", "Coiled horns on the stone, like a bluebottle's stingers."],
  ["skockz-set-05-redback-1-of-1", "SET 05 REDBACK", 40, false, "set-s05-redback-together.png?v=1792556091", "Red and gold. Flip the stone over and the whole back is gold."],
];
const card = (group, tag) => ([handle, name, price, sold, photo, detail]) => ({ image: img(photo), name, detail, price: "$" + price, tag, group, link: product(handle), sold });

const VAULT = [].concat(SETS.map(card("Sets", "1 of 1")), SKOCKSTERS.map(card("SKOCKSTERS", "1 of 1")), TRAYS.map(card("Trays", "1 of 1")), CASES.map(card("Lighter cases", "1 of 1")));
const claimed = VAULT.filter((i) => i.sold).length;
const available = VAULT.filter((i) => !i.sold);

const MERCH = [
  { image: img("IMG_3744.png?v=1789978074"), name: "Skateboarding Socks", detail: "Bamboo crew socks, one run of 100. AU 8–12.", price: "From $15", tag: "Just landed", group: "Wear", link: product("skockz-skateboarding-socks-limited-edition") },
  { image: img("Screenshot2026-06-20at3.36.57pm_27bea016-3ca4-4483-ae8b-e731164d1230.png?v=1786868422"), name: "Signature Hoodie", detail: "Puff print. One small batch, ships from November 2026.", price: "$110", tag: "Pre-order", group: "Wear", link: product("skockz-signature-hoodie") },
  { image: img("dark-IMG_3061.jpg?v=1786412014"), name: "Mini SKOCKSTERS Keychain", detail: "Rolled and shaped by hand. Yours is the only one.", price: "From $15", tag: "Made to order", group: "Keychains", link: product("mini-skocksters-keychain") },
  { image: img("ChatGPT_Image_Aug_3_2026_at_05_02_06_PM.png?v=1785740543"), name: "LOGO Keychain", detail: "SZ monogram or the full logo, in any colour.", price: "From $10", tag: "", group: "Keychains", link: product("clay-skockz-logo") },
  { image: img("ChatGPT_Image_Aug_3_2026_at_05_08_37_PM.png?v=1785740950"), name: "Sticker Sheets", detail: "Premium gloss. A free sheet comes in every order.", price: "$1", tag: "", group: "Stickers", link: product("stickers") },
];

const REVIEWS = [
  { quote: "Obsessed with the Skockz key rings, venom lives on my handbag 💜", name: "Morgan H", detail: "SKOCKSTER 003 VENOM" },
  { quote: "Same day delivery and extremely good quality, even threw in some free stickers for me.", name: "Sam B", detail: "Mini SKOCKSTERS Keychain" },
  { quote: "Perfect fit, very good quality hoodie, my new favourite piece in the wardrobe.", name: "Mia A", detail: "Signature Hoodie" },
];

const HERO_IMG = img("ChatGPT_Image_Aug_2_2026_at_05_45_27_PM.png?v=1785657015", 2000);

// ---------- Pages ----------
const home = [
  block("hero", {
    layout: "full",
    eyebrow: "Hand-sculpted in Warrnambool",
    heading: "Made to shred.\nMade one of one.",
    text: "Clay SKOCKSTERS, skate socks, hoodies and stickers, made by a skater for the skate community. When a one-of-one is claimed, it's gone for good.",
    button: "Enter the vault",
    buttonLink: "#/vault",
    button2: "Shop the drop",
    button2Link: "#/shop",
    image: HERO_IMG,
    badges: "4.9★ from 14 reviews\nFree Warrnambool pickup\nFree shipping over $50",
  }),
  block("stats", {
    items: [
      { value: String(VAULT.length), label: "One-of-ones made" },
      { value: String(claimed), label: "Already claimed" },
      { value: String(available.length), label: "Still in the vault" },
      { value: "0", label: "Restocks. Ever." },
    ],
  }),
  block("tiles", {
    eyebrow: "Shop the range",
    heading: "Pick your poison",
    items: [
      { image: img("set-s05-redback-together.png?v=1792556091", 1200), title: "Matched sets", text: "A SKOCKSTER plus the pieces made to match it.", link: "#/sets" },
      { image: img("skockster-012-patina-copper.png?v=1790393787", 1200), title: "The Vault", text: `${VAULT.length} one-of-ones. ${available.length} left.`, link: "#/vault" },
      { image: img("IMG_3744.png?v=1789978074", 1000), title: "SKOCKZ Socks", text: "100 pairs. One run.", link: "#/socks" },
      { image: img("Screenshot2026-06-20at3.36.57pm_27bea016-3ca4-4483-ae8b-e731164d1230.png?v=1786868422", 1000), title: "Hoodies & merch", text: "Wear it, clip it, slap it.", link: "#/shop" },
      { image: img("skockz-tray-008-oracle-premium.png?v=1789297465", 1000), title: "Trays & cases", text: "Sculpted dishes and lighter cases.", link: "#/vault" },
    ],
  }),
  block("products", {
    anchor: "fresh",
    eyebrow: "Still in the vault",
    heading: "Grab one before someone else does",
    intro: "There's exactly one of each of these. The photo is the exact piece you get.",
    columns: "4",
    items: available.filter((i) => i.group !== "Sets").slice(0, 8),
    button: `See all ${VAULT.length} in the vault`,
    buttonLink: "#/vault",
  }),
  block("feature", {
    eyebrow: "The first run has landed",
    heading: "SKOCKZ Socks.\n100 pairs. Then never again.",
    text: "Custom-knit bamboo crew socks in black and charcoal, each rolled into a collectible tin numbered by hand: yours out of 100.",
    points: "One size, AU 8–12\nReinforced where skate shoes wear through\nOne colourway, no restock",
    price: "From $15",
    priceNote: "$25 with the numbered can",
    button: "Get the socks",
    buttonLink: "#/socks",
    image: img("IMG_3743.png?v=1790072428", 1200),
    badge: "1 of 100",
  }),
  block("steps", {
    eyebrow: "Why SKOCKZ is different",
    heading: "Small batch. Real hands. No fake scarcity.",
    items: [
      { title: "Handmade in small batches", text: "Made in Warrnambool, not mass-produced. Every piece gets real time and real hands. No moulds, no casts, no production line." },
      { title: "Genuinely limited", text: "When a run's gone, it's gone. No restock spam. Sold one-of-ones keep their page so you can see what you missed." },
      { title: "By the community, for the community", text: "Built by a young Aussie skater who's actually part of it. A free sticker sheet goes in every single order." },
    ],
  }),
  block("testimonials", { heading: "What the crew says", items: REVIEWS }),
  block("cta", { heading: "Join the crew", text: "New drops, one-of-ones and behind-the-scenes sculpting land on Instagram first.", button: "Follow @skockz", buttonLink: "https://www.instagram.com/skockz" }),
];

const shop = [
  block("pagehead", { eyebrow: "Shop", heading: "The everyday drop", text: "Socks, hoodies, keychains and stickers. Every order comes with a free sticker sheet, and Warrnambool locals can pick up for free." }),
  block("products", { anchor: "merch", heading: "", columns: "3", filters: true, items: MERCH }),
  block("feature", {
    eyebrow: "Pre-order · ships from November 2026",
    heading: "The Signature Hoodie",
    text: "Puff-print SKOCKZ hoodie, made in one small batch rather than held in stock. Order now and yours is reserved from that run.",
    points: "An email at every step\nFull refund on request any time before it ships\nFree pickup in Warrnambool",
    price: "$110",
    button: "Reserve yours",
    buttonLink: product("skockz-signature-hoodie"),
    image: img("ChatGPT_Image_Sep_2_2026_at_12_48_50_PM.png?v=1790836882", 1200),
    badge: "Pre-order",
    flip: true,
  }),
  block("services", {
    heading: "The small print, made simple",
    items: [
      { icon: "📍", title: "Free Warrnambool pickup", text: "Choose local pickup at checkout and we'll arrange a time and a public spot.", price: "" },
      { icon: "📦", title: "Free shipping over $50", text: "Australia-wide. Standard $11, express $15, international $20.", price: "" },
      { icon: "✨", title: "Free stickers, always", text: "A sticker sheet goes in every order. You don't have to do anything.", price: "" },
    ],
  }),
];

const sets = [
  block("pagehead", { eyebrow: "Matched sets · one of each, ever", heading: "Four sets. One of each.", text: "A SKOCKSTER plus the pieces made to match it, all in one colour, sold as one. Take the one that's yours, or take the whole run.", image: img("set-s04-bluebottle-together.png?v=1792192132", 2000) }),
  block("products", { anchor: "all-sets", heading: "", columns: "3", soldText: "Claimed", items: SETS.map(card("Sets", "1 of 1")) }),
  block("feature", {
    eyebrow: "Only while all four are here",
    heading: "Take all four.",
    text: "GOBLIN, GALAH, BLUEBOTTLE and REDBACK: four one-of-one SKOCKSTERS, each with the worry stone made to match it. One buyer. This offer disappears the moment any single set sells.",
    price: "$130",
    priceNote: "save $20",
    button: "Claim all four",
    buttonLink: product("skockz-sets-all-four-1-of-1"),
    image: img("set-s03-galah-together.png?v=1791877423", 1200),
    badge: "Save $20",
  }),
  block("steps", {
    heading: "What's in a set",
    items: [
      { title: "A one-of-one SKOCKSTER", text: "Hand-sculpted, never repeated. The photo is the exact piece." },
      { title: "Its matching worry stone", text: "Made in the same colours, to sit in your pocket or on your desk." },
      { title: "Logo keychain + stickers", text: "Sets 03 to 05 add a two-sided SKO/CKZ keychain. Pick three set-only stickers you can't buy anywhere else." },
    ],
  }),
];

const vault = [
  block("pagehead", { eyebrow: "The Vault", heading: "Every one-of-one we've ever made.", text: "Hand-sculpted one at a time. There's exactly one of each, and when it's claimed its page stays up forever so you can see what you missed." }),
  block("stats", {
    items: [
      { value: String(VAULT.length), label: "Made" },
      { value: String(claimed), label: "Claimed" },
      { value: String(available.length), label: "Available now" },
      { value: "$20–$40", label: "Each" },
    ],
  }),
  block("products", { anchor: "collection", eyebrow: "Filter the vault", heading: "", columns: "4", filters: true, soldText: "Claimed", items: VAULT }),
  block("cta", { heading: "Want one made for you?", text: "Custom SKOCKSTERS and collabs start with a message on Instagram.", button: "DM @skockz", buttonLink: "https://www.instagram.com/skockz" }),
];

const socks = [
  block("hero", {
    layout: "split",
    eyebrow: "The run has landed",
    heading: "SKOCKZ Socks.\nThe first run.",
    text: "One hundred pairs turned up this week, along with one hundred cans, and every can is being numbered by hand. This is the first SKOCKZ product ever manufactured, and it exists because a 17-year-old in Warrnambool put his own money on the table.",
    button: "Buy socks: $15",
    buttonLink: product("skockz-skateboarding-socks-limited-edition"),
    button2: "Join the can list",
    button2Link: "#signup",
    image: img("IMG_3744.png?v=1789978074", 1200),
    badges: "Bamboo knit\nAU 8–12\nNo restock",
  }),
  block("stats", { items: [{ value: "100", label: "Pairs made" }, { value: "1", label: "Colourway" }, { value: "0", label: "Restocks" }] }),
  block("pricing", {
    heading: "Two ways to get a pair",
    items: [
      { name: "Socks only", price: "$15", note: "no can", features: "On sale now\nOnly 40 pairs go out without a can\nFree sticker sheet", featured: false },
      { name: "Socks + collectible can", price: "$25", note: "", features: "Printed tin with a ring-pull lid\nNumbered by hand: yours out of 100\nNo two cans share a number", featured: true },
    ],
  }),
  block("text", {
    heading: "What you're getting",
    body: "Colourway | Black and charcoal grey\nSize | One size, AU 8–12\nFabric | Bamboo knit, terry loop footbed\nCut | Crew, cushioned underfoot\nRun size | 100 pairs, no restock\n\nRibbed leg, contrast cuff, heel and toe, with the SKOCKSTER and the SKOCKZ wordmark up the side. Reinforced at the toe and heel, where skate shoes wear through first.\n\n## The can\nEvery pair comes rolled into a printed collectible tin with a ring-pull lid and a number written on it by hand. The can is half the point: it sits on your shelf long after the socks are in the wash.",
  }),
  block("signup", { eyebrow: "Why bother with a list?", heading: "100 pairs is genuinely not many.", text: "Warrnambool alone could clear that. Get one email the moment the cans go on sale, before the rest of the store sees them. No payment, no commitment.", button: "Join the list", note: "One email when the cans drop. We never sell your details." }),
];

const story = [
  block("pagehead", { eyebrow: "The story behind SKOCKZ", heading: "Made by a skater,\nfor the skate community.", text: "SKOCKZ started in a garage in Warrnambool with a simple idea: the gear you rep should feel just as personal as the culture behind it." }),
  block("about", {
    heading: "Why I started SKOCKZ",
    text: "I'm a Year 12 student and a skater. I started SKOCKZ because the skatepark is where mates are made, tricks are learned, and everything else disappears for a while.\n\nWhen an injury put me on the sidelines, I felt how isolating it is to be cut off from that. Filming my mates and slowly building back got me through it, and that's the spirit this brand is built on.",
    points: "Designed in Warrnambool\nEvery piece made by hand\nMade to shred",
    image: img("IMG_3743.png?v=1790072428", 1200),
    flip: false,
  }),
  block("services", {
    heading: "What we make",
    items: [
      { icon: "🧦", title: "SKOCKZ Socks", text: "Limited-edition skate socks, each shipped in its own collectible tin.", price: "" },
      { icon: "🐉", title: "SKOCKSTERS", text: "One-of-one polymer clay characters, hand-sculpted so no two are ever the same.", price: "" },
      { icon: "🧸", title: "Low Poly 3D Bears", text: "Precision 3D-printed collectibles in limited-run colours.", price: "" },
      { icon: "🛹", title: "Stickers & apparel", text: "Slap 'em on your board and rep the crew everywhere you ride.", price: "" },
    ],
  }),
  block("gallery", {
    heading: "From the desk",
    items: [
      { image: img("skockster-003-venom.jpg?v=1787478987"), caption: "003 VENOM, before the studio photo" },
      { image: img("skockster-006-tarnish-raw.jpg?v=1788043695"), caption: "006 TARNISH, raw" },
      { image: img("skockster-008-hazard-back.png?v=1789273961"), caption: "008 HAZARD from the back" },
      { image: img("dark-IMG_3050.jpg?v=1786412014"), caption: "Mini SKOCKSTERS, fresh batch" },
    ],
  }),
  block("cta", { heading: "Send in your clip", text: "Film your best line repping SKOCKZ and tag @skockz. The best ones get featured on the site and our story.", button: "Tag @skockz", buttonLink: "https://www.instagram.com/skockz" }),
];

const faq = [
  block("pagehead", { eyebrow: "FAQ", heading: "Everything people actually ask.", text: "If your question isn't here, email sskockzz@gmail.com. It's a real person, and it's usually me." }),
  block("faq", {
    anchor: "ordering",
    heading: "Ordering & how it's made",
    items: [
      { q: "Is it actually handmade?", a: "Actually handmade. Every clay SKOCKSTER, keychain and logo piece is rolled, shaped and assembled by hand in Warrnambool. No moulds, no casts. Yours will vary a little from the photos, and that's what makes it one of one." },
      { q: "Can I choose the colour?", a: "Yep. Pick your options on the product page. Most clay pieces come in 8 colours, and several have a resin glaze upgrade for a glossy, harder-wearing finish." },
      { q: "Is it made before or after I order?", a: "After. Clay pieces are made once your order comes through, so they take a few days. Stickers and anything in stock go out straight away." },
      { q: "Do I get free stickers?", a: "A free sticker sheet goes in every single order." },
      { q: "What's the FREE BONUS KEYCHAIN banner?", a: "If you see the gold banner on a product page, a second handmade keychain goes in your parcel at no cost. It's a surprise, and it's a real one." },
    ],
  }),
  block("text", {
    anchor: "shipping",
    heading: "Shipping & delivery",
    body: "Everything ships from Warrnambool, Victoria. All prices in AUD.\n\nAustralia, standard | $11.00\nAustralia, express | $15.00\nAustralia, orders over $50 | FREE\nWarrnambool local pickup | FREE\nInternational | $20.00\n\n## How long until it turns up?\nStickers and in-stock items | 1–2 business days to make\nClay SKOCKSTERS and keychains | 3–5 business days\nMade-to-order tees | 2–3 weeks\nSignature Hoodie | ships from November 2026\n\nThen the post: Australia Post is usually 2–6 business days standard, 1–3 express. International is usually 2–4 weeks. You'll get tracking by email the moment it's posted.",
  }),
  block("faq", {
    anchor: "returns",
    heading: "Returns, sizing & payment",
    items: [
      { q: "It arrived faulty or damaged", a: "Email sskockzz@gmail.com within 30 days with your order number and a photo. We'll sort a replacement, repair or refund, and cover return postage on faulty items. Your rights under Australian Consumer Law always apply." },
      { q: "I changed my mind. Can I return it?", a: "Yes, on most things: send back an unused item in its original condition within 30 days for a refund. Pieces made specifically for you (clay SKOCKSTERS, keychains, custom colours, made-to-order tees) can't be returned for change of mind." },
      { q: "What size should I get?", a: "Socks are one size, AU 8–12. For everything else, measure a shirt you already love and compare it with the size guide, or email us and we'll tell you straight." },
      { q: "How can I pay?", a: "Visa, Mastercard, American Express and the express wallets at checkout. Checkout runs on Shopify's secure checkout, so SKOCKZ never sees your card details." },
    ],
  }),
];

const contact = [
  block("pagehead", { eyebrow: "Contact", heading: "Get in touch", text: "Question about an order, a custom SKOCKSTER, a collab, or just want to say what's up? We're real people and we'd love to hear from you." }),
  block("contact", { heading: "Send us a message", text: "DM @skockz on Instagram for the fastest reply, or use the form and we'll get back to you within 1–2 days.", showForm: true }),
  block("services", {
    heading: "Quick answers",
    items: [
      { icon: "🚚", title: "Shipping", text: "We ship right across Australia and worldwide. Free over $50 in Australia.", price: "" },
      { icon: "✋", title: "Handmade items", text: "SKOCKSTERS are made by hand, so give us a few days to craft yours.", price: "" },
      { icon: "🤝", title: "Collabs & wholesale", text: "Keen to work together? Slide into the DMs.", price: "" },
    ],
  }),
];

const design = {
  version: 2,
  theme: {
    business: "SKOCKZ",
    phone: "",
    email: "sskockzz@gmail.com",
    description: "Hand-sculpted one-of-one SKOCKSTERS, skate socks, hoodies and stickers. Designed in Warrnambool, made to shred.",
    primary: "#ee1aea",
    accent: "#1a0b1f",
    mode: "dark",
    font: "street",
    radius: "soft",
  },
  shared: [
    block("marquee", { text: "Designed in Warrnambool\nMade to shred\nFree local pickup\nFree shipping over $50\nFree sticker with every order", style: "brand" }),
    block("header", { logo: "SKOCKZ", links: [], cta: "Shop all", ctaLink: "#/shop", auto: true }),
    block("footer", {
      text: "© 2026 SKOCKZ · Designed in Warrnambool, made to shred",
      tagline: "An independent skate brand from Warrnambool, Victoria. Hand-sculpted one-of-ones, socks, hoodies and stickers.",
      links: [
        { text: "Instagram @skockz", link: "https://www.instagram.com/skockz" },
        { text: "Shipping", link: "#shipping" },
        { text: "Returns", link: "#returns" },
        { text: "Current store", link: SHOP },
      ],
    }),
  ],
  pages: [
    { id: "home", title: "Home", slug: "home", blocks: home },
    { id: "shop", title: "Shop", slug: "shop", blocks: shop },
    { id: "sets", title: "Sets", slug: "sets", blocks: sets },
    { id: "vault", title: "The Vault", slug: "vault", blocks: vault },
    { id: "socks", title: "Socks", slug: "socks", blocks: socks },
    { id: "story", title: "Story", slug: "story", blocks: story },
    { id: "faq", title: "FAQ", slug: "faq", blocks: faq },
    { id: "contact", title: "Contact", slug: "contact", hideInMenu: true, blocks: contact },
  ],
};

if (!B.isDesign(design)) throw new Error("design has an unknown section type");
const out = path.join(__dirname, "..", "..", "docs", "mockups", "skockz");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "design.json"), JSON.stringify(design, null, 2));
fs.writeFileSync(path.join(out, "index.html"), B.renderSite(design, { noindex: true, banner: "Draft redesign for SKOCKZ · by Marshall Web Co." }));
console.log("wrote", path.relative(process.cwd(), out), `(${design.pages.length} pages, ${VAULT.length} one-of-ones, ${claimed} claimed)`);
