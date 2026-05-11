# Fleet Management SaaS

Multi-tenant fleet management SaaS.

## Stack
- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL
- SMS: Beem Africa shared toll-free shortcode
- WhatsApp: fallback after 30–45 minutes
- Multi-tenancy: shared database with `tenant_id`

## Roles
- Super Admin / SaaS Owner
- Company Admin
- Driver through SMS/WhatsApp only

## Plans
Standard and Premium have the same features. Only usage limits differ:
- trucks
- drivers
- Company Admin users
- SMS/WhatsApp monthly limits

## Run locally

Backend:
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Frontend:
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
