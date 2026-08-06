# Installation & Deployment Guide

## Prerequisites
- Node.js >= 18.0.0
- NPM >= 9.0.0
- MySQL Database (Version 8.0+ or MariaDB 10.5+)

## Step 1: Environment Setup
Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```

Configure your `.env` parameters:
```env
JWT_SECRET="your_secure_jwt_secret"
DISCORD_CLIENT_ID="your_discord_app_client_id"
DISCORD_CLIENT_SECRET="your_discord_app_client_secret"
DISCORD_REDIRECT_URI="http://localhost:3000/api/auth/discord/callback"
DISCORD_ADMIN_IDS="100000000000000001,100000000000000002"

DB_HOST="localhost"
DB_USER="root"
DB_PASSWORD="your_password"
DB_NAME="police_mdt"
```

## Step 2: Database Setup
Import the database schema and seed data into your MySQL database:
```bash
mysql -u root -p < docs/schema.sql
mysql -u root -p police_mdt < docs/seed.sql
```

## Step 3: Dependencies Installation & Running
Install dependencies and launch the dev server:
```bash
npm install
npm run dev
```

The application will launch on `http://localhost:3000`.

## Production Build
To create a production build:
```bash
npm run build
npm start
```
