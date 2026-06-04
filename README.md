# RFID Attendance & Access Control System

A full-stack smart attendance and door access control system using RFID technology. Built with Next.js, Express.js, Prisma, and PostgreSQL.

## Architecture

```
RFID Card → RC522 Reader → ESP32 → REST API → PostgreSQL → Admin Dashboard
```

## Tech Stack

| Layer       | Technology                    |
|-------------|-------------------------------|
| Frontend    | Next.js 14, React 18, Tailwind CSS |
| Backend     | Node.js, Express.js, TypeScript |
| ORM         | Prisma                        |
| Database    | PostgreSQL                    |
| Auth        | JWT + bcrypt                  |
| Validation  | Zod                           |

## Project Structure

```
rfid-attendance/
├── backend/                 # Express.js API server
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.ts          # Default admin seeder
│   └── src/
│       ├── config/          # Environment and database config
│       ├── controllers/     # Route handlers
│       ├── middleware/       # Auth, validation, error handling
│       ├── models/          # (Prisma handles this)
│       ├── routes/          # API routes
│       ├── types/           # TypeScript types and Zod schemas
│       └── index.ts         # Server entry point
└── dashboard/               # Next.js admin dashboard
    ├── app/
    │   ├── dashboard/       # Authenticated pages
    │   │   ├── page.tsx     # Overview with stats & charts
    │   │   ├── users/       # User management (CRUD)
    │   │   ├── attendance/  # Attendance records & filters
    │   │   ├── reports/     # Analytics & reporting
    │   │   ├── devices/     # Device management
    │   │   └── logs/        # Access logs
    │   └── login/           # Login page
    └── lib/
        ├── api.ts           # API client with auth
        ├── auth-context.tsx # Auth state management
        └── utils.ts         # Formatting & utility functions
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL (or Supabase)
- npm or yarn

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npx prisma migrate dev --name init

# Seed default admin account (admin@school.edu / admin123)
npx prisma db seed

# Then use the dashboard to import students via CSV/Excel or add them manually

# Start development server
npm run dev
```

The API runs at `http://localhost:4000`.

### 2. Dashboard Setup

```bash
cd dashboard

# Install dependencies
npm install

# Start development server
npm run dev
```

The dashboard runs at `http://localhost:3000`.

### 3. Login

- **Admin:** admin@school.edu / admin123

All other users (students, faculty) are created by the admin through the dashboard or via CSV import.

## API Endpoints

### Authentication
| Method | Endpoint           | Description          | Auth     |
|--------|--------------------|----------------------|----------|
| POST   | /api/auth/login    | Login                | Public   |
| GET    | /api/auth/profile  | Get current profile  | JWT      |
| PUT    | /api/auth/profile  | Update profile       | JWT      |

### Users (Admin only)
| Method | Endpoint         | Description      |
|--------|------------------|------------------|
| GET    | /api/users       | List users       |
| GET    | /api/users/:id   | Get user details |
| POST   | /api/users       | Create user      |
| POST   | /api/users/import| Bulk import CSV/Excel |
| PUT    | /api/users/:id   | Update user      |
| DELETE | /api/users/:id   | Delete user      |

### Attendance
| Method | Endpoint                | Description          | Auth         |
|--------|-------------------------|----------------------|--------------|
| POST   | /api/attendance/scan    | RFID scan (ESP32)    | Device API Key |
| GET    | /api/attendance/dashboard | Dashboard stats    | Admin/Faculty |
| GET    | /api/attendance/my      | My attendance         | JWT          |
| GET    | /api/attendance         | All records          | Admin/Faculty |

### Devices (Admin only)
| Method | Endpoint              | Description      |
|--------|-----------------------|------------------|
| GET    | /api/devices          | List devices     |
| POST   | /api/devices          | Register device  |
| PUT    | /api/devices/:id      | Update device    |
| DELETE | /api/devices/:id      | Delete device    |
| POST   | /api/devices/heartbeat| Device heartbeat |

### Reports (Admin/Faculty)
| Method | Endpoint                  | Description         |
|--------|---------------------------|---------------------|
| GET    | /api/reports              | Generate report     |
| GET    | /api/reports/access-logs  | Access logs         |

## ESP32 Integration

The ESP32 firmware should:

1. Connect to WiFi
2. Send heartbeat to `POST /api/devices/heartbeat` with `X-API-Key` header
3. On RFID scan, POST to `/api/attendance/scan` with:
   ```json
   {
     "uid": "AA:BB:CC:DD",
     "deviceId": "<your-device-id>"
   }
   ```
   Headers: `X-API-Key: <device-api-key>`
4. Response controls LEDs, buzzer, and relay:
   ```json
   {
     "access": "GRANTED",
     "greenLed": true,
     "redLed": false,
     "unlockDoor": true,
     "unlockDuration": 5
   }
   ```

## Features

- **Dark theme dashboard** with glass-card design
- **Real-time attendance** tracking and monitoring
- **User management** with role-based access (Admin, Faculty, Student)
- **RFID card** assignment and management
- **Bulk import** users via CSV/Excel spreadsheets
- **Device management** for multiple RFID readers
- **Device health monitoring** with automatic offline detection
- **Real-time WebSocket** updates for attendance and device status
- **Browser push notifications** for access denied events
- **Audio alerts** for denied access and device offline events
- **Attendance reports** with daily/weekly/monthly/custom ranges
- **CSV export** for attendance and reports
- **Access logs** with entry/exit tracking
- **JWT authentication** with secure token handling
- **Device API key** authentication for ESP32 devices
- **Input validation** with Zod schemas
- **Rate limiting** and security headers via Helmet
