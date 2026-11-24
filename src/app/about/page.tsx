import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "How Bitebox finds recipes, imports them from other sites, and uses AI for swaps and tweaks.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">About Bitebox</h1>
      <div className="mt-8 space-y-5 text-lg [&_h2]:mt-10 [&_h2]:text-2xl">
        <p>
          Bitebox helps you get from &ldquo;what should I cook?&rdquo; to a meal, even when you&apos;re missing
          something.
        </p>
        <h2>Where the recipes come from</h2>
        <p>
          The recipe library comes from{" "}
          <a href="https://www.themealdb.com" className="underline" rel="noopener">
            TheMealDB
          </a>
          , an open recipe database with photos. Bitebox indexes it so you can search by dish, ingredient, cuisine or
          course, or by the ingredients you already have.
        </p>
        <p>
          TheMealDB has no Pakistani recipes, so Bitebox has its own: biryani, karahi, nihari, kebabs, daal and sweets,
          written for home kitchens. Their photos come from{" "}
          <a href="https://unsplash.com/?utm_source=bitebox&utm_medium=referral" className="underline" rel="noopener">
            Unsplash
          </a>{" "}
          and each one credits its photographer.
        </p>
        <h2>Importing from other sites</h2>
        <p>
          When you paste a link, Bitebox reads the recipe details the page publishes for search engines (the schema.org
          Recipe format most food sites use). The recipe is shown to you with a link back to the publisher. It
          isn&apos;t stored, listed or indexed on Bitebox.
        </p>
        <h2>The AI kitchen helper</h2>
        <p>
          Swaps, &ldquo;make it spicier&rdquo; and the other answers come from Google&apos;s Gemini models. Bitebox
          sends the recipe and your question, nothing else. AI can be wrong: check allergens yourself and cook meat,
          poultry, eggs and seafood all the way through.
        </p>
        <p>
          <Link href="/privacy" className="underline">
            Read the privacy notes
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
