# System Architecture

## High-Level Overview

```
┌─────────────┐     WebSocket/HTTP     ┌──────────────────┐
│   Angular   │ ◄────────────────────► │   NestJS API     │
│  Frontend   │                        │   (port 3000)    │
│ (port 4200) │                        └────────┬─────────┘
└─────────────┘                                 │
                                      ┌─────────┴──────────┐
                                      │                    │
                               ┌──────▼──────┐   ┌────────▼──────┐
                               │  PostgreSQL  │   │     Redis     │
                               │  (port 5433) │   │  (port 6379)  │
                               └─────────────┘   └───────────────┘
```

## Component Responsibilities

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | Angular 17 + RxJS | SPA, real-time price charts |
| Backend API | NestJS + Prisma | REST/WS, auth, business logic |
| Database | PostgreSQL 16 | User data, portfolio, alerts |
| Cache | Redis 7 | Rate limiting, WebSocket pub/sub |
