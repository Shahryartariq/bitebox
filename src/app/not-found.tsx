import Link from "next/link";
import { SearchBox } from "@/components/search-box";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-16 sm:px-6">
      <h1 className="text-6xl font-black">This page isn&apos;t on the menu</h1>
      <p className="mt-4 text-lg text-muted">The link may be old or mistyped. Search for what you wanted to cook.</p>
      <div className="mt-8">
        <SearchBox size="compact" />
      </div>
      <Link href="/" className="mt-8 inline-block font-semibold underline">
        Go to the home page
      </Link>
    </div>
  );
}
