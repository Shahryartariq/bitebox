import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingPage } from "@/components/listing-page";
import { getCategory } from "@/lib/mealdb";

export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await getCategory((await params).slug).catch(() => null);
  if (!data) return { title: "Course not found" };
  const { category } = data;
  return {
    title: `${category.name} recipes`,
    description: `${category.count} ${category.name.toLowerCase()} recipes from around the world.`,
    alternates: { canonical: `/category/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const data = await getCategory((await params).slug);
  if (!data) notFound();
  const { category, recipes } = data;
  return (
    <ListingPage
      title={`${category.name} recipes`}
      intro={`${recipes.length} ${category.name.toLowerCase()} ${recipes.length === 1 ? "recipe" : "recipes"} from around the world.`}
      recipes={recipes}
      crumbs={[
        { name: "Home", path: "/" },
        { name: category.name, path: `/category/${category.slug}` },
      ]}
    />
  );
}
