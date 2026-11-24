import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingPage } from "@/components/listing-page";
import { PAKISTAN_BANNER } from "@/data/pakistani";
import { LOCAL_CUISINE, unsplashCredit, unsplashUrl } from "@/lib/local-recipes";
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
    title: cuisine.name === LOCAL_CUISINE ? "Pakistani recipes" : `${cuisine.name} recipes`,
    description: `${cuisine.count} recipes from ${cuisine.name}, with swaps and tips from the AI kitchen helper.`,
    alternates: { canonical: `/cuisine/${cuisine.slug}` },
  };
}

export default async function CuisinePage({ params }: { params: Params }) {
  const data = await getCuisine((await params).slug);
  if (!data) notFound();
  const { cuisine, recipes } = data;
  const isPakistan = cuisine.name === LOCAL_CUISINE;
  return (
    <ListingPage
      title={isPakistan ? "Pakistani recipes" : `${cuisine.name} recipes`}
      intro={
        isPakistan
          ? `${recipes.length} Pakistani recipes written for home kitchens: biryani, karahi, nihari, kebabs, daal and sweets. Every recipe has an AI helper for swaps and changes.`
          : `${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"} from ${cuisine.name}.`
      }
      banner={
        isPakistan
          ? { src: unsplashUrl(PAKISTAN_BANNER.id, 1600), credit: unsplashCredit(PAKISTAN_BANNER.by) }
          : undefined
      }
      recipes={recipes}
      crumbs={[
        { name: "Home", path: "/" },
        { name: "Cuisines", path: "/cuisines" },
        { name: cuisine.name, path: `/cuisine/${cuisine.slug}` },
      ]}
    />
  );
}
