import { LayoutGrid, MonitorPlay, Plus, Settings } from "lucide-react";
import { useState } from "react";

import type { Ticket } from "@shared/schemas";

import { AgentsView } from "@/components/AgentsView";
import { Board } from "@/components/Board";
import { NewTicketDialog } from "@/components/NewTicketDialog";
import { SettingsModal } from "@/components/SettingsModal";
import { SlotsBar } from "@/components/SlotsBar";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { TicketDetail } from "@/components/TicketDetail";
import { Toaster } from "@/components/Toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useBoard } from "@/hooks/useBoard";
import { useProjects } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";

type View = "kanban" | "agents";

const VIEW_OPTIONS: { value: View; label: string; Icon: typeof LayoutGrid }[] = [
  { value: "kanban", label: "Kanban", Icon: LayoutGrid },
  { value: "agents", label: "Agents", Icon: MonitorPlay },
];

export function App() {
  const projects = useProjects();
  const { slots } = useBoard();
  const [view, setView] = useState<View>("kanban");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
          <div className="inline-flex items-center rounded-md border bg-card p-0.5">
            {VIEW_OPTIONS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setView(value)}
                aria-pressed={view === value}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  view === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-48 bg-card"
            aria-label="Rechercher un ticket"
          />
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-card"
          >
            <option value="all">Tous les projets</option>
            {projects.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </Select>
          <ThemeSwitcher />
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            aria-label="Paramètres"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="mb-4">
        <SlotsBar slots={slots} />
      </div>

      {view === "kanban" ? (
        <Board
          projects={projects}
          projectFilter={filter}
          searchQuery={search}
          onOpenTicket={(t) => setOpenTicketId(t.id)}
          onAddTicket={() => setCreating(true)}
        />
      ) : (
        <AgentsView
          projects={projects}
          projectFilter={filter}
          searchQuery={search}
          onOpenTicket={(t) => setOpenTicketId(t.id)}
        />
      )}

      <NewTicketDialog
        open={creating}
        projects={projects}
        onClose={() => setCreating(false)}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
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
