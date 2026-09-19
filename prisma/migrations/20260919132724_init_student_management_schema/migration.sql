-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'BDM', 'ACCOUNTS', 'TEACHER');

-- CreateEnum
CREATE TYPE "AdmissionStatus" AS ENUM ('REGISTERED', 'PENDING_ACCOUNTS_APPROVAL', 'ACCOUNTS_APPROVED', 'ASSIGNED_TO_TEACHER');

-- CreateTable
CREATE TABLE "Admission" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT,
    "admissionAmount" DECIMAL(12,2),
    "paidAmount" DECIMAL(12,2),
    "classStartDate" TIMESTAMP(3),
    "assignedTeacherId" TEXT,
    "submittedByBdmId" TEXT,
    "status" "AdmissionStatus" NOT NULL DEFAULT 'REGISTERED',
    "accountsApprovedById" TEXT,
    "accountsApprovedAt" TIMESTAMP(3),
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

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseModule" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "bdmId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "education" TEXT NOT NULL,
    "additionalInfo" TEXT,
    "registeredViaBdmId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admission_studentId_key" ON "Admission"("studentId");

-- CreateIndex
CREATE INDEX "Admission_courseId_idx" ON "Admission"("courseId");

-- CreateIndex
CREATE INDEX "Admission_assignedTeacherId_idx" ON "Admission"("assignedTeacherId");

-- CreateIndex
CREATE INDEX "Admission_submittedByBdmId_idx" ON "Admission"("submittedByBdmId");

-- CreateIndex
CREATE INDEX "Admission_accountsApprovedById_idx" ON "Admission"("accountsApprovedById");

-- CreateIndex
CREATE INDEX "Admission_status_idx" ON "Admission"("status");

-- CreateIndex
CREATE INDEX "AdmissionStatusHistory_admissionId_idx" ON "AdmissionStatusHistory"("admissionId");

-- CreateIndex
CREATE INDEX "AdmissionStatusHistory_changedById_idx" ON "AdmissionStatusHistory"("changedById");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "Course_name_key" ON "Course"("name");

-- CreateIndex
CREATE INDEX "CourseModule_courseId_order_idx" ON "CourseModule"("courseId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "CourseModule_courseId_title_key" ON "CourseModule"("courseId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "CourseModule_courseId_order_key" ON "CourseModule"("courseId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationLink_token_key" ON "RegistrationLink"("token");

-- CreateIndex
CREATE INDEX "RegistrationLink_bdmId_idx" ON "RegistrationLink"("bdmId");

-- CreateIndex
CREATE INDEX "RegistrationLink_isActive_idx" ON "RegistrationLink"("isActive");

-- CreateIndex
CREATE INDEX "Student_registeredViaBdmId_idx" ON "Student"("registeredViaBdmId");

-- CreateIndex
CREATE INDEX "Student_email_idx" ON "Student"("email");

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_assignedTeacherId_fkey" FOREIGN KEY ("assignedTeacherId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_submittedByBdmId_fkey" FOREIGN KEY ("submittedByBdmId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_accountsApprovedById_fkey" FOREIGN KEY ("accountsApprovedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionStatusHistory" ADD CONSTRAINT "AdmissionStatusHistory_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionStatusHistory" ADD CONSTRAINT "AdmissionStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseModule" ADD CONSTRAINT "CourseModule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationLink" ADD CONSTRAINT "RegistrationLink_bdmId_fkey" FOREIGN KEY ("bdmId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_registeredViaBdmId_fkey" FOREIGN KEY ("registeredViaBdmId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
