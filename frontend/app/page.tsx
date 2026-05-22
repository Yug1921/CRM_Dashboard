"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { m } from "framer-motion"
import type { Variants } from "framer-motion"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"
import { format } from "date-fns"
import { TrendingUp } from "lucide-react"

import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import type { StatsOverview } from "@/types/stats"

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

function buildCaptureSeries(data: StatsOverview) {
  return data.capture_rate_7d.map((entry) => ({
    date: format(new Date(entry.date), "MMM d"),
    count: entry.count,
  }))
}

function buildCategorySeries(data: StatsOverview) {
  return Object.entries(data.by_category).map(([key, value]) => ({
    category: key.replaceAll("_", " "),
    count: value,
  }))
}

function buildStatusSeries(data: StatsOverview) {
  return Object.entries(data.by_status).map(([key, value]) => ({
    status: key.replaceAll("_", " "),
    count: value,
  }))
}

export default function DashboardPage() {
  const [mounted, setMounted] = React.useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: api.getStatsOverview,
  })

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const captureSeries = data ? buildCaptureSeries(data) : []
  const categorySeries = data ? buildCategorySeries(data) : []
  const statusSeries = data ? buildStatusSeries(data) : []
  const replyRate = data ? Math.round(data.reply_rate * 100) : 0

  return (
    <m.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-bg"
    >
      <div className="relative overflow-hidden px-6 py-8">
        <div className="pointer-events-none absolute -left-20 -top-24 size-72 rounded-full bg-[radial-gradient(circle_at_center,var(--accent-dim),transparent_70%)]" />
        <div className="pointer-events-none absolute right-0 top-6 h-60 w-80 bg-[radial-gradient(circle_at_top,var(--accent-dim),transparent_65%)]" />

        <div className="mx-auto flex max-w-[1200px] flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-text">GoTeeOff overview</div>
              <div className="text-xs text-text-muted">Snapshot of pipeline health and AI capture</div>
            </div>
            <Badge variant="secondary">
              <TrendingUp className="size-3" />
              Live
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-28 w-full rounded-xl" />
              ))
            ) : (
              [
                {
                  label: "Total leads",
                  value: data?.total_leads ?? 0,
                  helper: "All captured leads",
                },
                {
                  label: "Captured today",
                  value: data?.captured_today ?? 0,
                  helper: "New in last 24h",
                },
                {
                  label: "Reply rate",
                  value: `${replyRate}%`,
                  helper: "Responded vs contacted",
                },
                {
                  label: "Top region",
                  value: data?.top_locations?.[0]?.location ?? "-",
                  helper: "Highest lead count",
                },
              ].map((metric) => (
                <m.div key={metric.label} variants={cardVariants}>
                  <Card className="border border-border bg-surface">
                    <CardHeader>
                      <CardTitle>{metric.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-semibold text-text">{metric.value}</div>
                      <div className="text-xs text-text-muted">{metric.helper}</div>
                    </CardContent>
                  </Card>
                </m.div>
              ))
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <m.div variants={cardVariants}>
              <Card className="border border-border bg-surface">
                <CardHeader>
                  <CardTitle>Capture momentum</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  {isLoading ? (
                    <Skeleton className="h-full w-full" />
                  ) : mounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={captureSeries} margin={{ left: -8, right: 8 }}>
                        <defs>
                          <linearGradient id="capture" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--text-muted)" />
                        <YAxis tick={{ fontSize: 12 }} stroke="var(--text-muted)" />
                        <RechartsTooltip
                          cursor={{ fill: "var(--accent-dim)" }}
                          contentStyle={{ background: "var(--popover)", borderColor: "var(--border)" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="var(--accent)"
                          fill="url(#capture)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-text-muted">
                      Loading chart...
                    </div>
                  )}
                </CardContent>
              </Card>
            </m.div>

            <m.div variants={cardVariants}>
              <Card className="border border-border bg-surface">
                <CardHeader>
                  <CardTitle>Reply rate</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-24 w-full" />
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="text-sm text-text-muted">Conversions from contacted leads</div>
                      <div className="flex items-end gap-3">
                        <div className="text-3xl font-semibold text-text">{replyRate}%</div>
                        <div className="text-xs text-text-muted">Goal 35%</div>
                      </div>
                      <Progress value={replyRate} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </m.div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <m.div variants={cardVariants}>
              <Card className="border border-border bg-surface">
                <CardHeader>
                  <CardTitle>Category volume</CardTitle>
                </CardHeader>
                <CardContent className="h-56">
                  {isLoading ? (
                    <Skeleton className="h-full w-full" />
                  ) : mounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categorySeries} margin={{ left: -16, right: 12 }}>
                        <XAxis dataKey="category" tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
                        <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
                        <RechartsTooltip
                          cursor={{ fill: "var(--accent-dim)" }}
                          contentStyle={{ background: "var(--popover)", borderColor: "var(--border)" }}
                        />
                        <Bar dataKey="count" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-text-muted">
                      Loading chart...
                    </div>
                  )}
                </CardContent>
              </Card>
            </m.div>

            <m.div variants={cardVariants}>
              <Card className="border border-border bg-surface">
                <CardHeader>
                  <CardTitle>Status mix</CardTitle>
                </CardHeader>
                <CardContent className="h-56">
                  {isLoading ? (
                    <Skeleton className="h-full w-full" />
                  ) : mounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusSeries} margin={{ left: -16, right: 12 }}>
                        <XAxis dataKey="status" tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
                        <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
                        <RechartsTooltip
                          cursor={{ fill: "var(--accent-dim)" }}
                          contentStyle={{ background: "var(--popover)", borderColor: "var(--border)" }}
                        />
                        <Bar dataKey="count" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-text-muted">
                      Loading chart...
                    </div>
                  )}
                </CardContent>
              </Card>
            </m.div>
          </div>

          {/* TODO(phase-2): Add cohort retention and outreach attribution panels. */}
        </div>
      </div>
    </m.div>
  )
}