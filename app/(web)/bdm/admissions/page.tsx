import Link from "next/link";
import { AdmissionStatus, UserRole } from "@/generated/prisma/client";
import { requirePageRole } from "@/lib/server/guards/auth";
import { admissionQuerySchema } from "@/lib/shared/validations/admission";
import { listAdmissions } from "@/lib/server/services/admission.service";
import { EmptyState, PageHeader, SectionCard, StatusBadge } from "@/components/ui/primitives";

export const metadata = { title: "BDM Admissions — Luminedge" };

export default async function BdmAdmissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePageRole([UserRole.BDM]);
  const rawParams = await searchParams;
  const parsed = admissionQuerySchema.safeParse({
    q: typeof rawParams.q === "string" ? rawParams.q : undefined,
    status: typeof rawParams.status === "string" ? rawParams.status : undefined,
    page: typeof rawParams.page === "string" ? rawParams.page : undefined,
  });
  const query = parsed.success ? parsed.data : { page: 1 };
  const data = parsed.success
    ? await listAdmissions({ query: parsed.data, visibility: { role: UserRole.BDM, userId: session.user.id } })
    : { items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 };

  return (
    <>
      <PageHeader
        light
        eyebrow="BDM portal"
        title="My Admissions"
        description="Manage students registered through your own QR links. References are display only, authorization is based on your BDM ownership."
      />

      <SectionCard title="Admission workspace" description="Search your QR registered students and submit complete admissions to Accounts.">
        <form action="/bdm/admissions" className="mb-5 grid gap-4 md:grid-cols-[1fr_18rem_auto]">
          <label>
            <span className="lum-label">Search</span>
            <input className="lum-input" name="q" defaultValue={query.q ?? ""} placeholder="Student, email, reference, or course" />
          </label>
          <label>
            <span className="lum-label">Status</span>
            <select className="lum-input" name="status" defaultValue={query.status ?? ""}>
              <option value="">All statuses</option>
              {Object.values(AdmissionStatus).map((status) => (
                <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button className="lum-btn-primary h-11" type="submit">Search</button>
            <Link href="/bdm/admissions" className="lum-btn-secondary h-11">Reset</Link>
          </div>
        </form>

        {!parsed.success ? (
          <EmptyState title="Invalid filters" description="Adjust the search filters and try again." />
        ) : data.items.length === 0 ? (
          <EmptyState title="No admissions found" description="Students who register through your QR links will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="lum-table">
              <thead>
                <tr>
                  {["Student", "Course", "Reference", "Amount", "Status", "Created", "Action"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((admission) => (
                  <tr key={admission.id}>
                    <td>
                      <p className="font-bold text-slate-950">{admission.student.name}</p>
                      <p className="max-w-[18rem] truncate text-xs text-slate-500">{admission.student.email}</p>
                    </td>
                    <td className="font-semibold text-slate-700">{admission.course?.name ?? "Not selected"}</td>
                    <td className="font-mono text-xs text-slate-500">{admission.reference}</td>
                    <td className="font-mono text-xs">
                      {admission.admissionAmount ? `${admission.currency} ${Number(admission.admissionAmount).toLocaleString("en-BD")}` : "Pending"}
                    </td>
                    <td><StatusBadge status={admission.status} /></td>
                    <td className="text-sm text-slate-500">{new Date(admission.createdAt).toLocaleDateString("en-BD")}</td>
                    <td>
                      <Link href={`/bdm/admissions/${admission.id}`} className="lum-btn-secondary px-3 py-2 text-xs">Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </>
  );
}
