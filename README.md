<h1 align="center">Luminedge Student Enrollment Portal</h1>
<!-- <p align="center">
  <img src="./public/preview.png" alt="Luminedge project preview" width="100%" />
</p> -->

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=111827" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-7-2D3748?style=for-the-badge&logo=prisma" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Ready-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img alt="Status" src="https://img.shields.io/badge/Status-Active%20Practical-FACE39?style=for-the-badge" />
</p>

<p align="center">
  <strong>Live Demo:</strong> Coming soon
  <!-- <strong>API:</strong> Next.js route handlers under <code>/api</code> ·
  <strong>Docs:</strong> <code>context/</code> and <code>resource/PRD.md</code> -->
</p>

---

<!-- ## Project Preview

> Replace these placeholders with captured product screenshots when deployment media is ready.

| Public Experience | Student Portal |
| --- | --- |
| ![Public course catalog preview](./public/preview.png) | ![Student dashboard preview](./public/dashboard-preview.png) |

| Staff Operations | Teacher Workspace |
| --- | --- |
| ![Staff enrollment operations preview](./public/staff-preview.png) | ![Teacher workspace preview](./public/teacher-preview.png) |

--- -->

## Project Overview

Luminedge is a full stack student enrollment portal built around a secure, multi role education workflow. Students browse courses, create a profile, enroll, complete a server controlled demo payment, receive a stable verification QR code, and unlock the correct course only after staff approval.

The system is designed for a practical but serious training organization workflow. BDM and Accounts teams verify enrollments, assign teachers, and inspect operational enrollment history. Teachers see only their own approved students and course modules. Students get a clear enrollment journey and module level progress tracking after approval.

This is not a generic CRUD dashboard. The project demonstrates backend owned workflow transitions, role based authorization, resource ownership, payment verification safety, QR proof, privacy minimized DTOs, and real HTTP regression suites.

---

## Why This Project Matters

Many education portals look complete in the UI but rely on weak backend rules. Luminedge treats the backend as the source of truth.

The project is valuable because it models a real operational sequence:

- Students cannot choose privileged roles.
- Staff cannot approve without QR proof and valid payment state.
- Teachers cannot see another teacher’s students.
- Students cannot access unapproved course content.
- Payment and progress state are verified through server logic, not client trust.
- Sensitive profile fields stay out of staff and teacher payloads.

That makes the project a strong portfolio example for secure full stack product engineering.

---

## Tech Stack

| Layer | Technology | Role in the System |
| --- | --- | --- |
| Frontend | Next.js 16 App Router, React 19 | Server rendered pages, route groups, authenticated portals, public course pages |
| Language | TypeScript | Strict typing across routes, services, DTOs, and validation contracts |
| Styling | Tailwind CSS 4, custom Luminedge tokens | Responsive product UI, controlled glass surfaces, dashboard layouts |
| Backend | Next.js route handlers | Thin HTTP layer for auth, validation, service calls, and safe JSON responses |
| Database | PostgreSQL | Relational source of truth for users, students, courses, enrollments, payments, QR, history, progress |
| ORM | Prisma 7 with `@prisma/adapter-pg` | Typed queries, multi file schema, migrations, explicit selects |
| Auth | Better Auth | Email and password sessions with server controlled roles |
| Validation | Zod | Request body and query validation at API boundaries |
| Forms | React Hook Form | Interactive signup, login, and profile flows |
| QR | `qrcode`, `html5-qrcode` | Student QR rendering and staff camera scanning with manual fallback |
| Tooling | ESLint, TypeScript, TSX | Static checks and real HTTP verification suites |

---

## Project Architecture and Workflow

Luminedge is one full stack Next.js application. Public pages, authenticated portals, APIs, server services, shared validation, and Prisma models live in one repository with clear boundaries.

```text
Public website
  -> Course catalog and course detail
  -> Student registration and login

Authenticated app
  -> Student dashboard and course workspace
  -> BDM and Accounts dashboards
  -> Staff scanner and enrollment operations
  -> Teacher dashboard and assigned enrollment detail

API layer
  -> Auth and role checks
  -> Zod validation
  -> Server services
  -> Prisma
  -> Privacy safe DTOs
```

### Request Lifecycle

```text
Browser action
  -> Next.js page or route handler
  -> Better Auth session lookup
  -> Role and ownership guard
  -> Zod validation
  -> Server service
  -> Prisma query or transaction
  -> Safe response DTO
  -> UI update
```

### Core Enrollment Workflow

```text
Course
  -> Student signup, role forced to STUDENT
  -> Session owned profile
  -> Explicit enrollment confirmation
  -> PENDING_PAYMENT
  -> Server controlled demo payment
  -> PAYMENT_VERIFIED plus stable QR
  -> Staff QR scan
  -> Teacher assignment plus approval
  -> APPROVED
  -> Exact student course access
  -> Teacher curriculum visibility
  -> Student module progress
```

