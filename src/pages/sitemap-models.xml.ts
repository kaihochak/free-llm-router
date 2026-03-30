import type { APIRoute } from 'astro';
import { createDb } from '@/db';
import { getActiveModels } from '@/services/openrouter';
import { siteConfig } from '@/lib/seo';

function encodeModelPath(modelId: string): string {
  return modelId
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export const GET: APIRoute = async (context) => {
  const runtime = (context.locals as { runtime?: { env?: Record<string, string> } }).runtime;
  const databaseUrl = runtime?.env?.DATABASE_URL || import.meta.env.DATABASE_URL;
  const db = createDb(databaseUrl);
  const models = await getActiveModels(db);

  const urls = models
    .map((m) => {
      const lastmod = m.lastSeenAt
        ? `\n    <lastmod>${new Date(m.lastSeenAt).toISOString().split('T')[0]}</lastmod>`
        : '';
      return `  <url>
    <loc>${siteConfig.url}/models/${encodeModelPath(m.id)}</loc>${lastmod}
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
