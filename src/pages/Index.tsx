import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Scissors, Clock, Users, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-barbershop.jpg";

const Index = () => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const services = [
    { name: "Classic Haircut", price: "₱150", duration: "30 min", icon: Scissors },
    { name: "Premium Haircut", price: "₱250", duration: "45 min", icon: Scissors },
    { name: "Beard Trim", price: "₱100", duration: "20 min", icon: Scissors },
    { name: "Haircut + Beard", price: "₱300", duration: "50 min", icon: Scissors },
  ];

  const features = [
    {
      icon: Calendar,
      title: "Easy Booking",
      description: "Reserve your slot online and skip the wait",
    },
    {
      icon: Clock,
      title: "Real-time Queue",
      description: "Track your position and estimated wait time",
    },
    {
      icon: Users,
      title: "Professional Barbers",
      description: "Experienced staff for quality grooming",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background" />
        </div>
        
        <div className="container relative z-10 px-4 pt-20 pb-16 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="inline-block p-3 rounded-full bg-primary/10 mb-4">
              <Scissors className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              Premium Grooming,
              <span className="block text-primary">Zero Wait Time</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Book your appointment at Gupit Rizal and experience modern barbershop convenience
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to={user ? "/booking" : "/auth?mode=signup"}>
                <Button size="lg" className="text-lg px-8 shadow-lg hover:shadow-xl transition-all">
                  Book Now
                </Button>
              </Link>
              <Link to="/queue">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  View Queue
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why Choose <span className="text-primary">Gupit Rizal</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature) => (
              <Card key={feature.title} className="border-border hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 px-4 bg-card/50">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Our Services</h2>
          <p className="text-muted-foreground text-center mb-12 text-lg">
            Professional grooming services tailored to your style
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {services.map((service) => (
              <Card key={service.name} className="border-border hover:border-primary/50 transition-all hover:shadow-lg">
                <CardHeader>
                  <div className="p-3 rounded-lg bg-primary/10 w-fit mb-2">
                    <service.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{service.name}</CardTitle>
                  <CardDescription className="text-lg font-semibold text-primary">{service.price}</CardDescription>
                  <CardDescription className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {service.duration}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link to={user ? "/booking" : "/auth?mode=signup"}>
              <Button size="lg" className="px-8">
                Book Your Appointment
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2025 Gupit Rizal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
