import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const publicFiles = new Set([
  '/web/index.html', '/web/styles.css', '/web/app.mjs',
  '/core/matcher.mjs', '/core/questions.mjs', '/data/cities.json',
  '/assets/guide-cat.png', '/assets/guide-dog.png', '/assets/mascots-concept-v1.png'
]);
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png' };
export function createAppServer() {
  return createServer(async (req,res) => {
    if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      const path = decodeURIComponent(url.pathname === '/' ? '/web/index.html' : url.pathname);
      // Serve only the app's public assets, never native profiles, review packets or repository files.
      if (!publicFiles.has(path)) {res.writeHead(404);res.end('Not found');return;}
      const body = await readFile(resolve(root, '.' + path));
      res.writeHead(200, {'Content-Type':types[extname(path)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
      res.end(req.method==='HEAD'?undefined:body);
    } catch {res.writeHead(404);res.end('Not found');}
  });
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const server=createAppServer();
  server.listen(Number(process.env.PORT || 4318),'127.0.0.1',()=>console.log(`City Matchmaker: http://127.0.0.1:${server.address().port}`));
}
