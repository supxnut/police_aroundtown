# FiveM Police Management Web System (MDT)

A complete, production-ready Police MDT Web System built for FiveM Roleplay Servers.

## Features
- **Discord OAuth2 Authentication**: Secure login flow restricting system access strictly to authorized police discord accounts.
- **Admin & Role-Based Access Control**: Admins defined via `.env` with full system management privileges.
- **Officer Duty Hours Tracker**: Detailed duty shift logs, start/end times, and cumulative hour analytics.
- **Case Management System**: Complete active case tracker, suspect logs, officer assignments, and case status tracking.
- **Dynamic Activity System**: Create department operations and trainings. Police officers can join activities once; completed activities automatically archive to perpetual history.
- **Police Equipment Shop**: Gear & equipment catalog with stock status and pricing.
- **System Audit Logs**: Automated logging of all administrative actions with timestamp and affected officers.
- **Broadcast Notifications**: Department announcements, activity alerts, and system notifications.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite, TailwindCSS v4, React Router DOM, Motion, Lucide React, React Hot Toast.
- **Backend**: Express.js, TypeScript, MySQL / SQLite engine, JWT authentication, Multer file upload handling.

## Navigation & Dashboards
- **Police Dashboard**: Personal profile, total duty hours, active case count, joinable activities, equipment shop.
- **Admin Dashboard**: System statistics, officer account creation/management, duty log editing, case management, activity management, shop management, and security audit logs.
