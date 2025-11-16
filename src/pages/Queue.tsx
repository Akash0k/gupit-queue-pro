import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

interface QueueItem {
  id: string;
  queue_number: number;
  estimated_wait_minutes: number;
  status: string;
  service: {
    name: string;
    duration_minutes: number;
  };
  profile: {
    full_name: string;
  };
}

const Queue = () => {
  const [user, setUser] = useState<any>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { role } = useUserRole(user?.id);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchQueue();

    // Set up realtime subscription
    const channel = supabase
      .channel("queue-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => {
          fetchQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchQueue = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          queue_number,
          estimated_wait_minutes,
          status,
          service:services(name, duration_minutes),
          profile:profiles!bookings_customer_id_fkey(full_name)
        `)
        .gte("scheduled_time", today.toISOString())
        .in("status", ["pending", "confirmed", "in_progress"])
        .order("queue_number");

      if (error) throw error;

      setQueue(data as any || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load queue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_progress":
        return "bg-primary";
      case "confirmed":
        return "bg-secondary";
      default:
        return "bg-muted";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "in_progress":
        return "In Progress";
      case "confirmed":
        return "Confirmed";
      default:
        return "Waiting";
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: newStatus as any })
        .eq("id", bookingId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: "Booking status has been updated successfully",
      });
      fetchQueue();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const canManageQueue = role === "barber" || role === "admin";

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      
      <div className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Queue Status</h1>
            <p className="text-muted-foreground text-lg">
              Track the current queue and estimated wait times
            </p>
          </div>

          {/* Queue Summary */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  People in Queue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{queue.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Average Wait Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {queue.length > 0
                    ? Math.round(
                        queue.reduce((acc, item) => acc + (item.estimated_wait_minutes || 0), 0) /
                          queue.length
                      )
                    : 0}{" "}
                  min
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Queue List */}
          <Card>
            <CardHeader>
              <CardTitle>Current Queue</CardTitle>
              <CardDescription>
                {loading ? "Loading..." : `${queue.length} customers waiting`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {queue.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No one in queue right now</p>
                  <p className="text-sm">Book an appointment to get started!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {queue.map((item, index) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        item.status === "in_progress"
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="text-2xl font-bold text-primary">
                            #{item.queue_number || index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold">{item.profile?.full_name || "Customer"}</div>
                            <div className="text-sm text-muted-foreground">{item.service?.name}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {canManageQueue ? (
                            <Select
                              value={item.status}
                              onValueChange={(value) => updateBookingStatus(item.id, value)}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Waiting</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge className={getStatusColor(item.status)}>
                              {getStatusText(item.status)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Est. wait: {item.estimated_wait_minutes || item.service?.duration_minutes || 0} min
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Queue;
