import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

interface Booking {
  id: string;
  scheduled_time: string;
  status: string;
  queue_number: number | null;
  estimated_wait_minutes: number | null;
  notes: string | null;
  profile: { full_name: string; phone: string | null };
  service: { name: string; duration_minutes: number; price: number };
}

export const BarberDashboard = ({ userId }: { userId: string }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [todayStats, setTodayStats] = useState({ total: 0, completed: 0, pending: 0 });
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
    fetchTodayStats();

    const channel = supabase
      .channel('barber-bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `barber_id=eq.${userId}`
        },
        () => {
          fetchBookings();
          fetchTodayStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchBookings = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          scheduled_time,
          status,
          queue_number,
          estimated_wait_minutes,
          notes,
          profile:profiles!bookings_customer_id_fkey(full_name, phone),
          service:services(name, duration_minutes, price)
        `)
        .eq("barber_id", userId)
        .gte("scheduled_time", today.toISOString())
        .order("scheduled_time", { ascending: true });

      if (error) throw error;
      setBookings(data as any || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const fetchTodayStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: total } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("barber_id", userId)
        .gte("scheduled_time", today.toISOString());

      const { count: completed } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("barber_id", userId)
        .eq("status", "completed")
        .gte("scheduled_time", today.toISOString());

      const { count: pending } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("barber_id", userId)
        .in("status", ["pending", "confirmed"])
        .gte("scheduled_time", today.toISOString());

      setTodayStats({
        total: total || 0,
        completed: completed || 0,
        pending: pending || 0
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: newStatus })
        .eq("id", bookingId);

      if (error) throw error;

      toast({ title: "Success", description: "Booking status updated" });
      fetchBookings();
      fetchTodayStats();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-500",
      confirmed: "bg-blue-500",
      in_progress: "bg-purple-500",
      completed: "bg-green-500",
      cancelled: "bg-red-500"
    };
    return colors[status] || "bg-gray-500";
  };

  const activeBookings = bookings.filter(b => ["pending", "confirmed", "in_progress"].includes(b.status));
  const completedBookings = bookings.filter(b => b.status === "completed");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats.completed}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Appointments</CardTitle>
          <CardDescription>Your current and upcoming appointments</CardDescription>
        </CardHeader>
        <CardContent>
          {activeBookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No active appointments</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{format(new Date(booking.scheduled_time), "h:mm a")}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{booking.profile?.full_name}</div>
                        <div className="text-sm text-muted-foreground">{booking.profile?.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>{booking.service?.name}</TableCell>
                    <TableCell>{booking.service?.duration_minutes} min</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={booking.status}
                        onValueChange={(value) => updateBookingStatus(booking.id, value as any)}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Completed Today</CardTitle>
          <CardDescription>Your completed appointments</CardDescription>
        </CardHeader>
        <CardContent>
          {completedBookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No completed appointments yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{format(new Date(booking.scheduled_time), "h:mm a")}</TableCell>
                    <TableCell>{booking.profile?.full_name}</TableCell>
                    <TableCell>{booking.service?.name}</TableCell>
                    <TableCell>₱{booking.service?.price}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
