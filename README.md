# Bitebox

**Find a recipe. Fix what's missing.**

Bitebox is a recipe website with an AI kitchen helper. Search about 800 recipes from around the world, including Pakistani favourites, find dishes you can cook with what's already in your kitchen, or paste a link from any recipe site. When you're out of an ingredient, one tap shows what to use instead, and you can ask for changes like "make it spicier", "cook it without oil" or "make it vegetarian".

**Live demo:** https://bitebox-one.vercel.app

![Bitebox home page](docs/screenshots/home.png)

## What it does

- **Search by dish, ingredient, cuisine or course.** About 800 recipes from [TheMealDB](https://www.themealdb.com), indexed on the server and ranked so title matches come before ingredient matches. Plurals and spelling variants match ("tomatoes" finds "tomato", "eggplant" finds "aubergine").
- **Pakistani recipes.** Biryani, chicken karahi, nihari, haleem, chapli and seekh kebabs, aloo gosht, daal chawal, chana chaat, pakoras, aloo paratha, chicken tikka, bhindi, kheer and gulab jamun, written for home kitchens with times and servings. Search understands other spellings ("kabab", "pakoray", "khichra").
- **Cook with what you have.** Add the ingredients in your kitchen and Bitebox ranks recipes by how many of them each one uses and how little else you'd need to buy. The list is remembered in your browser.
- **Import a recipe from any site.** Paste a link and Bitebox reads the schema.org Recipe data most food sites publish, then shows it in the same view with a link back to the publisher.
- **Swap a missing ingredient.** Each ingredient has a "Don't have it?" button that suggests replacements with amounts for this recipe, how to use them, and how the taste or texture changes.
- **Ask the kitchen helper.** One-tap questions (spicier, creamier, no oil, no salt, vegetarian, lighter, faster, what to serve with it) or your own question. Answers stream in as they're written.
- **Let AI write it.** When a search finds nothing, Bitebox can write a recipe for it, using what you have.
- **Made for the kitchen.** Half, double or triple the amounts with proper kitchen fractions, tick off what you have, save recipes without an account, print a clean copy, light and dark themes, works on phones.

![Recipe page with ingredients and method](docs/screenshots/recipe.png)

<details>
<summary>More screenshots</summary>

![Swap dialog](docs/screenshots/swap.png)
![Kitchen helper answering "make it spicier"](docs/screenshots/helper.png)
![Dark theme on a phone](docs/screenshots/dark-phone.png)

</details>

## Tech stack

- **Next.js 16** (App Router) with **React 19** and **TypeScript** (strict)
- **Tailwind CSS 4** with design tokens for both themes; Figtree font, self-hosted
- **Vercel AI SDK** with **Google Gemini** for streaming answers and structured (Zod-validated) output
- **TheMealDB** for world recipes, Bitebox's own Pakistani recipes with **Unsplash** photos; **Neon Postgres** for shared rate limits
- **Vitest** for unit tests, **Playwright** + **axe** for browser and accessibility tests, **GitHub Actions** CI

## How it works

**Recipes and search.** The server loads TheMealDB's whole catalog (36 small requests, cached for a day) and builds a search index once per instance. Search, cuisine and course pages, and the "what I have" ranking all run on that index, so they're fast and don't depend on TheMealDB's single-ingredient filters. Recipe, cuisine and course pages are statically generated on first visit and refreshed daily.

**Importing.** Fetching a URL a visitor typed is a classic server-side request forgery risk, so the importer:

- accepts only `http`/`https` on ports 80 and 443, with no credentials in the URL;
- resolves DNS at connect time and refuses private, loopback, link-local, metadata and other non-public addresses (IPv4 and IPv6, including IPv4-mapped forms), so a hostname can't switch to a private address after it's checked;
- follows at most four redirects, checking each one, and stops at 9 seconds or 3 MB.

Imported recipes are cached for an hour, aren't stored, and their pages are `noindex`.

**AI.** The kitchen helper never trusts recipe text from the browser for database or imported recipes: the server loads the recipe again by id or URL and builds the prompt itself. Prompts tell the model to treat recipe text as data, put food safety first and flag allergens. Swaps and AI recipes use structured output validated with Zod. Every AI route checks the request's origin, limits body size, and is rate limited per visitor (a daily-rotating hash of the IP, never the raw address) plus a site-wide daily budget so a traffic spike can't run up the Gemini bill.

**Security and SEO.** Strict security headers (CSP, HSTS, frame and referrer policies), no `dangerouslySetInnerHTML` for user or AI content, Recipe and Breadcrumb structured data, canonical URLs, a sitemap of every recipe, cuisine and course page, and an Open Graph image.

## Run it locally

Requires Node.js 24.

```bash
git clone https://github.com/Shahryartariq/bitebox.git
cd bitebox
npm install
cp .env.example .env.local   # add GEMINI_API_KEY for real AI answers
npm run dev
```

Open http://localhost:3000. Without a Gemini key, the AI features give sample answers in development.

To work offline with the bundled sample recipes: `BITEBOX_SAMPLE_DATA=1 npm run dev`.

### Environment variables

| Variable                                                                                           | Needed | What it does                                                          |
| -------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------- |
| `GEMINI_API_KEY`                                                                                   | For AI | Google AI Studio key for the kitchen helper, swaps and AI recipes     |
| `GEMINI_MODEL`                                                                                     | No     | Model id (default `gemini-3.5-flash-lite`)                            |
| `MEALDB_API_KEY`                                                                                   | No     | TheMealDB key; `1` is the free test key                               |
| `DATABASE_URL`                                                                                     | No     | Postgres URL for rate limits shared across server instances           |
| `AI_DAILY_LIMIT`                                                                                   | No     | Site-wide AI requests per day (default 1500)                          |
| `SITE_URL`                                                                                         | No     | Public address; on Vercel the production domain is used automatically |
| `NEXT_PUBLIC_GA_ID`                                                                                | No     | Google Analytics 4 id                                                 |
| `GOOGLE_SITE_VERIFICATION`                                                                         | No     | Search Console HTML-tag token                                         |
| `NEXT_PUBLIC_ADSENSE_CLIENT`, `NEXT_PUBLIC_ADSENSE_SLOT_RECIPE`, `NEXT_PUBLIC_ADSENSE_SLOT_SEARCH` | No     | Google AdSense; also turns on `/ads.txt`                              |

## Tests

```bash
npm run lint && npm run typecheck
npm test                                              # unit tests
BITEBOX_SAMPLE_DATA=1 BITEBOX_AI_MOCK=1 npm run build
npx playwright test                                   # browser tests, desktop and phone
```

The browser tests cover search, "what I have", scaling, swaps, the kitchen helper, saving, AI recipes, the importer's address checks, themes, accessibility (axe, light and dark) on every page, phone layouts, security headers, structured data and the AI endpoints' input checks.

## Before making money from it

The code is ready for ads (AdSense slots and `ads.txt`) and analytics, but the services under it have their own terms:

- **TheMealDB:** the `1` key is for development. Get a supporter key (a one-off fee) for a public site and set `MEALDB_API_KEY`.
- **Vercel:** the Hobby plan is for non-commercial use. Move to Pro before running ads.
- **Gemini:** set billing alerts in Google AI Studio and pick `AI_DAILY_LIMIT` to match your budget.
- **AdSense in the EU/UK** needs a certified consent banner.

## Credits

World recipes and photos: [TheMealDB](https://www.themealdb.com). Pakistani recipe photos: [Unsplash](https://unsplash.com) (each photographer is credited on the recipe page). Imported recipes belong to their publishers. Built by [Muhammad Shehryar](https://github.com/Shahryartariq).
