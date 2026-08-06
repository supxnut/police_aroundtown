# Police Management System - API Documentation

## Authentication Endpoints (`/api/auth`)
- `POST /api/auth/discord/callback`
  - Body: `{ discord_id: string }`
  - Returns JWT token and user details if `discord_id` exists in database.
- `POST /api/auth/dev-login`
  - Body: `{ discord_id: string }`
  - Quick login for testing officer and admin accounts.
- `GET /api/auth/me`
  - Returns current authenticated session details.
- `POST /api/auth/logout`
  - Clears JWT token cookie.

## User Management Endpoints (`/api/users`) - Admin Only
- `GET /api/users`: Get list of all officers.
- `POST /api/users`: Create officer (form-data: `discord_id`, `fullname`, `rank`, `start_date`, `avatar`).
- `PUT /api/users/:id`: Edit officer profile.
- `DELETE /api/users/:id`: Delete officer account.

## Duty Log Endpoints (`/api/duty`)
- `GET /api/duty/my`: Get current officer's duty logs and total hours.
- `GET /api/duty` (Admin): Get all officers' duty logs.
- `POST /api/duty` (Admin): Create duty entry (`user_id`, `date`, `start_time`, `end_time`, `hours`).
- `PUT /api/duty/:id` (Admin): Update duty entry.
- `DELETE /api/duty/:id` (Admin): Delete duty log.

## Case Endpoints (`/api/cases`)
- `GET /api/cases`: Get all active police cases.
- `POST /api/cases` (Admin): Create case (`case_number`, `title`, `description`, `suspect_name`, `officer_in_charge`, `status`).
- `PUT /api/cases/:id` (Admin): Update case details.
- `DELETE /api/cases/:id` (Admin): Delete case record.

## Activity Endpoints (`/api/activities`)
- `GET /api/activities/police`: Get active operations for police officers.
- `POST /api/activities/:id/join`: Join an activity (Police can join only once).
- `GET /api/activities/admin` (Admin): Get all activities.
- `GET /api/activities/:id/participants` (Admin): Get officers signed up for activity.
- `GET /api/activities/history` (Admin): Permanent archive history of finished activities.
- `POST /api/activities` (Admin): Create activity (`title`, `description`, `reward`, `start_date`, `end_date`, `status`, `image`).
- `PUT /api/activities/:id` (Admin): Update activity.
- `DELETE /api/activities/:id` (Admin): Delete activity.

## Shop Endpoints (`/api/shop`)
- `GET /api/shop`: Get equipment items catalog.
- `POST /api/shop` (Admin): Add shop item (`name`, `description`, `price`, `status`, `shopImage`).
- `PUT /api/shop/:id` (Admin): Edit shop item.
- `DELETE /api/shop/:id` (Admin): Remove shop item.

## Audit Log Endpoints (`/api/logs`) - Admin Only
- `GET /api/logs`: Get history of all admin actions (`admin_discord_id`, `action`, `date`, `time`, `affected_user`).

## Notifications Endpoints (`/api/notifications`)
- `GET /api/notifications`: Get list of system announcements.
- `POST /api/notifications` (Admin): Broadcast announcement.
