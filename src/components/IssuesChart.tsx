"use client"

import { useMemo, useState, useEffect } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { IssueSummary, TimelinePoint, TimeRange } from "@/services/openrouter"
import { cn } from "@/lib/utils"

interface IssuesChartProps {
  timeline: TimelinePoint[]
  issues: IssueSummary[]
  range: TimeRange
}

// Chart color palette (cycles through these for each model)
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

function formatDateLabel(dateString: string, range: TimeRange): string {
  const date = new Date(dateString)
  if (range === "15m" || range === "1h") {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }
  if (range === "6h" || range === "24h") {
    return date.toLocaleTimeString("en-US", { hour: "numeric", hour12: true })
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function getShortModelName(modelId: string): string {
  // Extract just the model name from "provider/model:variant" format
  const parts = modelId.split("/")
  const modelPart = parts[parts.length - 1]
  return modelPart.replace(/:free$/, "")
}

function InteractiveLegendContent({
  payload,
  visibleSeries,
  onToggle,
}: {
  payload?: any[]
  visibleSeries: Set<string>
  onToggle: (dataKey: string) => void
}) {
  if (!payload?.length) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
      {payload
        .filter((item) => item.type !== "none")
        .map((item) => {
          const isVisible = visibleSeries.has(item.dataKey)
          const shortName = getShortModelName(item.dataKey)

          return (
            <button
              key={item.dataKey ?? item.value}
              onClick={() => onToggle(item.dataKey)}
              className={cn(
                "flex items-center gap-1.5 rounded px-2 py-1 transition-opacity cursor-pointer",
                isVisible ? "opacity-100" : "opacity-40 hover:opacity-60"
              )}
              title={isVisible ? "Click to hide" : "Click to show"}
            >
              <div
                className={cn(
                  "h-2 w-2 shrink-0 rounded-[2px] transition-opacity",
                  !isVisible && "opacity-50"
                )}
                style={{
                  backgroundColor: item.color,
                }}
              />
              <span className={!isVisible ? "text-muted-foreground" : ""}>
                {shortName}
              </span>
            </button>
          )
        })}
    </div>
  )
}

export function IssuesChart({ timeline, issues, range }: IssuesChartProps) {
  // Get unique model IDs from issues (sorted by total issues)
  const modelIds = useMemo(() => {
    return issues.map((issue) => issue.modelId)
  }, [issues])

  // State to track which series are currently visible
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(new Set())

  // Initialize visible series when modelIds change
  useEffect(() => {
    setVisibleSeries(new Set(modelIds))
  }, [modelIds])

  // Handle legend click - toggle series visibility
  const handleLegendClick = (dataKey: string) => {
    setVisibleSeries((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(dataKey)) {
        // Only allow hiding if there's more than one visible series
        if (newSet.size > 1) {
          newSet.delete(dataKey)
        }
      } else {
        newSet.add(dataKey)
      }
      return newSet
    })
  }

  // Build chart config dynamically based on models present
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {}
    modelIds.forEach((modelId, index) => {
      config[modelId] = {
        label: getShortModelName(modelId),
        color: CHART_COLORS[index % CHART_COLORS.length],
      }
    })
    return config
  }, [modelIds])

  // Legend payload stays constant so clicking an item doesn't remove it
  const legendPayload = useMemo(
    () =>
      modelIds.map((modelId, index) => ({
        dataKey: modelId,
        value: chartConfig[modelId]?.label ?? getShortModelName(modelId),
        color: CHART_COLORS[index % CHART_COLORS.length],
        type: "square" as const,
      })),
    [chartConfig, modelIds]
  )

  // Format timeline data for recharts - ensure all models have values (0 if missing)
  const chartData = useMemo(() => {
    return timeline.map((point) => {
      const filledPoint: Record<string, number | string> = {
        date: point.date,
        dateLabel: formatDateLabel(point.date, range),
      }
      // Fill in 0 for any model not present in this time bucket
      modelIds.forEach((modelId) => {
        filledPoint[modelId] = typeof point[modelId] === "number" ? point[modelId] : 0
      })
      return filledPoint
    })
  }, [timeline, range, modelIds])

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-52 w-full sm:h-75"
    >
      <AreaChart data={chartData}>
        <defs>
          {modelIds.map((modelId, index) => (
            <linearGradient
              key={modelId}
              id={`fill-${index}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor={CHART_COLORS[index % CHART_COLORS.length]}
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor={CHART_COLORS[index % CHART_COLORS.length]}
                stopOpacity={0.1}
              />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="dateLabel"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          allowDecimals={false}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(value) => value}
              indicator="dot"
            />
          }
        />
        {modelIds.map((modelId, index) =>
          visibleSeries.has(modelId) ? (
            <Area
              key={modelId}
              dataKey={modelId}
              type="monotone"
              fill={`url(#fill-${index})`}
              stroke={CHART_COLORS[index % CHART_COLORS.length]}
            />
          ) : null
        )}
        <ChartLegend
          payload={legendPayload}
          content={<InteractiveLegendContent visibleSeries={visibleSeries} onToggle={handleLegendClick} />}
        />
      </AreaChart>
    </ChartContainer>
  )
}
