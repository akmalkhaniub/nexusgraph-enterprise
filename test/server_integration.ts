import assert from 'assert';
import { createNexusGraphServer } from '../src/server.js';

console.log('🧪 Starting NexusGraph Server Integration Suite...\n');

let passed = 0;
function ok(label: string, cond: boolean): void {
  assert(cond, label);
  passed++;
  console.log(`   ✅ ${label}`);
}

const { server } = createNexusGraphServer();
await new Promise<void>((resolve) => server.listen(0, resolve));
const { port } = server.address() as import('net').AddressInfo;
const base = `http://127.0.0.1:${port}`;
const get = (p: string) => fetch(base + p).then(async (r) => ({ status: r.status, body: (await r.json().catch(() => ({}))) as any }));
const post = (p: string, body: unknown) =>
  fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(async (r) => ({ status: r.status, body: (await r.json().catch(() => ({}))) as any }));

try {
  console.log('1️⃣ Health & startup...');
  const health = await get('/api/health');
  ok('server boots and /api/health returns 200', health.status === 200);
  ok('four nodes seeded at startup', health.body.nodeCount === 4);

  console.log('\n2️⃣ Graph endpoint...');
  const g = await get('/api/graph');
  ok('/api/graph returns 4 nodes', Array.isArray(g.body.nodes) && g.body.nodes.length === 4);
  ok('/api/graph returns 3 edges', Array.isArray(g.body.edges) && g.body.edges.length === 3);

  console.log('\n3️⃣ GraphRAG query...');
  const q = await post('/api/query', { query: 'Who authored the deployment behind INC-902?' });
  ok('query returns 200', q.status === 200);
  ok('resolves to Elena Vance', q.body.targetEntity === 'Elena Vance');
  ok('reports 3 hops', q.body.hopsCount === 3);
  ok('missing query -> 400', (await post('/api/query', {})).status === 400);

  console.log('\n4️⃣ Security guards...');
  ok('encoded path traversal blocked (403)', (await fetch(base + '/..%2f..%2fserver.ts')).status === 403);
  ok('oversized body rejected (413)', (await post('/api/query', { query: 'x'.repeat(70 * 1024) })).status === 413);

  console.log(`\n🎉 ALL ${passed} NEXUSGRAPH SERVER INTEGRATION ASSERTIONS PASSED.\n`);
} finally {
  server.close();
}
