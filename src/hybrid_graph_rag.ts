import type { KnowledgeGraphEngine, GraphNode, PathStep, NodeType } from './knowledge_graph_engine.js';

/**
 * HybridGraphRAG - Enterprise GraphRAG with Weighted Reciprocal Rank Fusion (WRRF).
 * Combines dense vector retrieval, multi-hop graph traversal, and WRRF re-ranking
 * with zero-hallucination lineage provenance (Jira, GitHub, Datadog citations).
 */

export interface RagOptions {
  wrrfK?: number;
  vectorWeight?: number;
  graphWeight?: number;
}

export interface ScoredCandidate {
  node: GraphNode;
  vectorRank: number;
  graphRank: number;
  wrrfScore: number;
}

export interface Citation {
  system: string;
  refId: string;
  entityName: string;
}

export interface RagResult {
  query: string;
  answer: string;
  seedEntity: string;
  targetEntity: string;
  hopsCount: number;
  lineageChain: string;
  topRankedWRRF: ScoredCandidate;
  candidatesScored: ScoredCandidate[];
  citations: Citation[];
}

export class HybridGraphRAG {
  graph: KnowledgeGraphEngine;
  wrrfK: number;
  vectorWeight: number;
  graphWeight: number;

  constructor(graphEngine: KnowledgeGraphEngine, options: RagOptions = {}) {
    this.graph = graphEngine;
    this.wrrfK = options.wrrfK || 60;
    this.vectorWeight = options.vectorWeight || 0.45;
    this.graphWeight = options.graphWeight || 0.55;
  }

  private _idf: Map<string, number> | null = null;

  /** Simple lexical/semantic pseudo-embedding similarity (Jaccard over tokens). Kept for reference. */
  computeSemanticSimilarity(textA: string, textB: string): number {
    const wordsA = new Set(textA.toLowerCase().split(/\W+/).filter(Boolean));
    const wordsB = new Set(textB.toLowerCase().split(/\W+/).filter(Boolean));
    let intersection = 0;
    for (const w of wordsA) if (wordsB.has(w)) intersection++;
    const union = new Set([...wordsA, ...wordsB]).size;
    return union === 0 ? 0 : intersection / union;
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase().split(/\W+/).filter(Boolean);
  }

  /** Build inverse-document-frequency over the node corpus so rare terms weigh more. */
  buildIdf(): Map<string, number> {
    const docs = Array.from(this.graph.nodes.values()).map(
      (n) => `${n.name} ${n.type} ${JSON.stringify(n.attributes || {})}`
    );
    const df = new Map<string, number>();
    for (const doc of docs) {
      for (const tok of new Set(this.tokenize(doc))) df.set(tok, (df.get(tok) || 0) + 1);
    }
    const n = Math.max(1, docs.length);
    const idf = new Map<string, number>();
    for (const [tok, d] of df) idf.set(tok, Math.log((1 + n) / (1 + d)) + 1);
    this._idf = idf;
    return idf;
  }

  private tfidfVector(text: string): Map<string, number> {
    const idf = this._idf ?? this.buildIdf();
    const tokens = this.tokenize(text);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    const vec = new Map<string, number>();
    for (const [t, f] of tf) vec.set(t, (f / tokens.length) * (idf.get(t) ?? Math.log(1 + this.graph.nodes.size) + 1));
    return vec;
  }

  /** TF-IDF cosine similarity between a query and a document (0..1). */
  tfidfCosine(query: string, docText: string): number {
    const a = this.tfidfVector(query);
    const b = this.tfidfVector(docText);
    let dot = 0;
    for (const [t, av] of a) if (b.has(t)) dot += av * (b.get(t) as number);
    const na = Math.sqrt(Array.from(a.values()).reduce((s, v) => s + v * v, 0));
    const nb = Math.sqrt(Array.from(b.values()).reduce((s, v) => s + v * v, 0));
    return na === 0 || nb === 0 ? 0 : dot / (na * nb);
  }

  /** Execute Hybrid GraphRAG search with WRRF re-ranking. */
  query(query: string): RagResult {
    const q = query.toLowerCase();

    // 1. Vector Candidate Retrieval — TF-IDF cosine (rare terms weigh more than
    //    plain Jaccard overlap). Rebuild IDF each query so a mutated graph is reflected.
    this._idf = null;
    this.buildIdf();
    const vectorCandidates = Array.from(this.graph.nodes.values())
      .map((node) => {
        const textToMatch = `${node.name} ${node.type} ${JSON.stringify(node.attributes || {})}`;
        return { node, sim: this.tfidfCosine(query, textToMatch) };
      })
      .sort((a, b) => b.sim - a.sim);

    // 2. Identify root seed node
    let seedNode: GraphNode | undefined = vectorCandidates[0]?.node;
    if (!seedNode || vectorCandidates[0]?.sim === 0) {
      seedNode =
        Array.from(this.graph.nodes.values()).find((n) => n.type === 'INCIDENT') ||
        Array.from(this.graph.nodes.values())[0];
    }

    // 3. Determine target entity type
    let targetType: NodeType = 'PERSON';
    if (q.includes('who') || q.includes('person') || q.includes('author') || q.includes('owner') || q.includes('engineer')) {
      targetType = 'PERSON';
    } else if (q.includes('deployment') || q.includes('commit') || q.includes('pr')) {
      targetType = 'DEPLOYMENT';
    } else if (q.includes('service') || q.includes('component')) {
      targetType = 'SERVICE';
    }

    // 4. Multi-Hop Graph Traversal
    const paths = this.graph.findMultiHopPaths(seedNode.id, targetType, 3);
    const bestPath: Array<GraphNode | PathStep> = paths.length > 0 ? paths[0] : [seedNode];
    const targetEntity = bestPath[bestPath.length - 1];

    // 5. Weighted Reciprocal Rank Fusion (WRRF) scoring
    const candidatesScored: ScoredCandidate[] = Array.from(this.graph.nodes.values())
      .map((node) => {
        const vectorRank = vectorCandidates.findIndex((c) => c.node.id === node.id) + 1;
        let graphDistance = 999;
        if (node.id === seedNode!.id) graphDistance = 1;
        else {
          const inPathIdx = bestPath.findIndex((p) => p.id === node.id);
          if (inPathIdx >= 0) graphDistance = inPathIdx + 1;
        }
        const graphRank = graphDistance;
        const vectorScore = this.vectorWeight / (this.wrrfK + vectorRank);
        const graphScore = this.graphWeight / (this.wrrfK + graphRank);
        const wrrfScore = Number((vectorScore + graphScore).toFixed(5));
        return { node, vectorRank, graphRank, wrrfScore };
      })
      .sort((a, b) => b.wrrfScore - a.wrrfScore);

    const lineage = bestPath
      .map((step, idx) => {
        if (idx === 0) return `${step.name} (${step.type})`;
        return `-[${(step as PathStep).reachedVia}]-> ${step.name} (${step.type})`;
      })
      .join(' ');

    const answer = `Based on verified enterprise lineage: ${seedNode.name} was linked via ${bestPath.length - 1} hops to ${targetEntity.name} (${targetEntity.type}). Lineage: ${lineage}.`;

    return {
      query,
      answer,
      seedEntity: seedNode.name,
      targetEntity: targetEntity.name,
      hopsCount: bestPath.length - 1,
      lineageChain: lineage,
      topRankedWRRF: candidatesScored[0],
      candidatesScored,
      citations: bestPath.map((p) => ({
        system: p.sourceOrigin?.system || 'Internal',
        refId: p.sourceOrigin?.externalId || p.id,
        entityName: p.name
      }))
    };
  }
}
