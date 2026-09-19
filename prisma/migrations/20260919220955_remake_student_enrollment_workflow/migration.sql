-- ============================================================
-- Run 2R — Student Enrollment Workflow Remake Migration
-- Safe: Only drops old Run 1 domain tables (no real data).
-- Preserves: user, session, account, verification (Better Auth).
-- Preserves: Course, CourseModule (seeded, still needed).
-- ============================================================

-- Step 1: Drop old domain tables (dependency order matters)
DROP TABLE IF EXISTS "AdmissionStatusHistory" CASCADE;
DROP TABLE IF EXISTS "Admission" CASCADE;
DROP TABLE IF EXISTS "RegistrationLink" CASCADE;
DROP TABLE IF EXISTS "Student" CASCADE;

-- Step 2: Drop old enums
DROP TYPE IF EXISTS "AdmissionStatus";

-- Step 3: Add new enums
CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING_PAYMENT', 'PAYMENT_VERIFIED', 'APPROVED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- Step 4: Update Course table (add slug, price, currency)
ALTER TABLE "Course" ADD COLUMN "slug" TEXT;
ALTER TABLE "Course" ADD COLUMN "price" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Course" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'BDT';

-- Backfill slug from name (lowercase, spaces to hyphens)
UPDATE "Course" SET "slug" = LOWER(REPLACE("name", ' ', '-'));

-- Make slug NOT NULL and UNIQUE after backfill
ALTER TABLE "Course" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- Step 5: Drop old Student table relations that the new Student will replace
-- (Already dropped above via CASCADE)

-- Step 6: Create new Student table
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "education" TEXT NOT NULL,
    "additionalInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 7: Create Enrollment table
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "priceAtEnrollment" DECIMAL(12,2) NOT NULL,
    "currencyAtEnrollment" TEXT NOT NULL DEFAULT 'BDT',
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "assignedTeacherId" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Enrollment_reference_key" ON "Enrollment"("reference");
CREATE UNIQUE INDEX "Enrollment_studentId_courseId_key" ON "Enrollment"("studentId", "courseId");
CREATE INDEX "Enrollment_studentId_idx" ON "Enrollment"("studentId");
CREATE INDEX "Enrollment_courseId_idx" ON "Enrollment"("courseId");
CREATE INDEX "Enrollment_assignedTeacherId_idx" ON "Enrollment"("assignedTeacherId");
CREATE INDEX "Enrollment_status_idx" ON "Enrollment"("status");

ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_assignedTeacherId_fkey"
    FOREIGN KEY ("assignedTeacherId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 8: Create EnrollmentQr table
CREATE TABLE "EnrollmentQr" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "EnrollmentQr_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EnrollmentQr_enrollmentId_key" ON "EnrollmentQr"("enrollmentId");
CREATE UNIQUE INDEX "EnrollmentQr_token_key" ON "EnrollmentQr"("token");

ALTER TABLE "EnrollmentQr" ADD CONSTRAINT "EnrollmentQr_enrollmentId_fkey"
    FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 9: Create EnrollmentStatusHistory table
CREATE TABLE "EnrollmentStatusHistory" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "fromStatus" "EnrollmentStatus",
    "toStatus" "EnrollmentStatus" NOT NULL,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrollmentStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EnrollmentStatusHistory_enrollmentId_idx" ON "EnrollmentStatusHistory"("enrollmentId");

ALTER TABLE "EnrollmentStatusHistory" ADD CONSTRAINT "EnrollmentStatusHistory_enrollmentId_fkey"
    FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnrollmentStatusHistory" ADD CONSTRAINT "EnrollmentStatusHistory_changedById_fkey"
    FOREIGN KEY ("changedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 10: Create Payment table
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId") WHERE "providerPaymentId" IS NOT NULL;
CREATE INDEX "Payment_enrollmentId_idx" ON "Payment"("enrollmentId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_enrollmentId_fkey"
    FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
