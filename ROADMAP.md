# Roadmap & Milestones: NexusGraph
**Hackathon:** Galuxium Nexus V2  
**Target Submission Deadline:** October 31, 2026  

---

## Phase 1: Connectors & Entity Extraction (Week 1)
- [ ] Implement ingestion adapters for Jira tickets, Slack threads, and Markdown docs.
- [ ] Build entity & relation extraction pipeline using instructor / structured outputs with LLM.
- [ ] Implement entity deduplication and canonicalization algorithms.

## Phase 2: Hybrid Graph & Vector Engine (Week 2)
- [ ] Integrate SQLite/Postgres with pgvector and NetworkX/Neo4j graph representation.
- [ ] Implement Hybrid GraphRAG retriever combining vector proximity with breadth-first graph traversal.
- [ ] Benchmark query retrieval precision against standard RAG baseline.

## Phase 3: Interactive Visual Canvas (Week 3)
- [ ] Build modern Next.js 14 interface with 2D/3D force-directed graph canvas (Force-graph / Three.js).
- [ ] Implement interactive search bar, entity inspector sidebar, and path highlight between nodes.
- [ ] Add conversational chat assistant referencing active node selections.

## Phase 4: Verification, Video & Devpost Submission (Week 4)
- [ ] Run end-to-end evaluation suite on synthetic company dataset.
- [ ] Record high-impact product video showcasing multi-hop discovery and graph exploration.
- [ ] Complete Devpost submission and publish GitHub repository.
