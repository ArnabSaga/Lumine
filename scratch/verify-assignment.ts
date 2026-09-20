import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const connectionString = process.env.DATABASE_URL;
const staffPassword = process.env.DEMO_STAFF_PASSWORD;

if (!connectionString) throw new Error("DATABASE_URL is required in .env.local.");
if (!staffPassword) throw new Error("DEMO_STAFF_PASSWORD is required in .env.local.");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function extractCookies(res: Response): string {
  const headersWithGetter = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headersWithGetter.getSetCookie === "function") {
    return headersWithGetter.getSetCookie().map((cookie) => cookie.split(";")[0].trim()).join("; ");
  }
  return (res.headers.get("set-cookie") || "").split(";")[0].trim();
}

async function signIn(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE_URL },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`);
  return extractCookies(res);
}

async function signUpStudent(email: string, password: string, name: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE_URL },
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) throw new Error(`Student signup failed for ${email}: ${res.status} ${await res.text()}`);
  return extractCookies(res);
}

function expectStatus(label: string, res: Response, expected: number) {
  if (res.status !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${res.status}. Body: ${res.status === 204 ? "" : "see response"}`);
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertNoLeak(label: string, payload: unknown) {
  const text = JSON.stringify(payload);
  for (const field of [
    "phone",
    "address",
    "education",
    "additionalInfo",
    "token",
    "providerPaymentId",
    "password",
    "session",
    "account",
  ]) {
    if (text.includes(field)) {
      throw new Error(`${label} leaked ${field}.`);
    }
  }
}

async function createBdmQr(cookie: string): Promise<{ token: string; id: string }> {
  const res = await fetch(`${BASE_URL}/api/bdm/registration-qrs`, {
    method: "POST",
    headers: { Cookie: cookie },
  });
  expectStatus("BDM QR creation", res, 201);
  const data = (await res.json()) as { qr: { token: string; id: string } };
  return data.qr;
}

