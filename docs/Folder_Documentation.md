# Directory Structure & Architecture Overview

```
Police-Web/
├── backend/                  # Express Backend Service
│   ├── config/               # App configuration & env loader
│   ├── controllers/          # Request handlers & HTTP responses
│   ├── database/             # Schema, seeds, SQLite/MySQL DB abstraction layer
│   ├── middleware/           # JWT Auth, Admin verification, Multer upload
│   ├── models/               # SQL Query Abstraction Models
│   ├── routes/               # API Router endpoints
│   ├── services/             # Auth logic & Admin Logger services
│   ├── utils/                # Logger utilities
│   ├── logs/                 # Daily runtime execution logs
│   ├── uploads/              # Dynamic uploaded images (avatars, activities, shop)
│   ├── app.ts                # Express application configuration
│   └── server.ts             # Server entry point & Vite middleware integration
│
├── docs/                     # Production Documentation
│   ├── API_Documentation.md  # Detailed REST API endpoints
│   ├── Folder_Documentation.md # Architecture description
│   ├── Installation_Guide.md # Step-by-step setup guide
│   ├── README.md             # Project overview
│   ├── schema.sql            # MySQL Database DDL Script
│   └── seed.sql              # Initial Database Seed Script
│
├── src/                      # React Frontend Application
│   ├── api/                  # Axios service & interceptors
│   ├── assets/               # Branding graphics & logos
│   ├── components/           # UI Components
│   │   ├── admin/            # Admin forms, tables, modals
│   │   ├── common/           # Header, Sidebar, Badge, Modal, Shell
│   │   ├── notifications/    # Bell dropdown & announcements
│   │   ├── police/           # Officer dashboard cards & activity widgets
│   │   └── ui/               # Reusable buttons, inputs, cards
│   ├── contexts/             # AuthContext, NotificationContext
│   ├── hooks/                # Custom React Hooks
│   ├── layouts/              # Main Layout shell
│   ├── pages/                # Route pages (Login, Police, Admin)
│   ├── routes/               # Router definitions & Protected Routes
│   ├── types/                # TypeScript interfaces & types
│   └── utils/                # Constants, formatters, rank badges
```
