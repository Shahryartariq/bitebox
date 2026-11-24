"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-16 sm:px-6">
      <h1 className="text-6xl font-black">Something burned</h1>
      <p className="mt-4 text-lg text-muted">
        This page couldn&apos;t load, usually because the recipe library didn&apos;t answer in time. Try again in a
        moment.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <Link href="/" className="btn btn-quiet">
          Go to the home page
        </Link>
      </div>
    </div>
  );
}
