import type { Store } from "../db/store.ts";

/**
 * Time until which the preview of a campaign's final card is kept after delivery (FR7): the approved
 * review time. Null for every other ticket, whose previews keep their ordinary cleanup.
 */
export function campaignPreviewRetainedUntil(store: Store, ticketId: string): number | null {
  const campaign = store.campaigns.findByFinalTicket(ticketId);
  if (campaign === null || campaign.approvedVersion === null) return null;
  const reviewUntil = Date.parse(store.campaigns.requireVersion(campaign.id, campaign.approvedVersion).plan.schedule.reviewUntil);
  return Number.isFinite(reviewUntil) ? reviewUntil : null;
}
