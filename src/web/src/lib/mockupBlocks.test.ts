import { describe, expect, test } from "bun:test";

import { MOCKUP_SANDBOX, buildMockupSrcdoc, splitMockupBlocks } from "./mockupBlocks";

describe("web mockupBlocks", () => {
  test("sandbox never grants same-origin nor scripts", () => {
    expect(MOCKUP_SANDBOX).not.toContain("allow-same-origin");
    expect(MOCKUP_SANDBOX).not.toContain("allow-scripts");
  });

  test("srcdoc carries exactly one CSP meta at the start of head", () => {
    const srcdoc = buildMockupSrcdoc("<html><head><style>p{}</style></head><body><p>x</p></body></html>");
    expect(srcdoc.match(/Content-Security-Policy/g)?.length).toBe(1);
    expect(srcdoc).toMatch(/<head><meta http-equiv="Content-Security-Policy"/);
  });

  test("splits text and mockup segments", () => {
    expect(splitMockupBlocks('Avant\n<mockup title="Accueil"><p>Hi</p></mockup>\nAprès')).toEqual([
      { kind: "text", text: "Avant\n" },
      { kind: "mockup", title: "Accueil", html: "<p>Hi</p>", complete: true },
      { kind: "text", text: "\nAprès" },
    ]);
  });
});
