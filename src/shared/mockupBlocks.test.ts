import { describe, expect, test } from "bun:test";

import {
  MOCKUP_CSP,
  MOCKUP_DEFAULT_TITLE,
  MOCKUP_MAX_BYTES,
  MOCKUP_SANDBOX,
  MOCKUP_TITLE_MAX_LENGTH,
  buildMockupSrcdoc,
  collapseMockupHistory,
  isMockupTooLarge,
  splitMockupBlocks,
} from "./mockupBlocks.ts";

const DOC = "<!doctype html><html><head><style>p{}</style></head><body><p>Hi</p></body></html>";

describe("splitMockupBlocks", () => {
  test("text without a tag is one text segment", () => {
    expect(splitMockupBlocks("Bonjour <b>x</b>")).toEqual([{ kind: "text", text: "Bonjour <b>x</b>" }]);
  });

  test("a closed block splits the text", () => {
    expect(splitMockupBlocks(`Avant\n<mockup title="Liste">${DOC}</mockup>\nAprès`)).toEqual([
      { kind: "text", text: "Avant\n" },
      { kind: "mockup", title: "Liste", html: DOC, complete: true },
      { kind: "text", text: "\nAprès" },
    ]);
  });

  test("an unclosed block keeps the rest as incomplete", () => {
    expect(splitMockupBlocks("Voici <mockup title='A'><html><body>")).toEqual([
      { kind: "text", text: "Voici " },
      { kind: "mockup", title: "A", html: "<html><body>", complete: false },
    ]);
  });

  test("multiple blocks and two versions of the same title", () => {
    const segments = splitMockupBlocks('<mockup title="A">1</mockup><MOCKUP title="B">2</MOCKUP><mockup title="A">3</mockup>');
    expect(segments).toEqual([
      { kind: "mockup", title: "A", html: "1", complete: true },
      { kind: "mockup", title: "B", html: "2", complete: true },
      { kind: "mockup", title: "A", html: "3", complete: true },
    ]);
  });

  test("tags inside fenced code and inline code stay text", () => {
    const fenced = 'Exemple :\n```html\n<mockup title="A">x</mockup>\n```\nfin';
    expect(splitMockupBlocks(fenced)).toEqual([{ kind: "text", text: fenced }]);
    const tilde = '~~~~\n<mockup>x</mockup>\n~~~\nencore\n~~~~\n';
    expect(splitMockupBlocks(tilde)).toEqual([{ kind: "text", text: tilde }]);
    const inline = 'Écris `<mockup title="A">` ou ``<mockup>``.';
    expect(splitMockupBlocks(inline)).toEqual([{ kind: "text", text: inline }]);
  });

  test("backticks inside the HTML do not affect the block", () => {
    const html = "<body><code>`a`</code> ``` </body>";
    expect(splitMockupBlocks(`<mockup title="A">${html}</mockup>ok`)).toEqual([
      { kind: "mockup", title: "A", html, complete: true },
      { kind: "text", text: "ok" },
    ]);
  });

  test("a premature closing tag closes the block", () => {
    expect(splitMockupBlocks('<mockup title="A"><p></mockup></p></mockup>')).toEqual([
      { kind: "mockup", title: "A", html: "<p>", complete: true },
      { kind: "text", text: "</p></mockup>" },
    ]);
  });

  test("missing, empty, unquoted, malformed and long titles", () => {
    const title = (tag: string): string | undefined => {
      const segment = splitMockupBlocks(`${tag}x</mockup>`)[0];
      return segment?.kind === "mockup" ? segment.title : undefined;
    };
    expect(title("<mockup>")).toBe(MOCKUP_DEFAULT_TITLE);
    expect(title('<mockup title="  ">')).toBe(MOCKUP_DEFAULT_TITLE);
    expect(title("<mockup title=Liste>")).toBe("Liste");
    expect(title('<mockup title="abc>')).toBe(MOCKUP_DEFAULT_TITLE);
    expect(title(`<mockup title="${"a".repeat(200)}">`)?.length).toBe(MOCKUP_TITLE_MAX_LENGTH);
  });

  test("ignores look-alike tags", () => {
    expect(splitMockupBlocks("<mockups>x</mockups>")).toEqual([{ kind: "text", text: "<mockups>x</mockups>" }]);
  });

  test("hides a partial tag at the end of the buffer while streaming", () => {
    const streaming = { streaming: true };
    expect(splitMockupBlocks("Voici <mo", streaming)).toEqual([{ kind: "text", text: "Voici " }]);
    expect(splitMockupBlocks("Voici <", streaming)).toEqual([{ kind: "text", text: "Voici " }]);
    expect(splitMockupBlocks("Voici <mockup", streaming)).toEqual([{ kind: "text", text: "Voici " }]);
    expect(splitMockupBlocks('Voici <mockup title="a"', streaming)).toEqual([{ kind: "text", text: "Voici " }]);
    expect(splitMockupBlocks("<mo", streaming)).toEqual([]);
    expect(splitMockupBlocks("Voici `<mo` fin", streaming)).toEqual([{ kind: "text", text: "Voici `<mo` fin" }]);
  });

  test("keeps a trailing partial tag as text once the message is finished", () => {
    expect(splitMockupBlocks("Voici <")).toEqual([{ kind: "text", text: "Voici <" }]);
    expect(splitMockupBlocks("la balise <mockup")).toEqual([{ kind: "text", text: "la balise <mockup" }]);
    expect(splitMockupBlocks('Voici <mockup title="a"')).toEqual([{ kind: "text", text: 'Voici <mockup title="a"' }]);
  });

  test("an unmatched backtick does not open a code span across paragraphs", () => {
    const content = 'Appuie sur ` puis Entrée.\n\n<mockup title="A"><p>x</p></mockup>\n\nUtilise `title`.';
    expect(splitMockupBlocks(content)).toEqual([
      { kind: "text", text: "Appuie sur ` puis Entrée.\n\n" },
      { kind: "mockup", title: "A", html: "<p>x</p>", complete: true },
      { kind: "text", text: "\n\nUtilise `title`." },
    ]);
  });
});

