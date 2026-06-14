import {
  createContext,
  forwardRef,
  useContext,
  useMemo,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ResponsiveContainer, Tooltip, Legend } from "recharts";

import { cn } from "@/lib/utils";

/** Per-series display config: a human label and a CSS color (any valid CSS color value). */
export type ChartConfig = Record<string, { label: ReactNode; color?: string }>;

interface ChartContextValue {
  config: ChartConfig;
}

const ChartContext = createContext<ChartContextValue | null>(null);

function useChart(): ChartContextValue {
  const context = useContext(ChartContext);
  if (!context) throw new Error("useChart must be used within a <ChartContainer>");
  return context;
}

/** Build the `--color-<key>` CSS variables consumed by `var(--color-<key>)` series fills. */
function buildColorStyle(config: ChartConfig): CSSProperties {
  const vars: Record<string, string> = {};
  for (const [key, item] of Object.entries(config)) {
    if (item.color) vars[`--color-${key}`] = item.color;
  }
  return vars;
}

interface ChartContainerProps extends ComponentProps<"div"> {
  config: ChartConfig;
  children: ComponentProps<typeof ResponsiveContainer>["children"];
}

export const ChartContainer = forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ config, className, children, style, ...props }, ref) => {
    const colorStyle = useMemo(() => buildColorStyle(config), [config]);
    return (
      <ChartContext.Provider value={{ config }}>
        <div
          ref={ref}
          className={cn("h-64 w-full text-xs [&_.recharts-cartesian-grid_line]:stroke-border/60", className)}
          style={{ ...colorStyle, ...style }}
          {...props}
        >
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      </ChartContext.Provider>
    );
  },
);
ChartContainer.displayName = "ChartContainer";

export const ChartTooltip = Tooltip;

interface TooltipPayloadItem {
  name?: string | number;
  value?: string | number;
  dataKey?: string | number;
  color?: string;
  payload?: Record<string, unknown>;
}

interface ChartTooltipContentProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: ReactNode;
  /** Render the formatted value (e.g. duration). Receives the raw numeric/string value. */
  valueFormatter?: (value: string | number, item: TooltipPayloadItem) => ReactNode;
  /** Render an extra line under the value (e.g. sample size "n = 4"). */
  extraFormatter?: (item: TooltipPayloadItem) => ReactNode;
  hideLabel?: boolean;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  valueFormatter,
  extraFormatter,
  hideLabel,
}: ChartTooltipContentProps): ReactNode {
  const { config } = useChart();
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md">
      {!hideLabel && label !== undefined && <div className="mb-1 font-medium">{label}</div>}
      <div className="flex flex-col gap-1">
        {payload.map((item, index) => {
          const key = String(item.dataKey ?? item.name ?? index);
          const configItem = config[key];
          const labelNode = configItem?.label ?? item.name ?? key;
          const value = item.value ?? "";
          return (
            <div key={key} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground">{labelNode}</span>
              <span className="ml-auto font-mono font-medium tabular-nums">
                {valueFormatter ? valueFormatter(value, item) : value}
              </span>
              {extraFormatter && (
                <span className="text-muted-foreground">{extraFormatter(item)}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ChartLegend = Legend;

interface LegendPayloadItem {
  value?: string | number;
  color?: string;
  dataKey?: string | number;
}

interface ChartLegendContentProps {
  payload?: LegendPayloadItem[];
}

export function ChartLegendContent({ payload }: ChartLegendContentProps): ReactNode {
  const { config } = useChart();
  if (!payload || payload.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs">
      {payload.map((item, index) => {
        const key = String(item.dataKey ?? item.value ?? index);
        const configItem = config[key];
        return (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground">{configItem?.label ?? item.value}</span>
          </div>
        );
      })}
    </div>
  );
}
