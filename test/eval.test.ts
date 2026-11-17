import assert from 'assert';
import { buildEvalGraph, evaluate, ablation, EVAL_QUERIES } from '../src/eval.js';

console.log('🧪 NexusGraph retrieval-quality eval suite...\n');
let passed = 0;
const ok = (label: string, cond: boolean) => {
  assert(cond, label);
  passed++;
  console.log(`   ✅ ${label}`);
};

const g = buildEvalGraph();
const res = evaluate(g);
console.log('   metrics:', res);

ok('eval covers all labeled queries', res.n === EVAL_QUERIES.length);
ok('answer accuracy is perfect on the distinct labeled set (1.0)', res.accuracy === 1.0);
ok('the resolved entity is in the top 3 (hit-rate@3 is 1.0)', res.hitRateAt3 === 1.0);
ok('MRR in (0,1]', res.mrr > 0 && res.mrr <= 1);

const { hybrid, vectorOnly } = ablation();
console.log('   ablation:', { hybrid, vectorOnly });
ok('hybrid accuracy ≥ vector-only', hybrid.accuracy >= vectorOnly.accuracy);
ok('hybrid MRR ≥ vector-only MRR (graph signal does not hurt ranking)', hybrid.mrr >= vectorOnly.mrr);

console.log(`\n🎉 ALL ${passed} NEXUSGRAPH EVAL ASSERTIONS PASSED.\n`);
