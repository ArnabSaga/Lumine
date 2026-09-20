import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const connectionString = process.env.DATABASE_URL;
const demoStaffPassword = process.env.DEMO_STAFF_PASSWORD;

if (!connectionString) {
  throw new Error("DATABASE_URL is required in .env.local.");
}

if (!demoStaffPassword) {
  console.error("DEMO_STAFF_PASSWORD is required in .env.local. Stopping test cleanly.");
  process.exit(2);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function extractCookies(res: Response): string {
  const headersWithGetter = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headersWithGetter.getSetCookie === "function") {
    const cookies = headersWithGetter.getSetCookie();
    if (cookies.length > 0) {
      return cookies.map((cookie) => cookie.split(";")[0].trim()).join("; ");
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

async function signUpStudent(email: string, password: string, name: string): Promise<{ cookie: string; userId: string }> {
  const res = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE_URL },
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) {
    throw new Error(`Student signup failed: ${res.status} ${await res.text()}`);
  }
  const cookie = extractCookies(res);
  const user = await prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
  return { cookie, userId: user.id };
}

function expectStatus(label: string, res: Response, expected: number) {
  if (res.status !== expected) {
    throw new Error(`Expected ${expected} for ${label}, got ${res.status}.`);
  }
}

function assertNoLeak(label: string, payload: unknown, forbidden: string[]) {
  const text = JSON.stringify(payload);
  for (const field of forbidden) {
    if (text.includes(field)) {
      throw new Error(`Privacy failure in ${label}: payload contains ${field}.`);
    }
  }
}

type ProgressPayload = {
  enrollmentId: string;
  completedModules: number;
  totalModules: number;
  percentage: number;
  isComplete: boolean;
  modules: Array<{
    id: string;
    title: string;
    order: number;
    completed: boolean;
    completedAt: string | null;
  }>;
};

async function run() {
  console.log(`=== STARTING RUN 4 HTTP SUITE AGAINST: ${BASE_URL} ===\n`);

  const runId = `run4-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const staffPassword = demoStaffPassword as string;
  const createdUserIds: string[] = [];
  const createdEnrollmentIds: string[] = [];
  const createdCourseIds: string[] = [];

  async function putProgress(cookie: string, enrollmentId: string, moduleId: string, completed: boolean) {
    return fetch(`${BASE_URL}/api/student/enrollments/${enrollmentId}/modules/${moduleId}/progress`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ completed }),
    });
  }

  try {
    const [bdmCookie, accountsCookie, teacher1Cookie, teacher2Cookie] = await Promise.all([
      signIn("bdm1@example.com", staffPassword),
      signIn("accounts@example.com", staffPassword),
      signIn("teacher1@example.com", staffPassword),
      signIn("teacher2@example.com", staffPassword),
    ]);

    const [bdm, teacher1, teacher2] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { email: "bdm1@example.com" } }),
      prisma.user.findUniqueOrThrow({ where: { email: "teacher1@example.com" } }),
      prisma.user.findUniqueOrThrow({ where: { email: "teacher2@example.com" } }),
    ]);

    const webDev = await prisma.course.findUniqueOrThrow({
      where: { slug: "web-development" },
      include: { modules: { orderBy: [{ order: "asc" }, { id: "asc" }] } },
    });
    const ielts = await prisma.course.findUniqueOrThrow({
      where: { slug: "ielts" },
      include: { modules: { orderBy: [{ order: "asc" }, { id: "asc" }], take: 1 } },
    });
    if (webDev.modules.length !== 7 || ielts.modules.length < 1) {
      throw new Error("Run 4 suite requires the 7-module Web Development course and IELTS modules.");
    }
    const ieltsModuleId = ielts.modules[0].id;

    const studentA = await signUpStudent(`${runId}-a@example.com`, `Run4-${Date.now()}-A!`, `Run4 A ${runId}`);
    const studentB = await signUpStudent(`${runId}-b@example.com`, `Run4-${Date.now()}-B!`, `Run4 B ${runId}`);
    createdUserIds.push(studentA.userId, studentB.userId);

    const profileA = await prisma.student.create({
      data: { userId: studentA.userId, phone: "01700000000", address: "Run 4 address", education: "Run 4 education" },
    });
    const profileB = await prisma.student.create({
      data: { userId: studentB.userId, phone: "01700000001", address: "Run 4 address", education: "Run 4 education" },
    });

    const now = new Date();
    const enrollmentA = await prisma.enrollment.create({
      data: {
        reference: `R4A-${runId}`,
        studentId: profileA.id,
        courseId: webDev.id,
        priceAtEnrollment: webDev.price,
        currencyAtEnrollment: webDev.currency,
        status: "APPROVED",
        assignedTeacherId: teacher1.id,
        approvedById: bdm.id,
        approvedAt: now,
      },
    });
    const enrollmentB = await prisma.enrollment.create({
      data: {
        reference: `R4B-${runId}`,
        studentId: profileB.id,
        courseId: webDev.id,
        priceAtEnrollment: webDev.price,
        currencyAtEnrollment: webDev.currency,
        status: "APPROVED",
        assignedTeacherId: teacher2.id,
        approvedById: bdm.id,
        approvedAt: now,
      },
    });
    const enrollmentPending = await prisma.enrollment.create({
      data: {
        reference: `R4P-${runId}`,
        studentId: profileA.id,
        courseId: ielts.id,
        priceAtEnrollment: ielts.price,
        currencyAtEnrollment: ielts.currency,
        status: "PENDING_PAYMENT",
      },
    });
    const spoken = await prisma.course.findUniqueOrThrow({ where: { slug: "spoken-english" } });
    const enrollmentVerified = await prisma.enrollment.create({
      data: {
        reference: `R4V-${runId}`,
        studentId: profileA.id,
        courseId: spoken.id,
        priceAtEnrollment: spoken.price,
        currencyAtEnrollment: spoken.currency,
        status: "PAYMENT_VERIFIED",
      },
    });
    createdEnrollmentIds.push(enrollmentA.id, enrollmentB.id, enrollmentPending.id, enrollmentVerified.id);

    const progressUrl = (enrollmentId: string) =>
      `${BASE_URL}/api/student/enrollments/${enrollmentId}/progress`;
    const teacherProgressUrl = (enrollmentId: string) =>
      `${BASE_URL}/api/teacher/enrollments/${enrollmentId}/progress`;

    console.log("1. Authentication guards...");
    expectStatus("unauth student GET", await fetch(progressUrl(enrollmentA.id)), 401);
    expectStatus("unauth student PUT", await putProgress("", enrollmentA.id, webDev.modules[0].id, true), 401);
    expectStatus("unauth teacher GET", await fetch(teacherProgressUrl(enrollmentA.id)), 401);
    console.log("  ✓ Unauthenticated progress access blocked with 401.\n");

    console.log("2. Role guards...");
    expectStatus(
      "teacher PUT student endpoint",
      await putProgress(teacher1Cookie, enrollmentA.id, webDev.modules[0].id, true),
      403
    );
    expectStatus(
      "BDM PUT student endpoint",
      await putProgress(bdmCookie, enrollmentA.id, webDev.modules[0].id, true),
      403
    );
    expectStatus(
      "accounts PUT student endpoint",
      await putProgress(accountsCookie, enrollmentA.id, webDev.modules[0].id, true),
      403
    );
    expectStatus(
      "student GET teacher endpoint",
      await fetch(teacherProgressUrl(enrollmentA.id), { headers: { Cookie: studentA.cookie } }),
      403
    );
    console.log("  ✓ Cross-role progress access rejected with 403.\n");

    console.log("3. Student ownership...");
    const ownRes = await fetch(progressUrl(enrollmentA.id), { headers: { Cookie: studentA.cookie } });
    expectStatus("own approved progress GET", ownRes, 200);
    const ownData = ((await ownRes.json()) as { progress: ProgressPayload }).progress;
    if (ownData.enrollmentId !== enrollmentA.id || ownData.totalModules !== 7 || ownData.completedModules !== 0) {
      throw new Error("Own progress payload has unexpected shape or counts.");
    }
    expectStatus(
      "other student GET",
      await fetch(progressUrl(enrollmentB.id), { headers: { Cookie: studentA.cookie } }),
      404
    );
    expectStatus(
      "other student PUT",
      await putProgress(studentA.cookie, enrollmentB.id, webDev.modules[0].id, true),
      404
    );
    console.log("  ✓ Ownership holds: own 200, another student's 404.\n");

    console.log("4. Approval-state gates...");
    for (const [label, id] of [
      ["pending", enrollmentPending.id],
      ["verified", enrollmentVerified.id],
    ] as const) {
      expectStatus(
        `${label} GET denied`,
        await fetch(progressUrl(id), { headers: { Cookie: studentA.cookie } }),
        403
      );
      expectStatus(
        `${label} PUT denied`,
        await putProgress(studentA.cookie, id, webDev.modules[0].id, true),
        403
      );
    }
    console.log("  ✓ Learning locked before APPROVED (403), allowed after.\n");

    console.log("5. Cross-course module rejection...");
    const crossRes = await putProgress(studentA.cookie, enrollmentA.id, ieltsModuleId, true);
    expectStatus("cross-course PUT", crossRes, 404);
    const crossRows = await prisma.enrollmentModuleProgress.count({ where: { enrollmentId: enrollmentA.id } });
    if (crossRows !== 0) {
      throw new Error("Cross-course mutation created a progress row.");
    }
    console.log("  ✓ Foreign-course module rejected with zero rows.\n");

    console.log("6. Idempotency and stable completedAt...");
    const first = await putProgress(studentA.cookie, enrollmentA.id, webDev.modules[0].id, true);
    expectStatus("first complete", first, 200);
    const firstData = (await first.json()) as { moduleId: string; completed: boolean; completedAt: string | null };
    if (firstData.moduleId !== webDev.modules[0].id || firstData.completed !== true || !firstData.completedAt) {
      throw new Error("Complete response did not return the normalized resulting state.");
    }
    const second = await putProgress(studentA.cookie, enrollmentA.id, webDev.modules[0].id, true);
    expectStatus("repeat complete", second, 200);
    const secondData = (await second.json()) as { completedAt: string | null };
    if (secondData.completedAt !== firstData.completedAt) {
      throw new Error("Repeated complete rotated completedAt.");
    }
    const dupRows = await prisma.enrollmentModuleProgress.count({
      where: { enrollmentId: enrollmentA.id, moduleId: webDev.modules[0].id },
    });
    if (dupRows !== 1) {
      throw new Error(`Expected exactly 1 progress row, found ${dupRows}.`);
    }
    console.log("  ✓ Repeat complete: one row, stable completedAt.\n");

    console.log("7. Progress calculation...");
    await putProgress(studentA.cookie, enrollmentA.id, webDev.modules[1].id, true);
    await putProgress(studentA.cookie, enrollmentA.id, webDev.modules[2].id, true);
    const calcRes = await fetch(progressUrl(enrollmentA.id), { headers: { Cookie: studentA.cookie } });
    const calc = ((await calcRes.json()) as { progress: ProgressPayload }).progress;
    if (calc.completedModules !== 3 || calc.totalModules !== 7 || calc.percentage !== 43 || calc.isComplete !== false) {
      throw new Error(`Wrong 3/7 summary: ${calc.completedModules}/${calc.totalModules} ${calc.percentage}% complete=${calc.isComplete}.`);
    }
    const renderedOrder = calc.modules.map((m) => m.order).join(",");
    const expectedOrder = webDev.modules.map((m) => m.order).join(",");
    if (renderedOrder !== expectedOrder) {
      throw new Error("Progress modules are not in deterministic order ASC.");
    }
    console.log("  ✓ 3/7 → 43%, not complete, deterministic order.\n");

    console.log("8. Concurrent complete...");
    const [cc1, cc2] = await Promise.all([
      putProgress(studentA.cookie, enrollmentA.id, webDev.modules[3].id, true),
      putProgress(studentA.cookie, enrollmentA.id, webDev.modules[3].id, true),
    ]);
    if (!cc1.ok || !cc2.ok) {
      throw new Error(`Concurrent complete failed: ${cc1.status} / ${cc2.status}.`);
    }
    const ccRows = await prisma.enrollmentModuleProgress.count({
      where: { enrollmentId: enrollmentA.id, moduleId: webDev.modules[3].id },
    });
    if (ccRows !== 1) {
      throw new Error(`Concurrent complete created ${ccRows} rows, expected 1.`);
    }
    console.log("  ✓ Concurrent complete yields exactly one row.\n");

    console.log("9. Full completion and status freeze...");
    for (const mod of webDev.modules.slice(4)) {
      const res = await putProgress(studentA.cookie, enrollmentA.id, mod.id, true);
      if (!res.ok) throw new Error(`Completing ${mod.title} failed with ${res.status}.`);
    }
    const fullRes = await fetch(progressUrl(enrollmentA.id), { headers: { Cookie: studentA.cookie } });
    const full = ((await fullRes.json()) as { progress: ProgressPayload }).progress;
    if (full.completedModules !== 7 || full.totalModules !== 7 || full.percentage !== 100 || full.isComplete !== true) {
      throw new Error("Full completion summary is wrong.");
    }
    const afterStatus = (await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollmentA.id } })).status;
    if (afterStatus !== "APPROVED") {
      throw new Error(`Course completion mutated Enrollment status to ${afterStatus}.`);
    }
    // Uncomplete idempotency (after calculation asserts, so counts stay valid above).
    const un1 = await putProgress(studentA.cookie, enrollmentA.id, webDev.modules[0].id, false);
    expectStatus("first uncomplete", un1, 200);
    const un1Data = (await un1.json()) as { completed: boolean; completedAt: string | null };
    if (un1Data.completed !== false || un1Data.completedAt !== null) {
      throw new Error("Uncomplete response has wrong shape.");
    }
    const un2 = await putProgress(studentA.cookie, enrollmentA.id, webDev.modules[0].id, false);
    expectStatus("repeat uncomplete", un2, 200);
    const remaining = await prisma.enrollmentModuleProgress.count({
      where: { enrollmentId: enrollmentA.id, moduleId: webDev.modules[0].id },
    });
    if (remaining !== 0) {
      throw new Error("Uncomplete did not delete the progress row.");
    }
    console.log("  ✓ 7/7 → 100% complete, status frozen at APPROVED, uncomplete idempotent.\n");

    console.log("10. Teacher isolation and privacy...");
    expectStatus(
      "unassigned teacher GET",
      await fetch(teacherProgressUrl(enrollmentA.id), { headers: { Cookie: teacher2Cookie } }),
      404
    );
    const teacherRes = await fetch(teacherProgressUrl(enrollmentA.id), { headers: { Cookie: teacher1Cookie } });
    expectStatus("assigned teacher GET", teacherRes, 200);
    const teacherData = (await teacherRes.json()) as {
      student: { name: string; email: string };
      course: { name: string; slug: string };
      reference: string;
      progress: ProgressPayload;
    };
    if (!teacherData.student.name || !teacherData.course.slug || teacherData.reference !== `R4A-${runId}`) {
      throw new Error("Teacher progress context is incomplete.");
    }
    assertNoLeak("teacher progress", teacherData, [
      "phone",
      "address",
      "education",
      "additionalInfo",
      "qrToken",
      "providerPaymentId",
      "password",
    ]);
    assertNoLeak("student progress", full, ["providerPaymentId", "qrToken", "account", "session", "password"]);
    console.log("  ✓ Teacher isolation holds; DTOs privacy-safe.\n");

    console.log("11. Zero-module course...");
    const emptyCourse = await prisma.course.create({
      data: { name: `R4 Empty ${runId}`, slug: `r4-empty-${runId}`, description: null, price: 0, currency: "BDT", isActive: true },
    });
    createdCourseIds.push(emptyCourse.id);
    const emptyEnrollment = await prisma.enrollment.create({
      data: {
        reference: `R4E-${runId}`,
        studentId: profileA.id,
        courseId: emptyCourse.id,
        priceAtEnrollment: 0,
        currencyAtEnrollment: "BDT",
        status: "APPROVED",
        assignedTeacherId: teacher1.id,
        approvedById: bdm.id,
        approvedAt: now,
      },
    });
    createdEnrollmentIds.push(emptyEnrollment.id);
    const emptyRes = await fetch(progressUrl(emptyEnrollment.id), { headers: { Cookie: studentA.cookie } });
    expectStatus("zero-module progress GET", emptyRes, 200);
    const empty = ((await emptyRes.json()) as { progress: ProgressPayload }).progress;
    if (empty.totalModules !== 0 || empty.percentage !== 0 || empty.isComplete !== false) {
      throw new Error("Zero-module course must report 0 / 0% / incomplete.");
    }
    const emptyPage = await fetch(`${BASE_URL}/student/courses/${emptyCourse.slug}`, {
      headers: { Cookie: studentA.cookie },
    });
    const emptyHtml = await emptyPage.text();
    if (!emptyHtml.includes("No course modules are available yet.")) {
      throw new Error("Zero-module course page missing the empty state.");
    }
    console.log("  ✓ Zero modules → 0%, incomplete, honest empty UI.\n");

    console.log("12. Progress UI rendering...");
    const coursePage = await fetch(`${BASE_URL}/student/courses/web-development`, {
      headers: { Cookie: studentA.cookie },
    });
    const courseHtml = await coursePage.text();
    if (!courseHtml.includes("of 7 complete") && !courseHtml.includes("Course Complete")) {
      throw new Error("Student course workspace missing the progress summary.");
    }
    const teacherPage = await fetch(`${BASE_URL}/api/teacher/enrollments/${enrollmentA.id}`, {
      headers: { Cookie: teacher1Cookie },
    });
    if (!teacherPage.ok) throw new Error("Teacher detail API failed during UI checks.");
    const teacherDetailPage = await fetch(`${BASE_URL}/teacher/enrollments/${enrollmentA.id}`, {
      headers: { Cookie: teacher1Cookie },
    });
    const teacherDetailHtml = await teacherDetailPage.text();
    if (!teacherDetailHtml.includes("Learning Progress")) {
      throw new Error("Teacher detail page missing read-only progress.");
    }
    if (teacherDetailHtml.includes("Mark Complete")) {
      throw new Error("Teacher view must not offer mutation controls.");
    }
    const foreignTeacherPage = await fetch(`${BASE_URL}/teacher/enrollments/${enrollmentA.id}`, {
      headers: { Cookie: teacher2Cookie },
    });
    if (foreignTeacherPage.status !== 404) {
      throw new Error(`Unassigned teacher page returned ${foreignTeacherPage.status}, expected 404.`);
    }
    console.log("  ✓ Student/teacher progress UI renders read-only correctly.\n");

    console.log("====================================================");
    console.log("ALL RUN 4 LEARNING PROGRESS TESTS PASSED");
    console.log("====================================================");
  } finally {
    await prisma.enrollmentModuleProgress.deleteMany({
      where: { enrollmentId: { in: createdEnrollmentIds } },
    });
    await prisma.enrollmentStatusHistory.deleteMany({ where: { enrollmentId: { in: createdEnrollmentIds } } });
    await prisma.enrollmentQr.deleteMany({ where: { enrollmentId: { in: createdEnrollmentIds } } });
    await prisma.payment.deleteMany({ where: { enrollmentId: { in: createdEnrollmentIds } } });
    await prisma.enrollment.deleteMany({ where: { id: { in: createdEnrollmentIds } } });
    await prisma.course.deleteMany({ where: { id: { in: createdCourseIds } } });
    await prisma.student.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.account.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.session.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  }
}

run().catch((error: unknown) => {
  console.error("Run 4 Test Suite Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
