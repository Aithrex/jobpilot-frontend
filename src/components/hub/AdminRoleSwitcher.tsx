import { FlaskConical, RotateCcw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHubRoles } from "@/hooks/useHub";
import type { HubPathParams } from "@/types/hub";

interface AdminRoleSwitcherProps {
  override: HubPathParams | null;
  onChange: (params: HubPathParams | null) => void;
}

/**
 * Developer/admin-only preview control. Switches the previewed role + difficulty
 * WITHOUT touching the real user profile — it only drives the ?role/?difficulty
 * override on the hub queries (isolated `preview:` path server-side).
 */
export default function AdminRoleSwitcher({ override, onChange }: AdminRoleSwitcherProps) {
  const { data } = useHubRoles();
  if (!data) return null;

  const roles = data.roles ?? [];
  const difficulties = data.difficulties ?? [];
  const active = !!(override?.role || override?.difficulty);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] px-3 py-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
        <FlaskConical className="h-3.5 w-3.5" /> Dev preview
      </span>

      <Select
        value={override?.role ?? ""}
        onValueChange={(v) => onChange({ ...override, role: v })}
      >
        <SelectTrigger className="h-8 w-[190px] text-xs">
          <SelectValue placeholder="Preview role…" />
        </SelectTrigger>
        <SelectContent>
          {roles.map((r) => (
            <SelectItem key={r.key} value={r.key} className="text-xs">
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={override?.difficulty ?? ""}
        onValueChange={(v) => onChange({ ...override, difficulty: v })}
      >
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <SelectValue placeholder="Difficulty…" />
        </SelectTrigger>
        <SelectContent>
          {difficulties.map((d) => (
            <SelectItem key={d.key} value={d.key} className="text-xs">
              {d.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {active && (
        <>
          <Badge variant="outline" className="border-primary/30 text-[10px] text-primary">
            Preview mode
          </Badge>
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => onChange(null)}>
            <RotateCcw className="h-3.5 w-3.5" /> My profile
          </Button>
        </>
      )}
    </div>
  );
}
