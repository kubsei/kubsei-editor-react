import type { Metadata } from "next";
import { LegalPage } from "@/components/app/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy · plaart",
};

export default function PrivacyPage() {
  return <LegalPage document="privacy" />;
}
