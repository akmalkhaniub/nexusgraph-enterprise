import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { KnowledgeGraphEngine } from './knowledge_graph_engine.js';
import { HybridGraphRAG } from './hybrid_graph_rag.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = process.env.PORT || 3006;

const graph = new KnowledgeGraphEngine();
const rag = new HybridGraphRAG(graph);

// Seed standard enterprise topology
graph.addNode({
  id: 'jira_inc_902',
  type: 'INCIDENT',
  name: 'INC-902: High Checkout API Latency',
  sourceOrigin: { system: 'Jira Service Management', externalId: 'INC-902' }
});

graph.addNode({
  id: 'svc_checkout',
  type: 'SERVICE',
  name: 'Checkout Payments Gateway',
  sourceOrigin: { system: 'Datadog Service Catalog', externalId: 'checkout-v2' }
});

graph.addNode({
  id: 'gh_pr_1082',
  type: 'DEPLOYMENT',
  name: 'PR-1082: Reconfigure Redis Connection Pool',
  sourceOrigin: { system: 'GitHub', externalId: 'pull/1082' }
});

graph.addNode({
  id: 'usr_elena',
  type: 'PERSON',
  name: 'Elena Vance',
  attributes: { role: 'Principal Platform Engineer', email: 'elena.vance@enterprise.com' },
  sourceOrigin: { system: 'Workday / Slack', externalId: 'U084A29B' }
});

graph.addEdge('jira_inc_902', 'svc_checkout', 'AFFECTED_SERVICE');
graph.addEdge('svc_checkout', 'gh_pr_1082', 'MODIFIED_BY_DEPLOYMENT');
graph.addEdge('gh_pr_1082', 'usr_elena', 'AUTHORED_BY');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // REST API Routes
  if (req.url === '/api/graph' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      nodes: Array.from(graph.nodes.values()),
      edges: graph.edges
    }));
    return;
  }

  if (req.url === '/api/query' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { query } = JSON.parse(body);
        const result = rag.query(query);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Static files
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🌐 NexusGraph Enterprise Server running at http://localhost:${PORT}`);
});
