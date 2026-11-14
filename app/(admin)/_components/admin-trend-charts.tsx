"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { AdminDailyPoint, AdminPlanMrr } from "@/core/admin/types";
import { formatMoney, formatNumber } from "../_lib/format";

/*
 * Dashboard trends (B7). One validated hue for every single-series chart (dataviz palette slot 1,
 * stepped for each mode; checked against the light and dark card surfaces), thin marks, a
 * recessive grid, a crosshair tooltip, and a table view under each chart.
 */

const SERIES_THEME = { light: "#2a78d6", dark: "#3987e5" } as const;

const METRICS = [
  { key: "signups", label: "Sign-ups" },
  { key: "workspaces", label: "New workspaces" },
  { key: "deliveries", label: "Deliveries created" },
  { key: "approvals", label: "Approvals" },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

function dayLabel(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Four small charts, one per measure: they count different things, so each gets its own scale. */
export function DailyTrends({ points }: { points: AdminDailyPoint[] }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        {METRICS.map((metric) => (
          <TrendCard key={metric.key} metric={metric.key} label={metric.label} points={points} />
        ))}
      </div>
      <details className="rounded-xl border border-border bg-card p-3 text-sm">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Show as a table</summary>
        <div className="mt-2 max-h-72 overflow-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 text-left font-medium">Day (UTC)</th>
                {METRICS.map((metric) => (
                  <th key={metric.key} className="py-1 text-right font-medium">
                    {metric.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {[...points].reverse().map((point) => (
                <tr key={point.day} className="border-t border-border">
                  <td className="py-1">{point.day}</td>
                  {METRICS.map((metric) => (
                    <td key={metric.key} className="py-1 text-right">
                      {formatNumber(point[metric.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function TrendCard({ metric, label, points }: { metric: MetricKey; label: string; points: AdminDailyPoint[] }) {
  const config = { value: { label, theme: SERIES_THEME } } satisfies ChartConfig;
  const data = points.map((point) => ({ day: point.day, value: point[metric] }));
  const total = data.reduce((sum, point) => sum + point.value, 0);
  const lastWeek = data.slice(-7).reduce((sum, point) => sum + point.value, 0);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{formatNumber(lastWeek)} in the last 7 days</p>
      </div>
      <p className="mb-2 text-xl font-bold">{formatNumber(total)}</p>
      <ChartContainer config={config} className="aspect-auto h-36 w-full">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} accessibilityLayer>
          <CartesianGrid vertical={false} strokeWidth={1} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            minTickGap={40}
            interval="preserveStartEnd"
            tickFormatter={dayLabel}
          />
          <YAxis allowDecimals={false} tickCount={3} tickLine={false} axisLine={false} width={32} tickMargin={4} />
          <ChartTooltip
            cursor={{ strokeWidth: 1 }}
            content={<ChartTooltipContent indicator="line" labelFormatter={(value) => dayLabel(String(value))} />}
          />
          <Area
            dataKey="value"
            type="linear"
            stroke="var(--color-value)"
            strokeWidth={2}
            fill="var(--color-value)"
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

/** List-price MRR per plan, ranked, one chart per currency (amounts in different currencies don't share an axis). */
export function MrrByPlan({ plans }: { plans: AdminPlanMrr[] }) {
  const currencies = [...new Set(plans.map((plan) => plan.currency))];
  if (plans.length === 0) {
    return <p className="text-sm text-muted-foreground">No active paid subscriptions yet.</p>;
  }

  return (
    <div className="space-y-4">
      {currencies.map((currency) => {
        const rows = plans
          .filter((plan) => plan.currency === currency)
          .sort((a, b) => b.amountCents - a.amountCents)
          .map((plan) => ({
            plan: plan.planName,
            amount: plan.amountCents / 100,
            label: formatMoney(plan.amountCents, currency),
            subscriptions: plan.subscriptions,
          }));
        const config = { amount: { label: `MRR (${currency})`, theme: SERIES_THEME } } satisfies ChartConfig;
        return (
          <div key={currency}>
            {currencies.length > 1 && <p className="mb-1 text-xs font-medium text-muted-foreground">{currency}</p>}
            <ChartContainer config={config} className="aspect-auto w-full" style={{ height: rows.length * 36 + 8 }}>
              <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 88, bottom: 4, left: 0 }} accessibilityLayer>
                <XAxis type="number" hide domain={[0, "dataMax"]} />
                <YAxis type="category" dataKey="plan" tickLine={false} axisLine={false} width={120} />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      formatter={(_value, _name, item) => (
                        <span className="flex w-full justify-between gap-3">
                          <span className="text-muted-foreground">
                            {formatNumber(item.payload.subscriptions)} {item.payload.subscriptions === 1 ? "subscription" : "subscriptions"}
                          </span>
                          <span className="font-medium text-foreground">{item.payload.label}</span>
                        </span>
                      )}
                    />
                  }
                />
                <Bar dataKey="amount" fill="var(--color-amount)" radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false}>
                  <LabelList dataKey="label" position="right" offset={8} className="fill-foreground" fontSize={12} />
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        );
      })}
      <details className="text-sm">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Show as a table</summary>
        <table className="mt-2 w-full text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 text-left font-medium">Plan</th>
              <th className="py-1 text-right font-medium">Subscriptions</th>
              <th className="py-1 text-right font-medium">MRR (list price)</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {plans.map((plan) => (
              <tr key={plan.planId} className="border-t border-border">
                <td className="py-1">{plan.planName}</td>
                <td className="py-1 text-right">{formatNumber(plan.subscriptions)}</td>
                <td className="py-1 text-right">{formatMoney(plan.amountCents, plan.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
