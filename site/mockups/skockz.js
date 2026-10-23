// SKOCKZ redesign concept, built with the site builder's sections.
// Content, prices, photos and reviews come from the client's current store (skockz.store).
// Usage: node site/mockups/skockz.js  → writes docs/mockups/skockz/{index.html,design.json}

const fs = require("fs");
const path = require("path");
const B = require("../../docs/assets/js/builder-render.js");

const SHOP = "https://skockz.store";
const img = (file, w) => `${SHOP}/cdn/shop/files/${file}&width=${w || 900}`;
let n = 0;
const block = (type, fields) => Object.assign({ id: "sk" + (++n), type }, fields);

const design = {
  version: 1,
  theme: {
    business: "SKOCKZ",
    phone: "",
    email: "",
    description: "Hand-sculpted one-of-one keychains, skate socks, hoodies and stickers. Designed in Warrnambool, made to shred.",
    primary: "#ee1aea",
    accent: "#1a0b1f",
    mode: "dark",
    font: "street",
    radius: "soft",
  },
  blocks: [
    block("marquee", { text: "Designed in Warrnambool\nMade to shred\nFree local pickup\nShipping worldwide\nFree sticker with every order", style: "brand" }),
    block("header", {
      logo: "SKOCKZ",
      links: [
        { text: "Sets", link: "#sets" },
        { text: "Shop", link: "#shop" },
        { text: "The Vault", link: "#vault" },
        { text: "Story", link: "#about" },
        { text: "Reviews", link: "#reviews" },
      ],
      cta: "Shop all",
      ctaLink: `${SHOP}/collections/all`,
    }),
    block("hero", {
      layout: "split",
      eyebrow: "Hand-sculpted in Warrnambool",
      heading: "Made to shred.\nMade one of one.",
      text: "Clay SKOCKSTERS, skate socks, hoodies and stickers, sculpted by hand in Warrnambool. When a one-of-one is claimed, it's gone for good.",
      button: "Shop the drop",
      buttonLink: "#sets",
      button2: "Enter the vault",
      button2Link: `${SHOP}/collections/1-of-1`,
      image: img("ChatGPT_Image_Aug_2_2026_at_05_45_27_PM.png?v=1785657015", 1000),
      badges: "4.9★ from 14 reviews\nFree local pickup\nShipping worldwide",
    }),
    block("products", {
      anchor: "sets",
      eyebrow: "Matched sets · one of each, ever",
      heading: "Four sets. One of each.",
      intro: "A SKOCKSTER plus the pieces made to match it, all in one colour, sold as one. Take the one that's yours, or take the whole run.",
      columns: "4",
      items: [
        { image: img("set-s02-goblin-together.png?v=1791700747"), name: "Set 02 — GOBLIN", detail: "Glitter-olive body, curved horns, one white fang. Pale-green marble worry stone.", price: "$30", tag: "1 of 1", link: `${SHOP}/products/skockz-set-02-goblin-1-of-1` },
        { image: img("set-s03-galah-together.png?v=1791877423"), name: "Set 03 — GALAH", detail: "Pink and cheeky. Flip the keychain: SKO on one side, CKZ on the other.", price: "$40", tag: "1 of 1", link: `${SHOP}/products/skockz-set-03-galah-1-of-1` },
        { image: img("set-s04-bluebottle-together.png?v=1792192132"), name: "Set 04 — BLUEBOTTLE", detail: "Coiled horns on the stone, like a bluebottle's stingers. A SKOCKZ first.", price: "$40", tag: "1 of 1", link: `${SHOP}/products/skockz-set-04-bluebottle-1-of-1` },
        { image: img("set-s05-redback-together.png?v=1792556091"), name: "Set 05 — REDBACK", detail: "Red and gold. Flip the stone over and the whole back is gold.", price: "$40", tag: "1 of 1", link: `${SHOP}/products/skockz-set-05-redback-1-of-1` },
      ],
      button: "Take all four: $130 (save $20)",
      buttonLink: `${SHOP}/products/skockz-sets-all-four-1-of-1`,
    }),
    block("products", {
      anchor: "shop",
      eyebrow: "Best of SKOCKZ",
      heading: "The everyday drop",
      intro: "Every order comes with a free sticker.",
      columns: "4",
      items: [
        { image: img("Screenshot2026-06-20at3.36.57pm_27bea016-3ca4-4483-ae8b-e731164d1230.png?v=1786868422"), name: "Signature Hoodie", detail: "Puff print.", price: "$110", tag: "Best seller", link: `${SHOP}/products/skockz-signature-hoodie` },
        { image: img("IMG_3744.png?v=1789978074"), name: "Skateboarding Socks", detail: "Limited edition.", price: "From $15", tag: "Just landed", link: `${SHOP}/products/skockz-skateboarding-socks-limited-edition` },
        { image: img("dark-IMG_3061.jpg?v=1786412014"), name: "Mini SKOCKSTERS Keychain", detail: "Resin glazed.", price: "From $15", tag: "", link: `${SHOP}/products/mini-skocksters-keychain` },
        { image: img("ChatGPT_Image_Aug_3_2026_at_05_02_06_PM.png?v=1785740543"), name: "SKOCKZ Logo Keychain", detail: "Clay, hand-made.", price: "From $10", tag: "", link: `${SHOP}/products/clay-skockz-logo` },
      ],
      button: "Shop everything",
      buttonLink: `${SHOP}/collections/all`,
    }),
    block("stats", {
      items: [
        { value: "30", label: "One-of-ones made" },
        { value: "16", label: "Already claimed" },
        { value: "14", label: "Still in the vault" },
        { value: "$1", label: "Stickers. Yes, really." },
      ],
    }),
    block("cta", {
      anchor: "vault",
      heading: "The Vault",
      text: "Hand-sculpted one at a time. There's exactly one of each, and when it's claimed the page stays up forever so you can see what you missed.",
      button: "Enter the vault",
      buttonLink: `${SHOP}/collections/1-of-1`,
    }),
    block("about", {
      heading: "The story behind SKOCKZ",
      text: "Skateboarding has always been about bringing people together. But when injury strikes, isolation can hit hard: you're stuck on the sidelines, watching your crew progress while you heal.\n\nThat feeling inspired SKOCKZ. Our Youth Isolation Focus is about keeping you connected to skate culture, even when you can't ride. Bold designs, hot pink accents and street-inspired graphics that remind you you're still part of the crew.",
      points: "Designed and sculpted in Warrnambool\nEvery piece made by hand\nFree local pickup, delivery within 10 km, shipping worldwide",
      image: img("IMG_3743.png?v=1790072428"),
      flip: false,
    }),
    block("testimonials", {
      heading: "What the crew says",
      items: [
        { quote: "Obsessed with the Skockz key rings, venom lives on my handbag 💜", name: "Morgan H", detail: "SKOCKSTER 003 — VENOM" },
        { quote: "Same day delivery and extremely good quality, even threw in some free stickers for me.", name: "Sam B", detail: "Mini SKOCKSTERS Keychain" },
        { quote: "Perfect fit, very good quality hoodie, my new favourite piece in the wardrobe.", name: "Mia A", detail: "Signature Hoodie" },
      ],
    }),
    block("faq", {
      heading: "Good to know",
      items: [
        { q: "Do you ship?", a: "Yes, worldwide. Around Warrnambool you can also grab free local pickup, or delivery within 10 km." },
        { q: "Is every SKOCKSTER really one of one?", a: "Yes. Each one is hand-sculpted, and once it's claimed it's gone. Its page stays up so you can see what you missed." },
        { q: "Do I get a sticker?", a: "Every SKOCKZ order comes with a free sticker, and extra stickers are just $1 each." },
        { q: "Can I buy a whole set?", a: "Yes. Each matched set is sold as one, or take all four sets together for $130 while they're all still available." },
      ],
    }),
    block("cta", {
      heading: "Join the crew",
      text: "New drops, one-of-ones and behind-the-scenes sculpting, first on Instagram.",
      button: "Follow @skockz",
      buttonLink: "https://www.instagram.com/skockz",
    }),
    block("footer", { text: "© 2026 SKOCKZ · Designed in Warrnambool, made to shred · Instagram @skockz" }),
  ],
};

const out = path.join(__dirname, "..", "..", "docs", "mockups", "skockz");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "design.json"), JSON.stringify(design, null, 2));
fs.writeFileSync(path.join(out, "index.html"), B.renderSite(design, { noindex: true, banner: "Draft redesign for SKOCKZ · by Marshall Web Co." }));
console.log("wrote", path.relative(process.cwd(), out));
