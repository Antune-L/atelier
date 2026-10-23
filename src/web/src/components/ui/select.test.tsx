import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { Select, splitSelectClassName } from "./select";

describe("Select", () => {
  test("routes layout classes to the wrapper and keeps visual ones on the select", () => {
    expect(splitSelectClassName("px-2 w-auto ml-2 h-7 text-xs sm:max-w-full -mt-1 flex-1 !w-40")).toEqual({
      layout: "w-auto ml-2 sm:max-w-full -mt-1 flex-1 !w-40",
      visual: "px-2 h-7 text-xs",
    });
    expect(splitSelectClassName(undefined)).toEqual({ layout: "", visual: "" });
  });

  test("renders a decorative chevron and keeps room for it", () => {
    const html = renderToStaticMarkup(<Select className="px-2 w-auto ml-2" disabled><option>a</option></Select>);
    expect(html).toContain('<span class="relative inline-flex w-auto ml-2">');
    expect(html).toMatch(/<select class="[^"]*w-full[^"]*appearance-none[^"]*px-2[^"]*pr-9"/);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("pointer-events-none");
    expect(html).toContain("peer-disabled:opacity-50");
  });
});
