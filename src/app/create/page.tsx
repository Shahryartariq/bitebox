import type { Metadata } from "next";
import { CreateRecipe } from "@/components/create-recipe";

export const metadata: Metadata = {
  title: "Write a recipe with AI",
  robots: { index: false, follow: false },
};

type Params = Promise<{ q?: string | string[]; have?: string | string[]; saved?: string | string[] }>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function CreatePage({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const have = first(params.have)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
  return (
    <CreateRecipe prompt={first(params.q).slice(0, 140)} have={have} savedKey={first(params.saved) || undefined} />
  );
}
