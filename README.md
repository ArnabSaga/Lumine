# Luminedge

Luminedge is a Next.js student admission and learning access portal for a practical assignment. The canonical workflow is now aligned to the required business process:

```text
BDM Registration QR
→ Student QR Registration
→ BDM Admission Entry
→ Accounts Approval
→ Approved Enrollment + Manual Payment
→ Assigned Teacher
→ Course Modules + Progress
```

## Live Links

```text
GitHub: add repository URL here
Deployment: add live deployment URL here
```

## Demo Credentials

All demo staff accounts use the password from `DEMO_STAFF_PASSWORD` in your local `.env.local`.

```text
BDM One:          bdm1@example.com
BDM Two:          bdm2@example.com
Accounts Officer: accounts@example.com
Teacher One:      teacher1@example.com
Teacher Two:      teacher2@example.com
```

## Sample Registration QR

Seed creates a demo registration QR for BDM One:

```text
public/demo/sample-registration-qr.png
```

The QR points to:

```text
http://localhost:3000/register/<seeded-demo-token>
```

Regenerate the sample QR with the deployment domain before using it for a hosted review.

## Student Registration Assumption

A Student account is created during QR registration so the Student can later access approved course progress. No additional admission action is required from the Student after registration.

## Core Roles

```text
BDM
Creates single use registration QRs and completes Admission details for students registered through their own QR.

Accounts
Reviews a narrow payment safe Admission queue and approves Admissions. Approval creates the approved Enrollment and manual Payment.

Teacher
Sees only approved Enrollments assigned to that Teacher.

Student
Registers through a BDM QR and later accesses approved courses and progress.
```

## Retired Legacy Paths

The earlier self enrollment workflow is intentionally retired:

```text
Student self Enrollment POST
Student demo checkout
Enrollment QR final approval
BDM final approval through legacy staff Enrollment routes
```

The old database tables remain where they support learning access or backward compatible infrastructure, but they are no longer the assignment approval path.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example` and fill local values:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
BETTER_AUTH_SECRET="replace-with-a-secure-secret"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
DEMO_STAFF_PASSWORD="replace-with-demo-password"
```

3. Apply migrations and seed:

```bash
npx prisma migrate status
npx prisma db seed
```

4. Start the app:

```bash
npm run dev
```

## Verification

Primary assignment acceptance:

```bash
npx tsx scratch/verify-assignment.ts
```

Supporting regressions:

```bash
npx tsx scratch/verify-run3.ts
npx tsx scratch/verify-run4.ts
```

Static checks:

```bash
npx prisma validate
npx prisma generate
npx prisma migrate status
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

## Privacy And Security Notes

```text
Admission.reference is display only, never authorization.
BDM reads are scoped by Admission.bdmUserId.
Accounts DTOs avoid phone, address, education, additionalInfo, QR tokens, auth records, and payment provider IDs.
No Enrollment exists before Accounts approval.
Teacher access requires assignedTeacherId plus APPROVED Enrollment status.
```

## Tech Stack

```text
Next.js 16 App Router
TypeScript
Prisma 7
PostgreSQL
Better Auth
Tailwind CSS
Zod
QRCode
```
