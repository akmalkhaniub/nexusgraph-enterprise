# 🆓 Free Tier Deployment Guide for NexusGraph Enterprise

Deploy **NexusGraph Enterprise** using **Neon Serverless Postgres (pgvector)**, **Render / Koyeb**, and **Cloudflare Tunnels**.

---

## 1. Free Vector & Graph Database: Neon PostgreSQL
Neon provides a free serverless PostgreSQL database with `pgvector` included:
1. Create a free database at [neon.tech](https://neon.tech).
2. Run `deploy/free/neon_pgvector_schema.sql` in the Neon SQL Console to create nodes, edges, and HNSW vector indexes.
3. Add your `DATABASE_URL` to `.env`.

---

## 2. Free Web Hosting: Render or Koyeb
- **Render**: Connect repository and select Blueprint (`render.yaml`).
- **Koyeb**: Connect repository and select Docker deployment (`koyeb.yaml`).

---

## 3. Remote Live GraphRAG Demo: Cloudflare Tunnel
```powershell
# Windows
.\deploy\free\tunnel.ps1 -Port 3006

# Linux / macOS
./deploy/free/tunnel.sh 3006
```
Share the generated `https://*.trycloudflare.com` URL with hackathon judges!
