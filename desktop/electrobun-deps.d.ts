/**
 * Electrobun's bun entrypoint is shipped as .ts source and re-exports optional 3D helpers
 * (`three`, etc.) that carry no bundled type declarations. We never touch those exports; this
 * ambient shim stops the desktop typecheck from failing on the transitive untyped import.
 */
declare module "three";
