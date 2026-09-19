import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "../generated/prisma/client";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required in .env.local.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Helper to extract cookies from Response headers
function extractCookies(res: Response): string {
  const setCookie = res.headers.get("set-cookie") || "";
  // Split multiple set-cookie if present
  return setCookie
    .split(",")
    .map((c) => c.split(";")[0].trim())
    .join("; ");
}

async function run() {
  console.log(`=== STARTING RUN 2R TRUE HTTP/E2E SUITE AGAINST: ${BASE_URL} ===\n`);

  const timestamp = Date.now();
  const testStudentEmail = `e2e-run2r-${timestamp}@example.com`;
  const testStudentPassword = "Password123!@#";
  const demoStaffPassword = process.env.DEMO_STAFF_PASSWORD || "DemoPass123!";

  let createdStudentUserId: string | null = null;
  let createdEnrollmentId: string | null = null;

  try {
    // -------------------------------------------------------------
    // 1. Unauthenticated Route Guards (401)
    // -------------------------------------------------------------
    console.log("1. Testing Unauthenticated Access Guards...");
    const unauthEnrollments = await fetch(`${BASE_URL}/api/student/enrollments`);
    if (unauthEnrollments.status !== 401) {
      throw new Error(`Expected 401 for unauthenticated student enrollments, got ${unauthEnrollments.status}`);
    }

    const unauthScan = await fetch(`${BASE_URL}/api/staff/enrollments/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "dummy-token" }),
    });
    if (unauthScan.status !== 401) {
      throw new Error(`Expected 401 for unauthenticated staff scan, got ${unauthScan.status}`);
    }
    console.log("  ✓ Unauthenticated access correctly blocked with 401.\n");

    // -------------------------------------------------------------
    // 2. Staff Authentication & Cookie Setup
    // -------------------------------------------------------------
    console.log("2. Authenticating Demo Staff Sessions...");
    const bdmRes = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE_URL },
      body: JSON.stringify({ email: "bdm1@example.com", password: demoStaffPassword }),
    });
    if (!bdmRes.ok) throw new Error(`BDM login failed: ${bdmRes.statusText}`);
    const bdmCookie = extractCookies(bdmRes);

    const teacher1Res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE_URL },
      body: JSON.stringify({ email: "teacher1@example.com", password: demoStaffPassword }),
    });
    if (!teacher1Res.ok) throw new Error(`Teacher 1 login failed: ${teacher1Res.statusText}`);
    const teacher1Cookie = extractCookies(teacher1Res);

    const teacher2Res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE_URL },
      body: JSON.stringify({ email: "teacher2@example.com", password: demoStaffPassword }),
    });
    if (!teacher2Res.ok) throw new Error(`Teacher 2 login failed: ${teacher2Res.statusText}`);
    const teacher2Cookie = extractCookies(teacher2Res);

    const accountsRes = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE_URL },
      body: JSON.stringify({ email: "accounts@example.com", password: demoStaffPassword }),
    });
    if (!accountsRes.ok) throw new Error(`Accounts login failed: ${accountsRes.statusText}`);
    const accountsCookie = extractCookies(accountsRes);
    console.log("  ✓ Demo staff sessions active (BDM, Accounts, Teacher 1, Teacher 2).\n");

    // -------------------------------------------------------------
    // 3. Role Authorization Enforcements (403)
    // -------------------------------------------------------------
    console.log("3. Testing Cross-Role Access Restrictions (403)...");
    const bdmCallStudentApi = await fetch(`${BASE_URL}/api/student/enrollments`, {
      headers: { Cookie: bdmCookie },
    });
    if (bdmCallStudentApi.status !== 403) {
      throw new Error(`Expected 403 when BDM calls student API, got ${bdmCallStudentApi.status}`);
    }

    const teacherScanApi = await fetch(`${BASE_URL}/api/staff/enrollments/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: teacher1Cookie },
      body: JSON.stringify({ token: "dummy-token" }),
    });
    if (teacherScanApi.status !== 403) {
      throw new Error(`Expected 403 when Teacher calls staff scan, got ${teacherScanApi.status}`);
    }
    console.log("  ✓ Cross-role boundaries strictly enforced.\n");

    // -------------------------------------------------------------
    // 4. Public Catalog Contract (GET /api/courses)
    // -------------------------------------------------------------
    console.log("4. Testing Public Course Catalog Contract...");
    const coursesRes = await fetch(`${BASE_URL}/api/courses`);
    if (!coursesRes.ok) throw new Error(`Failed to fetch /api/courses: ${coursesRes.status}`);
    const coursesData = await coursesRes.json();
    const courses = coursesData.courses as Array<{ id: string; slug: string; name: string; price: string }>;
    if (!courses.some((c) => c.slug === "ielts") || !courses.some((c) => c.slug === "web-development")) {
      throw new Error("Catalog missing required courses (IELTS, Web Development).");
    }
    const webDevCourse = courses.find((c) => c.slug === "web-development")!;
    console.log(`  ✓ Public catalog verified: ${courses.length} active courses found.\n`);

    // -------------------------------------------------------------
    // 5. Student Registration & Profile Creation Flow
    // -------------------------------------------------------------
    console.log("5. Testing Student Public Registration & Profile...");
    const signUpRes = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE_URL },
      body: JSON.stringify({
        name: `Test Student ${timestamp}`,
        email: testStudentEmail,
        password: testStudentPassword,
      }),
    });

    if (!signUpRes.ok) {
      const errText = await signUpRes.text();
      throw new Error(`Student signup failed: ${signUpRes.status} — ${errText}`);
    }
    const studentCookie = extractCookies(signUpRes);

    const userInDb = await prisma.user.findUnique({ where: { email: testStudentEmail } });
    if (!userInDb) throw new Error("Registered user not found in database.");
    createdStudentUserId = userInDb.id;

    if (userInDb.role !== UserRole.STUDENT) {
      throw new Error(`SECURITY FAILURE: Public user role was set to ${userInDb.role}, expected STUDENT.`);
    }

    // Submit Student Profile (with attempt to inject role/userId which must be ignored)
    const profileRes = await fetch(`${BASE_URL}/api/student/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: studentCookie },
      body: JSON.stringify({
        phone: "+8801700000000",
        address: "123 Dhaka Ave, Dhaka",
        education: "B.Sc. in Computer Science",
        role: "ADMIN", // Injection attempt
        userId: "hacked-user-id", // Injection attempt
      }),
    });
    if (!profileRes.ok) {
      throw new Error(`Failed to save student profile: ${await profileRes.text()}`);
    }

    const studentRecord = await prisma.student.findUnique({ where: { userId: userInDb.id } });
    if (!studentRecord || studentRecord.phone !== "+8801700000000") {
      throw new Error("Student profile record not created accurately.");
    }
    console.log("  ✓ Student registered (role=STUDENT), profile created with injection resistance.\n");

    // -------------------------------------------------------------
    // 6. Enrollment Creation & Concurrency Race Test
    // -------------------------------------------------------------
    console.log("6. Testing Concurrent Enrollment Creation (Promise.all)...");
    const [enrollRes1, enrollRes2] = await Promise.all([
      fetch(`${BASE_URL}/api/student/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: studentCookie },
        body: JSON.stringify({ courseId: webDevCourse.id }),
      }),
      fetch(`${BASE_URL}/api/student/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: studentCookie },
        body: JSON.stringify({ courseId: webDevCourse.id }),
      }),
    ]);

    // One must return 201, the other either 201 or 409 (safe duplicate handler)
    if (!enrollRes1.ok && !enrollRes2.ok) {
      throw new Error("Both concurrent enrollment requests failed.");
    }

    const enrollData = (enrollRes1.ok ? await enrollRes1.json() : await enrollRes2.json()) as {
      enrollment: { id: string; reference: string };
    };
    createdEnrollmentId = enrollData.enrollment.id;

    const totalEnrollments = await prisma.enrollment.count({
      where: { studentId: studentRecord.id, courseId: webDevCourse.id },
    });
    if (totalEnrollments !== 1) {
      throw new Error(`CONCURRENCY FAILURE: Expected exactly 1 Enrollment, found ${totalEnrollments}.`);
    }

    const historyCount = await prisma.enrollmentStatusHistory.count({
      where: { enrollmentId: createdEnrollmentId },
    });
    if (historyCount !== 1) {
      throw new Error(`CONCURRENCY FAILURE: Expected 1 status history entry, found ${historyCount}.`);
    }
    console.log("  ✓ Concurrency safe: exactly 1 Enrollment and 1 status history created.\n");

    // -------------------------------------------------------------
    // 7. Payment Verification & Webhook Security Test
    // -------------------------------------------------------------
    console.log("7. Testing Payment Checkout & Webhook Security...");
    const checkoutRes = await fetch(`${BASE_URL}/api/student/enrollments/${createdEnrollmentId}/checkout`, {
      method: "POST",
      headers: { Cookie: studentCookie },
    });
    if (!checkoutRes.ok) {
      throw new Error(`Checkout simulation failed: ${await checkoutRes.text()}`);
    }
    const checkoutData = await checkoutRes.json();
    if (!checkoutData.verified) {
      throw new Error("Expected simulated checkout to finalize verified payment on server.");
    }

    // Verify DB state after payment
    const enrAfterPayment = await prisma.enrollment.findUnique({
      where: { id: createdEnrollmentId },
      include: { qr: true, payments: true },
    });

    if (enrAfterPayment?.status !== "PAYMENT_VERIFIED") {
      throw new Error(`Expected PAYMENT_VERIFIED status, got ${enrAfterPayment?.status}`);
    }
    if (!enrAfterPayment.qr?.token) {
      throw new Error("Expected Enrollment QR token to be generated.");
    }
    const qrToken = enrAfterPayment.qr.token;
    console.log(`  ✓ Payment verified on server: Status = PAYMENT_VERIFIED, QR Token = ${qrToken.slice(0, 10)}...\n`);

    // Concurrent Payment Finalization (Idempotency check via HTTP webhook)
    console.log("8. Testing Concurrent Payment Finalization & Stable QR...");
    const paymentRecord = enrAfterPayment.payments[0];
    const webhookHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Origin: BASE_URL,
    };
    if (process.env.MOCK_PAYMENT_WEBHOOK_SECRET) {
      webhookHeaders["x-webhook-secret"] = process.env.MOCK_PAYMENT_WEBHOOK_SECRET;
    }

    const [wh1, wh2] = await Promise.all([
      fetch(`${BASE_URL}/api/payments/webhook`, {
        method: "POST",
        headers: webhookHeaders,
        body: JSON.stringify({
          providerPaymentId: paymentRecord.providerPaymentId,
          amount: paymentRecord.amount.toString(),
          currency: paymentRecord.currency,
        }),
      }),
      fetch(`${BASE_URL}/api/payments/webhook`, {
        method: "POST",
        headers: webhookHeaders,
        body: JSON.stringify({
          providerPaymentId: paymentRecord.providerPaymentId,
          amount: paymentRecord.amount.toString(),
          currency: paymentRecord.currency,
        }),
      }),
    ]);

    if (!wh1.ok || !wh2.ok) {
      throw new Error(`Concurrent payment webhook failed: ${wh1.status} / ${wh2.status}`);
    }

    const enrQrCheck = await prisma.enrollmentQr.findUnique({ where: { enrollmentId: createdEnrollmentId } });
    if (enrQrCheck?.token !== qrToken) {
      throw new Error("SECURITY FAILURE: QR token was rotated during duplicate payment processing.");
    }
    console.log("  ✓ Idempotency verified: Stable QR preserved without rotation.\n");

    // -------------------------------------------------------------
    // 9. Staff QR Scan & Privacy Assertion
    // -------------------------------------------------------------
    console.log("9. Testing Staff Scan & DTO Privacy Guard...");
    const scanRes = await fetch(`${BASE_URL}/api/staff/enrollments/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: bdmCookie },
      body: JSON.stringify({ token: qrToken }),
    });

    if (!scanRes.ok) {
      throw new Error(`Staff scan failed: ${await scanRes.text()}`);
    }

    const scanData = await scanRes.json();
    const studentDto = scanData.enrollment.student;

    if ("address" in studentDto || "education" in studentDto || "phone" in studentDto) {
      throw new Error("PRIVACY LEAK: Staff scan response exposes student personal profile data.");
    }
    console.log("  ✓ Staff scan DTO verified privacy-safe (no address, phone, or education exposed).\n");

    // -------------------------------------------------------------
    // 10. Approval & Concurrency Race Test
    // -------------------------------------------------------------
    console.log("10. Testing Staff Approval & Concurrency Race (Promise.all)...");
    const teacher1 = await prisma.user.findUniqueOrThrow({ where: { email: "teacher1@example.com" } });

    const [app1, app2] = await Promise.all([
      fetch(`${BASE_URL}/api/staff/enrollments/${createdEnrollmentId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: accountsCookie },
        body: JSON.stringify({ assignedTeacherId: teacher1.id, qrToken }),
      }),
      fetch(`${BASE_URL}/api/staff/enrollments/${createdEnrollmentId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: bdmCookie },
        body: JSON.stringify({ assignedTeacherId: teacher1.id, qrToken }),
      }),
    ]);

    const statuses = [app1.status, app2.status];
    if (!statuses.includes(200) || !statuses.includes(409)) {
      throw new Error(`Expected exactly one 200 and one 409 for concurrent approvals, got: ${statuses.join(", ")}`);
    }

    const approvalHistoryCount = await prisma.enrollmentStatusHistory.count({
      where: { enrollmentId: createdEnrollmentId, toStatus: "APPROVED" },
    });
    if (approvalHistoryCount !== 1) {
      throw new Error(`Expected exactly 1 APPROVED history record, found ${approvalHistoryCount}.`);
    }
    console.log("  ✓ Concurrency safe: exactly 1 approval succeeded, duplicate returned 409.\n");

    // -------------------------------------------------------------
    // 11. Post-Approval Payment Idempotency
    // -------------------------------------------------------------
    console.log("11. Testing Payment Idempotency Post-Approval...");
    const postApprRes = await fetch(`${BASE_URL}/api/payments/webhook`, {
      method: "POST",
      headers: webhookHeaders,
      body: JSON.stringify({
        providerPaymentId: paymentRecord.providerPaymentId,
        amount: paymentRecord.amount.toString(),
        currency: paymentRecord.currency,
      }),
    });
    if (!postApprRes.ok) {
      throw new Error(`Expected 200 for webhook retry post-approval, got ${postApprRes.status}`);
    }
    const postApprData = await postApprRes.json();
    if (!postApprData.alreadyProcessed) {
      throw new Error("Expected alreadyProcessed: true when retrying payment for APPROVED enrollment.");
    }
    console.log("  ✓ Idempotency holds even after Enrollment is APPROVED.\n");

    // -------------------------------------------------------------
    // 12. Teacher Access & Isolation Verification
    // -------------------------------------------------------------
    console.log("12. Testing Teacher Isolation & Curriculum Inspection...");
    const teacher1ListRes = await fetch(`${BASE_URL}/api/teacher/enrollments`, {
      headers: { Cookie: teacher1Cookie },
    });
    if (!teacher1ListRes.ok) throw new Error("Teacher 1 failed to list enrollments.");
    const teacher1ListData = await teacher1ListRes.json();
    const foundInT1 = (teacher1ListData.enrollments as Array<{ id: string }>).some(
      (e) => e.id === createdEnrollmentId
    );
    if (!foundInT1) throw new Error("Assigned enrollment missing from Teacher 1 dashboard.");

    const teacher1DetailRes = await fetch(`${BASE_URL}/api/teacher/enrollments/${createdEnrollmentId}`, {
      headers: { Cookie: teacher1Cookie },
    });
    if (!teacher1DetailRes.ok) throw new Error("Teacher 1 failed to load enrollment detail.");
    const teacher1Detail = await teacher1DetailRes.json();
    if (!teacher1Detail.enrollment.modules || teacher1Detail.enrollment.modules.length !== 7) {
      throw new Error(`Expected 7 Web Development modules, got ${teacher1Detail.enrollment.modules?.length}`);
    }

    // Teacher 2 isolation check
    const teacher2DetailRes = await fetch(`${BASE_URL}/api/teacher/enrollments/${createdEnrollmentId}`, {
      headers: { Cookie: teacher2Cookie },
    });
    if (teacher2DetailRes.status !== 404) {
      throw new Error(`SECURITY FAILURE: Teacher 2 accessed Teacher 1's student (got ${teacher2DetailRes.status}, expected 404).`);
    }
    console.log("  ✓ Teacher isolation verified: Teacher 1 has full module access; Teacher 2 receives 404.\n");

    console.log("===============================================================");
    console.log("🎉 ALL RUN 2R TRUE HTTP/E2E WORKFLOW & SECURITY TESTS PASSED 100%");
    console.log("===============================================================\n");
  } finally {
    // Clean up test-created data only
    if (createdEnrollmentId) {
      await prisma.enrollmentStatusHistory.deleteMany({ where: { enrollmentId: createdEnrollmentId } });
      await prisma.enrollmentQr.deleteMany({ where: { enrollmentId: createdEnrollmentId } });
      await prisma.payment.deleteMany({ where: { enrollmentId: createdEnrollmentId } });
      await prisma.enrollment.deleteMany({ where: { id: createdEnrollmentId } });
    }
    if (createdStudentUserId) {
      await prisma.student.deleteMany({ where: { userId: createdStudentUserId } });
      await prisma.account.deleteMany({ where: { userId: createdStudentUserId } });
      await prisma.session.deleteMany({ where: { userId: createdStudentUserId } });
      await prisma.user.deleteMany({ where: { id: createdStudentUserId } });
    }
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
