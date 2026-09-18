import assert from 'assert';
import { KnowledgeGraphEngine } from '../src/knowledge_graph_engine.js';
import { HybridGraphRAG } from '../src/hybrid_graph_rag.js';

console.log('🧪 Starting NexusGraph Automated Verification Suite (Galuxium Nexus V2 2026)...\n');

const graph = new KnowledgeGraphEngine();
const rag = new HybridGraphRAG(graph);

console.log('1️⃣ Ingesting Cross-Platform Enterprise Nodes (Jira, GitHub, Datadog, Slack)...');
graph.addNode({ id: 'jira_inc_902', type: 'INCIDENT', name: 'INC-902: High Checkout API Latency', sourceOrigin: { system: 'Jira Service Management', externalId: 'INC-902' } });
graph.addNode({ id: 'svc_checkout', type: 'SERVICE', name: 'Checkout Payments Gateway', sourceOrigin: { system: 'Datadog Service Catalog', externalId: 'checkout-v2' } });
graph.addNode({ id: 'gh_pr_1082', type: 'DEPLOYMENT', name: 'PR-1082: Reconfigure Redis Connection Pool', sourceOrigin: { system: 'GitHub', externalId: 'pull/1082' } });
graph.addNode({ id: 'usr_elena', type: 'PERSON', name: 'Elena Vance', attributes: { role: 'Principal Platform Engineer', email: 'elena.vance@enterprise.com' }, sourceOrigin: { system: 'Workday / Slack', externalId: 'U084A29B' } });
assert(graph.nodes.size === 4, 'Must register 4 entity nodes');
console.log(`   ✅ Ingested ${graph.nodes.size} nodes across 4 enterprise systems.`);

console.log('2️⃣ Adding Typed Semantic Relationship Edges...');
graph.addEdge('jira_inc_902', 'svc_checkout', 'AFFECTED_SERVICE');
graph.addEdge('svc_checkout', 'gh_pr_1082', 'MODIFIED_BY_DEPLOYMENT');
graph.addEdge('gh_pr_1082', 'usr_elena', 'AUTHORED_BY');
assert(graph.edges.length === 3, 'Must create 3 directed edges');
console.log(`   ✅ Created ${graph.edges.length} graph edges with semantic labels.`);

console.log('3️⃣ Testing 3-Hop Graph Traversal from Incident to Author...');
const discoveredPaths = graph.findMultiHopPaths('jira_inc_902', 'PERSON', 3);
assert(discoveredPaths.length === 1, 'Should find exactly 1 valid path');
const path = discoveredPaths[0];
assert(path.length === 4, 'Path must traverse 4 nodes (3 hops)');
assert(path[path.length - 1].name === 'Elena Vance', 'End of path must be Elena Vance');
console.log('   ✅ Multi-Hop Path Discovered (Incident → Service → Deployment → Author).');

console.log('4️⃣ Testing Natural Language Hybrid GraphRAG Synthesis...');
const queryResult = rag.query('Who authored the deployment that triggered the INC-902 checkout outage?');
assert(queryResult.targetEntity === 'Elena Vance', 'Must identify Elena Vance');
assert(queryResult.hopsCount === 3, 'Must resolve across 3 hops');
assert(queryResult.citations.length === 4, 'Must provide 4 verifiable citations');
console.log('   💬 GraphRAG Answer:', queryResult.answer);

console.log('5️⃣ Testing Weighted Reciprocal Rank Fusion (WRRF) Ranking...');
assert(queryResult.topRankedWRRF !== undefined, 'Must output top-ranked WRRF candidate');
assert(queryResult.topRankedWRRF.wrrfScore > 0, 'WRRF score must be positive');
console.log(`   📊 Top Ranked WRRF Entity: ${queryResult.topRankedWRRF.node.name} (Score: ${queryResult.topRankedWRRF.wrrfScore})`);

console.log('\n🎉 ALL 5 NEXUSGRAPH ENTERPRISE & GRAPHRAG TESTS PASSED WITH 100% SUCCESS!\n');
