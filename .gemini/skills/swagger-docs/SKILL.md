---
name: swagger-docs
description: Skill to generate and serve OpenAPI 3.0 documentation for all backend API endpoints, serving an interactive Swagger UI at http://localhost:3000/docs.
---

# OpenSpec Skill: Swagger Documentation Server

This skill automates the creation and deployment of a central Swagger/OpenAPI documentation server for the EcoSystems platform, serving it interactively on port 3000.

## Implementation Steps

1. **Create the documentation server script**:
   - Write `backend/node-api/swagger-server.js` using Express.
   - Serve `/swagger.json` containing the OpenAPI 3.0 specification of all endpoints across all services.
   - Serve `/docs` with a lightweight, zero-dependency HTML interface that loads Swagger UI assets via CDN (unpkg) and points to `/swagger.json`.
   - Set up the server list pointing to the respective localhost ports for each backend API (8000, 8001, 8002, 8003, 8004).

2. **Add startup script to package.json**:
   - Register `"start:swagger": "node swagger-server.js"` inside `backend/node-api/package.json`.

3. **Integrate with Docker Compose**:
   - Declare the `swagger_docs` service container inside `backend/docker-compose.yml`, mapping port `3000:3000`.

4. **Deploy and Verify**:
   - Build and start the container using `docker-compose up -d swagger_docs`.
   - Run verification checks to ensure `http://localhost:3000/docs` is fully responsive and interactive.
