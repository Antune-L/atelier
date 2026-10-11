import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { autonomousStateSchema } from "@shared/autonomous";
import type { Ticket } from "@shared/schemas";

import { makeTicket } from "../../../server/testing/fixtures.ts";

import { TicketCard } from "./TicketCard";

function render(ticket: Ticket): string {
  return renderToStaticMarkup(
    <DndContext>
      <SortableContext items={[ticket.id]}>
        <TicketCard ticket={ticket} projectLabel="Test" onOpen={() => undefined} />
      </SortableContext>
    </DndContext>,
  );
}

const correcting = autonomousStateSchema.parse({ phase: "correcting", plan: null, acceptanceSnapshotId: null, functionalSnapshotId: null, revision: null, fullRunId: null, previewRunId: null, previewId: null, startedAt: 1, deadlineAt: 2, corrections: 1, error: null });

describe("TicketCard Devin marker", () => {
  test("autonomous ticket shows the Devin marker and its current phase", () => {
    const html = render(makeTicket({ autonomous: true, autonomousState: correcting }));
    expect(html).toContain("Devin");
    expect(html).toContain("Mode Devin actif");
    expect(html).toContain("Correction");
  });

  test("autonomous ticket without state shows only the marker", () => {
    const html = render(makeTicket({ autonomous: true, autonomousState: null }));
    expect(html).toContain("Mode Devin actif");
    expect(html).not.toContain("Correction");
  });

  test("non-autonomous ticket has no Devin marker", () => {
    expect(render(makeTicket({ autonomous: false }))).not.toContain("Devin");
  });
});
