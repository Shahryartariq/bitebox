import { test as base, expect } from "@playwright/test";

const PHOTO = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="700"><rect width="700" height="700" fill="#c98b4a"/><circle cx="350" cy="370" r="220" fill="#f3eee6"/></svg>`;

/** Recipe photos come from TheMealDB and Unsplash; serve a stand-in so tests run offline and stay fast. */
export const test = base.extend({
  page: async ({ page }, provide) => {
    for (const host of ["**/www.themealdb.com/**", "**/images.unsplash.com/**"]) {
      await page.route(host, (route) => route.fulfill({ status: 200, contentType: "image/svg+xml", body: PHOTO }));
    }
    await provide(page);
  },
});

export { expect };
