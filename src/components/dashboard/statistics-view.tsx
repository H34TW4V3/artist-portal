"use client"; // Required for Recharts in app directory (client component)

import { DollarSign, Play, Users, TrendingUp } from "lucide-react";
import { StatCard } from "./stat-card";
import { getStreamingStats, type StreamingStats } from "@/services/music-platform";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";
import React, { useEffect, useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Format numbers with K/M suffixes
const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return num.toString();
};

// Format currency without cents
const formatCurrency = (num: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);

// Generate mock data
const generateMockChartData = (months = 6) => {
  const data = [];
  const today = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthName = date.toLocaleString("default", { month: "short" });
    data.push({
      month: monthName,
      streams: Math.floor(Math.random() * 50000 + 100000 + (months - 1 - i) * 30000),
      revenue: Math.floor(Math.random() * 250 + 500 + (months - 1 - i) * 150)
    });
  }
  return data;
};

const chartData = generateMockChartData();

// Shuffle helper
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const chartColorVarNames = [
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5"
];

interface StatisticsViewProps {
  className?: string;
}

export function StatisticsView({ className }: StatisticsViewProps) {
  const [stats, setStats] = useState<StreamingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [shuffledChartColorVars, setShuffledChartColorVars] = useState<string[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const fetchedStats = await getStreamingStats("artist-id-placeholder");
        setStats(fetchedStats);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    setShuffledChartColorVars(shuffleArray(chartColorVarNames));
  }, []);

  const dynamicChartConfig = useMemo(() => {
    const streamColorVar = shuffledChartColorVars[0] || "--chart-1";
    const revenueColorVar = shuffledChartColorVars[1] || "--chart-2";

    return {
      streams: {
        label: "Streams",
        color: `hsl(var(${streamColorVar}))`
      },
      revenue: {
        label: "Revenue ($)",
        color: `hsl(var(${revenueColorVar}))`
      }
    } satisfies ChartConfig;
  }, [shuffledChartColorVars]);

  const hasStats = stats !== null;

  return (
    <Card className={cn("col-span-1 lg:col-span-3 shadow-md rounded-lg", className)}>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-primary">
          Streaming Statistics
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Your latest performance overview.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {!hasStats ? (
            <>
              <Skeleton className="h-28 w-full bg-muted/50" />
              <Skeleton className="h-28 w-full bg-muted/50" />
              <Skeleton className="h-28 w-full bg-muted/50" />
            </>
          ) : (
            <>
              <StatCard
                title="Total Streams"
                value={formatNumber(stats.streams)}
                icon={<Play className="h-5 w-5 text-accent" />}
                description="All-time streams across platforms"
                className="bg-background/80 dark:bg-background/50"
              />
              <StatCard
                title="Revenue"
                value={formatCurrency(stats.revenue)}
                icon={<DollarSign className="h-5 w-5 text-accent" />}
                description="Estimated earnings (USD)"
                className="bg-background/80 dark:bg-background/50"
              />
              <StatCard
                title="Listeners"
                value={formatNumber(stats.listeners)}
                icon={<Users className="h-5 w-5 text-accent" />}
                description="Unique listeners this month"
                className="bg-background/80 dark:bg-background/50"
              />
            </>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Streams Chart */}
          <Card className="bg-background/80 dark:bg-background/50 border border-border/40 shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" /> Streams Over Time
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Last 6 Months
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[250px] w-full bg-muted/50" />
              ) : (
                <ChartContainer config={dynamicChartConfig} className="h-[250px] w-full">
                  <ResponsiveContainer>
                    <LineChart
                      data={chartData}
                      margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(var(--border) / 0.5)"
                      />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        padding={{ left: 10, right: 10 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickFormatter={(value) => formatNumber(value)}
                        width={40}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                        formatter={(value) => formatNumber(Number(value))}
                      />
                      <Line
                        dataKey="streams"
                        type="monotone"
                        stroke={dynamicChartConfig.streams.color}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Revenue Chart */}
          <Card className="bg-background/80 dark:bg-background/50 border border-border/40 shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-accent" /> Revenue Over Time
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Last 6 Months (Estimated USD)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[250px] w-full bg-muted/50" />
              ) : (
                <ChartContainer config={dynamicChartConfig} className="h-[250px] w-full">
                  <ResponsiveContainer>
                    <LineChart
                      data={chartData}
                      margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(var(--border) / 0.5)"
                      />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        padding={{ left: 10, right: 10 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickFormatter={(value) => `$${formatNumber(value)}`}
                        width={40}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                      <Line
                        dataKey="revenue"
                        type="monotone"
                        stroke={dynamicChartConfig.revenue.color}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
