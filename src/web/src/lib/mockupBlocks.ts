// Web entry point for the shared mockup parser; keeps components importing from `@/lib`.
export { MOCKUP_CSP, MOCKUP_MAX_BYTES, MOCKUP_SANDBOX, buildMockupSrcdoc, isMockupTooLarge, splitMockupBlocks } from "@shared/mockupBlocks";
export type { MockupSegment } from "@shared/mockupBlocks";
