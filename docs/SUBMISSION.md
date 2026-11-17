# NexusGraph submission notes

Deadline 31 Oct 2026.

## What a judge can run today

```bash
npm install
npm run dev
```

Open http://localhost:3006. Retrieval is TF-IDF cosine plus graph traversal on the built-in graph. `src/eval.ts` scores 20 distinct questions, including a second checkout incident that shares a word with the first. Embeddings are not a hosted vector model.

## Not in this submission

No live Jira, GitHub, or Datadog connector, and no public URL.
