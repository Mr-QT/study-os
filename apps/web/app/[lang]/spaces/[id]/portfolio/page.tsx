import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PortfolioView } from "@/components/portfolio-view";
import { isLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "成长作品集 · Study OS",
};

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <main>
      <PortfolioView spaceId={id} locale={lang} />
    </main>
  );
}
