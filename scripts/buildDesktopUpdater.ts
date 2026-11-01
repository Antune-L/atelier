import { mkdir, writeFile } from "node:fs/promises";

await mkdir("dist", { recursive: true });
await writeFile("dist/desktop-update-trust.json", JSON.stringify({ publicKey: "" }));
const result = await Bun.build({ entrypoints: ["desktop/updateInstaller.ts"], target: "bun", outdir: "dist", naming: "updateInstaller.js" });
if (!result.success) throw new Error("Desktop update helper build failed.");
