import type { Metadata } from "next";
import { SavedList } from "@/components/saved-list";

export const metadata: Metadata = {
  title: "Saved recipes",
  robots: { index: false, follow: true },
};

export default function SavedPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">Saved recipes</h1>
      <p className="mt-3 max-w-prose text-muted">Saved in this browser. No account needed.</p>
      <SavedList />
    </div>
  );
}
