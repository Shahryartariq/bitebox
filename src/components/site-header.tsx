import Link from "next/link";
import { LogoMark } from "./logo";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header data-site-header className="border-b border-line">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
        <Link href="/" className="mr-auto flex items-center gap-2 rounded-md" aria-label="Bitebox home">
          <LogoMark className="size-8" />
          <span className="font-display text-[1.4rem] font-extrabold [font-stretch:112%] sm:text-2xl">Bitebox</span>
        </Link>
        <nav aria-label="Main" className="flex items-center text-[0.95rem] font-semibold sm:gap-1">
          <Link href="/search" className="rounded-full px-2.5 py-2 hover:bg-surface-2 sm:px-3">
            Search
          </Link>
          <Link href="/cuisines" className="hidden rounded-full px-3 py-2 hover:bg-surface-2 sm:inline-block">
            Cuisines
          </Link>
          <Link href="/saved" className="rounded-full px-2.5 py-2 hover:bg-surface-2 sm:px-3">
            Saved
          </Link>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
