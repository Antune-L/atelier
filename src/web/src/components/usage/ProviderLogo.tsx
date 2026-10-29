import type { ReactNode } from "react";

import type { QuotaProvider } from "@shared/providerQuota";

import { cn } from "@/lib/utils";

const PROVIDER_LOGO_SOURCES = {
  claude: "/provider-logos/claude.png",
  codex: "/provider-logos/openai.png",
} satisfies Record<QuotaProvider, string>;

export function ProviderLogo({ provider, className }: { provider: QuotaProvider; className?: string }): ReactNode {
  return (
    <img
      src={PROVIDER_LOGO_SOURCES[provider]}
      alt=""
      className={cn("h-4 w-4 shrink-0 object-contain", provider === "codex" && "mix-blend-multiply dark:mix-blend-screen dark:invert", className)}
      aria-hidden="true"
    />
  );
}
