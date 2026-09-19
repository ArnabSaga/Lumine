export default function Home() {
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Student Management Portal
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          Foundation ready for the core workflow.
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-700">
          Prisma schema, PostgreSQL configuration, and the minimal Next.js app
          shell are in place. Authentication, seed data, dashboards, and QR
          registration come next.
        </p>
      </div>
    </main>
  );
}
