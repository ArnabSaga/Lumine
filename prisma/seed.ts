import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "../generated/prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required in .env.local.");
}

const demoPassword = process.env.DEMO_STAFF_PASSWORD;
if (!demoPassword) {
  throw new Error("DEMO_STAFF_PASSWORD is required in .env.local.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const seedAuth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    autoSignIn: false,
  },
  user: {
    additionalFields: {
      role: {
        type: ["STUDENT", "BDM", "ACCOUNTS", "TEACHER"],
        defaultValue: "STUDENT",
        input: false,
      },
    },
  },
});

interface DemoStaff {
  name: string;
  email: string;
  targetRole: UserRole;
}

const DEMO_STAFF: DemoStaff[] = [
  { name: "BDM One", email: "bdm1@example.com", targetRole: UserRole.BDM },
  { name: "BDM Two", email: "bdm2@example.com", targetRole: UserRole.BDM },
  { name: "Accounts Officer", email: "accounts@example.com", targetRole: UserRole.ACCOUNTS },
  { name: "Teacher One", email: "teacher1@example.com", targetRole: UserRole.TEACHER },
  { name: "Teacher Two", email: "teacher2@example.com", targetRole: UserRole.TEACHER },
];

interface CourseSeedData {
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  modules: { title: string; description: string; order: number }[];
}

const COURSES: CourseSeedData[] = [
  {
    name: "IELTS",
    slug: "ielts",
    description: "Comprehensive International English Language Testing System Preparation",
    price: 15000,
    currency: "BDT",
    modules: [
      { title: "Listening", description: "Audio comprehension, note-taking, and question types", order: 1 },
      { title: "Reading", description: "Skimming, scanning, and analytical text comprehension", order: 2 },
      { title: "Writing", description: "Task 1 report/letter and Task 2 essay writing", order: 3 },
      { title: "Speaking", description: "Fluency, lexical resource, and interview practice", order: 4 },
      { title: "Mock Test", description: "Full-length simulated examination and evaluation", order: 5 },
    ],
  },
  {
    name: "Spoken English",
    slug: "spoken-english",
    description: "English Communication, Fluency, and Accent Neutralization",
    price: 8000,
    currency: "BDT",
    modules: [
      { title: "Grammar & Sentence Construction", description: "Essential structures for daily communication", order: 1 },
      { title: "Vocabulary & Idioms", description: "Everyday expressions and contextual vocabulary", order: 2 },
      { title: "Pronunciation & Accent", description: "Phonetics, intonation, and stress patterns", order: 3 },
      { title: "Conversational Practice", description: "Real-world dialogues, role plays, and debates", order: 4 },
      { title: "Public Speaking & Presentation", description: "Confidence building and presentation skills", order: 5 },
    ],
  },
  {
    name: "Web Development",
    slug: "web-development",
    description: "Full-Stack Web Development Bootcamp with React, Next.js, Node.js, and Databases",
    price: 25000,
    currency: "BDT",
    modules: [
      { title: "HTML & CSS Fundamentals", description: "Semantic markup, responsive layouts, CSS Grid, and Flexbox", order: 1 },
      { title: "JavaScript Mastery", description: "ES6+, DOM manipulation, asynchronous programming, and APIs", order: 2 },
      { title: "React & Component Architecture", description: "Hooks, state management, component composition, and routing", order: 3 },
      { title: "Next.js & Full-Stack Development", description: "App Router, Server Components, API routes, and SSR", order: 4 },
      { title: "Node.js & Backend Services", description: "Express, RESTful APIs, authentication, and middleware", order: 5 },
      { title: "Database & Relational Modeling", description: "PostgreSQL, Prisma ORM, migrations, and transactions", order: 6 },
      { title: "Deployment & DevOps", description: "CI/CD pipelines, production deployment, observability, and security", order: 7 },
    ],
  },
];

async function main() {
  console.log("Starting seed process...");

  // 1. Seed Staff Users
  for (const staff of DEMO_STAFF) {
    const existingUser = await prisma.user.findUnique({
      where: { email: staff.email },
    });

    if (!existingUser) {
      console.log(`Creating user: ${staff.email} (${staff.targetRole})`);
      await seedAuth.api.signUpEmail({
        body: {
          name: staff.name,
          email: staff.email,
          password: demoPassword as string,
        },
      });

      await prisma.user.update({
        where: { email: staff.email },
        data: { role: staff.targetRole },
      });
    } else {
      console.log(`Verifying user: ${staff.email}`);
      const credentialAccount = await prisma.account.findFirst({
        where: {
          userId: existingUser.id,
          providerId: "credential",
        },
      });

      if (!credentialAccount) {
        throw new Error(
          `Incompatible demo account for ${staff.email}: Missing credential account.`
        );
      }

      if (existingUser.role !== staff.targetRole) {
        console.log(`Updating role for ${staff.email} to ${staff.targetRole}`);
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { role: staff.targetRole },
        });
      }
    }
  }

  // 2. Seed Courses and Modules
  for (const courseData of COURSES) {
    console.log(`Upserting course: ${courseData.name}`);
    const course = await prisma.course.upsert({
      where: { name: courseData.name },
      update: {
        slug: courseData.slug,
        description: courseData.description,
        price: courseData.price,
        currency: courseData.currency,
        isActive: true,
      },
      create: {
        name: courseData.name,
        slug: courseData.slug,
        description: courseData.description,
        price: courseData.price,
        currency: courseData.currency,
        isActive: true,
      },
    });

    for (const mod of courseData.modules) {
      await prisma.courseModule.upsert({
        where: {
          courseId_title: {
            courseId: course.id,
            title: mod.title,
          },
        },
        update: {
          description: mod.description,
          order: mod.order,
        },
        create: {
          courseId: course.id,
          title: mod.title,
          description: mod.description,
          order: mod.order,
        },
      });
    }
  }

  console.log("Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
