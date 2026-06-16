import type { ProjectInfo } from "@shared/schemas";

import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface ProjectSelectProps {
  id: string;
  projects: ProjectInfo[];
  value: string;
  onChange: (key: string) => void;
}

/** Labelled project dropdown shared by the ticket/import/ask panels. */
export function ProjectSelect({ id, projects, value, onChange }: ProjectSelectProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Projet</Label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="w-full">
        {projects.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