Status transitions are backend owned. The frontend never sends arbitrary enrollment status changes.

---

## API Endpoints and Data Flow

### Authentication

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/sign-up/email` | Public student registration through Better Auth |
| `POST` | `/api/auth/sign-in/email` | Student and staff credential login |
| `GET/POST` | `/api/auth/[...all]` | Better Auth handler |

Public signup is configured so every public user becomes `STUDENT`. Staff users are provisioned through seed data.

### Courses

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/courses` | Returns active public courses and module summaries |

Course pages use server side Prisma reads for catalog and detail experiences.

### Student

| Method | Route | Purpose | Request |
| --- | --- | --- | --- |
| `GET` | `/api/student/profile` | Read current student profile | Session only |
| `POST` | `/api/student/profile` | Create session owned student profile | phone, address, education, optional info |
| `GET` | `/api/student/enrollments` | Read own enrollments only | Session only |
| `POST` | `/api/student/enrollments` | Explicit enrollment confirmation | course id |
| `POST` | `/api/student/enrollments/[id]/checkout` | Server controlled demo checkout | Enrollment id from route |
| `GET` | `/api/student/enrollments/[id]/progress` | Read own approved course progress | Enrollment id from route |
| `PUT` | `/api/student/enrollments/[id]/modules/[moduleId]/progress` | Mark a module complete or incomplete | `{ completed: boolean }` |

Student ownership is always derived from the authenticated session.

### Staff

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/staff/enrollments` | Search and filter privacy safe enrollment records |
| `GET` | `/api/staff/enrollments/[id]` | Read only staff enrollment detail and real status history |
| `POST` | `/api/staff/enrollments/scan` | Resolve QR token to privacy safe enrollment preview |
| `POST` | `/api/staff/enrollments/[id]/approve` | QR backed approval with teacher assignment |

Staff list and detail payloads never expose QR tokens, provider payment IDs, profile address, phone, education, additional info, sessions, accounts, or credential data.

### Teacher

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/teacher/enrollments` | Search own assigned approved enrollments |
| `GET` | `/api/teacher/enrollments/[id]` | Read own assigned approved enrollment detail |
| `GET` | `/api/teacher/enrollments/[id]/progress` | Read only progress visibility for assigned approved enrollment |

Teacher access is always scoped by `assignedTeacherId` and `APPROVED` status. Cross teacher access returns safe `404`.

### Payments

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/payments/webhook` | Mock provider webhook with fail closed signature verification |

Payment verification uses Decimal values and exact currency checks. Webhook authentication happens before database mutation.

---

## Key Features

### Product Experience

- **Public course catalog**
  Students can browse active courses and view syllabus previews before signing up.

- **Role aware portals**
  Student, BDM, Accounts, and Teacher users each get a focused workspace.

- **Student enrollment journey**
  Students can see enrollment state, payment verification, staff approval, course access, QR code, and progress.

- **Course progress tracking**
  Approved students can complete or uncomplete modules. Teachers get read only visibility.

### Security and Workflow

- **Server controlled roles**
  Public signup always creates a Student. Staff roles are not self assigned.

- **Backend owned state transitions**
  Enrollment status changes only through trusted server workflows.

- **Stable QR approval proof**
  QR tokens are opaque, stable, and resolved server side.

- **Privacy minimized data access**
  Staff and teachers receive only the fields they need.

- **Teacher isolation**
  Teachers can access only assigned, approved enrollments.

### Operations

- **Staff enrollment management**
  BDM and Accounts can search and filter enrollments by student, email, reference, course, status, and teacher.

- **Read only enrollment detail**
  Staff can inspect payment summary, assignment, approval actor, and timeline without creating a second approval path.

- **Dashboard metrics**
  BDM, Accounts, and Teacher dashboards use live database counts and aggregates.

- **Real HTTP regression suites**
  Verification scripts test authorization, privacy, search, pagination, webhook safety, payment races, approval races, and progress ownership.

---

## Installation and Local Setup

### Prerequisites

- Node.js 20 or newer
- npm
- PostgreSQL database
- A configured `.env.local`

### Clone and Install

```bash
git clone <your-repository-url>
cd lumine
npm ci
```

### Configure Environment

```bash
cp .env.example .env.local
```

Fill `.env.local` with real local or hosted values. Never commit real secrets.

### Prepare Prisma

```bash
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

For local migration authoring only:

```bash
npx prisma migrate dev
```

### Start Development

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### Build for Production

```bash
npm run build
npm run start
```

---

## Environment Variables

