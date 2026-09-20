import "server-only";

import { AdmissionStatus, EnrollmentStatus, PaymentStatus, Prisma, UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/server/db";
import type {
  AdmissionQueryInput,
  CompleteAdmissionRegistrationInput,
  SubmitAdmissionInput,
} from "@/lib/shared/validations/admission";
import { createQrToken } from "@/lib/server/services/qr.service";
import { generateEnrollmentReference } from "@/lib/server/services/enrollment.service";

const PAGE_SIZE = 20;
const MAX_REFERENCE_RETRIES = 5;

type ServiceErrorStatus = 400 | 403 | 404 | 409;
type ServiceResult<T> = { ok: true; data: T } | { ok: false; status: ServiceErrorStatus; message: string };

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}

function generateAdmissionReference() {
  const chars = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let result = "ADM-";
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

async function uniqueAdmissionReference() {
  for (let i = 0; i < MAX_REFERENCE_RETRIES; i++) {
    const reference = generateAdmissionReference();
    const existing = await prisma.admission.findUnique({ where: { reference }, select: { id: true } });
    if (!existing) return reference;
  }
  throw new Error("Failed to generate unique admission reference.");
}

export function registrationUrlForToken(token: string) {
  return `${appUrl().replace(/\/$/, "")}/register/${encodeURIComponent(token)}`;
}

export async function createRegistrationQr(bdmUserId: string) {
  const qr = await prisma.studentRegistrationQr.create({
    data: {
      token: createQrToken(),
      bdmUserId,
    },
    select: {
      id: true,
      token: true,
      createdAt: true,
      usedAt: true,
      revokedAt: true,
    },
  });

  return {
    ...qr,
    url: registrationUrlForToken(qr.token),
  };
}

export async function listRegistrationQrs(bdmUserId: string) {
  const qrs = await prisma.studentRegistrationQr.findMany({
    where: { bdmUserId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 20,
    select: {
      id: true,
      token: true,
      createdAt: true,
      usedAt: true,
      revokedAt: true,
      admission: { select: { id: true, reference: true, status: true } },
    },
  });

  return qrs.map((qr) => ({
    ...qr,
    url: registrationUrlForToken(qr.token),
  }));
}

export async function getRegistrationQrForPublicToken(token: string) {
  return await prisma.studentRegistrationQr.findUnique({
    where: { token },
    select: {
      id: true,
      token: true,
      createdAt: true,
      usedAt: true,
      revokedAt: true,
      bdm: { select: { name: true } },
      admission: { select: { id: true } },
    },
  });
}

export async function preflightAdmissionRegistration(params: {
  token: string;
  email: string;
}): Promise<ServiceResult<{ ok: true }>> {
  const qr = await prisma.studentRegistrationQr.findUnique({
    where: { token: params.token },
    select: { id: true, usedAt: true, revokedAt: true, admission: { select: { id: true } } },
  });

  if (!qr || qr.revokedAt || qr.usedAt || qr.admission) {
    return { ok: false, status: 409, message: "This registration QR is no longer available." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: params.email },
    select: { id: true, role: true },
  });

  if (existingUser) {
    return {
      ok: false,
      status: 409,
      message:
        existingUser.role === UserRole.STUDENT
          ? "This student email is already registered. Please request a fresh registration link if needed."
          : "This email belongs to a staff account and cannot be used for student registration.",
    };
  }

  return { ok: true, data: { ok: true } };
}

export async function completeAdmissionRegistration(params: {
  userId: string;
  input: CompleteAdmissionRegistrationInput;
}): Promise<ServiceResult<{ admissionId: string; reference: string; status: AdmissionStatus }>> {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, role: true },
  });

  if (!user || user.role !== UserRole.STUDENT) {
    return { ok: false, status: 403, message: "Only Student accounts can complete QR registration." };
  }

  for (let attempt = 1; attempt <= MAX_REFERENCE_RETRIES; attempt++) {
    const reference = await uniqueAdmissionReference();
    try {
      return await prisma.$transaction(async (tx) => {
        const qr = await tx.studentRegistrationQr.findUnique({
          where: { token: params.input.token },
          select: {
            id: true,
            bdmUserId: true,
            usedAt: true,
            revokedAt: true,
            admission: {
              select: {
                id: true,
                reference: true,
                status: true,
                student: { select: { userId: true } },
              },
            },
          },
        });

        if (!qr || qr.revokedAt) {
          return { ok: false, status: 404, message: "Registration QR not found." };
        }

        if (qr.admission) {
          if (qr.admission.student.userId === params.userId) {
            return {
              ok: true,
              data: {
                admissionId: qr.admission.id,
                reference: qr.admission.reference,
                status: qr.admission.status,
              },
            };
          }
          return { ok: false, status: 409, message: "This registration QR has already been used." };
        }

        const consumed = await tx.studentRegistrationQr.updateMany({
          where: {
            id: qr.id,
            usedAt: null,
            revokedAt: null,
          },
          data: { usedAt: new Date() },
        });

        if (consumed.count !== 1) {
          return { ok: false, status: 409, message: "This registration QR has already been used." };
        }

        const student = await tx.student.upsert({
          where: { userId: params.userId },
          create: {
            userId: params.userId,
            phone: params.input.phone,
            address: params.input.address,
            education: params.input.education,
            additionalInfo: params.input.additionalInfo ?? null,
          },
          update: {
            phone: params.input.phone,
            address: params.input.address,
            education: params.input.education,
            additionalInfo: params.input.additionalInfo ?? null,
          },
        });

        const admission = await tx.admission.create({
          data: {
            reference,
            studentId: student.id,
            registrationQrId: qr.id,
            bdmUserId: qr.bdmUserId,
            status: AdmissionStatus.REGISTERED,
          },
          select: { id: true, reference: true, status: true },
        });

        await tx.admissionStatusHistory.create({
          data: {
            admissionId: admission.id,
            fromStatus: null,
            toStatus: AdmissionStatus.REGISTERED,
            changedById: params.userId,
          },
        });

        return {
          ok: true,
          data: {
            admissionId: admission.id,
            reference: admission.reference,
            status: admission.status,
          },
        };
      });
    } catch (err: unknown) {
      const isUniqueViolation = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (isUniqueViolation && attempt < MAX_REFERENCE_RETRIES) continue;
      throw err;
    }
  }

  throw new Error("Failed to complete admission registration.");
}

