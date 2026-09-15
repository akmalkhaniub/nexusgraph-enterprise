/**
 * HybridGraphRAG - Multi-Hop Question Answering & Lineage Synthesizer
 * Combines graph traversal with provenance tracking to eliminate hallucination.
 */

export class HybridGraphRAG {
  constructor(graphEngine) {
    this.graph = graphEngine;
  }

  /**
   * Execute multi-hop reasoning over the enterprise knowledge graph
   * @param {string} query 
   * @returns {Object} Structured answer with full lineage provenance
   */
  query(query) {
    const q = query.toLowerCase();

    // 1. Identify seed entity
    let seedNode = null;
    for (const node of this.graph.nodes.values()) {
      if (q.includes(node.name.toLowerCase()) || q.includes(node.id.toLowerCase())) {
        seedNode = node;
        break;
      }
    }

    if (!seedNode) {
      // Default to incident node if query asks about outage/incident
      if (q.includes('outage') || q.includes('incident') || q.includes('error')) {
        seedNode = Array.from(this.graph.nodes.values()).find(n => n.type === 'INCIDENT');
      }
    }

    if (!seedNode) {
      return {
        answer: 'Could not identify a matching root entity in the knowledge graph.',
        provenanceLineage: []
      };
    }

    // 2. Determine target entity type
    let targetType = 'PERSON';
    if (q.includes('who') || q.includes('person') || q.includes('author') || q.includes('owner') || q.includes('engineer')) {
      targetType = 'PERSON';
    } else if (q.includes('deployment') || q.includes('commit') || q.includes('pr')) {
      targetType = 'DEPLOYMENT';
    } else if (q.includes('service') || q.includes('component')) {
      targetType = 'SERVICE';
    }

    // 3. Discover multi-hop path
    const paths = this.graph.findMultiHopPaths(seedNode.id, targetType, 3);
    if (paths.length === 0) {
      return {
        answer: `Identified ${seedNode.name}, but found no multi-hop relationship path leading to a ${targetType}.`,
        provenanceLineage: []
      };
    }

    const bestPath = paths[0];
    const targetEntity = bestPath[bestPath.length - 1];

    // Build lineage chain
    const lineage = bestPath.map((step, idx) => {
      if (idx === 0) return `${step.name} (${step.type})`;
      return `-[${step.reachedVia}]-> ${step.name} (${step.type})`;
    }).join(' ');

    const answer = `Based on verified enterprise lineage: ${seedNode.name} was linked via ${bestPath.length - 1} hops to ${targetEntity.name} (${targetEntity.type}). Lineage: ${lineage}.`;

    return {
      query,
      answer,
      seedEntity: seedNode.name,
      targetEntity: targetEntity.name,
      hopsCount: bestPath.length - 1,
      lineageChain: lineage,
      citations: bestPath.map(p => ({
        system: p.sourceOrigin.system || 'Internal',
        refId: p.sourceOrigin.externalId || p.id,
        entityName: p.name
      }))
    };
  }
}
