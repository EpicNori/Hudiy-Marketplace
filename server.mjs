import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createReadStream } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const fileEnv = loadEnvFile(join(root, '.env'));
const port = Number(process.env.PORT || 4174);
const catalogUrl = process.env.HUDIY_CATALOG_URL || fileEnv.HUDIY_CATALOG_URL || '';
const catalogFile = process.env.HUDIY_CATALOG_FILE || fileEnv.HUDIY_CATALOG_FILE || '';
const supabaseUrl = process.env.SUPABASE_URL || fileEnv.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || fileEnv.SUPABASE_ANON_KEY || '';
const allowedFiles = new Set(['index.html', 'app.js', 'styles.css', 'hudiy-theme.json', 'README.md', 'LICENSE', 'package.json', 'style.md', 'integration/hudiy/applications.marketplace.json', 'integration/hudiy/applications_menu.marketplace.json']);
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' };

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/api/catalog') return await serveCatalog(response);
    if (request.method !== 'GET' && request.method !== 'HEAD') return sendJson(response, 405, { error: 'method_not_allowed' });
    const relativePath = decodeURIComponent(url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
    const safePath = resolve(root, relativePath);
    if (relative(root, safePath).startsWith('..') || !isAllowedPath(relativePath)) return sendJson(response, 404, { error: 'not_found' });
    const fileStat = await stat(safePath); if (!fileStat.isFile()) return sendJson(response, 404, { error: 'not_found' });
    response.writeHead(200, { 'Content-Type': mimeTypes[extname(safePath).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    if (request.method === 'HEAD') return response.end();
    createReadStream(safePath).pipe(response);
  } catch { if (!response.headersSent) sendJson(response, 404, { error: 'not_found' }); else response.destroy(); }
});

async function serveCatalog(response) {
  if (catalogUrl && isHttpUrl(catalogUrl)) {
    try { const upstream = await fetch(catalogUrl, { headers: { Accept: 'application/json' }, redirect: 'error' }); if (!upstream.ok) throw new Error('upstream'); const payload = await upstream.text(); JSON.parse(payload); return sendRaw(response, 200, payload); } catch { return sendJson(response, 502, { error: 'catalog_unavailable', plugins: [] }); }
  }
  if (isHttpUrl(supabaseUrl) && supabaseAnonKey.startsWith('sb_publishable_')) {
    try {
      const endpoint = new URL('/rest/v1/plugins', supabaseUrl);
      endpoint.searchParams.set('select', 'id,name,description,author,version,type,supported_hudiy_version,permissions,entrypoints,files,checksum,downloads,rating,updated_at');
      endpoint.searchParams.set('status', 'eq.published');
      endpoint.searchParams.set('order', 'downloads.desc,updated_at.desc');
      const upstream = await fetch(endpoint, { headers: { Accept: 'application/json', apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }, redirect: 'error' });
      if (!upstream.ok) throw new Error('supabase');
      const rows = await upstream.json();
      const plugins = Array.isArray(rows) ? rows.map((row) => ({ ...row, supportedHudiyVersion: row.supported_hudiy_version, updatedAt: row.updated_at })).map(({ supported_hudiy_version, updated_at, ...plugin }) => plugin) : [];
      return sendJson(response, 200, { plugins, catalogConnected: true });
    } catch { return sendJson(response, 502, { error: 'supabase_catalog_unavailable', plugins: [] }); }
  }
  if (catalogFile) {
    const safeCatalog = resolve(root, catalogFile); if (!relative(root, safeCatalog).startsWith('..') && extname(safeCatalog).toLowerCase() === '.json') { try { const payload = await readFile(safeCatalog, 'utf8'); JSON.parse(payload); return sendRaw(response, 200, payload); } catch { return sendJson(response, 502, { error: 'catalog_unavailable', plugins: [] }); } }
  }
  return sendJson(response, 503, { error: 'catalog_not_configured', plugins: [] });
}

function isAllowedPath(pathname) { if (allowedFiles.has(pathname)) return true; return pathname.startsWith('assets/') && extname(pathname).toLowerCase() === '.ttf'; }
function isHttpUrl(value) { try { const protocol = new URL(value).protocol; return protocol === 'http:' || protocol === 'https:'; } catch { return false; } }
function loadEnvFile(pathname) { try { return Object.fromEntries(readFileSync(pathname, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#') && line.includes('=')).map((line) => { const index = line.indexOf('='); return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')]; })); } catch { return {}; } }
function sendRaw(response, status, body) { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); response.end(body); }
function sendJson(response, status, body) { sendRaw(response, status, JSON.stringify(body)); }
server.listen(port, '127.0.0.1', () => console.log(`Hudiy Marketplace: http://localhost:${port}/`));