async function completeQrRegistration(params: {
  token: string;
  email: string;
  name: string;
  password: string;
}) {
  const preflight = await fetch(`${BASE_URL}/api/admissions/register/preflight`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: params.token, email: params.email }),
  });
  expectStatus("registration preflight", preflight, 200);

  const cookie = await signUpStudent(params.email, params.password, params.name);
  const finish = await fetch(`${BASE_URL}/api/admissions/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      token: params.token,
      phone: "01700000000",
      address: "Assignment verification address",
      education: "Bachelor",
      additionalInfo: "Verification student",
    }),
  });
  expectStatus("complete QR registration", finish, 201);
  const payload = (await finish.json()) as { admissionId: string; reference: string };
  return { cookie, admissionId: payload.admissionId, reference: payload.reference };
}

async function run() {
  console.log(`=== STARTING ASSIGNMENT ACCEPTANCE SUITE AGAINST ${BASE_URL} ===`);
  const runId = `assign-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = `StudentPass-${runId}!`;
  const demoPassword = staffPassword as string;

  const [bdm1Cookie, bdm2Cookie, accountsCookie, teacher1Cookie, teacher2Cookie] = await Promise.all([
    signIn("bdm1@example.com", demoPassword),
    signIn("bdm2@example.com", demoPassword),
    signIn("accounts@example.com", demoPassword),
    signIn("teacher1@example.com", demoPassword),
    signIn("teacher2@example.com", demoPassword),
  ]);

  const [course, teacher1, teacher2] = await Promise.all([
    prisma.course.findFirstOrThrow({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "teacher1@example.com" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "teacher2@example.com" } }),
  ]);

  expectStatus("unauthenticated QR creation", await fetch(`${BASE_URL}/api/bdm/registration-qrs`, { method: "POST" }), 401);
  expectStatus("Accounts QR creation", await fetch(`${BASE_URL}/api/bdm/registration-qrs`, { method: "POST", headers: { Cookie: accountsCookie } }), 403);
  expectStatus("Teacher QR creation", await fetch(`${BASE_URL}/api/bdm/registration-qrs`, { method: "POST", headers: { Cookie: teacher1Cookie } }), 403);

  const qr = await createBdmQr(bdm1Cookie);
  const registered = await completeQrRegistration({
    token: qr.token,
    email: `${runId}@student.test`,
    name: `Assignment Student ${runId}`,
    password,
  });

  const admission = await prisma.admission.findUniqueOrThrow({
    where: { id: registered.admissionId },
    include: { registrationQr: true, statusHistory: true },
  });
  const bdm1 = await prisma.user.findUniqueOrThrow({ where: { email: "bdm1@example.com" } });
  assert(admission.bdmUserId === bdm1.id, "Admission is not owned by BDM One.");
  assert(admission.status === "REGISTERED", "New Admission must start as REGISTERED.");
  assert(admission.registrationQr.usedAt, "Registration QR was not consumed.");
  assert(admission.statusHistory.map((item) => item.toStatus).join(" > ") === "REGISTERED", "REGISTERED history missing.");

  const existingStudentQr = await createBdmQr(bdm1Cookie);
  const existingStudentRes = await fetch(`${BASE_URL}/api/admissions/register/preflight`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: existingStudentQr.token, email: `${runId}@student.test` }),
  });
  expectStatus("existing student email rejected", existingStudentRes, 409);
  const stillUnused = await prisma.studentRegistrationQr.findUniqueOrThrow({ where: { token: existingStudentQr.token } });
  assert(!stillUnused.usedAt, "Existing email rejection consumed the QR.");

  const staffEmailQr = await createBdmQr(bdm1Cookie);
  const staffEmailRes = await fetch(`${BASE_URL}/api/admissions/register/preflight`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: staffEmailQr.token, email: "accounts@example.com" }),
  });
  expectStatus("staff email rejected", staffEmailRes, 409);
  const staffQrStillUnused = await prisma.studentRegistrationQr.findUniqueOrThrow({ where: { token: staffEmailQr.token } });
  assert(!staffQrStillUnused.usedAt, "Staff email rejection consumed the QR.");

  const concurrentQr = await createBdmQr(bdm1Cookie);
  const [concurrentCookieA, concurrentCookieB] = await Promise.all([
    signUpStudent(`${runId}-race-a@student.test`, password, "Race Student A"),
    signUpStudent(`${runId}-race-b@student.test`, password, "Race Student B"),
  ]);
  const finishBody = {
    token: concurrentQr.token,
    phone: "01711111111",
    address: "Race address",
    education: "Bachelor",
    additionalInfo: "Race",
  };
  const [raceA, raceB] = await Promise.all([
    fetch(`${BASE_URL}/api/admissions/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: concurrentCookieA },
      body: JSON.stringify(finishBody),
    }),
    fetch(`${BASE_URL}/api/admissions/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: concurrentCookieB },
      body: JSON.stringify(finishBody),
    }),
  ]);
  assert([raceA.status, raceB.status].filter((status) => status === 201).length === 1, "QR race must have exactly one winner.");
  const raceAdmissionCount = await prisma.admission.count({ where: { registrationQr: { token: concurrentQr.token } } });
  assert(raceAdmissionCount === 1, "QR race created more than one Admission.");

  expectStatus(
    "BDM Two cannot read BDM One Admission",
    await fetch(`${BASE_URL}/api/bdm/admissions/${registered.admissionId}`, { headers: { Cookie: bdm2Cookie } }),
    404
  );
  expectStatus(
    "BDM One reads own Admission",
    await fetch(`${BASE_URL}/api/bdm/admissions/${registered.admissionId}`, { headers: { Cookie: bdm1Cookie } }),
    200
  );

  const invalidSubmit = await fetch(`${BASE_URL}/api/bdm/admissions/${registered.admissionId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: bdm1Cookie },
    body: JSON.stringify({}),
  });
  expectStatus("BDM submit missing fields", invalidSubmit, 400);

  const validSubmit = await fetch(`${BASE_URL}/api/bdm/admissions/${registered.admissionId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: bdm1Cookie },
    body: JSON.stringify({
      courseId: course.id,
      admissionAmount: "15000",
      paidAmount: "15000",
      classStartingDate: "2026-10-01",
      assignedTeacherId: teacher1.id,
    }),
  });
  expectStatus("valid BDM submit", validSubmit, 200);

  const student = await prisma.user.findUniqueOrThrow({
    where: { email: `${runId}@student.test` },
    select: { student: { select: { id: true } } },
  });
  assert(student.student, "Student profile missing after QR registration.");
  const enrollmentBeforeApproval = await prisma.enrollment.count({
    where: { studentId: student.student.id, courseId: course.id },
  });
  assert(enrollmentBeforeApproval === 0, "Enrollment exists before Accounts approval.");

  const submittedAdmission = await prisma.admission.findUniqueOrThrow({ where: { id: registered.admissionId } });
  assert(submittedAdmission.status === "PENDING_ACCOUNTS_APPROVAL", "Admission did not reach pending approval.");
  assert(submittedAdmission.enrollmentId === null, "Enrollment linked before Accounts approval.");

  const pendingQueue = (await (
    await fetch(`${BASE_URL}/api/accounts/admissions`, { headers: { Cookie: accountsCookie } })
  ).json()) as { total: number; items: Array<{ reference: string }> };
  assert(
    pendingQueue.items.some((item) => item.reference === registered.reference),
    "Pending admission missing from Accounts queue."
  );
  const accountsPreview = await (
    await fetch(`${BASE_URL}/accounts/dashboard`, { headers: { Cookie: accountsCookie } })
  ).text();
  assert(accountsPreview.includes(registered.reference), "Pending admission missing from Accounts dashboard preview.");
  const teacherDashboardBefore = await (
    await fetch(`${BASE_URL}/teacher/dashboard`, { headers: { Cookie: teacher1Cookie } })
  ).text();
  assert(
    !teacherDashboardBefore.includes(`${runId}@student.test`),
    "Teacher dashboard shows student before Accounts approval."
  );

  const accountsList = await fetch(`${BASE_URL}/api/accounts/admissions`, { headers: { Cookie: accountsCookie } });
  expectStatus("Accounts queue", accountsList, 200);
  assertNoLeak("Accounts queue", await accountsList.json());

  expectStatus(
    "BDM cannot approve Admission",
    await fetch(`${BASE_URL}/api/accounts/admissions/${registered.admissionId}/approve`, { method: "POST", headers: { Cookie: bdm1Cookie } }),
    403
  );
  expectStatus(
    "Teacher cannot approve Admission",
    await fetch(`${BASE_URL}/api/accounts/admissions/${registered.admissionId}/approve`, { method: "POST", headers: { Cookie: teacher1Cookie } }),
    403
  );

  const teacherBefore = await fetch(`${BASE_URL}/api/teacher/enrollments`, { headers: { Cookie: teacher1Cookie } });
  expectStatus("Teacher list before approval", teacherBefore, 200);
  const teacherBeforePayload = (await teacherBefore.json()) as { enrollments: Array<{ studentEmail: string }> };
  assert(!JSON.stringify(teacherBeforePayload).includes(`${runId}@student.test`), "Teacher saw student before Accounts approval.");

  const [approveA, approveB] = await Promise.all([
    fetch(`${BASE_URL}/api/accounts/admissions/${registered.admissionId}/approve`, { method: "POST", headers: { Cookie: accountsCookie } }),
    fetch(`${BASE_URL}/api/accounts/admissions/${registered.admissionId}/approve`, { method: "POST", headers: { Cookie: accountsCookie } }),
  ]);
  assert([approveA.status, approveB.status].filter((status) => status === 200).length === 1, "Concurrent approval must have one winner.");

  const finalAdmission = await prisma.admission.findUniqueOrThrow({
    where: { id: registered.admissionId },
    include: { statusHistory: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
  });
  assert(finalAdmission.enrollmentId, "Accounts approval did not link an Enrollment.");
  const enrollmentCount = await prisma.enrollment.count({ where: { id: finalAdmission.enrollmentId } });
  const manualPaymentCount = await prisma.payment.count({
    where: { enrollmentId: finalAdmission.enrollmentId, provider: "MANUAL_ADMISSION", status: "SUCCEEDED" },
  });
  assert(enrollmentCount === 1, "Expected exactly one approved Enrollment.");
  assert(manualPaymentCount === 1, "Expected exactly one manual succeeded Payment.");
  assert(
    finalAdmission.statusHistory.map((item) => item.toStatus).join(" > ") ===
      "REGISTERED > PENDING_ACCOUNTS_APPROVAL > ACCOUNTS_APPROVED > ASSIGNED_TO_TEACHER",
    "Admission history order is not deterministic."
  );

  expectStatus(
    "Assigned Teacher sees enrollment",
    await fetch(`${BASE_URL}/api/teacher/enrollments/${finalAdmission.enrollmentId}`, { headers: { Cookie: teacher1Cookie } }),
    200
  );
  expectStatus(
    "Other Teacher cannot see enrollment",
    await fetch(`${BASE_URL}/api/teacher/enrollments/${finalAdmission.enrollmentId}`, { headers: { Cookie: teacher2Cookie } }),
    404
  );
  const approvedAdmission = await prisma.admission.findUniqueOrThrow({ where: { id: registered.admissionId } });
  assert(approvedAdmission.status === "ASSIGNED_TO_TEACHER", "Admission did not reach assigned state.");
  const approvedEnrollment = await prisma.enrollment.findUniqueOrThrow({
    where: { id: finalAdmission.enrollmentId },
  });
  assert(approvedEnrollment.status === "APPROVED", "Enrollment is not approved.");
  assert(approvedEnrollment.assignedTeacherId === teacher1.id, "Enrollment assigned to the wrong teacher.");
  const postQueue = (await (
    await fetch(`${BASE_URL}/api/accounts/admissions`, { headers: { Cookie: accountsCookie } })
  ).json()) as { items: Array<{ reference: string }> };
  assert(
    !postQueue.items.some((item) => item.reference === registered.reference),
    "Approved admission still present in Accounts pending queue."
  );
  const postPreview = await (
    await fetch(`${BASE_URL}/accounts/dashboard`, { headers: { Cookie: accountsCookie } })
  ).text();
  assert(!postPreview.includes(registered.reference), "Approved admission still present in dashboard preview.");
  const teacherDashboardAfter = await (
    await fetch(`${BASE_URL}/teacher/dashboard`, { headers: { Cookie: teacher1Cookie } })
  ).text();
  assert(teacherDashboardAfter.includes(`${runId}@student.test`), "Assigned teacher dashboard missing student.");
  const teacher2DashboardAfter = await (
    await fetch(`${BASE_URL}/teacher/dashboard`, { headers: { Cookie: teacher2Cookie } })
  ).text();
  assert(!teacher2DashboardAfter.includes(`${runId}@student.test`), "Other teacher dashboard shows student.");
  expectStatus(
    "Student sees approved course progress",
    await fetch(`${BASE_URL}/api/student/enrollments/${finalAdmission.enrollmentId}/progress`, { headers: { Cookie: registered.cookie } }),
    200
  );

  expectStatus(
    "Student self Enrollment disabled",
    await fetch(`${BASE_URL}/api/student/enrollments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: registered.cookie },
      body: JSON.stringify({ courseId: course.id }),
    }),
    410
  );
  expectStatus(
    "Student checkout disabled",
    await fetch(`${BASE_URL}/api/student/enrollments/${finalAdmission.enrollmentId}/checkout`, {
      method: "POST",
      headers: { Cookie: registered.cookie },
    }),
    410
  );
  expectStatus(
    "Legacy BDM global staff list blocked",
    await fetch(`${BASE_URL}/api/staff/enrollments`, { headers: { Cookie: bdm1Cookie } }),
    403
  );
  expectStatus(
    "Legacy approval disabled",
    await fetch(`${BASE_URL}/api/staff/enrollments/${finalAdmission.enrollmentId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: accountsCookie },
      body: JSON.stringify({ assignedTeacherId: teacher2.id, qrToken: "not-used" }),
    }),
    410
  );

  // --- Registration QR UX closure (single-use lifecycle + owner isolation) ---
  const uxQr = await createBdmQr(bdm1Cookie);

  const qrListRes = await fetch(`${BASE_URL}/api/bdm/registration-qrs`, { headers: { Cookie: bdm1Cookie } });
  expectStatus("BDM QR list", qrListRes, 200);
  const qrList = (await qrListRes.json()) as { qrs: Array<{ id: string; token: string }> };
  const listedUx = qrList.qrs.find((item) => item.id === uxQr.id);
  assert(listedUx?.token === uxQr.token, "Owner QR list must carry the copy/download token.");
  expectStatus("copy/download URL resolves", await fetch(`${BASE_URL}/register/${encodeURIComponent(uxQr.token)}`), 200);

  expectStatus(
    "BDM2 revoke foreign QR",
    await fetch(`${BASE_URL}/api/bdm/registration-qrs/${uxQr.id}/revoke`, { method: "POST", headers: { Cookie: bdm2Cookie } }),
    404
  );
  expectStatus(
    "revoke own ACTIVE QR",
    await fetch(`${BASE_URL}/api/bdm/registration-qrs/${uxQr.id}/revoke`, { method: "POST", headers: { Cookie: bdm1Cookie } }),
    200
  );

  const revokedPreflight = await fetch(`${BASE_URL}/api/admissions/register/preflight`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: uxQr.token, email: `revoked-${runId}@student.test` }),
  });
  expectStatus("revoked QR preflight rejected", revokedPreflight, 409);
  const revokedPage = await fetch(`${BASE_URL}/register/${encodeURIComponent(uxQr.token)}`);
  expectStatus("revoked register page", revokedPage, 200);
  assert((await revokedPage.text()).includes("no longer active"), "Revoked QR page must say the link is no longer active.");

  expectStatus(
    "revoke REGISTERED QR",
    await fetch(`${BASE_URL}/api/bdm/registration-qrs/${qr.id}/revoke`, { method: "POST", headers: { Cookie: bdm1Cookie } }),
    409
  );

  const secondCookie = await signUpStudent(`second-${runId}@student.test`, password, `Second ${runId}`);
  const secondAttempt = await fetch(`${BASE_URL}/api/admissions/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: secondCookie },
    body: JSON.stringify({ token: qr.token, phone: "01700000000", address: "Second address", education: "Bachelor" }),
  });
  expectStatus("used QR second admission rejected", secondAttempt, 409);

  const usedPage = await fetch(`${BASE_URL}/register/${encodeURIComponent(qr.token)}`);
  expectStatus("used register page", usedPage, 200);
  assert((await usedPage.text()).includes("already been used"), "Used QR page must say the link was already used.");
  expectStatus("invalid register page", await fetch(`${BASE_URL}/register/definitely-not-a-real-token`), 404);

  const accountsQueue = await (
    await fetch(`${BASE_URL}/api/accounts/admissions`, { headers: { Cookie: accountsCookie } })
  ).json();
  assert(!JSON.stringify(accountsQueue).includes(uxQr.token), "Accounts DTO leaked a raw registration token.");
  const teacherRoster = await (
    await fetch(`${BASE_URL}/api/teacher/enrollments`, { headers: { Cookie: teacher1Cookie } })
  ).json();
  assert(!JSON.stringify(teacherRoster).includes(uxQr.token), "Teacher DTO leaked a raw registration token.");

  // Cleanup spare QR (revoked, no admission attached).
  await prisma.studentRegistrationQr.deleteMany({ where: { id: uxQr.id, admission: null } });

  // --- BDM dashboard UX closure (queue visibility + Complete action) ---
  const queueBefore = (await (
    await fetch(`${BASE_URL}/api/accounts/admissions`, { headers: { Cookie: accountsCookie } })
  ).json()) as { total: number };

  const actionQr = await createBdmQr(bdm1Cookie);
  const actionRegistered = await completeQrRegistration({
    token: actionQr.token,
    email: `ux-${runId}@student.test`,
    name: `Ux Student ${runId}`,
    password,
  });

  const queuePage = await fetch(`${BASE_URL}/bdm/admissions?status=REGISTERED`, {
    headers: { Cookie: bdm1Cookie },
  });
  expectStatus("BDM REGISTERED queue page", queuePage, 200);
  const queueHtml = await queuePage.text();
  const uxAdmission = await prisma.admission.findUniqueOrThrow({ where: { id: actionRegistered.admissionId } });
  assert(queueHtml.includes(uxAdmission.reference), "REGISTERED admission missing from BDM queue page.");
  assert(queueHtml.includes("Complete Admission"), "Complete Admission action missing from BDM queue.");
  assert(
    queueHtml.includes(`/bdm/admissions/${actionRegistered.admissionId}`),
    "Complete Admission link must route to the admission detail."
  );

  expectStatus(
    "BDM2 opening BDM1 admission detail",
    await fetch(`${BASE_URL}/bdm/admissions/${actionRegistered.admissionId}`, { headers: { Cookie: bdm2Cookie } }),
    404
  );

  const queueAfter = (await (
    await fetch(`${BASE_URL}/api/accounts/admissions`, { headers: { Cookie: accountsCookie } })
  ).json()) as { total: number; items: Array<{ reference: string }> };
  assert(queueAfter.total === queueBefore.total + 1, "Accounts queue count did not grow by one pending admission.");
  assert(
    queueAfter.items.some((item) => item.reference === uxAdmission.reference),
    "Fresh REGISTERED admission missing from Accounts queue."
  );

  console.log("Assignment acceptance suite passed.");
}

run()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
