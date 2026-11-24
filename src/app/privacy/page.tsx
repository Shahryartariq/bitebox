import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Bitebox stores, what it sends to AI, and which third parties are involved.",
  alternates: { canonical: "/privacy" },
};

const analytics = Boolean(process.env.NEXT_PUBLIC_GA_ID);
const ads = Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT);

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
      <h1 className="text-5xl font-black sm:text-6xl">Privacy</h1>
      <div className="mt-8 space-y-5 text-lg [&_h2]:mt-10 [&_h2]:text-3xl [&_h2]:font-extrabold [&_ul]:list-disc [&_ul]:pl-6">
        <p>Bitebox has no accounts and doesn&apos;t ask for your name or email.</p>
        <h2>Stored in your browser</h2>
        <ul>
          <li>Saved recipes, including AI recipes you choose to save.</li>
          <li>Your &ldquo;What I have&rdquo; ingredient list.</li>
          <li>Your light or dark theme choice.</li>
        </ul>
        <p>These stay on your device. Clearing your browser data removes them.</p>
        <h2>Sent to the server</h2>
        <ul>
          <li>Your searches and pasted links, to find and import recipes.</li>
          <li>
            Questions to the kitchen helper, together with the recipe, which are sent to Google&apos;s Gemini API to
            write an answer. Don&apos;t type personal details into questions.
          </li>
          <li>
            To stop abuse, the server counts requests per visitor using a one-way hash of your IP address that changes
            every day. The raw address isn&apos;t stored.
          </li>
        </ul>
        <h2>Third parties</h2>
        <ul>
          <li>Recipe photos load from TheMealDB, or from the publisher&apos;s site for imported recipes.</li>
          <li>The site is hosted on Vercel.</li>
          {analytics ? <li>Google Analytics measures page views to help improve the site.</li> : null}
          {ads ? (
            <li>
              Google AdSense shows ads and may use cookies to do so. You can manage ad personalisation at{" "}
              <a href="https://adssettings.google.com" className="underline" rel="noopener">
                adssettings.google.com
              </a>
              .
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