describe("sandbox and srcdoc", () => {
  test("the sandbox grants nothing", () => {
    expect(MOCKUP_SANDBOX).not.toContain("allow-same-origin");
    expect(MOCKUP_SANDBOX).not.toContain("allow-scripts");
  });

  const metaCount = (doc: string): number => doc.split('http-equiv="Content-Security-Policy"').length - 1;

  test("injects the CSP as the first child of an existing head", () => {
    const doc = buildMockupSrcdoc(DOC);
    expect(metaCount(doc)).toBe(1);
    expect(doc.startsWith(`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${MOCKUP_CSP}">`)).toBe(true);
    expect(buildMockupSrcdoc('<head lang="fr"><title>t</title></head>')).toStartWith('<head lang="fr"><meta ');
  });

  test("creates a head after html, after the doctype or as a prefix", () => {
    expect(buildMockupSrcdoc("<html><header>x</header></html>")).toStartWith("<html><head><meta ");
    const doctypeOnly = buildMockupSrcdoc("<!DOCTYPE html><body>x</body>");
    expect(doctypeOnly).toStartWith("<!DOCTYPE html><head><meta ");
    expect(metaCount(doctypeOnly)).toBe(1);
    expect(buildMockupSrcdoc("<p>x</p>")).toStartWith("<head><meta ");
  });

  test("size limit uses UTF-8 bytes", () => {
    expect(isMockupTooLarge("a".repeat(MOCKUP_MAX_BYTES))).toBe(false);
    expect(isMockupTooLarge("é".repeat(MOCKUP_MAX_BYTES / 2 + 1))).toBe(true);
  });
});

describe("collapseMockupHistory", () => {
  test("keeps only the last version of each title, byte-identical otherwise", () => {
    const first = 'v1 <mockup title="A">1</mockup> et <mockup title="B">b</mockup>';
    const second = 'v2 <mockup title="A">2</mockup>';
    const plain = "rien ```<mockup title=\"A\">x</mockup>```";
    expect(collapseMockupHistory([first, plain, second])).toEqual([
      'v1 [version précédente de la maquette « A » omise] et <mockup title="B">b</mockup>',
      plain,
      second,
    ]);
  });
});