function admissionSearchWhere(
  query: AdmissionQueryInput,
  visibility: { role: "BDM"; userId: string } | { role: "ACCOUNTS" }
): Prisma.AdmissionWhereInput {
  const where: Prisma.AdmissionWhereInput =
    visibility.role === UserRole.BDM ? { bdmUserId: visibility.userId } : {};

  if (query.status) {
    where.status = query.status;
  }

  if (query.q) {
    where.OR = [
      { reference: { contains: query.q, mode: "insensitive" } },
      { student: { user: { name: { contains: query.q, mode: "insensitive" } } } },
      { student: { user: { email: { contains: query.q, mode: "insensitive" } } } },
      { course: { name: { contains: query.q, mode: "insensitive" } } },
    ];
  }

  return where;
}

export async function listAdmissions(params: {
  query: AdmissionQueryInput;
  visibility: { role: "BDM"; userId: string } | { role: "ACCOUNTS" };
}) {
  const where = admissionSearchWhere(params.query, params.visibility);
  const page = params.query.page;
  const [total, items] = await Promise.all([
    prisma.admission.count({ where }),
    prisma.admission.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        reference: true,
        status: true,
        admissionAmount: true,
        paidAmount: true,
        currency: true,
        classStartingDate: true,
        submittedAt: true,
        createdAt: true,
        student: { select: { user: { select: { name: true, email: true } } } },
        course: { select: { id: true, name: true, slug: true } },
      },
    }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      reference: item.reference,
      status: item.status,
      admissionAmount: item.admissionAmount?.toString() ?? null,
      paidAmount: item.paidAmount?.toString() ?? null,
      currency: item.currency,
      classStartingDate: item.classStartingDate ? item.classStartingDate.toISOString().slice(0, 10) : null,
      submittedAt: item.submittedAt ? item.submittedAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      student: {
        name: item.student.user.name,
        email: item.student.user.email,
      },
      course: item.course,
    })),
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / PAGE_SIZE),
  };
}

