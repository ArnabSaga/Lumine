<div align="center">

# 🎓 Luminedge — Student Enrollment & Admission Portal

**An enterprise-grade, multi-role course enrollment, QR admission, and curriculum progress tracking platform.**

[![Next.js](https://img.shields.io/badge/Next.js-16.3.5-black?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.10-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Better Auth](https://img.shields.io/badge/Better_Auth-1.7-6366F1?style=for-the-badge&logo=auth0&logoColor=white)](https://www.better-auth.com/)
[![Status](https://img.shields.io/badge/Status-Production--Grade%20Verified-10B981?style=for-the-badge)]()

<br />

[Explore Public Catalog](http://localhost:3000/courses) · [Student Portal](http://localhost:3000/student/login) · [Staff Workspace](http://localhost:3000/staff/login) · [API Documentation](#-api-endpoints--data-flow)

</div>

---

## 🖼️ Project Preview

<div align="center">
  <img src="./public/preview.png" alt="Luminedge Platform Overview" width="100%" />
</div>

<br />

| 🌐 Public Experience & Courses | 🧑‍🎓 Student Dashboard & Progress |
| :---: | :---: |
| ![Course Catalog](./public/preview.png) | ![Student Portal](./public/dashboard-preview.png) |
| *Dynamic course catalog with curriculum breakdown* | *Enrollment status, stable verification QR, and module tracker* |

| 👔 BDM / Accounts Operations | 👨‍🏫 Teacher Workspace |
| :---: | :---: |
| ![Staff Scanner & Verification](./public/staff-preview.png) | ![Teacher Workspace](./public/teacher-preview.png) |
| *QR scanner, applicant review, and teacher assignment* | *Strictly isolated student rosters and syllabus tracking* |

---

## 📌 Project Overview

**Luminedge** is a production-grade student enrollment and academic lifecycle management portal engineered to streamline the end-to-end journey from course exploration to verified enrollment and curriculum completion.

In traditional education institutions, student admissions and fee collections suffer from disconnected tools, manual reconciliation errors, unauthorized role escalations, and unverified attendance. Luminedge solves this with a **strictly backend-enforced, multi-role state machine**:

- **Students** browse official courses, create authenticated profiles, generate admissions through high-entropy QR codes, execute demo payment simulations, and track real-time syllabus module completion.
- **BDM (Business Development Managers)** generate targeted student onboarding QR links, verify prospective applicant details, and transition registrations into formal review pipelines.
- **Accounts Teams** review verified financial transactions, scan student QR codes via camera/manual fallback, and authorize final course access with designated teacher assignments.
- **Teachers** operate within isolated workspace boundaries—accessing only assigned, approved students and monitoring curriculum milestones without exposure to sensitive personal identity information (PII).

---

## 💡 Core Value & Engineering Highlights

Luminedge is built from first principles as a secure, high-integrity software system rather than a generic CRUD dashboard:

- 🛡️ **Backend-Owned State Authority**: The frontend never dictates workflow transitions. All status changes (`PENDING_PAYMENT` $\rightarrow$ `PAYMENT_VERIFIED` $\rightarrow$ `APPROVED`) are executed within atomic database transactions with concurrency race guards (`409 Conflict`).
- 🔐 **Zero-Trust Role & Resource Isolation**: Session-derived resource ownership ensures cross-tenant isolation. Teachers cannot query unassigned students, students cannot alter role parameters during signup, and staff endpoints enforce strict role gates.
- 🔏 **Data Privacy by Design**: Staff and teacher verification endpoints use explicit Prisma selections and privacy-minimized Data Transfer Objects (DTOs), completely stripping student addresses, phone numbers, and academic history from verification payloads.
- 💳 **Monetary & Webhook Integrity**: All financial paths carry exact `Prisma.Decimal` precision end-to-end (never floating-point numbers). Webhooks feature cryptographic signature validation and post-approval idempotency.
- 📷 **Stable Opaque QR Security**: Enrollment QR tokens are cryptographically unique and immutable—guaranteeing that duplicate payment retries or webhook deliveries never rotate active verification tokens.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose & Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 16 (App Router)** | Server Components by default for optimal TTFB, streaming UI, and unified route groups (`(web)`). |
| **UI & React Core** | **React 19** | Modern hooks, concurrent transitions, optimistic UI updates, and zero-hydration mismatch patterns. |
| **Type Safety** | **TypeScript 5 (Strict)** | End-to-end static typing across database models, API contracts, Zod schemas, and UI components. |
| **Styling & Design System** | **Tailwind CSS 4** | Clean, accessible design system with custom CSS variables, responsive typography, and glass surfaces. |
| **Database Engine** | **PostgreSQL 16** | Robust relational persistence ensuring ACID transaction guarantees, composite indexes, and cascading relations. |
| **Database ORM** | **Prisma 7 (`@prisma/adapter-pg`)** | Multi-file modular schema (`prisma/schema/`), type-safe client generation, and strict transaction isolation. |
| **Authentication & RBAC** | **Better Auth 1.7** | Secure session-cookie authentication, server-controlled role assignment (`role.input = false`), and adaptive redirection. |
| **Validation Layer** | **Zod 4 & React Hook Form** | Authoritative server-side request parsing, client-side input validation, and unified error mapping. |
| **Computer Vision / QR** | **`html5-qrcode` & `qrcode`** | Client-side camera video decoding with fallback manual alphanumeric token input, and server QR generation. |
| **Testing & Quality** | **TSX & Node Test Runners** | Real HTTP E2E regression test suites testing concurrency races (`Promise.all`), idempotency, and isolation. |

---

## 🏗️ System Architecture & Internal Workflow

Luminedge is architected as a modular, full-stack Next.js monolith following strict domain-driven service boundaries.

```mermaid
flowchart TD
    subgraph Client ["Client Layer (App Router)"]
        A[Public Catalog & Courses]
        B[Student Dashboard & Progress]
        C[Staff Workspace / Scanner]
        D[Teacher Dashboard]
    end

    subgraph Auth ["Authentication & Guard Layer"]
        G1[Better Auth Session Validator]
        G2[requirePageRole / requireApiRole]
        G3[Adaptive Login Router]
    end

    subgraph API ["HTTP / API Layer (Route Handlers)"]
        R1["/api/courses"]
        R2["/api/student/*"]
        R3["/api/staff/*"]
        R4["/api/teacher/*"]
        R5["/api/payments/webhook"]
    end

    subgraph Service ["Domain Business Logic Layer (server-only)"]
        S1[Enrollment Service]
        S2[Admission Service]
        S3[Payment Service]
        S4[Teacher Service]
        S5[Course Progress Service]
    end

    subgraph DB ["Data Persistence Layer (PostgreSQL)"]
        P1[(Users & Auth)]
        P2[(Admissions & QR Tokens)]
        P3[(Enrollments & Payments)]
        P4[(Courses & Modules)]
        P5[(Module Progress)]
    end

    Client --> Auth
    Auth --> API
    API --> Service
    Service --> DB
```

### 1. Request Lifecycle & Security Invariants
1. **Edge/Guard Ingestion**: Incoming requests validate session cookies via Better Auth. `requireApiRole()` or `requirePageRole()` rejects unauthenticated or unauthorized calls with standard `401` or `403` responses.
2. **Authoritative Input Parsing**: Route handlers parse JSON bodies against strict Zod schemas, returning `400 Bad Request` with structured error trees if invalid.
3. **Domain Service Execution**: Encapsulated `server-only` service functions handle business logic, enforce ownership derived from session IDs, and execute database queries.
4. **Atomic Transactions**: Multi-step state transitions execute inside `prisma.$transaction()`. If any step fails or a race occurs, the entire transaction rolls back cleanly.
5. **Privacy-Safe DTO Formatting**: Data responses filter out internal database IDs, passwords, and sensitive student PII before serialization.

---

## 🔄 Core Business Workflows

### Standard QR Admission Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor BDM as BDM Staff
    actor Student as Student
    actor Accounts as Accounts Staff
    actor Teacher as Assigned Teacher

    BDM->>System: Generate Student Registration QR
    System-->>BDM: Issue High-Entropy Token
    Student->>System: Scan QR / Complete Registration Form
    System->>System: Create Admission (Status: REGISTERED)
    BDM->>System: Review Applicant & Submit for Approval
    System->>System: Transition Admission (Status: UNDER_REVIEW)
    Accounts->>System: Verify Payment & Approve with Teacher ID
    System->>System: Create Active Enrollment (Status: APPROVED)
    Teacher->>System: Inspect Student Roster & Course Syllabus
    Student->>System: Access Full Course & Complete Modules
```

---

## 🔌 API Endpoints & Data Flow

### 1. Authentication & Role APIs
| Method | Route | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/sign-up/email` | Public | Student signup (server forces `role = STUDENT`). |
| `POST` | `/api/auth/sign-in/email` | Public | Authenticates credentials and issues encrypted session cookie. |
| `POST` | `/api/auth/sign-out` | Authenticated | Revokes active user session. |

### 2. Public Catalog APIs
| Method | Route | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/courses` | Public | Lists active published courses with prices and module counts. |
| `GET` | `/api/courses/[slug]` | Public | Fetches detailed course syllabus and description. |

### 3. Student Enrollment & Payment APIs
| Method | Route | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/student/profile` | Student | Submits student personal profile (phone, address, education). |
| `GET` | `/api/student/enrollments` | Student | Lists session-owned enrollments with payment/approval status. |
| `POST` | `/api/student/enrollments` | Student | Confirms enrollment selection (creates `PENDING_PAYMENT`). |
| `POST` | `/api/student/enrollments/[id]/checkout` | Student | Simulates server-controlled checkout and payment finalization. |
| `GET` | `/api/student/enrollments/[id]/progress` | Student | Retrieves module completion percentages for approved courses. |
| `POST` | `/api/student/enrollments/[id]/modules/[moduleId]` | Student | Toggles completion status of an individual syllabus module. |

### 4. Staff Operations & QR Verification APIs
| Method | Route | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/staff/enrollments/scan` | BDM / Accounts | Decodes opaque QR token and returns privacy-minimized DTO. |
| `POST` | `/api/staff/enrollments/[id]/approve` | BDM / Accounts | Approves enrollment and binds assigned teacher ID. |
| `GET` | `/api/staff/enrollments` | BDM / Accounts | Search and filter enrollments across status, date, and keyword. |
| `GET` | `/api/staff/enrollments/[id]` | BDM / Accounts | Detailed enrollment overview with complete status history timeline. |
| `POST` | `/api/payments/webhook` | Gateway / Mock | Receives payment callbacks with signature and Decimal validation. |

### 5. Teacher Workspace APIs
| Method | Route | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/teacher/enrollments` | Teacher | Lists approved enrollments assigned strictly to the authenticated teacher. |
| `GET` | `/api/teacher/enrollments/[id]` | Teacher | Fetches privacy-safe student summary and course module breakdown. |
| `GET` | `/api/teacher/enrollments/[id]/progress` | Teacher | Inspects real-time module completion milestones for assigned students. |

---

## ✨ Key Platform Features

### 🧑‍🎓 Student Experience
- **Interactive Course Directory**: Explore comprehensive course outlines with module counts and tuition fees.
- **Guided Onboarding**: Streamlined profile registration with validation for contact and academic details.
- **Simulated Payment Gateway**: Instant server-controlled payment verification with realistic checkout experience.
- **Verification QR Badge**: Real-time rendering of high-entropy verification QR token for in-person staff validation.
- **Curriculum Tracker**: Interactive module checklists with dynamic progress bars and percentage calculation.

### 🛡️ Security & Access Control
- **Server-Owned Role Invariants**: Zero possibility of client-side role injection during public registration.
- **Adaptive Role Routing**: Automatic redirection to dedicated `/student/login` or `/staff/login` based on context.
- **Opaque Token Isolation**: QR tokens contain no raw database IDs, emails, or personal contact info.
- **PII Stripping**: Strict separation of student personal profiles from verification and teacher payloads.
- **Teacher Tenancy Isolation**: 404 response on cross-teacher student inspection to prevent enumeration attacks.

### 💼 Staff & Operations Management
- **Live Optical QR Scanner**: Native browser camera scanning powered by `html5-qrcode` with manual input fallback.
- **Real-Time Operational Metrics**: Aggregated KPI dashboard cards displaying pending, verified, and approved metrics.
- **Audit History Timeline**: Complete chronological log of status transitions with actor IDs and timestamps.
- **Teacher Assignment Engine**: Validates designated teacher role before enrollment authorization.

---

## 🚀 Installation & Local Setup

### Prerequisites
- **Node.js**: `v20.x` or higher
- **Package Manager**: `npm` (canonical) or `pnpm`
- **Database**: `PostgreSQL 14+` (Local instance or cloud-hosted such as Neon / Supabase)

### Step 1: Clone Repository
```bash
git clone https://github.com/ArnabSaga/Lumine.git
cd Lumine
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env.local` and configure your credentials:
```bash
cp .env.example .env.local
```

### Step 4: Database Migration & Seeding
Run Prisma migrations and seed demo courses, modules, and staff credentials:
```bash
# Validate schema configuration
npx prisma validate

# Apply database migrations
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate

# Seed initial courses, syllabus modules, and demo staff accounts
npx prisma db seed
```

### Step 5: Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Credentials

After running `npx prisma db seed`, you can access the platform using these pre-configured accounts:

| Portal | Role | Email | Password |
| :--- | :--- | :--- | :--- |
| **Staff Workspace** | BDM Manager 1 | `bdm1@example.com` | `DemoPass123!` (or value in `.env.local`) |
| **Staff Workspace** | Accounts Officer | `accounts@example.com` | `DemoPass123!` (or value in `.env.local`) |
| **Teacher Portal** | Senior Teacher 1 | `teacher1@example.com` | `DemoPass123!` (or value in `.env.local`) |
| **Teacher Portal** | Senior Teacher 2 | `teacher2@example.com` | `DemoPass123!` (or value in `.env.local`) |
| **Student Portal** | Public Student | *Self-register at `/register`* | *Configured during signup* |

---

## ⚙️ Environment Variables

| Variable Name | Purpose | Example Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@localhost:5432/lumine` |
| `BETTER_AUTH_SECRET` | Cryptographic secret for signing session tokens | `a-secure-random-32-char-string` |
| `BETTER_AUTH_URL` | Canonical base URL for auth callbacks | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | Client-accessible base URL | `http://localhost:3000` |
| `DEMO_STAFF_PASSWORD` | Password assigned to seeded staff accounts | `DemoPass123!` |
| `MOCK_PAYMENT_WEBHOOK_SECRET` | *(Optional)* Secret for signing payment webhooks | `webhook-secret-key-123` |

---

## 📂 Repository Structure

```text
d:/Project/lumine/
├── app/                              # Next.js App Router root
│   ├── (web)/                        # Route group for presentation pages & portals
│   │   ├── accounts/                 # Accounts portal (Dashboard & Admissions)
│   │   ├── bdm/                      # BDM portal (Dashboard, Admissions & QR generator)
│   │   ├── courses/                  # Public course catalog & syllabus details
│   │   ├── register/                 # Student signup & token-based QR onboarding
│   │   ├── staff/                    # Shared staff portal (QR scanner & search)
│   │   ├── student/                  # Student portal (Dashboard, profile & courses)
│   │   └── teacher/                  # Teacher portal (Dashboard & student views)
│   ├── api/                          # Thin HTTP route handlers
│   │   ├── accounts/                 # Accounts approval endpoints
│   │   ├── admissions/               # QR registration & preflight endpoints
│   │   ├── auth/                     # Better Auth authentication endpoints
│   │   ├── bdm/                      # BDM admissions & QR generation endpoints
│   │   ├── courses/                  # Public catalog endpoints
│   │   ├── payments/                 # Webhook receivers
│   │   ├── staff/                    # QR scanner & staff enrollment endpoints
│   │   ├── student/                  # Student enrollments, checkout & progress
│   │   └── teacher/                  # Teacher enrollment & syllabus endpoints
│   ├── globals.css                   # Global CSS & Tailwind design tokens
│   └── layout.tsx                    # Root application layout with typography
├── components/                       # Modular UI components
│   ├── course/                       # Progress bars, module checklists & catalog cards
│   ├── forms/                        # Reusable form controls
│   └── ui/                           # Primitives, buttons, badges, tables & shells
├── context/                          # Project documentation & architectural invariants
├── lib/                              # Core application libraries
│   ├── client/                       # Browser-safe authentication client
│   ├── server/                       # Server-only database, auth & domain services
│   │   ├── guards/                   # Centralized RBAC & session guard functions
│   │   ├── payments/                 # Payment provider contracts & mock simulator
│   │   └── services/                 # Domain logic (Admission, Enrollment, Payment, etc.)
│   └── shared/                       # Shared validations (Zod schemas), types & helpers
├── prisma/                           # Multi-file schema & database migrations
│   ├── migrations/                   # Sequential SQL migration history
│   ├── schema/                       # Modular Prisma schemas (auth, course, enrollment, etc.)
│   └── seed.ts                       # Idempotent database seeding script
├── public/                           # Static assets, logos & preview images
└── scratch/                          # True HTTP automated regression test suites
```

---

## 🧪 Verification & Automated Testing

Luminedge includes comprehensive end-to-end HTTP test suites verifying authorization, concurrency races, payment idempotency, and teacher isolation:

```bash
# 1. Verify TypeScript compilation (0 errors)
npx tsc --noEmit

# 2. Run ESLint code quality checks (0 warnings)
npm run lint

# 3. Verify Prisma schema integrity
npx prisma validate

# 4. Execute True HTTP E2E Test Suite (requires server running)
npx tsx scratch/verify-run2r.ts
npx tsx scratch/verify-run3.ts
npx tsx scratch/verify-assignment.ts
```

---

## 📄 License

This project was developed as a technical evaluation assignment for **Luminedge**. All rights reserved.

<div align="center">
  <sub>Crafted with precision using Next.js 16, React 19, TypeScript & PostgreSQL.</sub>
</div>
