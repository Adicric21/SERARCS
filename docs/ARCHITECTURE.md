# Architecture

```text
Browser
  │
  ├── Next.js React UI
  │     ├── Command Deck
  │     ├── SOS form
  │     ├── Fleet console
  │     ├── Map
  │     └── Captain's Log
  │
  └── REST calls /api/*
           │
           ▼
      Next.js Route Handlers
           │
           ▼
      Service layer
           │
           ├── Priority Engine
           ├── Request actions
           ├── Crew aggregation
           └── Analytics queries
           │
           ▼
       Drizzle ORM
           │
           ▼
       PostgreSQL
```

## Data model

- `crews`: rescue units and their specialties
- `emergency_requests`: current emergency state and authoritative timestamps
- `request_events`: immutable operational history for each request

## Priority design

The system avoids a static priority value. The score is derived from severity and elapsed waiting time. This prevents a low-severity request from being forgotten forever while keeping critical calls structurally ahead of fresh minor calls.