export async function getBdmAdmissionDetail(admissionId: string, bdmUserId: string) {
  return await prisma.admission.findFirst({
    where: { id: admissionId, bdmUserId },
    select: {
      id: true,
      reference: true,
      status: true,
      admissionAmount: true,
      paidAmount: true,
      currency: true,
      classStartingDate: true,
      submittedAt: true,
      createdAt: true,
      student: {
        select: {
          phone: true,
          address: true,
          education: true,
          additionalInfo: true,
          user: { select: { name: true, email: true } },
        },
      },
      course: { select: { id: true, name: true, slug: true } },
      assignedTeacher: { select: { id: true, name: true } },
      statusHistory: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, fromStatus: true, toStatus: true, createdAt: true },
      },
    },
  });
}

export async function getAccountsAdmissionDetail(admissionId: string) {
  return await prisma.admission.findUnique({
    where: { id: admissionId },
    select: {
      id: true,
      reference: true,
      status: true,
      admissionAmount: true,
      paidAmount: true,
      currency: true,
      classStartingDate: true,
      student: { select: { user: { select: { name: true, email: true } } } },
      course: { select: { id: true, name: true, slug: true } },
      statusHistory: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, fromStatus: true, toStatus: true, createdAt: true },
      },
    },
  });
}

export async function submitBdmAdmission(params: {
  admissionId: string;
  bdmUserId: string;
  input: SubmitAdmissionInput;
}): Promise<ServiceResult<{ ok: true }>> {
  const [course, teacher, admission] = await Promise.all([
    prisma.course.findUnique({ where: { id: params.input.courseId, isActive: true }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: params.input.assignedTeacherId }, select: { id: true, role: true } }),
    prisma.admission.findFirst({
      where: { id: params.admissionId, bdmUserId: params.bdmUserId },
      select: { id: true, status: true },
    }),
  ]);

  if (!admission) return { ok: false, status: 404, message: "Admission not found." };
  if (admission.status !== AdmissionStatus.REGISTERED) {
    return { ok: false, status: 409, message: "Admission has already been submitted for review." };
  }
  if (!course) return { ok: false, status: 400, message: "Course not found or inactive." };
  if (!teacher || teacher.role !== UserRole.TEACHER) {
    return { ok: false, status: 400, message: "Assigned user is not a Teacher." };
  }

  return await prisma.$transaction(async (tx) => {
    const now = new Date();
    const updated = await tx.admission.updateMany({
      where: {
        id: params.admissionId,
        bdmUserId: params.bdmUserId,
        status: AdmissionStatus.REGISTERED,
      },
      data: {
        status: AdmissionStatus.PENDING_ACCOUNTS_APPROVAL,
        courseId: params.input.courseId,
        admissionAmount: new Prisma.Decimal(params.input.admissionAmount),
        paidAmount: new Prisma.Decimal(params.input.paidAmount),
        classStartingDate: new Date(`${params.input.classStartingDate}T00:00:00.000Z`),
        assignedTeacherId: params.input.assignedTeacherId,
        submittedAt: now,
      },
    });

    if (updated.count !== 1) {
      return { ok: false, status: 409, message: "Admission has already been submitted." };
    }

    await tx.admissionStatusHistory.create({
      data: {
        admissionId: params.admissionId,
        fromStatus: AdmissionStatus.REGISTERED,
        toStatus: AdmissionStatus.PENDING_ACCOUNTS_APPROVAL,
        changedById: params.bdmUserId,
        createdAt: now,
      },
    });

    return { ok: true, data: { ok: true } };
  });
}

