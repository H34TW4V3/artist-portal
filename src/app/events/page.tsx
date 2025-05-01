
"use client"; // Required for hooks and client-side interactions

import { useState, useEffect } from "react";
import UserProfile from "@/components/common/user-profile";
// import { TimeWeather } from "@/components/common/time-weather"; // Import TimeWeather - Temporarily disabled
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CalendarClock, Home, PlusCircle } from "lucide-react"; // Use CalendarClock icon, add PlusCircle
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useRouter } from 'next/navigation';
import { SplashScreen } from '@/components/common/splash-screen'; // Import SplashScreen
import { Calendar } from "@/components/ui/calendar"; // Import Calendar component
import { EventList } from "@/components/events/event-list"; // Import EventList (will create)
import { CreateEventModal } from "@/components/events/create-event-modal"; // Import CreateEventModal (will create)
import type { Event } from "@/types/event"; // Import Event type (will create)
import { getEvents } from "@/services/events"; // Import getEvents service (will create)
import { useToast } from "@/hooks/use-toast";

export default function EventsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch events
  const fetchEvents = async () => {
    if (!user) {
        setIsLoadingEvents(false);
        setEvents([]);
        return;
    }
    setIsLoadingEvents(true);
    try {
        const fetchedEvents = await getEvents();
        setEvents(fetchedEvents);
    } catch (error) {
        console.error("Error fetching events:", error);
        toast({
            title: "Error Loading Events",
            description: error instanceof Error ? error.message : "Could not load events.",
            variant: "destructive",
        });
        setEvents([]);
    } finally {
        setIsLoadingEvents(false);
    }
  };


  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

   // Fetch events on mount and when user changes
   useEffect(() => {
    fetchEvents();
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [user]);


  // Show loading indicator
  // Use SplashScreen instead of Loader2
  if (loading || (!user && !loading)) { // Show loader if initial auth check ongoing OR if determined no user
     // Pass user details if available, otherwise null
     return <SplashScreen
               loadingText="Loading Events..."
               userImageUrl={user?.photoURL}
               userName={user?.displayName || user?.email?.split('@')[0]}
               appletIcon={<CalendarClock />} // Pass the Events icon
            />; // Pass custom text and user info
  }

   // Calculate event dates for calendar highlighting
   const eventDates = events.map(event => {
     // Assuming event.date is a Timestamp from Firestore
     if (event.date instanceof Date) {
       return event.date;
     } else if (typeof event.date === 'object' && event.date !== null && 'toDate' in event.date) {
        // Handle Firestore Timestamp
        return event.date.toDate();
     }
     // Fallback for potentially string dates (adjust parsing as needed)
     try {
        const parsedDate = new Date(event.date as any);
        return isNaN(parsedDate.getTime()) ? null : parsedDate;
     } catch {
         return null;
     }
   }).filter((date): date is Date => date !== null); // Filter out nulls and type guard


  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent">
      <main className="relative z-10 flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {/* Header Card */}
        <Card className="mb-4 sm:mb-8 bg-card/60 dark:bg-card/50 shadow-lg rounded-lg border-border/30"> {/* Adjusted opacity */}
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap"> {/* Added flex-wrap */}
            <div className="flex items-center gap-4">
              <Link href="/" passHref legacyBehavior>
                <Button variant="ghost" size="lg" className="h-12 w-12 text-primary hover:bg-primary/10 active:bg-primary/20 p-0" aria-label="Go to Home">
                  <Home className="h-7 w-7" />
                </Button>
              </Link>
              <CalendarClock className="h-8 w-8 text-primary hidden sm:block" />
              <div className="text-center sm:text-left">
                <CardTitle className="text-xl sm:text-3xl font-bold tracking-tight text-primary text-center sm:text-left">
                  Events Management
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs sm:text-sm text-center sm:text-left">
                  Manage your upcoming events and view past ones.
                </CardDescription>
              </div>
            </div>
            {/* Time and Weather - Temporarily disabled
             <div className="flex-shrink-0 ml-auto hidden md:flex">
                 <TimeWeather />
             </div>
             */}
             {/* Render UserProfile component - added flex-shrink-0 */}
             <div className="flex-shrink-0 ml-auto"> {/* Adjusted to use ml-auto when weather is hidden */}
                <UserProfile />
             </div>
             {/* Mobile Time and Weather - Temporarily disabled
             <div className="w-full md:hidden mt-2">
                 <TimeWeather />
             </div>
             */}
          </CardHeader>
        </Card>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Column */}
          <Card className="lg:col-span-1 bg-card/60 dark:bg-card/50 border-border/30 shadow-md rounded-lg p-4 flex flex-col items-center"> {/* Adjusted opacity */}
             <h2 className="text-lg font-semibold text-foreground mb-4">Calendar</h2>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md"
               // Highlight dates with events
               modifiers={{ eventDates: eventDates }}
               modifiersStyles={{
                 eventDates: {
                   backgroundColor: 'hsl(var(--accent))',
                   color: 'hsl(var(--accent-foreground))',
                   borderRadius: '100%',
                   fontWeight: 'bold',
                 },
               }}
               // Disable past dates for selection if desired
               // disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
            />
          </Card>

          {/* Events List & Actions Column */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card/60 dark:bg-card/50 border-border/30 shadow-md rounded-lg"> {/* Adjusted opacity */}
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="text-lg font-semibold text-foreground">
                  Upcoming Events
                </CardTitle>
                 <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
                   <PlusCircle className="mr-2 h-4 w-4" /> Create Event
                 </Button>
              </CardHeader>
              <CardContent>
                <EventList events={events} isLoading={isLoadingEvents} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Create Event Modal */}
        <CreateEventModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={() => {
                setIsCreateModalOpen(false);
                fetchEvents(); // Refresh list after adding
            }}
        />
      </main>
    </div>
  );
}
