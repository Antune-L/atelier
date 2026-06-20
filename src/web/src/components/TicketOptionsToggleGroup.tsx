import {
  FileText,
  FlaskConical,
  GitMerge,
  GitPullRequest,
  type LucideIcon,
} from "lucide-react";
import { useRef } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

const TICKET_OPTION = {
  prd: "prd",
  draft: "draft",
  autoMerge: "auto-merge",
  verify: "verify",
} as const;

const OPTION_ITEM_CLASS =
  "h-16 w-full min-w-0 flex-row items-center justify-start gap-2 whitespace-normal px-3 text-sm font-normal hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 disabled:hover:translate-y-0 disabled:hover:shadow-none data-[state=on]:hover:-translate-y-0.5 data-[state=on]:hover:shadow-md";

const OPTION_ICON_CLASS = "h-4 w-4 shrink-0 self-center";

export interface TicketOptionValues {
  prdEnabled: boolean;
  prDraft: boolean;
  autoMerge: boolean;
  verifyFeature: boolean;
}

interface TicketOptionsToggleGroupProps {
  values: TicketOptionValues;
  onChange: (
    next: TicketOptionValues,
    meta: { autoMergeChanged: boolean },
  ) => void;
  headingId?: string;
  title?: string;
  className?: string;
}

function OptionToggleLabel({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <>
      <Icon className={OPTION_ICON_CLASS} aria-hidden />
      <span className="min-w-0 flex-1 self-center text-left leading-snug">
        {children}
      </span>
    </>
  );
}

export function TicketOptionsToggleGroup({
  values,
  onChange,
  headingId = "ticket-options-heading",
  title = "Options",
  className,
}: TicketOptionsToggleGroupProps) {
  const prDraftBeforeAutoMerge = useRef(values.prDraft);

  const selectedOptions = [
    ...(values.prdEnabled ? [TICKET_OPTION.prd] : []),
    ...(values.prDraft && !values.autoMerge ? [TICKET_OPTION.draft] : []),
    ...(values.autoMerge ? [TICKET_OPTION.autoMerge] : []),
    ...(values.verifyFeature ? [TICKET_OPTION.verify] : []),
  ];

  const onOptionsChange = (toggleValues: string[]): void => {
    const nextAutoMerge = toggleValues.includes(TICKET_OPTION.autoMerge);
    const nextDraft = toggleValues.includes(TICKET_OPTION.draft);
    let nextPrDraft = values.prDraft;
    let autoMergeChanged = false;

    if (nextAutoMerge !== values.autoMerge) {
      autoMergeChanged = true;
      if (nextAutoMerge) {
        prDraftBeforeAutoMerge.current = values.prDraft;
        nextPrDraft = false;
      } else {
        nextPrDraft = prDraftBeforeAutoMerge.current;
      }
    } else if (!nextAutoMerge && nextDraft !== values.prDraft) {
      nextPrDraft = nextDraft;
      prDraftBeforeAutoMerge.current = nextDraft;
    }

    onChange(
      {
        prdEnabled: toggleValues.includes(TICKET_OPTION.prd),
        prDraft: nextPrDraft,
        autoMerge: nextAutoMerge,
        verifyFeature: toggleValues.includes(TICKET_OPTION.verify),
      },
      { autoMergeChanged },
    );
  };

  return (
    <div className={cn("space-y-3 rounded-md border p-3", className)}>
      <h3 id={headingId} className="text-sm font-semibold">
        {title}
      </h3>
      <ToggleGroup
        type="multiple"
        variant="outline"
        value={selectedOptions}
        onValueChange={onOptionsChange}
        className="grid w-full grid-cols-1 items-stretch gap-2 sm:grid-cols-2"
        aria-labelledby={headingId}
      >
        <ToggleGroupItem
          value={TICKET_OPTION.prd}
          aria-label="PRD"
          className={OPTION_ITEM_CLASS}
        >
          <OptionToggleLabel icon={FileText}>PRD</OptionToggleLabel>
        </ToggleGroupItem>
        <ToggleGroupItem
          value={TICKET_OPTION.draft}
          disabled={values.autoMerge}
          aria-label="Ouvrir la PR en draft"
          className={OPTION_ITEM_CLASS}
        >
          <OptionToggleLabel icon={GitPullRequest}>
            Ouvrir la PR en draft
          </OptionToggleLabel>
        </ToggleGroupItem>
        <ToggleGroupItem
          value={TICKET_OPTION.autoMerge}
          aria-label="Merge automatique de la PR"
          className={OPTION_ITEM_CLASS}
        >
          <OptionToggleLabel icon={GitMerge}>
            Merge automatique de la PR
          </OptionToggleLabel>
        </ToggleGroupItem>
        <ToggleGroupItem
          value={TICKET_OPTION.verify}
          aria-label="Test approfondi"
          className={OPTION_ITEM_CLASS}
        >
          <OptionToggleLabel icon={FlaskConical}>Test approfondi</OptionToggleLabel>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
