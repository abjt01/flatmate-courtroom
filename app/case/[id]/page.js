import CaseRoom from "@/components/CaseRoom";
import { caseTitle } from "@/lib/cases";

// Shows up in the WhatsApp link preview, so keep it to the title.
export async function generateMetadata({ params }) {
  const { id } = await params;
  const title = await caseTitle(id).catch(() => null);
  if (!title) return { title: "Flatmate Court" };
  return {
    title: `${title} · Flatmate Court`,
    description: "You've been summoned to Flatmate Court. Tell the bench your side, privately.",
  };
}

export default async function CasePage({ params, searchParams }) {
  const { id } = await params;
  const { k = "", p = "" } = await searchParams;
  return (
    <main className="wrap">
      <CaseRoom id={id} k={String(k)} p={String(p)} />
    </main>
  );
}
