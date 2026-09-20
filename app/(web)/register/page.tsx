import Link from "next/link";
import { AuthShell } from "@/components/ui/shells";

export const metadata = {
  title: "Registration — Luminedge",
  description: "Luminedge student registration starts from a BDM issued QR.",
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Use your BDM registration QR"
      description="Student registration starts from a single use QR link issued by an authorized Luminedge BDM."
    >
      <div className="text-center">
        <p className="text-sm leading-6 text-slate-600">
          Scan the QR code or open the registration link provided by your BDM. A student account is created during QR
          registration so you can access approved course progress later.
        </p>
        <Link href="/student/login" className="lum-btn-primary mt-6 inline-flex">
          Student Login
        </Link>
      </div>
    </AuthShell>
  );
}
