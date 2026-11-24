import Link from "next/link";

export function SiteFooter() {
  return (
    <footer data-site-footer className="mt-20 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm text-muted sm:grid-cols-[1fr_auto] sm:px-6">
        <p className="max-w-prose">
          Recipes and photos from{" "}
          <a href="https://www.themealdb.com" className="underline hover:text-ink" rel="noopener">
            TheMealDB
          </a>
          . Imported recipes belong to their publishers and link back to them. AI answers can be wrong, so use your
          judgement, especially with allergies.
        </p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 font-medium">
          <Link href="/cuisines" className="hover:text-ink">
            Cuisines
          </Link>
          <Link href="/about" className="hover:text-ink">
            About
          </Link>
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <a href="https://github.com/Shahryartariq/bitebox" className="hover:text-ink" rel="noopener">
            Source code
          </a>
        </nav>
      </div>
    </footer>
  );
}
