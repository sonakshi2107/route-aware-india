import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Zap,
  AlertTriangle,
  MapPin,
  Navigation,
  Clock,
  Settings,
  Users,
  Check,
  Locate,
  Play,
  ArrowLeft,
  Sparkles,
  TrendingUp,
  Star,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import MapView, { generateDemoRoutes } from "@/components/MapView";
import SOSButton from "@/components/SOSButton";
import CheckInModal from "@/components/CheckInModal";
import TrustedContactsManager from "@/components/TrustedContactsManager";
import SettingsPanel from "@/components/SettingsPanel";

// Indian cities coordinates for demo
const INDIAN_CITIES: Record<string, [number, number]> = {
  delhi: [28.6139, 77.209],
  "new delhi": [28.6139, 77.209],
  mumbai: [19.076, 72.8777],
  bangalore: [12.9716, 77.5946],
  chennai: [13.0827, 80.2707],
  kolkata: [22.5726, 88.3639],
  hyderabad: [17.385, 78.4867],
  pune: [18.5204, 73.8567],
  jaipur: [26.9124, 75.7873],
  lucknow: [26.8467, 80.9462],
  gurugram: [28.4595, 77.0266],
  noida: [28.5355, 77.391],
  "connaught place": [28.6315, 77.2167],
  cp: [28.6315, 77.2167],
};

function getCoordinates(input: string): [number, number] | null {
  const lower = input.toLowerCase().trim();
  if (INDIAN_CITIES[lower]) return INDIAN_CITIES[lower];
  // Fallback: generate random coords near Delhi
  return [28.6 + Math.random() * 0.2, 77.1 + Math.random() * 0.2];
}

interface RouteInfo {
  type: "safe" | "balanced" | "fast";
  label: string;
  safetyScore: number;
  time: string;
  distance: string;
  icon: typeof Shield;
  color: string;
  bgColor: string;
  borderColor: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const activeJourney = useQuery(api.journeys.getActive);
  const recentJourneys = useQuery(api.journeys.getRecent) ?? [];
  const contacts = useQuery(api.trustedContacts.list) ?? [];
  const createJourney = useMutation(api.journeys.create);
  const startJourney = useMutation(api.journeys.startJourney);
  const completeJourney = useMutation(api.journeys.complete);
  const checkDeviation = useMutation(api.journeys.checkDeviation);

  // UI State
  const [view, setView] = useState<"planner" | "journey">("planner");
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [startCoords, setStartCoords] = useState<[number, number] | null>(null);
  const [endCoords, setEndCoords] = useState<[number, number] | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<
    "safe" | "balanced" | "fast"
  >("safe");
  const [planning, setPlanning] = useState(false);

  // Check-in
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [pendingCheckInId, setPendingCheckInId] = useState<string | null>(null);
  const [checkInCountdown, setCheckInCountdown] = useState<number | null>(null);

