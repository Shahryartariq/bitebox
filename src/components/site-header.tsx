import Link from "next/link";
import { LogoMark } from "./logo";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  { href: "/search", label: "All recipes" },
  { href: "/cuisine/pakistan", label: "Pakistani" },
  { href: "/cuisines", label: "Cuisines" },
  { href: "/saved", label: "Saved" },
];

export function SiteHeader() {
  return (
    <header data-site-header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 sm:px-6">
        <Link href="/" className="mr-auto flex items-center gap-2 rounded-md" aria-label="Bitebox home">
          <LogoMark className="size-8" />
          <span className="text-[1.35rem] font-extrabold tracking-tight">Bitebox</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 font-semibold md:flex">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-full px-3.5 py-2 hover:bg-surface-3">
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/search"
          className="grid size-10 place-items-center rounded-full hover:bg-surface-3 md:hidden"
          aria-label="Search recipes"
        >
          <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M13 13l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </Link>

        <ThemeToggle />

        {/* Phones: a simple menu. <details> works without JavaScript. */}
        <details className="relative md:hidden">
          <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-full hover:bg-surface-3 [&::-webkit-details-marker]:hidden">
            <span className="sr-only">Menu</span>
            <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
              <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </summary>
          <nav
            aria-label="Menu"
            className="absolute right-0 top-12 w-56 rounded-2xl border border-line bg-surface p-2 shadow-xl"
          >
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-xl px-4 py-3 font-semibold hover:bg-surface-3"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}
