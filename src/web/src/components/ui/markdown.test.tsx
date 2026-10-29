import { expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

// DOMPurify needs a real DOM, which does not exist under SSR: pass the marked output through.
mock.module("dompurify", () => ({
  default: () => ({ addHook: () => undefined, sanitize: (html: string) => html }),
}));

// The module reads the `window` global at load time; expose it only for the import.
Reflect.set(globalThis, "window", globalThis);
const { COPY_CODE_DONE_LABEL, COPY_CODE_FAILED_LABEL, COPY_CODE_LABEL, CopyCodeButton, Markdown, copyButtonLabel, copyCodeText } =
  await import("./markdown");
Reflect.deleteProperty(globalThis, "window");

test("copy button is labelled for screen readers and does not submit forms", () => {
  const html = renderToStaticMarkup(<CopyCodeButton getText={() => "bun install"} />);
  expect(html).toContain('type="button"');
  expect(html).toContain(`aria-label="${COPY_CODE_LABEL}"`);
  expect(html).toContain('data-copy-status="idle"');
  expect(COPY_CODE_LABEL).toBe("Copier le code");
});

test("copying writes exactly the code text and reports success", async () => {
  const copied: string[] = [];
  const status = await copyCodeText("bun install\n", async (text) => {
    copied.push(text);
  });
  expect(copied).toEqual(["bun install\n"]);
  expect(status).toBe("copied");
  expect(copyButtonLabel(status)).toBe(COPY_CODE_DONE_LABEL);
  expect(COPY_CODE_DONE_LABEL).toBe("Copié");
});

test("a rejected clipboard write resolves to a failure instead of throwing", async () => {
  const status = await copyCodeText("x", async () => {
    throw new Error("Clipboard denied");
  });
  expect(status).toBe("failed");
  expect(copyButtonLabel(status)).toBe(COPY_CODE_FAILED_LABEL);
});

test("only opted-in markdown is marked copyable; inline code has no block to host a button", () => {
  const fenced = "```sh\nbun install\n```";
  expect(renderToStaticMarkup(<Markdown content={fenced} copyableCode />)).toContain("markdown-copyable");
  const plain = renderToStaticMarkup(<Markdown content={fenced} />);
  expect(plain).not.toContain("markdown-copyable");
  expect(plain).not.toContain(COPY_CODE_LABEL);
  const inline = renderToStaticMarkup(<Markdown content="run `x` now" copyableCode />);
  expect(inline).toContain("<code>x</code>");
  expect(inline).not.toContain("<pre");
  expect(inline).not.toContain(COPY_CODE_LABEL);
});
