import { effectiveSchedule } from "../../shared/campaign.ts";
import type { Store } from "../db/store.ts";

/**
 * Time until which the preview of a campaign's final card is kept after delivery (FR7): the approved
 * review time, shifted by any extension. Null once it has passed and for every other ticket, whose previews keep their ordinary cleanup.
 */
export function campaignPreviewRetainedUntil(store: Store, ticketId: string): number | null {
  const campaign = store.campaigns.findByFinalTicket(ticketId);
  if (campaign === null || campaign.approvedVersion === null) return null;
  const until = campaign.runtime.finalization?.previewKeepUntil
    ?? effectiveSchedule(store.campaigns.requireVersion(campaign.id, campaign.approvedVersion).plan, campaign.runtime).reviewUntil;
  return Date.now() < until ? until : null;
}
