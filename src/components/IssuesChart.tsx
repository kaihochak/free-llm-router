"use client"

import { useMemo } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { IssueSummary, TimelinePoint, TimeRange } from "@/services/openrouter"

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
  if (range === "24h") {
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

export function IssuesChart({ timeline, issues, range }: IssuesChartProps) {
  // Get unique model IDs from issues (sorted by total issues)
  const modelIds = useMemo(() => {
    return issues.map((issue) => issue.modelId)
  }, [issues])

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
        {modelIds.map((modelId, index) => (
          <Area
            key={modelId}
            dataKey={modelId}
            type="monotone"
            fill={`url(#fill-${index})`}
            stroke={CHART_COLORS[index % CHART_COLORS.length]}
            stackId="a"
          />
        ))}
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  )
}
