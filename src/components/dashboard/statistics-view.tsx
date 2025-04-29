import { DollarSign, Play, Users } from "lucide-react";
import { StatCard } from "./stat-card";
import { getStreamingStats, type StreamingStats } from "@/services/music-platform";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

export async function StatisticsView() {
  // Fetch mock stats. In a real app, you might pass an artistId or user token.
  const stats: StreamingStats = await getStreamingStats("artist-id-placeholder");

  return (
     <Card className="col-span-1 lg:col-span-3 bg-card shadow-md rounded-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-primary">Streaming Statistics</CardTitle>
        <CardDescription className="text-muted-foreground">Your latest performance overview.</CardDescription>
      </CardHeader>
      <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Total Streams"
              value={formatNumber(stats.streams)}
              icon={<Play className="h-5 w-5 text-accent" />} // Use accent color
              description="All-time streams across platforms"
            />
            <StatCard
              title="Revenue"
              value={formatCurrency(stats.revenue)}
              icon={<DollarSign className="h-5 w-5 text-accent" />} // Use accent color
              description="Estimated earnings (USD)"
            />
            <StatCard
              title="Listeners"
              value={formatNumber(stats.listeners)}
              icon={<Users className="h-5 w-5 text-accent" />} // Use accent color
              description="Unique listeners this month"
            />
          </div>
       </CardContent>
     </Card>
  );
}
