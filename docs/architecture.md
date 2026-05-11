# Architecture

The system has three layers:

1. Frontend: React + TypeScript
2. Backend: Node.js + Express
3. Database: PostgreSQL

The frontend never talks directly to the database. It calls backend API routes.

Every tenant/company has isolated data using `tenant_id`.

Important rule:
The frontend must never control `tenant_id`. The backend gets it from the JWT token.
