import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { KnowledgeGraphEngine } from './knowledge_graph_engine.js';
import { HybridGraphRAG } from './hybrid_graph_rag.js';
import { resolveSafePath, readJsonBody } from './util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const sendJson = (res: http.ServerResponse, status: number, payload: unknown): void => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
};

/** Build a fully wired NexusGraph server (with seeded topology) without binding a port. */
export function createNexusGraphServer(): { server: http.Server; graph: KnowledgeGraphEngine; rag: HybridGraphRAG } {
  const graph = new KnowledgeGraphEngine();
  const rag = new HybridGraphRAG(graph);

  // Seed standard enterprise topology
  graph.addNode({ id: 'jira_inc_902', type: 'INCIDENT', name: 'INC-902: High Checkout API Latency', sourceOrigin: { system: 'Jira Service Management', externalId: 'INC-902' } });
  graph.addNode({ id: 'svc_checkout', type: 'SERVICE', name: 'Checkout Payments Gateway', sourceOrigin: { system: 'Datadog Service Catalog', externalId: 'checkout-v2' } });
  graph.addNode({ id: 'gh_pr_1082', type: 'DEPLOYMENT', name: 'PR-1082: Reconfigure Redis Connection Pool', sourceOrigin: { system: 'GitHub', externalId: 'pull/1082' } });
  graph.addNode({ id: 'usr_elena', type: 'PERSON', name: 'Elena Vance', attributes: { role: 'Principal Platform Engineer', email: 'elena.vance@enterprise.com' }, sourceOrigin: { system: 'Workday / Slack', externalId: 'U084A29B' } });
  graph.addEdge('jira_inc_902', 'svc_checkout', 'AFFECTED_SERVICE');
  graph.addEdge('svc_checkout', 'gh_pr_1082', 'MODIFIED_BY_DEPLOYMENT');
  graph.addEdge('gh_pr_1082', 'usr_elena', 'AUTHORED_BY');

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      if (req.url === '/api/health' && req.method === 'GET') {
        return sendJson(res, 200, { status: 'online', service: 'NexusGraph Enterprise', timestamp: new Date().toISOString(), nodeCount: graph.nodes.size });
      }

      if (req.url === '/api/graph' && req.method === 'GET') {
        return sendJson(res, 200, { nodes: Array.from(graph.nodes.values()), edges: graph.edges });
      }

      if (req.url === '/api/query' && req.method === 'POST') {
        const { query } = await readJsonBody(req);
        if (!query || typeof query !== 'string') {
          return sendJson(res, 400, { error: 'A non-empty "query" string is required.' });
        }
        return sendJson(res, 200, rag.query(query));
      }

      // Static files (path-traversal safe)
      const filePath = resolveSafePath(PUBLIC_DIR, req.url);
      if (!filePath) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      fs.readFile(filePath, (err, content) => {
        if (err) {
          const code = (err as NodeJS.ErrnoException).code === 'ENOENT' ? 404 : 500;
          res.writeHead(code, { 'Content-Type': 'text/plain' });
          res.end(code === 404 ? '404 Not Found' : 'Server Error');
        } else {
          res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
          res.end(content);
        }
      });
    } catch (err) {
      const e = err as Error & { statusCode?: number };
      sendJson(res, e.statusCode || 400, { error: e.message });
    }
  });

  return { server, graph, rag };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isMain) {
  const PORT = process.env.PORT || 3006;
  const { server } = createNexusGraphServer();
  server.listen(PORT, () => {
    console.log(`🌐 NexusGraph Enterprise Server running at http://localhost:${PORT}`);
    console.log(`📋 Health: http://localhost:${PORT}/api/health`);
  });
  const shutdown = (signal: string) => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
