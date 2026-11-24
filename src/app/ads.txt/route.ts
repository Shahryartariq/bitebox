/** ads.txt for Google AdSense, served only when an AdSense client id is configured. */
export const dynamic = "force-static";

export function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
  const match = client ? /^ca-(pub-\d+)$/.exec(client) : null;
  if (!match) return new Response("Not found", { status: 404 });
  return new Response(`google.com, ${match[1]}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
