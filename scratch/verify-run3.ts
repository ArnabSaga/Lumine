import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import {
  EnrollmentStatus,
  PaymentStatus,
  PrismaClient,
  UserRole,
} from "../generated/prisma/client";

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

type StaffListResponse = {
  items: Array<{
    id: string;
    reference: string;
    status: EnrollmentStatus;
    student: { name: string; email: string };
    course: { id: string; name: string; slug: string };
    payment: { status: PaymentStatus; amount: string; currency: string; verifiedAt: string | null } | null;
    teacher: { id: string; name: string } | null;
    createdAt: string;
  }>;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type StaffDetailResponse = {
  enrollment: {
    id: string;
    reference: string;
    status: EnrollmentStatus;
    history: Array<{ toStatus: EnrollmentStatus; createdAt: string; actorName: string }>;
    payment: { status: PaymentStatus; amount: string; currency: string; verifiedAt: string | null } | null;
  };
};

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

function assertNoSensitiveFields(label: string, payload: unknown) {
  const text = JSON.stringify(payload);
  const forbidden = [
    "address",
    "phone",
    "education",
    "additionalInfo",
    "qrToken",
    "providerPaymentId",
    "session",
    "account",
    "password",
    "token",
  ];

  for (const field of forbidden) {
    if (text.includes(field)) {
      throw new Error(`Privacy failure in ${label}: serialized payload contains ${field}.`);
    }
  }
}

function expectOnlyStatus(data: StaffListResponse, status: EnrollmentStatus) {
  if (data.items.some((item) => item.status !== status)) {
    throw new Error(`Expected only ${status} results.`);
  }
}

async function fetchStaffList(cookie: string, params: URLSearchParams = new URLSearchParams()) {
  const query = params.toString();
  const res = await fetch(`${BASE_URL}/api/staff/enrollments${query ? `?${query}` : ""}`, {
    headers: { Cookie: cookie },
  });
  return res;
}

async function run() {
  console.log(`=== STARTING RUN 3 HTTP SUITE AGAINST: ${BASE_URL} ===\n`);

  const runId = `run3-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const staffPassword = demoStaffPassword as string;
  const studentPassword = `Run3-${Date.now()}-Pass!`;
  const createdUserIds: string[] = [];
  const createdStudentIds: string[] = [];
  const createdEnrollmentIds: string[] = [];

  try {
    const [bdmCookie, accountsCookie, teacher1Cookie] = await Promise.all([
      signIn("bdm1@example.com", staffPassword),
      signIn("accounts@example.com", staffPassword),
      signIn("teacher1@example.com", staffPassword),
    ]);

    const [bdm, teacher1, teacher2, courses] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { email: "bdm1@example.com" } }),
      prisma.user.findUniqueOrThrow({ where: { email: "teacher1@example.com" } }),
      prisma.user.findUniqueOrThrow({ where: { email: "teacher2@example.com" } }),
      prisma.course.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, take: 3 }),
    ]);

    if (courses.length < 3) {
      throw new Error("Run 3 suite requires at least three active seeded courses.");
    }

    const signedUpStudent = await signUpStudent(`${runId}-student@example.com`, studentPassword, `Run3 Student ${runId}`);
    createdUserIds.push(signedUpStudent.userId);

    const signedUpProfile = await prisma.student.create({
      data: {
        userId: signedUpStudent.userId,
        phone: "01700000000",
        address: "Run 3 address",
        education: "Run 3 education",
      },
    });
    createdStudentIds.push(signedUpProfile.id);

    const extraUsers = Array.from({ length: 24 }, (_, index) => ({
      id: `${runId}-user-${index}`,
      name: `Run3 Fixture ${index}`,
      email: `${runId}-fixture-${index}@example.com`,
      role: UserRole.STUDENT,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    await prisma.user.createMany({ data: extraUsers });
    createdUserIds.push(...extraUsers.map((user) => user.id));

    const extraStudents = extraUsers.map((user, index) => ({
      id: `${runId}-student-${index}`,
      userId: user.id,
      phone: "01700000000",
      address: "Run 3 address",
      education: "Run 3 education",
    }));
    await prisma.student.createMany({ data: extraStudents });
    createdStudentIds.push(...extraStudents.map((student) => student.id));

    const special = {
      pending: `${runId}-enr-pending`,
      verified: `${runId}-enr-verified`,
      approvedT1: `${runId}-enr-approved-t1`,
      approvedT2: `${runId}-enr-approved-t2`,
    };
    const fixtureStart = new Date(Date.now() - 10 * 60 * 1000);
    const at = (seconds: number) => new Date(fixtureStart.getTime() + seconds * 1000);

    const enrollments = [
      {
        id: special.pending,
        reference: `R3P-${runId}`,
        studentId: signedUpProfile.id,
        courseId: courses[0].id,
        priceAtEnrollment: courses[0].price,
        currencyAtEnrollment: courses[0].currency,
        status: EnrollmentStatus.PENDING_PAYMENT,
        createdAt: at(1),
      },
      {
        id: special.verified,
        reference: `R3V-${runId}`,
        studentId: extraStudents[0].id,
        courseId: courses[1].id,
        priceAtEnrollment: courses[1].price,
        currencyAtEnrollment: courses[1].currency,
        status: EnrollmentStatus.PAYMENT_VERIFIED,
        createdAt: at(2),
      },
      {
        id: special.approvedT1,
        reference: `R3A1-${runId}`,
        studentId: extraStudents[1].id,
        courseId: courses[2].id,
        priceAtEnrollment: courses[2].price,
        currencyAtEnrollment: courses[2].currency,
        status: EnrollmentStatus.APPROVED,
        assignedTeacherId: teacher1.id,
        approvedById: bdm.id,
        approvedAt: at(30),
        createdAt: at(3),
      },
      {
        id: special.approvedT2,
        reference: `R3A2-${runId}`,
        studentId: extraStudents[2].id,
        courseId: courses[0].id,
        priceAtEnrollment: courses[0].price,
        currencyAtEnrollment: courses[0].currency,
        status: EnrollmentStatus.APPROVED,
        assignedTeacherId: teacher2.id,
        approvedById: bdm.id,
        approvedAt: at(40),
        createdAt: at(4),
      },
      ...extraStudents.slice(3).map((student, index) => ({
        id: `${runId}-page-${index}`,
        reference: `R3PG-${runId}-${index}`,
        studentId: student.id,
        courseId: courses[index % courses.length].id,
        priceAtEnrollment: courses[index % courses.length].price,
        currencyAtEnrollment: courses[index % courses.length].currency,
        status: EnrollmentStatus.PENDING_PAYMENT,
        createdAt: at(10 + index),
      })),
    ];

    await prisma.enrollment.createMany({ data: enrollments });
    createdEnrollmentIds.push(...enrollments.map((enrollment) => enrollment.id));

    await prisma.payment.createMany({
      data: [
        {
          id: `${runId}-payment-failed`,
          enrollmentId: special.approvedT1,
          provider: "run3",
          providerPaymentId: `${runId}-failed`,
          amount: courses[2].price,
          currency: courses[2].currency,
          status: PaymentStatus.FAILED,
        },
        {
          id: `${runId}-payment-success`,
          enrollmentId: special.approvedT1,
          provider: "run3",
          providerPaymentId: `${runId}-success`,
          amount: courses[2].price,
          currency: courses[2].currency,
          status: PaymentStatus.SUCCEEDED,
          verifiedAt: at(35),
        },
        {
          id: `${runId}-payment-verified`,
          enrollmentId: special.verified,
          provider: "run3",
          providerPaymentId: `${runId}-verified`,
          amount: courses[1].price,
          currency: courses[1].currency,
          status: PaymentStatus.SUCCEEDED,
          verifiedAt: at(25),
        },
      ],
    });

    await prisma.enrollmentStatusHistory.createMany({
      data: [
        { enrollmentId: special.pending, fromStatus: null, toStatus: EnrollmentStatus.PENDING_PAYMENT, createdAt: at(1) },
        { enrollmentId: special.verified, fromStatus: null, toStatus: EnrollmentStatus.PENDING_PAYMENT, createdAt: at(2) },
        { enrollmentId: special.verified, fromStatus: EnrollmentStatus.PENDING_PAYMENT, toStatus: EnrollmentStatus.PAYMENT_VERIFIED, createdAt: at(25) },
        { enrollmentId: special.approvedT1, fromStatus: null, toStatus: EnrollmentStatus.PENDING_PAYMENT, createdAt: at(3) },
        { enrollmentId: special.approvedT1, fromStatus: EnrollmentStatus.PENDING_PAYMENT, toStatus: EnrollmentStatus.PAYMENT_VERIFIED, createdAt: at(20) },
        {
          enrollmentId: special.approvedT1,
          fromStatus: EnrollmentStatus.PAYMENT_VERIFIED,
          toStatus: EnrollmentStatus.APPROVED,
          changedById: bdm.id,
          createdAt: at(30),
        },
        { enrollmentId: special.approvedT2, fromStatus: null, toStatus: EnrollmentStatus.PENDING_PAYMENT, createdAt: at(4) },
        { enrollmentId: special.approvedT2, fromStatus: EnrollmentStatus.PENDING_PAYMENT, toStatus: EnrollmentStatus.PAYMENT_VERIFIED, createdAt: at(22) },
        {
          enrollmentId: special.approvedT2,
          fromStatus: EnrollmentStatus.PAYMENT_VERIFIED,
          toStatus: EnrollmentStatus.APPROVED,
          changedById: bdm.id,
          createdAt: at(40),
        },
        ...enrollments
          .filter((enrollment) => enrollment.id.startsWith(`${runId}-page-`))
          .map((enrollment) => ({
            enrollmentId: enrollment.id,
            fromStatus: null,
            toStatus: EnrollmentStatus.PENDING_PAYMENT,
            createdAt: enrollment.createdAt,
          })),
      ],
    });

    console.log("1. Access control...");
    expectStatus("unauthenticated staff list", await fetch(`${BASE_URL}/api/staff/enrollments`), 401);
    expectStatus(
      "student staff list",
      await fetch(`${BASE_URL}/api/staff/enrollments`, { headers: { Cookie: signedUpStudent.cookie } }),
      403
    );
    expectStatus(
      "teacher staff list",
      await fetch(`${BASE_URL}/api/staff/enrollments`, { headers: { Cookie: teacher1Cookie } }),
      403
    );
    expectStatus("BDM staff list", await fetchStaffList(bdmCookie), 200);
    expectStatus("Accounts staff list", await fetchStaffList(accountsCookie), 200);
    expectStatus(
      "missing staff detail",
      await fetch(`${BASE_URL}/api/staff/enrollments/no-such-enrollment`, { headers: { Cookie: bdmCookie } }),
      404
    );
    expectStatus(
      "student staff detail",
      await fetch(`${BASE_URL}/api/staff/enrollments/${special.approvedT1}`, { headers: { Cookie: signedUpStudent.cookie } }),
      403
    );
    expectStatus(
      "teacher staff detail",
      await fetch(`${BASE_URL}/api/staff/enrollments/${special.approvedT1}`, { headers: { Cookie: teacher1Cookie } }),
      403
    );
    console.log("  ✓ Staff access controls hold.\n");

    console.log("2. Query validation...");
    expectStatus("invalid status", await fetchStaffList(bdmCookie, new URLSearchParams({ status: "INVALID" })), 400);
    expectStatus("invalid page", await fetchStaffList(bdmCookie, new URLSearchParams({ page: "-4" })), 400);
    const emptySearch = await fetchStaffList(bdmCookie, new URLSearchParams({ q: `${runId}-does-not-exist` }));
    const emptyData = (await emptySearch.json()) as StaffListResponse;
    if (emptyData.total !== 0 || emptyData.items.length !== 0) {
      throw new Error("Unknown search should return an empty result.");
    }
    console.log("  ✓ Invalid filters fail with 400 and unknown search is empty.\n");

    console.log("3. Search and filters...");
    const searchCases = [
      ["student name", extraUsers[1].name],
      ["email", extraUsers[1].email],
      ["reference", `R3A1-${runId}`],
      ["course", courses[2].name],
    ];

    for (const [label, value] of searchCases) {
      const res = await fetchStaffList(bdmCookie, new URLSearchParams({ q: value }));
      if (!res.ok) throw new Error(`Search by ${label} failed with ${res.status}.`);
      const data = (await res.json()) as StaffListResponse;
      if (!data.items.some((item) => item.id === special.approvedT1)) {
        throw new Error(`Search by ${label} did not find expected enrollment.`);
      }
    }

    const pending = (await (await fetchStaffList(bdmCookie, new URLSearchParams({ status: "PENDING_PAYMENT", q: runId }))).json()) as StaffListResponse;
    expectOnlyStatus(pending, EnrollmentStatus.PENDING_PAYMENT);
    const verified = (await (await fetchStaffList(bdmCookie, new URLSearchParams({ status: "PAYMENT_VERIFIED", q: runId }))).json()) as StaffListResponse;
    expectOnlyStatus(verified, EnrollmentStatus.PAYMENT_VERIFIED);
    const approved = (await (await fetchStaffList(bdmCookie, new URLSearchParams({ status: "APPROVED", q: runId }))).json()) as StaffListResponse;
    expectOnlyStatus(approved, EnrollmentStatus.APPROVED);

    const combo = (await (await fetchStaffList(
      bdmCookie,
      new URLSearchParams({ q: runId, status: "APPROVED", courseId: courses[2].id })
    )).json()) as StaffListResponse;
    if (!combo.items.every((item) => item.status === "APPROVED" && item.course.id === courses[2].id)) {
      throw new Error("Combined q + status + courseId filter returned an invalid row.");
    }

    const teacherFilter = (await (await fetchStaffList(
      bdmCookie,
      new URLSearchParams({ q: runId, teacherId: teacher1.id })
    )).json()) as StaffListResponse;
    if (!teacherFilter.items.every((item) => item.teacher?.id === teacher1.id)) {
      throw new Error("Teacher filter returned another teacher's enrollment.");
    }
    console.log("  ✓ Search and filters work together.\n");

    console.log("4. Pagination and sorting...");
    const page1 = (await (await fetchStaffList(bdmCookie, new URLSearchParams({ q: runId, page: "1" }))).json()) as StaffListResponse;
    const page2 = (await (await fetchStaffList(bdmCookie, new URLSearchParams({ q: runId, page: "2" }))).json()) as StaffListResponse;
    const page1Ids = new Set(page1.items.map((item) => item.id));
    if (page2.items.some((item) => page1Ids.has(item.id))) {
      throw new Error("Pagination page 1 and page 2 duplicated records.");
    }
    const sorted = [...page1.items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    if (page1.items.map((item) => item.id).join("|") !== sorted.map((item) => item.id).join("|")) {
      throw new Error("Staff list sorting is not deterministic createdAt DESC.");
    }
    console.log("  ✓ Pagination and sorting verified.\n");

    console.log("5. Staff detail, privacy, and history...");
    const detailRes = await fetch(`${BASE_URL}/api/staff/enrollments/${special.approvedT1}`, {
      headers: { Cookie: accountsCookie },
    });
    if (!detailRes.ok) {
      throw new Error(`Staff detail failed with ${detailRes.status}.`);
    }
    const detail = (await detailRes.json()) as StaffDetailResponse;
    assertNoSensitiveFields("staff detail", detail);
    assertNoSensitiveFields("staff list", page1);
    if (detail.enrollment.payment?.status !== PaymentStatus.SUCCEEDED) {
      throw new Error("Canonical payment did not prefer the succeeded payment.");
    }
    const statuses = detail.enrollment.history.map((entry) => entry.toStatus);
    const expectedHistory = [
      EnrollmentStatus.PENDING_PAYMENT,
      EnrollmentStatus.PAYMENT_VERIFIED,
      EnrollmentStatus.APPROVED,
    ];
    if (statuses.join("|") !== expectedHistory.join("|")) {
      throw new Error(`Unexpected history order: ${statuses.join(", ")}`);
    }
    if (JSON.stringify(detail).includes("Course Access")) {
      throw new Error("Staff persisted history must not synthesize Course Access.");
    }
    console.log("  ✓ Staff detail is private and history is real.\n");

    console.log("6. Teacher search security...");
    const teacherSearch = await fetch(
      `${BASE_URL}/api/teacher/enrollments?q=${encodeURIComponent(extraUsers[2].email)}`,
      { headers: { Cookie: teacher1Cookie } }
    );
    if (!teacherSearch.ok) throw new Error(`Teacher search failed with ${teacherSearch.status}.`);
    const teacherSearchData = (await teacherSearch.json()) as { enrollments: Array<{ id: string }> };
    if (teacherSearchData.enrollments.length !== 0) {
      throw new Error("Teacher search revealed another teacher's enrollment.");
    }
    expectStatus(
      "teacher cross detail",
      await fetch(`${BASE_URL}/api/teacher/enrollments/${special.approvedT2}`, { headers: { Cookie: teacher1Cookie } }),
      404
    );
    const teacherOwnFilter = await fetch(
      `${BASE_URL}/api/teacher/enrollments?q=${encodeURIComponent(runId)}&courseId=${encodeURIComponent(courses[2].id)}`,
      { headers: { Cookie: teacher1Cookie } }
    );
    if (!teacherOwnFilter.ok) throw new Error(`Teacher own filter failed with ${teacherOwnFilter.status}.`);
    const teacherOwnData = (await teacherOwnFilter.json()) as { enrollments: Array<{ id: string }> };
    if (!teacherOwnData.enrollments.some((item) => item.id === special.approvedT1)) {
      throw new Error("Teacher own search and course filter did not find the assigned enrollment.");
    }
    console.log("  ✓ Teacher search remains ownership scoped.\n");

    console.log("7. Dashboard route smoke...");
    for (const [label, url, cookie] of [
      ["BDM dashboard", "/bdm/dashboard", bdmCookie],
      ["Accounts dashboard", "/accounts/dashboard", accountsCookie],
      ["Teacher dashboard", "/teacher/dashboard", teacher1Cookie],
    ] as const) {
      const res = await fetch(`${BASE_URL}${url}`, { headers: { Cookie: cookie } });
      if (!res.ok) throw new Error(`${label} failed with ${res.status}.`);
      const html = await res.text();
      if (!html.includes("Awaiting approval") && label !== "Teacher dashboard") {
        throw new Error(`${label} did not render operational metrics.`);
      }
      if (label === "Teacher dashboard" && !html.includes("Assigned students")) {
        throw new Error("Teacher dashboard did not render assigned student metrics.");
      }
    }
    console.log("  ✓ Dashboard metric surfaces load.\n");

    console.log("====================================================");
    console.log("ALL RUN 3 ENROLLMENT OPERATIONS TESTS PASSED");
    console.log("====================================================");
  } finally {
    await prisma.payment.deleteMany({ where: { enrollmentId: { in: createdEnrollmentIds } } });
    await prisma.enrollmentStatusHistory.deleteMany({ where: { enrollmentId: { in: createdEnrollmentIds } } });
    await prisma.enrollmentQr.deleteMany({ where: { enrollmentId: { in: createdEnrollmentIds } } });
    await prisma.enrollment.deleteMany({ where: { id: { in: createdEnrollmentIds } } });
    await prisma.student.deleteMany({ where: { id: { in: createdStudentIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  }
}

run().catch(async (error: unknown) => {
  console.error("Run 3 Test Suite Failed:", error);
  await prisma.$disconnect();
  process.exit(1);
});
