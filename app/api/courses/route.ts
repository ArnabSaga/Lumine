import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";

// GET /api/courses — public catalog, no auth required

export async function GET() {
  const courses = await prisma.course.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      price: true,
      currency: true,
      _count: { select: { modules: true } },
    },
  });

  return NextResponse.json({ courses });
}
