# Roadmap & Milestones: NexusGraph
**Hackathon:** Galuxium Nexus V2  
**Target Submission Deadline:** October 31, 2026  

---

> **Status legend (updated 2026-09-18):** `[x]` implemented in code · `[~]` partial / stand-in (working JS prototype, not the production stack named) · `[ ]` not started.
> **Reality note:** Node.js prototype with a real hybrid vector + graph-traversal retriever (WRRF scoring) over an in-memory knowledge graph (328 LOC, 5 passing tests). No real connectors, LLM extraction, pgvector/Neo4j, or Next.js/3D canvas; ingestion and UI are mocked/static.

## Phase 1: Connectors & Entity Extraction (Week 1)
- [~] Implement ingestion adapters for Jira tickets, Slack threads, and Markdown docs. *(mock ingestion)*
- [~] Build entity & relation extraction pipeline using instructor / structured outputs with LLM. *(rule-based stand-in)*
- [~] Implement entity deduplication and canonicalization algorithms.

## Phase 2: Hybrid Graph & Vector Engine (Week 2)
- [~] Integrate SQLite/Postgres with pgvector and NetworkX/Neo4j graph representation. *(in-memory graph, no DB)*
- [x] Implement Hybrid GraphRAG retriever combining vector proximity with breadth-first graph traversal.
- [~] Benchmark query retrieval precision against standard RAG baseline. *(demo metric only)*

## Phase 3: Interactive Visual Canvas (Week 3)
- [~] Build modern Next.js 14 interface with 2D/3D force-directed graph canvas (Force-graph / Three.js). *(static HTML)*
- [~] Implement interactive search bar, entity inspector sidebar, and path highlight between nodes.
- [~] Add conversational chat assistant referencing active node selections.

## Phase 4: Verification, Video & Devpost Submission (Week 4)
- [~] Run end-to-end evaluation suite on synthetic company dataset. *(unit tests on synthetic graph)*
- [ ] Record high-impact product video showcasing multi-hop discovery and graph exploration.
- [ ] Complete Devpost submission and publish GitHub repository.
