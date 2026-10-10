"use client";
import Link from "next/link";
import useIntl from "@/hooks/useIntl";
import { LanguageSwitcher } from "@/components/ui/language-swicher";
import { LEGAL } from "@/lib/legal";

interface LegalSection {
  title: string;
  paragraphs?: string[];
  items?: string[];
}

interface LegalDocument {
  title: string;
  intro: string;
  sections: LegalSection[];
}

interface LegalPageProps {
  document: "privacy" | "terms";
}

const fill = (text: string) =>
  text.replaceAll("{controller}", LEGAL.controller).replaceAll("{email}", LEGAL.email);

export const LegalPage = ({ document }: LegalPageProps) => {
  const { t, messages } = useIntl();
  const doc = messages.legal[document] as LegalDocument;

  return (
    <div className="min-h-screen bg-white text-black">
      <nav className="sticky top-0 z-50 py-4 backdrop-blur-xl border-b border-gray-100 bg-white/80">
        <div className="container px-6 mx-auto flex justify-between items-center">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            {t("common.brand.name")}
          </Link>
          <LanguageSwitcher />
        </div>
      </nav>

      <main className="container px-6 mx-auto max-w-3xl py-12">
        <h1 className="text-4xl font-light mb-2">{doc.title}</h1>
        <p className="text-sm text-gray-500 mb-8">
          {t("legal.updated", { date: t("legal.date") })}
        </p>
        <p className="text-gray-700 mb-10">{fill(doc.intro)}</p>

        {doc.sections.map((section) => (
          <section key={section.title} className="mb-8">
            <h2 className="text-xl font-medium mb-3">{section.title}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="text-gray-700 mb-3 leading-relaxed">
                {fill(paragraph)}
              </p>
            ))}
            {section.items && (
              <ul className="list-disc pl-6 space-y-2 text-gray-700 leading-relaxed">
                {section.items.map((item) => (
                  <li key={item}>{fill(item)}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <div className="mt-12 pt-6 border-t border-gray-100 flex gap-6 text-sm">
          <Link href="/" className="text-gray-600 hover:text-black hover:underline">
            {t("legal.backHome")}
          </Link>
          <Link
            href={document === "privacy" ? "/terms" : "/privacy"}
            className="text-gray-600 hover:text-black hover:underline">
            {document === "privacy" ? t("legal.links.terms") : t("legal.links.privacy")}
          </Link>
        </div>
      </main>
    </div>
  );
};
