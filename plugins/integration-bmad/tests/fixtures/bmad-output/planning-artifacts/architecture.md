---
stepsCompleted: ["tech-stack", "architecture-decisions"]
---

# PlantPal - Architecture Document

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Prisma ORM
- **ML**: TensorFlow Lite for plant identification

## Architecture Decisions

### ADR-1: Monorepo Structure

We use a monorepo with pnpm workspaces to share types and utilities between frontend and backend.

### ADR-2: Offline-First

SQLite local storage with background sync to ensure core functionality works offline.
