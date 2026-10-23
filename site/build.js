// Builds the agency site into /docs.
// Optional details (e.g. phone, abn) can be left empty in config.json; see sections() below.
// Each file in site/pages starts with a JSON comment: <!-- {"title": "...", "description": "...", "nav": "home"} -->
// Usage: node site/build.js

const fs = require("fs");
const path = require("path");

const root = __dirname;
const out = path.join(root, "..", "docs");
const config = JSON.parse(fs.readFileSync(path.join(root, "config.json"), "utf8"));
const layout = fs.readFileSync(path.join(root, "layout.html"), "utf8");

const NAV = [
  ["home", "index.html", "Home"],
  ["services", "services.html", "Packages"],
  ["portfolio", "portfolio.html", "Work"],
  ["about", "about.html", "About"],
];

// {{#key}}...{{/key}} keeps its contents only when key is set; {{^key}}...{{/key}} only when it's empty
function sections(text, vars) {
  return text.replace(/\{\{([#^])(\w+)\}\}([\s\S]*?)\{\{\/\2\}\}/g, (match, kind, key, inner) => {
    const isSet = Boolean(vars[key]);
    return (kind === "#") === isSet ? inner : "";
  });
}

function fill(text, vars) {
  return sections(text, vars).replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (!(key in vars)) throw new Error(`Unknown token ${match}`);
    return vars[key];
  });
}

const pagesDir = path.join(root, "pages");
const sitemap = [];

for (const file of fs.readdirSync(pagesDir).filter((f) => f.endsWith(".html"))) {
  const raw = fs.readFileSync(path.join(pagesDir, file), "utf8");
  const metaMatch = raw.match(/^<!--\s*(\{[\s\S]*?\})\s*-->\n?/);
  if (!metaMatch) throw new Error(`${file} is missing its JSON header comment`);
  const meta = JSON.parse(metaMatch[1]);
  const body = raw.slice(metaMatch[0].length);

  const navLinks = NAV.map(([key, href, label]) => {
    const current = meta.nav === key ? ' aria-current="page"' : "";
    return `<a href="${href}"${current}>${label}</a>`;
  }).join("\n        ");

  const vars = {
    ...config,
    title: meta.title,
    description: meta.description,
    canonical: `${config.domain}/${file === "index.html" ? "" : file}`,
    robots: meta.noindex ? "noindex" : "index, follow",
    navLinks,
    // One block per founding spot; taken spots are dimmed
    seatIcons: Array.from({ length: 5 }, (_, i) =>
      i < 5 - config.foundingSeatsLeft ? '<i class="taken"></i>' : "<i></i>"
    ).join(""),
  };

  const html = fill(layout, { ...vars, content: fill(body, vars) });
  fs.writeFileSync(path.join(out, file), html);
  if (!meta.noindex) sitemap.push(vars.canonical);
  console.log(`built ${file}`);
}

const today = new Date().toISOString().slice(0, 10);
const demoUrls = ["tradie", "cafe", "salon"].map((d) => `${config.domain}/demos/${d}/`);
fs.writeFileSync(
  path.join(out, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    [...sitemap, ...demoUrls].map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join("\n") +
    `\n</urlset>\n`
);
fs.writeFileSync(path.join(out, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${config.domain}/sitemap.xml\n`);
console.log("built sitemap.xml, robots.txt");
