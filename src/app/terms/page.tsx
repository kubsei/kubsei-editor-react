import type { Metadata } from "next";
import { LegalPage } from "@/components/app/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms · plaart",
};

export default function TermsPage() {
  return <LegalPage document="terms" />;
}
