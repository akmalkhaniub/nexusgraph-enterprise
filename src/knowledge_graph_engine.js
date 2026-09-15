/**
 * KnowledgeGraphEngine - Enterprise Semantic Property Graph
 * Manages typed entity nodes, directed relationship edges, and multi-hop path traversal.
 */

export class KnowledgeGraphEngine {
  constructor() {
    this.nodes = new Map(); // nodeId -> Node
    this.edges = [];        // Array of { sourceId, targetId, relationship, metadata }
    this.adjacency = new Map(); // nodeId -> Array of { targetId, relationship }
  }

  /**
   * Add a typed entity node to the knowledge graph
   */
  addNode({ id, type, name, attributes = {}, sourceOrigin = {} }) {
    const node = {
      id,
      type, // 'PERSON' | 'SERVICE' | 'INCIDENT' | 'DOCUMENT' | 'DEPLOYMENT'
      name,
      attributes,
      sourceOrigin // { system: 'Jira'|'Slack'|'GitHub', externalId: '...' }
    };
    this.nodes.set(id, node);
    if (!this.adjacency.has(id)) {
      this.adjacency.set(id, []);
    }
    return node;
  }

  /**
   * Add a directed relationship edge between two nodes
   */
  addEdge(sourceId, targetId, relationship, metadata = {}) {
    if (!this.nodes.has(sourceId)) throw new Error(`Source node not found: ${sourceId}`);
    if (!this.nodes.has(targetId)) throw new Error(`Target node not found: ${targetId}`);

    const edge = { sourceId, targetId, relationship, metadata };
    this.edges.push(edge);
    this.adjacency.get(sourceId).push({ targetId, relationship });
    return edge;
  }

  /**
   * Traverse the graph using Breadth-First Search (BFS) to find multi-hop connections
   * @param {string} startNodeId 
   * @param {string} targetType 
   * @param {number} maxHops 
   * @returns {Array<Object>} Discovered multi-hop paths with relationship lineage
   */
  findMultiHopPaths(startNodeId, targetType, maxHops = 3) {
    if (!this.nodes.has(startNodeId)) return [];

    const paths = [];
    const queue = [[{ nodeId: startNodeId, relationship: null }]];
    const visited = new Set([startNodeId]);

    while (queue.length > 0) {
      const currentPath = queue.shift();
      const currentStep = currentPath[currentPath.length - 1];
      const currentNode = this.nodes.get(currentStep.nodeId);

      // If matches target type and has traversed at least 1 hop
      if (currentPath.length > 1 && currentNode.type === targetType) {
        paths.push(currentPath.map(step => ({
          ...this.nodes.get(step.nodeId),
          reachedVia: step.relationship
        })));
      }

      if (currentPath.length - 1 < maxHops) {
        const neighbors = this.adjacency.get(currentStep.nodeId) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor.targetId)) {
            visited.add(neighbor.targetId);
            queue.push([...currentPath, { nodeId: neighbor.targetId, relationship: neighbor.relationship }]);
          }
        }
      }
    }

    return paths;
  }
}
