import { writeFileSync } from 'node:fs';
import { PUBLIC_PAGES, SITE } from '../src/seo/public-pages.mjs';
writeFileSync(new URL('../public/sitemap.xml', import.meta.url), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(PUBLIC_PAGES).map((path) => `  <url><loc>${SITE}${path}</loc></url>`).join('\n')}\n</urlset>\n`);
