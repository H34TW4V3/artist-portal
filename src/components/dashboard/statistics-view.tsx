
"use client"; // Add use client for Recharts components

import { DollarSign, Play, Users, TrendingUp } from "lucide-react";
import { StatCard } from "./stat-card";
import { getStreamingStats, type StreamingStats } from "@/services/music-platform";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils"; // Import cn utility
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart"; // Import chart components
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'; // Import recharts directly
import type React from "react";
import { useEffect, useState } from "react";

// Helper function to format numbers with K/M suffixes
const formatNumber = (num: number): string => {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'; // Remove .0 if present
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'; // Remove .0 if present
  }
  return num.toString();
};

// Helper function to format currency without cents
const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(num);
}

// Mock data generation for charts
const generateMockChartData = (months = 6) => {
    const data = [];
    const today = new Date();
    for (let i = months - 1; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthName = date.toLocaleString('default', { month: 'short' });
        data.push({
            month: monthName,
            // Simulate increasing trend with some randomness
            streams: Math.floor(Math.random() * 50000 + 100000 + (months - 1 - i) * 30000),
            revenue: Math.floor(Math.random() * 250 + 500 + (months - 1 - i) * 150),
        });
    }
    return data;
};

const chartData = generateMockChartData();

// Chart configuration
const chartConfig = {
  streams: {
    label: "Streams",
    color: "hsl(var(--chart-1))",
  },
  revenue: {
    label: "Revenue ($)",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;


interface StatisticsViewProps {
    className?: string; // Add className prop
}

// Make this a client component to fetch data dynamically
export function StatisticsView({ className }: StatisticsViewProps) {
  const [stats, setStats] = useState<StreamingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch mock stats. In a real app, you might pass an artistId or user token.
        const fetchedStats: StreamingStats = await getStreamingStats("artist-id-placeholder");
        setStats(fetchedStats);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
        // Handle error state appropriately, maybe show a message
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);


  return (
     <Card className={cn("col-span-1 lg:col-span-3 shadow-md rounded-lg", className)}> {/* Apply className */}
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-primary">Streaming Statistics</CardTitle>
        <CardDescription className="text-muted-foreground">Your latest performance overview.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
          {/* Stat Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {loading || !stats ? (
                <>
                 {/* Skeletons for Stat Cards */}
                 <Skeleton className="h-28 w-full" />
                 <Skeleton className="h-28 w-full" />
                 <Skeleton className="h-28 w-full" />
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

          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Streams Chart */}
            <Card className="bg-background/80 dark:bg-background/50 border border-border/40 shadow-sm rounded-lg">
                <CardHeader>
                    <CardTitle className="text-lg font-medium text-muted-foreground flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-accent" /> Streams Over Time
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">Last 6 Months</CardDescription>
                </CardHeader>
                <CardContent>
                     {loading ? (
                        <Skeleton className="h-[250px] w-full" />
                     ) : (
                        <ChartContainer config={chartConfig} className="h-[250px] w-full">
                            <ResponsiveContainer>
                                <LineChart
                                    data={chartData}
                                    margin={{ top: 5, right: 10, left: -10, bottom: 0 }} // Adjust margins
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
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
                                        tickFormatter={(value) => formatNumber(value)} // Format Y-axis numbers
                                        width={40} // Adjust width for labels
                                    />
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent hideLabel />}
                                        formatter={(value) => formatNumber(Number(value))}
                                    />
                                    <Line
                                        dataKey="streams"
                                        type="monotone"
                                        stroke="var(--color-streams)"
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
                     <CardDescription className="text-xs text-muted-foreground">Last 6 Months (Estimated USD)</CardDescription>
                </CardHeader>
                <CardContent>
                     {loading ? (
                         <Skeleton className="h-[250px] w-full" />
                     ) : (
                        <ChartContainer config={chartConfig} className="h-[250px] w-full">
                            <ResponsiveContainer>
                                <LineChart
                                    data={chartData}
                                    margin={{ top: 5, right: 10, left: -10, bottom: 0 }} // Adjust margins
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
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
                                        tickFormatter={(value) => `$${formatNumber(value)}`} // Format Y-axis currency
                                         width={40} // Adjust width for labels
                                    />
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent hideLabel />}
                                        formatter={(value) => formatCurrency(Number(value))}
                                    />
                                    <Line
                                        dataKey="revenue"
                                        type="monotone"
                                        stroke="var(--color-revenue)"
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

// Need Skeleton component for loading states
import { Skeleton } from "@/components/ui/skeleton";

