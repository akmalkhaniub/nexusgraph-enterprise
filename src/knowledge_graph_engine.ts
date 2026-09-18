/**
 * KnowledgeGraphEngine - Enterprise Semantic Property Graph
 * Manages typed entity nodes, directed relationship edges, and multi-hop path traversal.
 */

export type NodeType = 'PERSON' | 'SERVICE' | 'INCIDENT' | 'DOCUMENT' | 'DEPLOYMENT' | string;

export interface SourceOrigin {
  system?: string;
  externalId?: string;
}

export interface GraphNode {
  id: string;
  type: NodeType;
  name: string;
  attributes: Record<string, unknown>;
  sourceOrigin: SourceOrigin;
}

export interface GraphEdge {
  sourceId: string;
  targetId: string;
  relationship: string;
  metadata: Record<string, unknown>;
}

export interface PathStep extends GraphNode {
  reachedVia: string | null;
}

interface AddNodeInput {
  id: string;
  type: NodeType;
  name: string;
  attributes?: Record<string, unknown>;
  sourceOrigin?: SourceOrigin;
}

export class KnowledgeGraphEngine {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  adjacency: Map<string, Array<{ targetId: string; relationship: string }>>;

  constructor() {
    this.nodes = new Map();
    this.edges = [];
    this.adjacency = new Map();
  }

  /** Add a typed entity node to the knowledge graph */
  addNode({ id, type, name, attributes = {}, sourceOrigin = {} }: AddNodeInput): GraphNode {
    const node: GraphNode = { id, type, name, attributes, sourceOrigin };
    this.nodes.set(id, node);
    if (!this.adjacency.has(id)) this.adjacency.set(id, []);
    return node;
  }

  /** Add a directed relationship edge between two nodes */
  addEdge(sourceId: string, targetId: string, relationship: string, metadata: Record<string, unknown> = {}): GraphEdge {
    if (!this.nodes.has(sourceId)) throw new Error(`Source node not found: ${sourceId}`);
    if (!this.nodes.has(targetId)) throw new Error(`Target node not found: ${targetId}`);

    const edge: GraphEdge = { sourceId, targetId, relationship, metadata };
    this.edges.push(edge);
    this.adjacency.get(sourceId)!.push({ targetId, relationship });
    return edge;
  }

  /**
   * Traverse the graph with BFS to find multi-hop connections.
   * @returns Discovered multi-hop paths with relationship lineage.
   */
  findMultiHopPaths(startNodeId: string, targetType: NodeType, maxHops = 3): PathStep[][] {
    if (!this.nodes.has(startNodeId)) return [];

    const paths: PathStep[][] = [];
    const queue: Array<Array<{ nodeId: string; relationship: string | null }>> = [
      [{ nodeId: startNodeId, relationship: null }]
    ];
    const visited = new Set<string>([startNodeId]);

    while (queue.length > 0) {
      const currentPath = queue.shift()!;
      const currentStep = currentPath[currentPath.length - 1];
      const currentNode = this.nodes.get(currentStep.nodeId)!;

      if (currentPath.length > 1 && currentNode.type === targetType) {
        paths.push(currentPath.map((step) => ({
          ...this.nodes.get(step.nodeId)!,
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
