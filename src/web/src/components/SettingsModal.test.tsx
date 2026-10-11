import { expect, test } from "bun:test";

import { matchingSettingsSection } from "@/lib/settingsSearch";

test("exact GitHub setup phrases select Projects through global settings search", () => {
  for (const phrase of ["token GitHub", "jeton GitHub", "authentification GitHub"]) {
    expect(matchingSettingsSection(phrase)).toBe("projects");
    expect(matchingSettingsSection(`  ${phrase.toUpperCase()}  `)).toBe("projects");
  }
});

test("other connection and secret settings remain discoverable", () => {
  expect(matchingSettingsSection("azure devops")).toBe("projects");
  expect(matchingSettingsSection("compte")).toBe("github");
  expect(matchingSettingsSection("mcp")).toBe("mcp");
  expect(matchingSettingsSection("coolify")).toBe("coolify");
  expect(matchingSettingsSection("does not exist")).toBeUndefined();
});
