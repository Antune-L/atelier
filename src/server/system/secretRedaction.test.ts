import { describe, expect, test } from "bun:test";

import { redactSecrets } from "./secretRedaction.ts";

const SUFFIX = "A1b2C3d4E5f6G7h8I9j0K1l2M3n4";

describe("redactSecrets", () => {
  test.each(["ghp_", "gho_", "ghu_", "ghs_", "ghr_"])("masks %s GitHub tokens", (prefix) => {
    const masked = redactSecrets(`token ${prefix}${SUFFIX} refusé`);
    expect(masked).toBe("token [redacted] refusé");
  });

  test("masks fine-grained personal access tokens", () => {
    expect(redactSecrets(`github_pat_11ABCDEFG_${SUFFIX}`)).toBe("[redacted]");
  });

  test("masks credentials embedded in https URLs", () => {
    expect(redactSecrets("fatal: https://alice:s3cret@github.com/o/r.git")).toBe("fatal: https://[redacted]@github.com/o/r.git");
    expect(redactSecrets("remote https://x-access@github.com/o/r")).toBe("remote https://[redacted]@github.com/o/r");
  });

  test("keeps the legacy quality patterns", () => {
    expect(redactSecrets("header Bearer abc.def")).toBe("header Bearer [redacted]");
    expect(redactSecrets("Authorization: Bearer abc.def")).not.toContain("abc.def");
    expect(redactSecrets("key sk-abcdef123")).toBe("key [redacted]");
    expect(redactSecrets('{"api_key": "abc"}')).toBe('{"api_key": "[redacted]"}');
    expect(redactSecrets("password=hunter2")).toBe("password=[redacted]");
  });

  test("keeps JSON-escaped quotes intact so the payload still parses", () => {
    const json = JSON.stringify({ body: 'use password="hunter2" here' });
    const masked = redactSecrets(json);
    expect(masked).not.toContain("hunter2");
    expect(JSON.parse(masked).body).toContain("[redacted]");
  });

  test("masks a secret value containing a backslash entirely", () => {
    expect(redactSecrets("password=ab\\cd next")).toBe("password=[redacted] next");
  });

  test("masks extra literal secrets such as a freshly pasted token", () => {
    expect(redactSecrets("bad credentials for abc123secret", ["abc123secret"])).toBe("bad credentials for [redacted]");
  });

  test("leaves ordinary text and plain URLs untouched", () => {
    const text = "git push https://github.com/o/r.git (ghp short) gh pr create";
    expect(redactSecrets(text)).toBe(text);
  });
});
