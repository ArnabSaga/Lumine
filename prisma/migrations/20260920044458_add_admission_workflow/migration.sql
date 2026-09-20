-- CreateEnum
CREATE TYPE "AdmissionStatus" AS ENUM ('REGISTERED', 'PENDING_ACCOUNTS_APPROVAL', 'ACCOUNTS_APPROVED', 'ASSIGNED_TO_TEACHER');

-- CreateTable
CREATE TABLE "StudentRegistrationQr" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "bdmUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "StudentRegistrationQr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admission" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "registrationQrId" TEXT NOT NULL,
    "bdmUserId" TEXT NOT NULL,
    "status" "AdmissionStatus" NOT NULL DEFAULT 'REGISTERED',
    "courseId" TEXT,
    "admissionAmount" DECIMAL(12,2),
    "paidAmount" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "classStartingDate" DATE,
    "assignedTeacherId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "accountsApprovedById" TEXT,
    "accountsApprovedAt" TIMESTAMP(3),
    "enrollmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionStatusHistory" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "fromStatus" "AdmissionStatus",
    "toStatus" "AdmissionStatus" NOT NULL,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdmissionStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentRegistrationQr_token_key" ON "StudentRegistrationQr"("token");

-- CreateIndex
CREATE INDEX "StudentRegistrationQr_bdmUserId_idx" ON "StudentRegistrationQr"("bdmUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Admission_reference_key" ON "Admission"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Admission_registrationQrId_key" ON "Admission"("registrationQrId");

-- CreateIndex
CREATE UNIQUE INDEX "Admission_enrollmentId_key" ON "Admission"("enrollmentId");

-- CreateIndex
CREATE INDEX "Admission_studentId_idx" ON "Admission"("studentId");

-- CreateIndex
CREATE INDEX "Admission_bdmUserId_idx" ON "Admission"("bdmUserId");

-- CreateIndex
CREATE INDEX "Admission_status_idx" ON "Admission"("status");

-- CreateIndex
CREATE INDEX "Admission_courseId_idx" ON "Admission"("courseId");

-- CreateIndex
CREATE INDEX "Admission_assignedTeacherId_idx" ON "Admission"("assignedTeacherId");

-- CreateIndex
CREATE INDEX "AdmissionStatusHistory_admissionId_idx" ON "AdmissionStatusHistory"("admissionId");

-- AddForeignKey
ALTER TABLE "StudentRegistrationQr" ADD CONSTRAINT "StudentRegistrationQr_bdmUserId_fkey" FOREIGN KEY ("bdmUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_registrationQrId_fkey" FOREIGN KEY ("registrationQrId") REFERENCES "StudentRegistrationQr"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_bdmUserId_fkey" FOREIGN KEY ("bdmUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_assignedTeacherId_fkey" FOREIGN KEY ("assignedTeacherId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_accountsApprovedById_fkey" FOREIGN KEY ("accountsApprovedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionStatusHistory" ADD CONSTRAINT "AdmissionStatusHistory_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionStatusHistory" ADD CONSTRAINT "AdmissionStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
