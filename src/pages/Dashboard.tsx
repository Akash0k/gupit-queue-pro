import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import { Calendar, Clock, Scissors } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useUserRole } from "@/hooks/useUserRole";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { BarberDashboard } from "@/components/dashboard/BarberDashboard";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

interface Booking {
  id: string;
  scheduled_time: string;
  status: string;
  notes: string | null;
  queue_number: number | null;
  service: {
    name: string;
    duration_minutes: number;
    price: number;
  };
}

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [editTime, setEditTime] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, loading: roleLoading } = useUserRole(user?.id);

  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  ];

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          scheduled_time,
          status,
          notes,
          queue_number,
          service:services(name, duration_minutes, price)
        `)
        .eq("customer_id", user.id)
        .order("scheduled_time", { ascending: false });

      if (error) throw error;

      setBookings(data as any || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId);

      if (error) throw error;

      toast({
        title: "Booking Cancelled",
        description: "Your booking has been cancelled successfully",
      });
      fetchBookings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel booking",
        variant: "destructive",
      });
    }
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setEditDate(new Date(booking.scheduled_time));
    setEditTime(format(new Date(booking.scheduled_time), "HH:mm"));
    setEditNotes(booking.notes || "");
    setEditDialogOpen(true);
  };

  const handleUpdateBooking = async () => {
    if (!editingBooking || !editDate || !editTime) {
      toast({
        title: "Error",
        description: "Please select both date and time",
        variant: "destructive",
      });
      return;
    }

    try {
      const [hours, minutes] = editTime.split(":").map(Number);
      const scheduledDateTime = new Date(editDate);
      scheduledDateTime.setHours(hours, minutes, 0, 0);

      const { error } = await supabase
        .from("bookings")
        .update({
          scheduled_time: scheduledDateTime.toISOString(),
          notes: editNotes || null,
        })
        .eq("id", editingBooking.id);

      if (error) throw error;

      toast({
        title: "Booking Updated",
        description: "Your booking has been updated successfully",
      });
      setEditDialogOpen(false);
      fetchBookings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update booking",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-primary";
      case "in_progress":
        return "bg-accent";
      case "completed":
        return "bg-secondary";
      case "cancelled":
        return "bg-destructive";
      default:
        return "bg-muted";
    }
  };

  const upcomingBookings = bookings.filter(
    (b) => ["pending", "confirmed"].includes(b.status) && new Date(b.scheduled_time) > new Date()
  );
  const pastBookings = bookings.filter(
    (b) => b.status === "completed" || new Date(b.scheduled_time) < new Date()
  );

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar user={user} />
        <div className="container mx-auto px-4 pt-24 pb-16">
          <p className="text-center">Loading...</p>
        </div>
      </div>
    );
  }

  if (role === 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <Navbar user={user} />
        <div className="container mx-auto px-4 pt-24 pb-16">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage bookings, queue, and user roles</p>
          </div>
          <AdminDashboard />
        </div>
      </div>
    );
  }

  if (role === 'barber') {
    return (
      <div className="min-h-screen bg-background">
        <Navbar user={user} />
        <div className="container mx-auto px-4 pt-24 pb-16">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Barber Dashboard</h1>
            <p className="text-muted-foreground">Manage your appointments and queue</p>
          </div>
          <BarberDashboard userId={user.id} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      
      <div className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">My Dashboard</h1>
            <p className="text-muted-foreground text-lg">
              Manage your appointments and bookings
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : (
            <div className="space-y-8">
              {/* Upcoming Bookings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Upcoming Appointments</CardTitle>
                      <CardDescription>
                        {upcomingBookings.length} scheduled appointment{upcomingBookings.length !== 1 ? "s" : ""}
                      </CardDescription>
                    </div>
                    <Button onClick={() => navigate("/booking")}>
                      <Scissors className="h-4 w-4 mr-2" />
                      New Booking
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {upcomingBookings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No upcoming appointments</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {upcomingBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-lg">{booking.service?.name}</h3>
                                <Badge className={getStatusColor(booking.status)}>
                                  {booking.status}
                                </Badge>
                              </div>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  {format(new Date(booking.scheduled_time), "MMMM d, yyyy")}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  {format(new Date(booking.scheduled_time), "h:mm a")} ({booking.service?.duration_minutes} min)
                                </div>
                                {booking.queue_number && (
                                  <div className="text-primary font-medium">
                                    Queue Number: #{booking.queue_number}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold text-primary mb-2">
                                ₱{booking.service?.price}
                              </div>
                              {!["cancelled", "completed"].includes(booking.status) && (
                                <div className="flex gap-2">
                                  {booking.status === "pending" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditBooking(booking)}
                                    >
                                      Edit
                                    </Button>
                                  )}
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleCancelBooking(booking.id)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                          {booking.notes && (
                            <div className="text-sm text-muted-foreground mt-2 pt-2 border-t border-border">
                              <strong>Notes:</strong> {booking.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Past Bookings */}
              {pastBookings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Past Appointments</CardTitle>
                    <CardDescription>
                      {pastBookings.length} completed appointment{pastBookings.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pastBookings.slice(0, 5).map((booking) => (
                        <div
                          key={booking.id}
                          className="p-3 rounded-lg border border-border opacity-75"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{booking.service?.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(booking.scheduled_time), "MMM d, yyyy")}
                              </div>
                            </div>
                            <Badge className={getStatusColor(booking.status)} variant="outline">
                              {booking.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Booking Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
            <DialogDescription>
              Update your booking details. You can only edit pending bookings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Date Selection */}
            <div className="space-y-2">
              <Label>Select Date</Label>
              <CalendarComponent
                mode="single"
                selected={editDate}
                onSelect={setEditDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </div>

            {/* Time Selection */}
            <div className="space-y-2">
              <Label>Select Time</Label>
              <div className="grid grid-cols-4 gap-2">
                {timeSlots.map((time) => (
                  <Button
                    key={time}
                    variant={editTime === time ? "default" : "outline"}
                    onClick={() => setEditTime(time)}
                    className="w-full"
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes (Optional)</Label>
              <Textarea
                id="edit-notes"
                placeholder="Any special requests or notes..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBooking}>
              Update Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
