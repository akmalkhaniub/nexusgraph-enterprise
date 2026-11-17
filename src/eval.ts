/**
 * Retrieval-quality evaluation for the Hybrid GraphRAG.
 *
 * Builds a labeled synthetic enterprise graph and a query set with known target
 * entities, then measures answer accuracy, hit-rate@k over the WRRF ranking, and MRR.
 * Also runs a hybrid-vs-vector-only ablation to show the graph signal helps.
 */
import { KnowledgeGraphEngine } from './knowledge_graph_engine.js';
import { HybridGraphRAG, type RagOptions } from './hybrid_graph_rag.js';

export interface EvalQuery {
  query: string;
  expected: string; // expected target entity name
}

export interface EvalResult {
  n: number;
  accuracy: number; // fraction where targetEntity === expected
  hitRateAt3: number; // expected appears in top-3 WRRF candidates
  mrr: number; // mean reciprocal rank of the expected entity in WRRF order
}

/** A richer, labeled graph: 3 incident→service→deployment→author chains + noise. */
export function buildEvalGraph(): KnowledgeGraphEngine {
  const g = new KnowledgeGraphEngine();
  const chains = [
    { inc: 'INC-902: Checkout API latency', svc: 'Checkout Gateway', dep: 'PR-1082 Redis pool', person: 'Elena Vance' },
    { inc: 'INC-431: Auth token expiry storm', svc: 'Identity Service', dep: 'PR-0777 JWT rotation', person: 'Marcus Lee' },
    { inc: 'INC-655: Search indexing lag', svc: 'Catalog Search', dep: 'PR-1210 Shard rebalance', person: 'Priya Nair' },
  ];
  chains.forEach((c, i) => {
    g.addNode({ id: `inc_${i}`, type: 'INCIDENT', name: c.inc, sourceOrigin: { system: 'Jira', externalId: `INC-${i}` } });
    g.addNode({ id: `svc_${i}`, type: 'SERVICE', name: c.svc, sourceOrigin: { system: 'Datadog', externalId: `svc-${i}` } });
    g.addNode({ id: `dep_${i}`, type: 'DEPLOYMENT', name: c.dep, sourceOrigin: { system: 'GitHub', externalId: `pr-${i}` } });
    g.addNode({ id: `usr_${i}`, type: 'PERSON', name: c.person, sourceOrigin: { system: 'Slack', externalId: `u-${i}` } });
    g.addEdge(`inc_${i}`, `svc_${i}`, 'AFFECTED_SERVICE');
    g.addEdge(`svc_${i}`, `dep_${i}`, 'MODIFIED_BY_DEPLOYMENT');
    g.addEdge(`dep_${i}`, `usr_${i}`, 'AUTHORED_BY');
  });
  // Shares the word "checkout" with INC-902 so a bag-of-words match is not enough.
  g.addNode({ id: 'inc_x', type: 'INCIDENT', name: 'INC-219: Checkout cache stampede', sourceOrigin: { system: 'Jira', externalId: 'INC-219' } });
  g.addNode({ id: 'svc_x', type: 'SERVICE', name: 'Billing Service', sourceOrigin: { system: 'Datadog', externalId: 'svc-x' } });
  g.addNode({ id: 'dep_x', type: 'DEPLOYMENT', name: 'PR-3301 tax table', sourceOrigin: { system: 'GitHub', externalId: 'pr-x' } });
  g.addNode({ id: 'usr_x', type: 'PERSON', name: 'Sam Ortiz', sourceOrigin: { system: 'Slack', externalId: 'u-x' } });
  g.addEdge('inc_x', 'svc_x', 'AFFECTED_SERVICE');
  g.addEdge('svc_x', 'dep_x', 'MODIFIED_BY_DEPLOYMENT');
  g.addEdge('dep_x', 'usr_x', 'AUTHORED_BY');
    return g;
}

/** Twenty distinct questions. A second checkout incident is in the graph so a shared word is not enough. */
export const EVAL_QUERIES: EvalQuery[] = [
  { query: 'Who authored the deployment behind the checkout API latency incident?', expected: 'Elena Vance' },
  { query: 'Which engineer wrote the Redis pool change?', expected: 'Elena Vance' },
  { query: 'Who is the author linked to PR-1082?', expected: 'Elena Vance' },
  { query: 'Who owns the JWT rotation that followed the auth token expiry storm?', expected: 'Marcus Lee' },
  { query: 'Which person is responsible for INC-431?', expected: 'Marcus Lee' },
  { query: 'Which person wrote PR-0777?', expected: 'Marcus Lee' },
  { query: 'Who shipped the shard rebalance for the search indexing lag?', expected: 'Priya Nair' },
  { query: 'Which engineer authored the catalog search deployment?', expected: 'Priya Nair' },
  { query: 'Who is tied to PR-1210?', expected: 'Priya Nair' },
  { query: 'Which service is affected by the checkout API latency incident?', expected: 'Checkout Gateway' },
  { query: 'What service did the auth token expiry storm hit?', expected: 'Identity Service' },
  { query: 'Which component is behind the search indexing lag?', expected: 'Catalog Search' },
  { query: 'Which deployment changed the checkout gateway?', expected: 'PR-1082 Redis pool' },
  { query: 'What pull request rotated JWTs for the identity service?', expected: 'PR-0777 JWT rotation' },
  { query: 'Which commit rebalanced shards for catalog search?', expected: 'PR-1210 Shard rebalance' },
  { query: 'Who authored the tax table change behind the checkout cache stampede?', expected: 'Sam Ortiz' },
  { query: 'Which service was hit by the checkout cache stampede?', expected: 'Billing Service' },
  { query: 'Which deployment is PR-3301?', expected: 'PR-3301 tax table' },
  { query: 'Who wrote the billing deployment?', expected: 'Sam Ortiz' },
  { query: 'Which person owns the checkout cache incident?', expected: 'Sam Ortiz' },
];

export function evaluate(graph: KnowledgeGraphEngine, options: RagOptions = {}): EvalResult {
  const rag = new HybridGraphRAG(graph, options);
  let correct = 0;
  let hits = 0;
  let rrSum = 0;
  for (const q of EVAL_QUERIES) {
    const res = rag.query(q.query);
    if (res.targetEntity === q.expected) correct++;
    const rankIdx = res.candidatesScored.findIndex((c) => c.node.name === q.expected);
    if (rankIdx >= 0 && rankIdx < 3) hits++;
    if (rankIdx >= 0) rrSum += 1 / (rankIdx + 1);
  }
  const n = EVAL_QUERIES.length;
  return {
    n,
    accuracy: correct / n,
    hitRateAt3: hits / n,
    mrr: Number((rrSum / n).toFixed(4)),
  };
}

/** Hybrid vs. vector-only ablation. */
export function ablation(): { hybrid: EvalResult; vectorOnly: EvalResult } {
  const g = buildEvalGraph();
  return {
    hybrid: evaluate(g, { vectorWeight: 0.2, graphWeight: 0.8, wrrfK: 1 }),
    vectorOnly: evaluate(g, { vectorWeight: 1.0, graphWeight: 0.0 }),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { hybrid, vectorOnly } = ablation();
  console.log('NexusGraph retrieval eval');
  console.log('  hybrid     :', hybrid);
  console.log('  vector-only:', vectorOnly);
}
