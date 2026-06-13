import { Plus } from "lucide-react";
import { useState } from "react";

import type { Ticket } from "@shared/schemas";

import { Board } from "@/components/Board";
import { NewTicketDialog } from "@/components/NewTicketDialog";
import { SlotsBar } from "@/components/SlotsBar";
import { TicketDetail } from "@/components/TicketDetail";
import { Toaster } from "@/components/Toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useBoard } from "@/hooks/useBoard";
import { useProjects } from "@/hooks/useProjects";

export function App() {
  const projects = useProjects();
  const { slots } = useBoard();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);

  const { tickets } = useBoard();
  const openTicket: Ticket | null = openTicketId
    ? (tickets.find((t) => t.id === openTicketId) ?? null)
    : null;

  return (
    <div className="min-h-screen bg-background p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Atelier</h1>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-48 bg-white"
            aria-label="Rechercher un ticket"
          />
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-white"
          >
            <option value="all">Tous les projets</option>
            {projects.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </Select>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="mb-4">
        <SlotsBar slots={slots} />
      </div>

      <Board
        projects={projects}
        projectFilter={filter}
        searchQuery={search}
        onOpenTicket={(t) => setOpenTicketId(t.id)}
        onAddTicket={() => setCreating(true)}
      />

      <NewTicketDialog
        open={creating}
        projects={projects}
        onClose={() => setCreating(false)}
      />
      <TicketDetail
        ticket={openTicket}
        projects={projects}
        onClose={() => setOpenTicketId(null)}
      />
      <Toaster />
    </div>
  );
}