| Variable | Purpose | Example |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma | `postgresql://USER:PASSWORD@HOST:5432/DATABASE` |
| `BETTER_AUTH_SECRET` | Secret used by Better Auth | `replace-with-a-secure-secret` |
| `BETTER_AUTH_URL` | Base URL for auth callbacks and session logic | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | Public application URL used by the client | `http://localhost:3000` |
| `DEMO_STAFF_PASSWORD` | Password used to seed demo staff and run HTTP suites | `replace-with-demo-password` |
| `MOCK_PAYMENT_WEBHOOK_SECRET` | Signature secret for the mock payment webhook | `replace-with-webhook-secret` |

---

## Folder Structure

```text
.
|-- app/
|   |-- (web)/                  # Public pages and authenticated portals
|   |-- api/                    # Next.js route handlers
|   |-- globals.css             # Global styles and Luminedge tokens
|   `-- layout.tsx              # Root app shell and fonts
|-- components/
|   |-- course/                 # Course progress UI
|   `-- ui/                     # Shared shells and presentation primitives
|-- context/                    # Architecture, build plan, UI rules, progress notes
|-- generated/
|   `-- prisma/                 # Generated Prisma client
|-- lib/
|   |-- client/                 # Browser safe clients
|   |-- server/                 # DB, auth, guards, services
|   `-- shared/                 # Validation schemas, labels, shared helpers
|-- prisma/
|   |-- migrations/             # Database migrations
|   |-- schema/                 # Multi file Prisma schema
|   `-- seed.ts                 # Demo staff and course seed
|-- public/
|   `-- logo/                   # Public brand assets
|-- resource/
|   `-- PRD.md                  # Product requirements
|-- scratch/
|   `-- verify-run*.ts          # Real HTTP verification suites
|-- package.json
|-- prisma.config.ts
`-- README.md
```

---

## Database Model Highlights

| Model | Purpose |
| --- | --- |
| `User` | Auth identity and role holder |
| `Student` | Session owned student profile |
| `Course` | Public course catalog entity |
| `CourseModule` | Ordered course curriculum |
| `Enrollment` | Core workflow record |
| `EnrollmentQr` | Stable opaque verification token |
| `Payment` | Demo provider payment attempts |
| `EnrollmentStatusHistory` | Real persisted workflow timeline |
| `EnrollmentModuleProgress` | Student module completion state |

Money values use Prisma Decimal fields. Progress rows are scoped by enrollment and module, and completion never mutates enrollment status.

---

## Seed Accounts

After running `npx prisma db seed`, demo staff accounts are available with the password from `DEMO_STAFF_PASSWORD`.

| Email | Role |
| --- | --- |
| `bdm1@example.com` | BDM |
| `bdm2@example.com` | BDM |
| `accounts@example.com` | Accounts |
| `teacher1@example.com` | Teacher |
| `teacher2@example.com` | Teacher |

Seeded courses include IELTS, Spoken English, and Web Development.

---

## Verification

Run static checks:

```bash
npx prisma validate
npx prisma generate
npx prisma migrate status
npx tsc --noEmit
npm run lint
npm run build
git diff --check
git diff -- prisma/schema prisma/migrations
```

Run HTTP suites against a running development server:

```bash
npm run dev
```

In a second terminal:

```bash
npx tsx scratch/verify-run2r.ts
npx tsx scratch/verify-run3.ts
npx tsx scratch/verify-run4.ts
```

The suites create unique run scoped records, read secrets from `.env.local`, and remove only their own test data.

---

## Security Notes

- Public users cannot self assign staff roles.
- Protected APIs check authentication and role before returning data.
- Resource visibility is enforced server side, not only through hidden UI.
- Staff scan and operations endpoints use explicit privacy safe selections.
- QR tokens are opaque and never encode student, course, enrollment, or email data.
- Payment verification fails closed when webhook secrets are missing or invalid.
- Teacher APIs use safe `404` responses for inaccessible enrollments.
- Provider payment IDs, auth accounts, sessions, password hashes, and raw QR tokens stay out of user facing DTOs except where QR proof is explicitly required by the scanner approval flow.

---

## Deployment Notes

Recommended deployment flow:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm run start
```

Set production `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the deployed domain.

Do not run destructive Prisma reset commands against shared or production data.

---

## Scope and Limitations

This project intentionally focuses on the enrollment workflow and learning progress foundation.

Out of scope for the current practical:

- Real payment gateway integration
- Email or SMS notification infrastructure
- Attendance
- Certificates
- Grades and assignments
- Chat
- Admin panel
- Course CRUD
- Password reset flow
- Advanced analytics dashboards

---

## Portfolio Summary

Luminedge demonstrates a complete, security focused full stack workflow with real product structure. It combines polished UI, relational modeling, backend authorization, stateful workflow handling, QR verification, Decimal payment safety, privacy controlled DTOs, and automated HTTP regression coverage.

It is built to show practical production thinking, not just screen assembly.
