-- ==============================================================================
-- Neon Serverless PostgreSQL + pgvector Schema for NexusGraph Enterprise
-- Fuses relational graph edges with dense vector embeddings (1536 dims)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Graph Nodes Table with Vector Embeddings
CREATE TABLE IF NOT EXISTS public.graph_nodes (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,          -- INCIDENT, SERVICE, DEPLOYMENT, PERSON
    name TEXT NOT NULL,
    source_system TEXT NOT NULL, -- Jira, Datadog, GitHub, Workday
    external_id TEXT,
    attributes JSONB DEFAULT '{}'::jsonb,
    embedding vector(1536),      -- OpenAI / Cohere / Bedrock vector embedding
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Typed Directional Graph Edges Table
CREATE TABLE IF NOT EXISTS public.graph_edges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_id TEXT REFERENCES public.graph_nodes(id) ON DELETE CASCADE,
    target_id TEXT REFERENCES public.graph_nodes(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL,  -- AFFECTED_SERVICE, MODIFIED_BY, AUTHORED_BY
    weight NUMERIC DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_id, target_id, relationship)
);

-- 3. HNSW Vector Index for Sub-10ms Cosine Similarity Search
CREATE INDEX IF NOT EXISTS graph_nodes_embedding_hnsw_idx 
ON public.graph_nodes 
USING hnsw (embedding vector_cosine_ops);

-- 4. B-Tree Indexes for Relational Multi-Hop Traversals
CREATE INDEX IF NOT EXISTS graph_edges_source_idx ON public.graph_edges(source_id);
CREATE INDEX IF NOT EXISTS graph_edges_target_idx ON public.graph_edges(target_id);
