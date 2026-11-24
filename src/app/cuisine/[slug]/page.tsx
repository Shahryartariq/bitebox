import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingPage } from "@/components/listing-page";
import { getCuisine } from "@/lib/mealdb";

export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await getCuisine((await params).slug).catch(() => null);
  if (!data) return { title: "Cuisine not found" };
  const { cuisine } = data;
  return {
    title: `${cuisine.name} recipes`,
    description: `${cuisine.count} recipes from ${cuisine.name}, with swaps and tips from the AI kitchen helper.`,
    alternates: { canonical: `/cuisine/${cuisine.slug}` },
  };
}

export default async function CuisinePage({ params }: { params: Params }) {
  const data = await getCuisine((await params).slug);
  if (!data) notFound();
  const { cuisine, recipes } = data;
  return (
    <ListingPage
      title={`${cuisine.name} recipes`}
      intro={`${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"} from ${cuisine.name}.`}
      recipes={recipes}
      crumbs={[
        { name: "Home", path: "/" },
        { name: "Cuisines", path: "/cuisines" },
        { name: cuisine.name, path: `/cuisine/${cuisine.slug}` },
      ]}
    />
  );
}
