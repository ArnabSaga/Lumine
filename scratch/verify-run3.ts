import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const connectionString = process.env.DATABASE_URL;
const staffPassword = process.env.DEMO_STAFF_PASSWORD;

if (!connectionString) throw new Error("DATABASE_URL is required in .env.local.");
if (!staffPassword) throw new Error("DEMO_STAFF_PASSWORD is required in .env.local.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

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
  if (!res.ok) throw new Error(`Signup failed: ${res.status} ${await res.text()}`);
  return extractCookies(res);
}

function expectStatus(label: string, res: Response, expected: number) {
  if (res.status !== expected) throw new Error(`${label}: expected ${expected}, got ${res.status}.`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertNoLeak(label: string, payload: unknown) {
  const text = JSON.stringify(payload);
  for (const field of ["phone", "address", "education", "additionalInfo", "token", "providerPaymentId", "password"]) {
    if (text.includes(field)) throw new Error(`${label} leaked ${field}.`);
  }
}

async function createAdmissionFixture(runId: string, bdmCookie: string) {
  const qrRes = await fetch(`${BASE_URL}/api/bdm/registration-qrs`, { method: "POST", headers: { Cookie: bdmCookie } });
  expectStatus("BDM QR creation", qrRes, 201);
  const qr = (await qrRes.json()) as { qr: { token: string } };

  const email = `${runId}@run3.test`;
  const password = `Run3Pass-${runId}!`;
  expectStatus(
    "preflight",
    await fetch(`${BASE_URL}/api/admissions/register/preflight`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: qr.qr.token, email }),
    }),
    200
  );
  const studentCookie = await signUpStudent(email, password, `Run3 Student ${runId}`);
  const completeRes = await fetch(`${BASE_URL}/api/admissions/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({
      token: qr.qr.token,
      phone: "01722222222",
      address: "Run 3 address",
      education: "Bachelor",
      additionalInfo: "Run 3 fixture",
    }),
  });
  expectStatus("complete registration", completeRes, 201);
  const complete = (await completeRes.json()) as { admissionId: string };
  return { admissionId: complete.admissionId, email, studentCookie };
}

async function run() {
  console.log(`=== STARTING RUN 3 ADMISSION REGRESSION AGAINST ${BASE_URL} ===`);
  const runId = `run3-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const demoPassword = staffPassword as string;
  const [bdmCookie, accountsCookie, teacherCookie] = await Promise.all([
    signIn("bdm1@example.com", demoPassword),
    signIn("accounts@example.com", demoPassword),
    signIn("teacher1@example.com", demoPassword),
  ]);
  const [course, teacher] = await Promise.all([
    prisma.course.findFirstOrThrow({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "teacher1@example.com" } }),
  ]);

  const fixture = await createAdmissionFixture(runId, bdmCookie);

  expectStatus(
    "invalid BDM status query",
    await fetch(`${BASE_URL}/api/bdm/admissions?status=INVALID`, { headers: { Cookie: bdmCookie } }),
    400
  );
  expectStatus(
    "invalid BDM page query",
    await fetch(`${BASE_URL}/api/bdm/admissions?page=-4`, { headers: { Cookie: bdmCookie } }),
    400
  );

  const unknownSearch = await fetch(`${BASE_URL}/api/bdm/admissions?q=${runId}-missing`, { headers: { Cookie: bdmCookie } });
  expectStatus("unknown search", unknownSearch, 200);
  const unknownPayload = (await unknownSearch.json()) as { total: number; items: unknown[] };
  assert(unknownPayload.total === 0 && unknownPayload.items.length === 0, "Unknown search should return empty result.");

  const submitRes = await fetch(`${BASE_URL}/api/bdm/admissions/${fixture.admissionId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: bdmCookie },
    body: JSON.stringify({
      courseId: course.id,
      admissionAmount: "12000",
      paidAmount: "12000",
      classStartingDate: "2026-10-02",
      assignedTeacherId: teacher.id,
    }),
  });
  expectStatus("BDM submit", submitRes, 200);

  const bdmList = await fetch(`${BASE_URL}/api/bdm/admissions?q=${encodeURIComponent(fixture.email)}&status=PENDING_ACCOUNTS_APPROVAL`, {
    headers: { Cookie: bdmCookie },
  });
  expectStatus("BDM filtered list", bdmList, 200);
  const bdmPayload = (await bdmList.json()) as { items: Array<{ id: string; student: { email: string }; status: string }> };
  assert(bdmPayload.items.some((item) => item.id === fixture.admissionId), "BDM filtered list did not include fixture Admission.");

  const accountsList = await fetch(`${BASE_URL}/api/accounts/admissions?q=${encodeURIComponent(fixture.email)}`, {
    headers: { Cookie: accountsCookie },
  });
  expectStatus("Accounts filtered list", accountsList, 200);
  const accountsPayload = await accountsList.json();
  assertNoLeak("Accounts filtered list", accountsPayload);

  const approveRes = await fetch(`${BASE_URL}/api/accounts/admissions/${fixture.admissionId}/approve`, {
    method: "POST",
    headers: { Cookie: accountsCookie },
  });
  expectStatus("Accounts approval", approveRes, 200);

  const finalAdmission = await prisma.admission.findUniqueOrThrow({
    where: { id: fixture.admissionId },
    include: { statusHistory: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
  });
  assert(
    finalAdmission.statusHistory.map((item) => item.toStatus).join(" > ") ===
      "REGISTERED > PENDING_ACCOUNTS_APPROVAL > ACCOUNTS_APPROVED > ASSIGNED_TO_TEACHER",
    "Admission history order is wrong."
  );

  const teacherList = await fetch(`${BASE_URL}/api/teacher/enrollments?q=${encodeURIComponent(fixture.email)}`, {
    headers: { Cookie: teacherCookie },
  });
  expectStatus("Teacher search", teacherList, 200);
  const teacherPayload = JSON.stringify(await teacherList.json());
  assert(teacherPayload.includes(fixture.email), "Teacher search did not include approved assigned student.");

  console.log("Run 3 Admission regression passed.");
}

run()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
