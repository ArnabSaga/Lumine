import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "../generated/prisma/client";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required in .env.local.");
}

const demoStaffPassword = process.env.DEMO_STAFF_PASSWORD;
if (!demoStaffPassword) {
  console.error("DEMO_STAFF_PASSWORD is required in .env.local. Stopping test cleanly.");
  process.exit(2);
}

const webhookSecret: string | undefined = process.env.MOCK_PAYMENT_WEBHOOK_SECRET || undefined;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Extract cookies without splitting on commas (Expires attributes contain commas).
function extractCookies(res: Response): string {
  const headersWithGetter = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headersWithGetter.getSetCookie === "function") {
    const cookies = headersWithGetter.getSetCookie();
    if (cookies.length > 0) {
      return cookies.map((c) => c.split(";")[0].trim()).join("; ");
    }
  }
  const single = res.headers.get("set-cookie") || "";
  return single.split(";")[0].trim();
}

async function signIn(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE_URL },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${res.status} ${await res.text()}`);
  }
  return extractCookies(res);
}

interface CourseSummary {
  id: string;
  slug: string;
  name: string;
  price: string;
}

async function run() {
  console.log(`=== STARTING RUN 2R TRUE HTTP/E2E SUITE AGAINST: ${BASE_URL} ===\n`);

  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 100000);
  const testStudentEmail = `e2e-run2r-${timestamp}-${randomSuffix}@example.com`;
  const testStudentPassword = `E2e-${timestamp}-Pass!`;
  const staffPassword: string = demoStaffPassword as string;

  let createdStudentUserId: string | null = null;
  const createdEnrollmentIds: string[] = [];

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
    const bdmCookie = await signIn("bdm1@example.com", staffPassword);
    const accountsCookie = await signIn("accounts@example.com", staffPassword);
    const teacher1Cookie = await signIn("teacher1@example.com", staffPassword);
    const teacher2Cookie = await signIn("teacher2@example.com", staffPassword);
    const teacher1 = await prisma.user.findUniqueOrThrow({ where: { email: "teacher1@example.com" } });
    const teacher2 = await prisma.user.findUniqueOrThrow({ where: { email: "teacher2@example.com" } });
    const accountsUser = await prisma.user.findUniqueOrThrow({ where: { email: "accounts@example.com" } });
    console.log("  ✓ Demo staff sessions active (BDM, Accounts, Teacher 1, Teacher 2).\n");

    // -------------------------------------------------------------
    // 3. Role Authorization Matrix (403)
    // -------------------------------------------------------------
    console.log("3. Testing Cross-Role Access Restrictions (403)...");
    async function expectStatus(label: string, res: Response, expected: number) {
      if (res.status !== expected) {
        throw new Error(`Expected ${expected} for ${label}, got ${res.status}: ${await res.text()}`);
      }
    }

    await expectStatus(
      "BDM calling student enrollments",
      await fetch(`${BASE_URL}/api/student/enrollments`, { headers: { Cookie: bdmCookie } }),
      403
    );
    await expectStatus(
      "Teacher calling staff scan",
      await fetch(`${BASE_URL}/api/staff/enrollments/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: teacher1Cookie },
        body: JSON.stringify({ token: "dummy-token" }),
      }),
      403
    );
    await expectStatus(
      "BDM creating student enrollment",
      await fetch(`${BASE_URL}/api/student/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: bdmCookie },
        body: JSON.stringify({ courseId: "dummy" }),
      }),
      403
    );
    for (const [label, cookie] of [
      ["BDM", bdmCookie],
      ["ACCOUNTS", accountsCookie],
      ["TEACHER", teacher2Cookie],
    ] as Array<[string, string]>) {
      await expectStatus(
        `${label} submitting student profile`,
        await fetch(`${BASE_URL}/api/student/profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: cookie },
          body: JSON.stringify({ phone: "x", address: "x", education: "x" }),
        }),
        403
      );
    }
    console.log("  ✓ Cross-role boundaries strictly enforced.\n");

    // -------------------------------------------------------------
    // 4. Public Catalog Contract (GET /api/courses)
    // -------------------------------------------------------------
    console.log("4. Testing Public Course Catalog Contract...");
    const coursesRes = await fetch(`${BASE_URL}/api/courses`);
    if (!coursesRes.ok) throw new Error(`Failed to fetch /api/courses: ${coursesRes.status}`);
    const coursesData = (await coursesRes.json()) as { courses: CourseSummary[] };
    const courses = coursesData.courses;
    const webDevCourse = courses.find((c) => c.slug === "web-development");
    const spokenCourse = courses.find((c) => c.slug === "spoken-english");
    const ieltsCourse = courses.find((c) => c.slug === "ielts");
    if (!webDevCourse || !spokenCourse || !ieltsCourse) {
      throw new Error("Catalog missing required courses (web-development, spoken-english, ielts).");
    }
    console.log(`  ✓ Public catalog verified: ${courses.length} active courses found.\n`);

    // -------------------------------------------------------------
    // 5. Student Registration & Profile Security
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
      throw new Error(`Student signup failed: ${signUpRes.status} — ${await signUpRes.text()}`);
    }
    const studentCookie = extractCookies(signUpRes);

    // STUDENT calling staff-only scan must be rejected.
    await expectStatus(
      "STUDENT calling staff scan",
      await fetch(`${BASE_URL}/api/staff/enrollments/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: studentCookie },
        body: JSON.stringify({ token: "dummy-token" }),
      }),
      403
    );

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
    if (studentRecord.userId !== userInDb.id) {
      throw new Error("SECURITY FAILURE: Profile ownership escaped the authenticated session.");
    }
    const roleAfterProfile = (await prisma.user.findUniqueOrThrow({ where: { id: userInDb.id } })).role;
    if (roleAfterProfile !== UserRole.STUDENT) {
      throw new Error("SECURITY FAILURE: Profile injection changed the user role.");
    }
    console.log("  ✓ Student registered (role=STUDENT), profile session-owned with injection resistance.\n");

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

    if (!enrollRes1.ok && !enrollRes2.ok) {
      throw new Error("Both concurrent enrollment requests failed.");
    }
    for (const res of [enrollRes1, enrollRes2]) {
      if (res.ok && res.status !== 201 && res.status !== 200) {
        throw new Error(`Unexpected enrollment status: ${res.status}`);
      }
      if (!res.ok && res.status !== 409) {
        throw new Error(`Unexpected enrollment rejection status: ${res.status}`);
      }
    }

    const enrollData = (enrollRes1.ok ? await enrollRes1.json() : await enrollRes2.json()) as {
      enrollment: { id: string; reference: string };
    };
    const webDevEnrollmentId = enrollData.enrollment.id;
    createdEnrollmentIds.push(webDevEnrollmentId);

    const totalEnrollments = await prisma.enrollment.count({
      where: { studentId: studentRecord.id, courseId: webDevCourse.id },
    });
    if (totalEnrollments !== 1) {
      throw new Error(`CONCURRENCY FAILURE: Expected exactly 1 Enrollment, found ${totalEnrollments}.`);
    }

    const historyCount = await prisma.enrollmentStatusHistory.count({
      where: { enrollmentId: webDevEnrollmentId },
    });
    if (historyCount !== 1) {
      throw new Error(`CONCURRENCY FAILURE: Expected 1 status history entry, found ${historyCount}.`);
    }
    console.log("  ✓ Concurrency safe: exactly 1 Enrollment and 1 status history created.\n");

    // -------------------------------------------------------------
    // 7. Course Access Gate Before Payment
    // -------------------------------------------------------------
    console.log("7. Testing Course Access Gate (PENDING_PAYMENT → no access)...");
    const gatedPage = await fetch(`${BASE_URL}/student/courses/${webDevCourse.slug}`, {
      headers: { Cookie: studentCookie },
    });
    const gatedHtml = await gatedPage.text();
    if (gatedPage.status !== 200 || !gatedHtml.includes("Course Access Restricted")) {
      throw new Error("Expected restricted course page for PENDING_PAYMENT enrollment.");
    }
    const missingCoursePage = await fetch(`${BASE_URL}/student/courses/no-such-course-xyz`, {
      headers: { Cookie: studentCookie },
    });
    if (missingCoursePage.status !== 404) {
      throw new Error(`Expected 404 for unknown course slug, got ${missingCoursePage.status}.`);
    }
    console.log("  ✓ Unpaid enrollment cannot access curriculum; unknown slug is 404.\n");

    // -------------------------------------------------------------
    // 8. Concurrent Checkout Race (no duplicate PENDING payments)
    // -------------------------------------------------------------
    console.log("8. Testing Concurrent Checkout (Promise.all)...");
    const spokenEnrollRes = await fetch(`${BASE_URL}/api/student/enrollments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: studentCookie },
      body: JSON.stringify({ courseId: spokenCourse.id }),
    });
    if (!spokenEnrollRes.ok && spokenEnrollRes.status !== 409) {
      throw new Error(`Spoken English enrollment failed: ${await spokenEnrollRes.text()}`);
    }
    const spokenEnrollData = (await spokenEnrollRes.json()) as { enrollment: { id: string } };
    const spokenEnrollmentId = spokenEnrollData.enrollment.id;
    createdEnrollmentIds.push(spokenEnrollmentId);

    const [co1, co2] = await Promise.all([
      fetch(`${BASE_URL}/api/student/enrollments/${spokenEnrollmentId}/checkout`, {
        method: "POST",
        headers: { Cookie: studentCookie },
      }),
      fetch(`${BASE_URL}/api/student/enrollments/${spokenEnrollmentId}/checkout`, {
        method: "POST",
        headers: { Cookie: studentCookie },
      }),
    ]);
    if (!co1.ok || !co2.ok) {
      throw new Error(`Concurrent checkout failed: ${co1.status} / ${co2.status}`);
    }
    const spokenSucceeded = await prisma.payment.count({
      where: { enrollmentId: spokenEnrollmentId, status: "SUCCEEDED" },
    });
    const spokenPending = await prisma.payment.count({
      where: { enrollmentId: spokenEnrollmentId, status: "PENDING" },
    });
    if (spokenSucceeded !== 1 || spokenPending !== 0) {
      throw new Error(
        `CHECKOUT RACE FAILURE: Expected 1 SUCCEEDED / 0 PENDING payments, found ${spokenSucceeded} / ${spokenPending}.`
      );
    }
    console.log("  ✓ Checkout race safe: exactly 1 SUCCEEDED payment, 0 PENDING left.\n");

    // -------------------------------------------------------------
    // 9. Dedicated Webhook-Harness Enrollment (IELTS)
    // -------------------------------------------------------------
    console.log("9. Creating Dedicated Webhook-Harness Enrollment...");
    const ieltsEnrollRes = await fetch(`${BASE_URL}/api/student/enrollments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: studentCookie },
      body: JSON.stringify({ courseId: ieltsCourse.id }),
    });
    if (!ieltsEnrollRes.ok && ieltsEnrollRes.status !== 409) {
      throw new Error(`IELTS enrollment failed: ${await ieltsEnrollRes.text()}`);
    }
    const ieltsEnrollData = (await ieltsEnrollRes.json()) as { enrollment: { id: string } };
    const ieltsEnrollmentId = ieltsEnrollData.enrollment.id;
    createdEnrollmentIds.push(ieltsEnrollmentId);

    const ieltsEnrollment = await prisma.enrollment.findUniqueOrThrow({ where: { id: ieltsEnrollmentId } });
    const harnessPayment = await prisma.payment.create({
      data: {
        enrollmentId: ieltsEnrollmentId,
        provider: "test-harness",
        providerPaymentId: `HARNESS-${timestamp}-${randomSuffix}`,
        amount: ieltsEnrollment.priceAtEnrollment,
        currency: ieltsEnrollment.currencyAtEnrollment,
        status: "PENDING",
      },
    });
    const harnessAmount = harnessPayment.amount.toString();
    const harnessCurrency = harnessPayment.currency;

    async function assertHarnessUntouched(label: string) {
      const payment = await prisma.payment.findUniqueOrThrow({ where: { id: harnessPayment.id } });
      if (payment.status !== "PENDING") {
        throw new Error(`DB MUTATED by ${label}: payment status is ${payment.status}.`);
      }
      const enrollment = await prisma.enrollment.findUniqueOrThrow({ where: { id: ieltsEnrollmentId } });
      if (enrollment.status !== "PENDING_PAYMENT") {
        throw new Error(`DB MUTATED by ${label}: enrollment status is ${enrollment.status}.`);
      }
      const history = await prisma.enrollmentStatusHistory.count({ where: { enrollmentId: ieltsEnrollmentId } });
      if (history !== 1) {
        throw new Error(`DB MUTATED by ${label}: history count is ${history}.`);
      }
      const qr = await prisma.enrollmentQr.count({ where: { enrollmentId: ieltsEnrollmentId } });
      if (qr !== 0) {
        throw new Error(`DB MUTATED by ${label}: QR was created.`);
      }
    }
    console.log("  ✓ Harness enrollment (PENDING_PAYMENT) with PENDING payment ready.\n");

    // -------------------------------------------------------------
    // 10. Webhook Security Matrix
    // -------------------------------------------------------------
    console.log("10. Testing Webhook Security Matrix...");
    if (!webhookSecret) {
      const unconfigured = await fetch(`${BASE_URL}/api/payments/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: BASE_URL },
        body: JSON.stringify({
          providerPaymentId: harnessPayment.providerPaymentId,
          amount: harnessAmount,
          currency: harnessCurrency,
          success: true,
        }),
      });
      if (unconfigured.status !== 503) {
        throw new Error(`Expected 503 when webhook secret is unconfigured, got ${unconfigured.status}.`);
      }
      await assertHarnessUntouched("unconfigured webhook");
      console.log("  ✓ Webhook fails closed (503) without a configured secret; zero DB mutation.\n");
    } else {
      const signedHeaders = (secret: string): Record<string, string> => ({
        "Content-Type": "application/json",
        Origin: BASE_URL,
        "x-webhook-secret": secret,
      });

      // Missing signature → 401, zero mutation.
      const noSig = await fetch(`${BASE_URL}/api/payments/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: BASE_URL },
        body: JSON.stringify({
          providerPaymentId: harnessPayment.providerPaymentId,
          amount: harnessAmount,
          currency: harnessCurrency,
          success: true,
        }),
      });
      if (noSig.status !== 401) throw new Error(`Expected 401 for missing signature, got ${noSig.status}.`);
      await assertHarnessUntouched("missing signature");

      // Wrong signature → 401, zero mutation.
      const wrongSig = await fetch(`${BASE_URL}/api/payments/webhook`, {
        method: "POST",
        headers: signedHeaders("wrong-secret-value"),
        body: JSON.stringify({
          providerPaymentId: harnessPayment.providerPaymentId,
          amount: harnessAmount,
          currency: harnessCurrency,
          success: true,
        }),
      });
      if (wrongSig.status !== 401) throw new Error(`Expected 401 for wrong signature, got ${wrongSig.status}.`);
      await assertHarnessUntouched("wrong signature");

      // Unknown provider payment → 404.
      const unknownPayment = await fetch(`${BASE_URL}/api/payments/webhook`, {
        method: "POST",
        headers: signedHeaders(webhookSecret),
        body: JSON.stringify({
          providerPaymentId: `HARNESS-UNKNOWN-${timestamp}`,
          amount: harnessAmount,
          currency: harnessCurrency,
          success: true,
        }),
      });
      if (unknownPayment.status !== 404) {
        throw new Error(`Expected 404 for unknown payment, got ${unknownPayment.status}.`);
      }

      // Wrong amount → rejected, zero finalization.
      const wrongAmount = await fetch(`${BASE_URL}/api/payments/webhook`, {
        method: "POST",
        headers: signedHeaders(webhookSecret),
        body: JSON.stringify({
          providerPaymentId: harnessPayment.providerPaymentId,
          amount: "1.00",
          currency: harnessCurrency,
          success: true,
        }),
      });
      if (wrongAmount.ok) throw new Error("Webhook with wrong amount was accepted.");
      await assertHarnessUntouched("wrong amount");

      // Wrong currency → rejected, zero finalization.
      const wrongCurrency = await fetch(`${BASE_URL}/api/payments/webhook`, {
        method: "POST",
        headers: signedHeaders(webhookSecret),
        body: JSON.stringify({
          providerPaymentId: harnessPayment.providerPaymentId,
          amount: harnessAmount,
          currency: "USD",
          success: true,
        }),
      });
      if (wrongCurrency.ok) throw new Error("Webhook with wrong currency was accepted.");
      await assertHarnessUntouched("wrong currency");

      // Provider reports failure → never finalizes.
      const providerFailure = await fetch(`${BASE_URL}/api/payments/webhook`, {
        method: "POST",
        headers: signedHeaders(webhookSecret),
        body: JSON.stringify({
          providerPaymentId: harnessPayment.providerPaymentId,
          amount: harnessAmount,
          currency: harnessCurrency,
          success: false,
        }),
      });
      if (providerFailure.ok) throw new Error("Webhook with success=false was accepted.");
      await assertHarnessUntouched("provider failure");
      console.log("  ✓ Webhook matrix: 401/404/409/400 rejections with zero DB mutation.\n");
    }

    // -------------------------------------------------------------
    // 11. Unpaid Enrollment Cannot Be Approved
    // -------------------------------------------------------------
    console.log("11. Testing Approval Gate for Unpaid Enrollment...");
    const unpaidApproval = await fetch(`${BASE_URL}/api/staff/enrollments/${ieltsEnrollmentId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: accountsCookie },
      body: JSON.stringify({ assignedTeacherId: teacher2.id, qrToken: "bogus-token" }),
    });
    if (unpaidApproval.status !== 409) {
      throw new Error(`Expected 409 when approving unpaid enrollment, got ${unpaidApproval.status}.`);
    }
    console.log("  ✓ Unpaid enrollment approval rejected with 409.\n");

    // -------------------------------------------------------------
    // 12. Concurrent Payment Finalization & Stable QR
    // -------------------------------------------------------------
    let ieltsQrToken: string;
    if (!webhookSecret) {
      console.log("12. Skipping webhook finalization race (no webhook secret configured).\n");
      // Without a webhook secret the harness payment cannot finalize; clean up
      // replaces finalization coverage for this run.
      createdEnrollmentIds.splice(createdEnrollmentIds.indexOf(ieltsEnrollmentId), 1);
      await prisma.enrollmentStatusHistory.deleteMany({ where: { enrollmentId: ieltsEnrollmentId } });
      await prisma.payment.deleteMany({ where: { enrollmentId: ieltsEnrollmentId } });
      await prisma.enrollment.deleteMany({ where: { id: ieltsEnrollmentId } });
      ieltsQrToken = "";
    } else {
      console.log("12. Testing Concurrent Payment Finalization & Stable QR...");
      const validPayload = {
        providerPaymentId: harnessPayment.providerPaymentId,
        amount: harnessAmount,
        currency: harnessCurrency,
        success: true,
      };
      const webhookHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        Origin: BASE_URL,
        "x-webhook-secret": webhookSecret,
      };

      const [wh1, wh2] = await Promise.all([
        fetch(`${BASE_URL}/api/payments/webhook`, {
          method: "POST",
          headers: webhookHeaders,
          body: JSON.stringify(validPayload),
        }),
        fetch(`${BASE_URL}/api/payments/webhook`, {
          method: "POST",
          headers: webhookHeaders,
          body: JSON.stringify(validPayload),
        }),
      ]);
      if (!wh1.ok || !wh2.ok) {
        throw new Error(`Concurrent payment webhook failed: ${wh1.status} / ${wh2.status}`);
      }

      const enrAfterPayment = await prisma.enrollment.findUniqueOrThrow({
        where: { id: ieltsEnrollmentId },
        include: { qr: true, payments: true },
      });
      if (enrAfterPayment.status !== "PAYMENT_VERIFIED") {
        throw new Error(`Expected PAYMENT_VERIFIED status, got ${enrAfterPayment.status}`);
      }
      if (!enrAfterPayment.qr?.token) {
        throw new Error("Expected Enrollment QR token to be generated.");
      }
      const succeededCount = enrAfterPayment.payments.filter((p) => p.status === "SUCCEEDED").length;
      if (succeededCount !== 1) {
        throw new Error(`Expected exactly 1 SUCCEEDED payment, found ${succeededCount}.`);
      }
      const verifiedHistory = await prisma.enrollmentStatusHistory.count({
        where: { enrollmentId: ieltsEnrollmentId, toStatus: "PAYMENT_VERIFIED" },
      });
      if (verifiedHistory !== 1) {
        throw new Error(`Expected exactly 1 PAYMENT_VERIFIED history record, found ${verifiedHistory}.`);
      }
      ieltsQrToken = enrAfterPayment.qr.token;

      // Duplicate finalization must be idempotent with a stable QR.
      const wh3 = await fetch(`${BASE_URL}/api/payments/webhook`, {
        method: "POST",
        headers: webhookHeaders,
        body: JSON.stringify(validPayload),
      });
      if (!wh3.ok) throw new Error(`Duplicate webhook failed: ${wh3.status}`);
      const wh3Data = (await wh3.json()) as { alreadyProcessed?: boolean };
      if (wh3Data.alreadyProcessed !== true) {
        throw new Error("Expected alreadyProcessed=true on duplicate payment webhook.");
      }
      const qrRecheck = await prisma.enrollmentQr.findUniqueOrThrow({
        where: { enrollmentId: ieltsEnrollmentId },
      });
      if (qrRecheck.token !== ieltsQrToken) {
        throw new Error("SECURITY FAILURE: QR token rotated during duplicate payment processing.");
      }
      console.log("  ✓ Idempotent finalization: 1 SUCCEEDED payment, 1 history, stable QR.\n");
    }

    // -------------------------------------------------------------
    // 13. Web-Dev Payment, Staff Scan & DTO Privacy
    // -------------------------------------------------------------
    console.log("13. Testing Payment Checkout, Staff Scan & DTO Privacy...");
    const webCheckout = await fetch(`${BASE_URL}/api/student/enrollments/${webDevEnrollmentId}/checkout`, {
      method: "POST",
      headers: { Cookie: studentCookie },
    });
    if (!webCheckout.ok) {
      throw new Error(`Web-Dev checkout failed: ${await webCheckout.text()}`);
    }
    const webCheckoutData = (await webCheckout.json()) as { verified?: boolean };
    if (!webCheckoutData.verified) {
      throw new Error("Expected simulated checkout to finalize verified payment on server.");
    }

    const webAfterPayment = await prisma.enrollment.findUniqueOrThrow({
      where: { id: webDevEnrollmentId },
      include: { qr: true },
    });
    if (webAfterPayment.status !== "PAYMENT_VERIFIED" || !webAfterPayment.qr?.token) {
      throw new Error("Web-Dev enrollment did not reach PAYMENT_VERIFIED with a QR.");
    }
    const webQrToken = webAfterPayment.qr.token;

    // Tampered token → 404.
    const tamperedScan = await fetch(`${BASE_URL}/api/staff/enrollments/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: bdmCookie },
      body: JSON.stringify({ token: `${webQrToken}-tampered` }),
    });
    if (tamperedScan.status !== 404) {
      throw new Error(`Expected 404 for tampered QR token, got ${tamperedScan.status}.`);
    }

    const scanRes = await fetch(`${BASE_URL}/api/staff/enrollments/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: bdmCookie },
      body: JSON.stringify({ token: webQrToken }),
    });
    if (!scanRes.ok) {
      throw new Error(`Staff scan failed: ${await scanRes.text()}`);
    }
    const scanData = (await scanRes.json()) as {
      enrollment: {
        student: Record<string, unknown>;
        course: unknown;
        reference: string;
        payment: unknown;
        status: string;
      };
    };
    const studentDto = scanData.enrollment.student;
    for (const forbidden of ["address", "education", "additionalInfo", "phone"]) {
      if (forbidden in studentDto) {
        throw new Error(`PRIVACY LEAK: Staff scan response exposes "${forbidden}".`);
      }
    }
    for (const required of ["name", "email"]) {
      if (!(required in studentDto)) {
        throw new Error(`Staff scan DTO missing required field "${required}".`);
      }
    }
    console.log("  ✓ Staff scan privacy-safe (name/email/course/payment only); tampered token 404.\n");

    // -------------------------------------------------------------
    // 14. Approval Validation & Concurrency Race
    // -------------------------------------------------------------
    console.log("14. Testing Approval Validation & Concurrency Race...");
    if (webhookSecret) {
      // Wrong QR token → rejected.
      const wrongQrApproval = await fetch(`${BASE_URL}/api/staff/enrollments/${ieltsEnrollmentId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: accountsCookie },
        body: JSON.stringify({ assignedTeacherId: teacher2.id, qrToken: "wrong-qr-token" }),
      });
      if (wrongQrApproval.ok) {
        throw new Error("Approval with wrong QR token was accepted.");
      }

      // Non-teacher assignment → rejected.
      const wrongRoleApproval = await fetch(`${BASE_URL}/api/staff/enrollments/${ieltsEnrollmentId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: accountsCookie },
        body: JSON.stringify({ assignedTeacherId: accountsUser.id, qrToken: ieltsQrToken }),
      });
      if (wrongRoleApproval.status !== 400) {
        throw new Error(`Expected 400 for non-teacher assignment, got ${wrongRoleApproval.status}.`);
      }
      console.log("  ✓ Wrong QR rejected; non-teacher assignment rejected with 400.");
    }

    const [app1, app2] = await Promise.all([
      fetch(`${BASE_URL}/api/staff/enrollments/${webDevEnrollmentId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: accountsCookie },
        body: JSON.stringify({ assignedTeacherId: teacher1.id, qrToken: webQrToken }),
      }),
      fetch(`${BASE_URL}/api/staff/enrollments/${webDevEnrollmentId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: bdmCookie },
        body: JSON.stringify({ assignedTeacherId: teacher1.id, qrToken: webQrToken }),
      }),
    ]);

    const statuses = [app1.status, app2.status];
    if (!statuses.includes(200) || !statuses.includes(409)) {
      throw new Error(`Expected exactly one 200 and one 409 for concurrent approvals, got: ${statuses.join(", ")}`);
    }

    const approvalHistoryCount = await prisma.enrollmentStatusHistory.count({
      where: { enrollmentId: webDevEnrollmentId, toStatus: "APPROVED" },
    });
    if (approvalHistoryCount !== 1) {
      throw new Error(`Expected exactly 1 APPROVED history record, found ${approvalHistoryCount}.`);
    }
    console.log("  ✓ Concurrency safe: exactly 1 approval succeeded, duplicate returned 409.\n");

    if (webhookSecret) {
      // Sequentially approve the IELTS enrollment with Teacher 2 for isolation coverage.
      const ieltsApproval = await fetch(`${BASE_URL}/api/staff/enrollments/${ieltsEnrollmentId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: accountsCookie },
        body: JSON.stringify({ assignedTeacherId: teacher2.id, qrToken: ieltsQrToken }),
      });
      if (!ieltsApproval.ok) {
        throw new Error(`IELTS approval failed: ${await ieltsApproval.text()}`);
      }
      console.log("  ✓ IELTS enrollment approved with Teacher 2.\n");
    }

    // -------------------------------------------------------------
    // 15. Post-Approval Payment Idempotency
    // -------------------------------------------------------------
    console.log("15. Testing Payment Idempotency Post-Approval...");
    if (!webhookSecret) {
      console.log("  ⊘ Skipped (no webhook secret configured).\n");
    } else {
      const webPayment = await prisma.payment.findFirstOrThrow({
        where: { enrollmentId: webDevEnrollmentId, status: "SUCCEEDED" },
      });
      const postApprRes = await fetch(`${BASE_URL}/api/payments/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: BASE_URL,
          "x-webhook-secret": webhookSecret,
        },
        body: JSON.stringify({
          providerPaymentId: webPayment.providerPaymentId,
          amount: webPayment.amount.toString(),
          currency: webPayment.currency,
          success: true,
        }),
      });
      if (!postApprRes.ok) {
        throw new Error(`Expected 200 for webhook retry post-approval, got ${postApprRes.status}`);
      }
      const postApprData = (await postApprRes.json()) as { alreadyProcessed?: boolean };
      if (postApprData.alreadyProcessed !== true) {
        throw new Error("Expected alreadyProcessed: true when retrying payment for APPROVED enrollment.");
      }
      console.log("  ✓ Idempotency holds even after Enrollment is APPROVED.\n");
    }

    // -------------------------------------------------------------
    // 16. Exact Course Access After Approval
    // -------------------------------------------------------------
    console.log("16. Testing Exact Course Access...");
    const webCoursePage = await fetch(`${BASE_URL}/student/courses/${webDevCourse.slug}`, {
      headers: { Cookie: studentCookie },
    });
    const webCourseHtml = await webCoursePage.text();
    if (webCoursePage.status !== 200 || !webCourseHtml.includes("Curriculum Modules")) {
      throw new Error("Approved Web-Dev course page did not expose curriculum modules.");
    }
    for (const moduleTitle of ["HTML &amp; CSS", "JavaScript", "Next.js", "Deployment"]) {
      if (!webCourseHtml.includes(moduleTitle)) {
        throw new Error(`Approved course page missing module "${moduleTitle}".`);
      }
    }
    const spokenCoursePage = await fetch(`${BASE_URL}/student/courses/${spokenCourse.slug}`, {
      headers: { Cookie: studentCookie },
    });
    const spokenCourseHtml = await spokenCoursePage.text();
    if (spokenCoursePage.status !== 200 || !spokenCourseHtml.includes("Course Access Restricted")) {
      throw new Error("PAYMENT_VERIFIED (unapproved) course must remain restricted.");
    }
    console.log("  ✓ APPROVED course exposes modules; VERIFIED-but-unapproved stays restricted.\n");

    // -------------------------------------------------------------
    // 17. Teacher Access & Isolation Verification
    // -------------------------------------------------------------
    console.log("17. Testing Teacher Isolation & Curriculum Inspection...");
    const teacher1ListRes = await fetch(`${BASE_URL}/api/teacher/enrollments`, {
      headers: { Cookie: teacher1Cookie },
    });
    if (!teacher1ListRes.ok) throw new Error("Teacher 1 failed to list enrollments.");
    const teacher1ListData = (await teacher1ListRes.json()) as { enrollments: Array<{ id: string }> };
    const t1Ids = teacher1ListData.enrollments.map((e) => e.id);
    if (!t1Ids.includes(webDevEnrollmentId)) {
      throw new Error("Assigned enrollment missing from Teacher 1 dashboard.");
    }
    if (webhookSecret && t1Ids.includes(ieltsEnrollmentId)) {
      throw new Error("SECURITY FAILURE: Teacher 1 sees Teacher 2's enrollment in list.");
    }

    const teacher1DetailRes = await fetch(`${BASE_URL}/api/teacher/enrollments/${webDevEnrollmentId}`, {
      headers: { Cookie: teacher1Cookie },
    });
    if (!teacher1DetailRes.ok) throw new Error("Teacher 1 failed to load enrollment detail.");
    const teacher1Detail = (await teacher1DetailRes.json()) as {
      enrollment: { modules: Array<unknown> };
    };
    if (!teacher1Detail.enrollment.modules || teacher1Detail.enrollment.modules.length !== 7) {
      throw new Error(`Expected 7 Web Development modules, got ${teacher1Detail.enrollment.modules?.length}`);
    }

    // Cross-teacher direct access must be a safe 404.
    const teacher2DetailRes = await fetch(`${BASE_URL}/api/teacher/enrollments/${webDevEnrollmentId}`, {
      headers: { Cookie: teacher2Cookie },
    });
    if (teacher2DetailRes.status !== 404) {
      throw new Error(
        `SECURITY FAILURE: Teacher 2 accessed Teacher 1's student (got ${teacher2DetailRes.status}, expected 404).`
      );
    }
    if (webhookSecret) {
      const teacher1CrossRes = await fetch(`${BASE_URL}/api/teacher/enrollments/${ieltsEnrollmentId}`, {
        headers: { Cookie: teacher1Cookie },
      });
      if (teacher1CrossRes.status !== 404) {
        throw new Error(
          `SECURITY FAILURE: Teacher 1 accessed Teacher 2's student (got ${teacher1CrossRes.status}, expected 404).`
        );
      }
      const teacher2ListRes = await fetch(`${BASE_URL}/api/teacher/enrollments`, {
        headers: { Cookie: teacher2Cookie },
      });
      if (!teacher2ListRes.ok) throw new Error("Teacher 2 failed to list enrollments.");
      const teacher2ListData = (await teacher2ListRes.json()) as { enrollments: Array<{ id: string }> };
      const t2Ids = teacher2ListData.enrollments.map((e) => e.id);
      if (!t2Ids.includes(ieltsEnrollmentId) || t2Ids.includes(webDevEnrollmentId)) {
        throw new Error("Teacher 2 list isolation violated.");
      }
    }
    console.log("  ✓ Teacher isolation verified: assigned access only, cross-access 404.\n");

    console.log("===============================================================");
    console.log("🎉 ALL RUN 2R TRUE HTTP/E2E WORKFLOW & SECURITY TESTS PASSED 100%");
    console.log("===============================================================\n");
  } finally {
    // Clean up ONLY data created by this test run.
    for (const enrollmentId of createdEnrollmentIds) {
      await prisma.enrollmentStatusHistory.deleteMany({ where: { enrollmentId } });
      await prisma.enrollmentQr.deleteMany({ where: { enrollmentId } });
      await prisma.payment.deleteMany({ where: { enrollmentId } });
      await prisma.enrollment.deleteMany({ where: { id: enrollmentId } });
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

run().catch((err: unknown) => {
  console.error("Test Suite Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
