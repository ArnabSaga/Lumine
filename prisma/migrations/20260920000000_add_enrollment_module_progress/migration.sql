-- CreateTable
CREATE TABLE "EnrollmentModuleProgress" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrollmentModuleProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnrollmentModuleProgress_enrollmentId_idx" ON "EnrollmentModuleProgress"("enrollmentId");

-- CreateIndex
CREATE INDEX "EnrollmentModuleProgress_moduleId_idx" ON "EnrollmentModuleProgress"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentModuleProgress_enrollmentId_moduleId_key" ON "EnrollmentModuleProgress"("enrollmentId", "moduleId");

-- AddForeignKey
ALTER TABLE "EnrollmentModuleProgress" ADD CONSTRAINT "EnrollmentModuleProgress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentModuleProgress" ADD CONSTRAINT "EnrollmentModuleProgress_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