export async function approveAdmissionByAccounts(params: {
  admissionId: string;
  accountsUserId: string;
}): Promise<ServiceResult<{ enrollmentId: string }>> {
  return await prisma.$transaction(async (tx) => {
    const admission = await tx.admission.findUnique({
      where: { id: params.admissionId },
      select: {
        id: true,
        status: true,
        studentId: true,
        courseId: true,
        admissionAmount: true,
        paidAmount: true,
        currency: true,
        assignedTeacherId: true,
        enrollmentId: true,
      },
    });

    if (!admission) return { ok: false, status: 404, message: "Admission not found." };
    if (admission.enrollmentId) {
      return { ok: false, status: 409, message: "Admission has already been approved." };
    }
    if (
      admission.status !== AdmissionStatus.PENDING_ACCOUNTS_APPROVAL ||
      !admission.courseId ||
      !admission.assignedTeacherId ||
      !admission.admissionAmount ||
      !admission.paidAmount
    ) {
      return { ok: false, status: 409, message: "Admission is not ready for Accounts approval." };
    }

    const approvedAt = new Date();
    const transition = await tx.admission.updateMany({
      where: {
        id: admission.id,
        status: AdmissionStatus.PENDING_ACCOUNTS_APPROVAL,
        enrollmentId: null,
      },
      data: {
        status: AdmissionStatus.ACCOUNTS_APPROVED,
        accountsApprovedById: params.accountsUserId,
        accountsApprovedAt: approvedAt,
      },
    });

    if (transition.count !== 1) {
      return { ok: false, status: 409, message: "Admission was already approved." };
    }

    const enrollmentReference = await generateEnrollmentReference();
    const enrollment = await tx.enrollment.create({
      data: {
        reference: enrollmentReference,
        studentId: admission.studentId,
        courseId: admission.courseId,
        priceAtEnrollment: admission.admissionAmount,
        currencyAtEnrollment: admission.currency,
        status: EnrollmentStatus.APPROVED,
        assignedTeacherId: admission.assignedTeacherId,
        approvedById: params.accountsUserId,
        approvedAt,
      },
      select: { id: true },
    });

    await tx.payment.create({
      data: {
        enrollmentId: enrollment.id,
        provider: "MANUAL_ADMISSION",
        providerPaymentId: `manual-admission-${admission.id}`,
        amount: admission.paidAmount,
        currency: admission.currency,
        status: PaymentStatus.SUCCEEDED,
        verifiedAt: approvedAt,
      },
    });

    await tx.enrollmentStatusHistory.create({
      data: {
        enrollmentId: enrollment.id,
        fromStatus: null,
        toStatus: EnrollmentStatus.APPROVED,
        changedById: params.accountsUserId,
        createdAt: approvedAt,
      },
    });

    await tx.admissionStatusHistory.createMany({
      data: [
        {
          admissionId: admission.id,
          fromStatus: AdmissionStatus.PENDING_ACCOUNTS_APPROVAL,
          toStatus: AdmissionStatus.ACCOUNTS_APPROVED,
          changedById: params.accountsUserId,
          createdAt: approvedAt,
        },
        {
          admissionId: admission.id,
          fromStatus: AdmissionStatus.ACCOUNTS_APPROVED,
          toStatus: AdmissionStatus.ASSIGNED_TO_TEACHER,
          changedById: params.accountsUserId,
          createdAt: new Date(approvedAt.getTime() + 1),
        },
      ],
    });

    await tx.admission.update({
      where: { id: admission.id },
      data: {
        status: AdmissionStatus.ASSIGNED_TO_TEACHER,
        enrollmentId: enrollment.id,
      },
    });

    return { ok: true, data: { enrollmentId: enrollment.id } };
  });
}
