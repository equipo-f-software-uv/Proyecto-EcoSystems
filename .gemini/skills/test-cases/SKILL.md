---
name: test-cases
description: Generates a test suite in docs/test-cases.md containing manual test cases designed via Equivalence Partitioning (CE) and Boundary Value Analysis (VL) for the platform's POST and PUT API endpoints.
---

# OpenSpec Skill: Generate Test Cases

This skill analyzes the main API configuration entity (`perfil_cultivo`) and generates a structured test suite in `docs/test-cases.md`.

## Implementation Steps

1. **Analyze Crop Profile Configuration API**:
   - Inspect [backend/node-api/api/api_perfiles.js](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/backend/node-api/api/api_perfiles.js) endpoints:
     - `POST /api/crop-profiles` (Create crop profile)
     - `PUT /api/irrigation/thresholds` (Update thresholds)
     - `PUT /api/sectors/:sectorId/profile` (Assign profile to sector)

2. **Design Test Scenarios**:
   - Apply **Clases de Equivalencia (CE)**: Agroup valid and invalid values (negative, overflow, missing fields, duplicate fields).
   - Apply **Análisis de Valores Límite (VL)**: Test exact boundaries (0, 100, -1, 101, equality limits).

3. **Generate `docs/test-cases.md`**:
   - Create a clean Markdown file containing tables for each technique.
   - Include: ID, Técnica, Descripción, Input JSON, HTTP esperado, and an empty column for "Resultado real".
