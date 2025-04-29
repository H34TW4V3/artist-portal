import { StatisticsView } from "@/components/dashboard/statistics-view";
import { ReleaseForm } from "@/components/dashboard/release-form";
import { ReleaseList } from "@/components/dashboard/release-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Music } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-secondary">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
         {/* Optional Header Card */}
         <Card className="mb-4 sm:mb-8 bg-card shadow-lg rounded-lg">
             <CardHeader className="flex flex-row items-center gap-4">
                 <Music className="h-8 w-8 text-primary" />
                 <div>
                    <CardTitle className="text-3xl font-bold tracking-tight text-primary">Artist Hub</CardTitle>
                    <CardDescription className="text-muted-foreground">Welcome Back! Here's what's happening with your music.</CardDescription>
                 </div>
            </CardHeader>
         </Card>

        {/* Statistics Section */}
        <StatisticsView />

         <Separator className="my-4 md:my-8 bg-border" />

        {/* Release Management Section */}
        <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
          {/* Release Upload/Edit Form */}
          <div className="lg:col-span-1">
             <ReleaseForm />
          </div>
          {/* Release List */}
          <div className="lg:col-span-2">
             <ReleaseList />
          </div>
        </div>
      </main>
    </div>
  );
}