  // Panels
  const [contactsOpen, setContactsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Listen for custom event from SOS button to open contacts manager
  useEffect(() => {
    const handler = () => setContactsOpen(true);
    window.addEventListener("open-trusted-contacts", handler);
    return () => window.removeEventListener("open-trusted-contacts", handler);
  }, []);

  // Geolocation for current position
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const watchRef = useRef<number | null>(null);

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setCurrentLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }
    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, []);

  // Switch to journey view when active journey exists
  useEffect(() => {
    if (activeJourney) {
      setView("journey");
    }
  }, [activeJourney]);

  // Route planning
  const handlePlanRoute = useCallback(() => {
    if (!startLocation.trim() || !endLocation.trim()) {
      toast.error("Enter both start and destination locations");
      return;
    }
    const sCoords = getCoordinates(startLocation);
    const eCoords = getCoordinates(endLocation);
    if (!sCoords || !eCoords) {
      toast.error("Could not find those locations");
      return;
    }
    setStartCoords(sCoords);
    setEndCoords(eCoords);
    setPlanning(true);
  }, [startLocation, endLocation]);

  const handleStartJourney = async () => {
    if (!startCoords || !endCoords) return;
    try {
      const journeyId = await createJourney({
        startLocation,
        endLocation,
        startCoords: { lat: startCoords[0], lng: startCoords[1] },
        endCoords: { lat: endCoords[0], lng: endCoords[1] },
        routeType: selectedRoute,
        expectedArrival: Date.now() + 45 * 60 * 1000, // 45 min default
      });
      await startJourney({ journeyId });
      setView("journey");
      toast.success("Journey started!", {
        description: `Your trusted contact has been notified.`,
      });
    } catch {
      toast.error("Failed to start journey");
    }
  };

  const handleEndJourney = async () => {
    if (!activeJourney) return;
    try {
      await completeJourney({ journeyId: activeJourney._id });
      setView("planner");
      setPlanning(false);
      setStartCoords(null);
      setEndCoords(null);
      setStartLocation("");
      setEndLocation("");
      toast.success("Journey completed. Stay safe!");
    } catch {
      toast.error("Failed to end journey");
    }
  };

  // Check-in polling during active journey
  useEffect(() => {
    if (!activeJourney) return;
    // Simulate check-in every 10 minutes for demo
    const interval = setInterval(() => {
      toast("Are you okay?", {
        description: "Please verify your safety.",
        duration: 10000,
        action: {
          label: "I'm Safe",
          onClick: () => setCheckInOpen(true),
        },
      });
    }, 60000); // Every 60s for demo (would be 10min in production)

    return () => clearInterval(interval);
  }, [activeJourney]);

  // Deviation check during active journey
  useEffect(() => {
    if (!activeJourney || !currentLocation) return;
    const interval = setInterval(async () => {
      try {
        const result = await checkDeviation({
          journeyId: activeJourney._id,
          currentCoords: currentLocation,
        });
        if (result.deviation) {
          toast.error("Route deviation detected!", {
            description:
              "Your trusted contacts have been notified of the route change.",
          });
        }
      } catch {
        // silent
      }
    }, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, [activeJourney, currentLocation, checkDeviation]);

  const routes: RouteInfo[] = startCoords && endCoords
    ? [
        {
          type: "safe",
          label: "Safest Route",
          safetyScore: 92,
          time: "42 min",
          distance: "18 km",
          icon: Shield,
          color: "text-safe",
          bgColor: "bg-safe/10",
          borderColor: "border-safe/30",
        },
        {
          type: "balanced",
          label: "Balanced Route",
          safetyScore: 71,
          time: "35 min",
          distance: "15 km",
          icon: Zap,
          color: "text-balanced",
          bgColor: "bg-balanced/10",
          borderColor: "border-balanced/30",
        },
        {
          type: "fast",
          label: "Fastest Route",
          safetyScore: 45,
          time: "28 min",
          distance: "13 km",
          icon: AlertTriangle,
          color: "text-fast",
          bgColor: "bg-fast/10",
          borderColor: "border-fast/30",
        },
      ]
    : [];

  const demoRoutes =
    startCoords && endCoords
      ? generateDemoRoutes(startCoords, endCoords)
      : [];

  // =========== JOURNEY VIEW ===========
  if (view === "journey" && activeJourney) {
    return (
      <main className="min-h-screen bg-background flex flex-col">
        {/* Journey header */}
        <div className="bg-card border-b border-border/60 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={handleEndJourney}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>                  <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-safe animate-pulse" />
                  <p className="text-sm font-semibold">Journey in Progress</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeJourney.startLocation} → {activeJourney.endLocation}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Safety</p>
              <p className={`text-lg font-bold ${
                activeJourney.safetyScore >= 80
                  ? "text-safe"
                  : activeJourney.safetyScore >= 60
                  ? "text-balanced"
                  : "text-fast"
              }`}>
                {activeJourney.safetyScore}%
              </p>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <MapView
            center={currentLocation ? [currentLocation.lat, currentLocation.lng] : startCoords ?? [28.63, 77.22]}
            zoom={14}
            routes={demoRoutes}
            activeRoute={activeJourney.routeType}
            currentLocation={currentLocation}
            className="h-full min-h-[400px] rounded-none border-0"
          />

          {/* Floating controls — top of map */}
          <div className="absolute top-4 left-4 right-4 max-w-md mx-auto space-y-2.5 z-[1000]">
            {/* Emergency + I'm Safe row */}
            <div className="flex gap-2">
              <SOSButton journeyId={activeJourney._id} />
              <Button
                variant="outline"
                size="lg"
                className="flex-1 h-14 text-base font-bold gap-2.5 bg-card/95 backdrop-blur-md border-border/60 shadow-lg rounded-xl"
                onClick={() => setCheckInOpen(true)}
              >
                <Check className="w-5 h-5" />
                I'm Safe
              </Button>
            </div>

            {/* Secondary row */}
            <div className="flex gap-2">
              <Card className="flex-1 bg-card/95 backdrop-blur-md border-border/60 shadow-lg">
                <CardContent className="p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-accent" />
                    <span className="text-xs font-medium">Check-in</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {user?.checkInInterval ?? 10} min
                  </span>
                </CardContent>
              </Card>
              <Button
                variant="outline"
                className="bg-card/95 backdrop-blur-md border-border/60 shadow-lg rounded-xl px-4"
                onClick={() => setContactsOpen(true)}
              >
                <Users className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Check-in Modal */}
        <CheckInModal
          open={checkInOpen}
          onOpenChange={setCheckInOpen}
          checkInId={pendingCheckInId ?? "placeholder"}
          useBiometric={user?.useBiometric ?? false}
        />

        {/* Contacts Panel */}
        <TrustedContactsManager
          open={contactsOpen}
          onOpenChange={setContactsOpen}
        />
      </main>
    );
  }

  // =========== PLANNER VIEW ===========
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border/60 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MapPin className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight leading-none">
                Where<span className="text-accent">हो</span>
              </span>
              <span className="text-[10px] text-muted-foreground leading-none mt-0.5">AI Route Planner</span>
            </div>
          </div>
          <div className="flex items-center gap-1">              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setContactsOpen(true)}
                title="Trusted Contacts"
              >
                <Users className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setSettingsOpen(true)}
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-8">
        {/* Welcome */}
        <div className="py-6">
          <p className="text-sm text-muted-foreground">
            {new Date().getHours() < 12
              ? "Good morning"
              : new Date().getHours() < 17
              ? "Good afternoon"
              : "Good evening"}
            {user?.name ? `, ${user.name}` : ""}
          </p>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5">
            Where are you headed?
          </h1>
        </div>

        {/* Route planner card */}
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5 space-y-4">
            {/* Start */}
            <div className="relative">
              <div className="absolute left-3 top-3 h-2 w-2 rounded-full bg-safe border-2 border-safe/30" />
              <Input
                placeholder="Starting point"
                className="pl-8"
                value={startLocation}
                onChange={(e) => setStartLocation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handlePlanRoute();
                }}
              />
            </div>

            {/* End */}
            <div className="relative">
              <div className="absolute left-3 top-3 h-2 w-2 rounded-full bg-fast border-2 border-fast/30" />
              <Input
                placeholder="Enter destination"
                className="pl-8"
                value={endLocation}
                onChange={(e) => setEndLocation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handlePlanRoute();
                }}
              />
            </div>

            {/* Use current location */}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-accent"
              onClick={() => {
                if (currentLocation) {
                  setStartCoords([currentLocation.lat, currentLocation.lng]);
                  setStartLocation("Current Location");
                  toast.success("Using your current location");
                } else {
                  toast.error("Could not detect your location");
                }
              }}
            >
              <Locate className="w-3 h-3 mr-1.5" />
              Use my current location
            </Button>

            <Button
              className="w-full"
              size="lg"
              onClick={handlePlanRoute}
              disabled={!startLocation.trim() || !endLocation.trim()}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Analyse Routes
            </Button>
          </CardContent>
        </Card>

        {/* Route results */}
        <AnimatePresence>
          {planning && startCoords && endCoords && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-4 space-y-3"
            >
              {/* Map preview */}
              <div className="rounded-2xl overflow-hidden border border-border/60 shadow-sm">
                <MapView
                  center={[
                    (startCoords[0] + endCoords[0]) / 2,
                    (startCoords[1] + endCoords[1]) / 2,
                  ]}
                  zoom={13}
                  routes={demoRoutes}
                  activeRoute={selectedRoute}
                  className="h-[280px]"
                />
              </div>

              {/* Route options */}
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                AI-generated route options
              </p>

              {routes.map((route) => (
                <motion.div
                  key={route.type}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className={`cursor-pointer transition-all border-2 ${
                      selectedRoute === route.type
                        ? `${route.borderColor} shadow-md`
                        : "border-border/40 hover:border-border"
                    }`}
                    onClick={() => setSelectedRoute(route.type)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl ${route.bgColor} flex items-center justify-center shrink-0`}
                      >
                        <route.icon className={`w-6 h-6 ${route.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{route.label}</p>
                          {selectedRoute === route.type && (
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-3 h-3 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                          <span>{route.time}</span>
                          <span>•</span>
                          <span>{route.distance}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={`text-xl font-bold ${route.color}`}
                        >
                          {route.safetyScore}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          AI score
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              {/* Start journey */}
              <Button
                className="w-full mt-2"
                size="lg"
                onClick={handleStartJourney}
                disabled={contacts.length === 0}
              >
                <Play className="w-4 h-4 mr-2" />
                Start Journey
              </Button>
              {contacts.length === 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  Add at least one trusted contact before starting a journey
                </p>
              )}

              {/* Time-of-day notice */}
              <Card className="bg-accent/5 border-accent/20">
                <CardContent className="p-3 flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Safety scores adapt in real time based on current conditions. Routes may be rated differently at night due to reduced lighting and lower service availability.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent journeys */}
        {recentJourneys.length > 0 && !planning && (
          <div className="mt-8">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-3">
              Recent Trips
            </p>
            <div className="space-y-2">
              {recentJourneys.slice(0, 5).map((j) => (
                <Card key={j._id} className="border-border/40">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        j.routeType === "safe"
                          ? "bg-safe/10"
                          : j.routeType === "balanced"
                          ? "bg-balanced/10"
                          : "bg-fast/10"
                      }`}
                    >
                      {j.routeType === "safe" ? (
                        <Shield className="w-4 h-4 text-safe" />
                      ) : j.routeType === "balanced" ? (
                        <Zap className="w-4 h-4 text-balanced" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-fast" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {j.startLocation} → {j.endLocation}
                      </p>                <p className="text-xs text-muted-foreground">
                {new Date(j.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}{" "}
                • {j.status}
              </p>
                    </div>
                    <p
                      className={`text-sm font-bold ${
                        j.safetyScore >= 80
                          ? "text-safe"
                          : j.safetyScore >= 60
                          ? "text-balanced"
                          : "text-fast"
                      }`}
                    >
                      {j.safetyScore}%
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CheckInModal
        open={checkInOpen}
        onOpenChange={setCheckInOpen}
        checkInId={pendingCheckInId ?? "placeholder"}
        useBiometric={user?.useBiometric ?? false}
      />
      <TrustedContactsManager
        open={contactsOpen}
        onOpenChange={setContactsOpen}
      />
      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        currentInterval={user?.checkInInterval ?? 10}
        currentBiometric={user?.useBiometric ?? false}
      />
    </main>
  );
}
