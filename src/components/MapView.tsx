import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

// Default center: Connaught Place, Delhi
const DEFAULT_CENTER: [number, number] = [28.6315, 77.2167];

interface Route {
  type: "safe" | "balanced" | "fast";
  coordinates: [number, number][];
  active?: boolean;
}

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  routes?: Route[];
  activeRoute?: "safe" | "balanced" | "fast" | null;
  currentLocation?: { lat: number; lng: number } | null;
  className?: string;
  showMarker?: boolean;
  markerPosition?: [number, number];
}

// Generate curved route points between two coordinates
function generateRoute(
  start: [number, number],
  end: [number, number],
  offset: number,
  numPoints: number = 8
): [number, number][] {
  const points: [number, number][] = [];
  const midLat = (start[0] + end[0]) / 2 + offset * 0.3;
  const midLng = (start[1] + end[1]) / 2 + offset * 0.2;

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const lat =
      (1 - t) * (1 - t) * start[0] +
      2 * (1 - t) * t * midLat +
      t * t * end[0];
    const lng =
      (1 - t) * (1 - t) * start[1] +
      2 * (1 - t) * t * midLng +
      t * t * end[1];
    points.push([lat, lng]);
  }
  return points;
}

const ROUTE_COLORS: Record<string, string> = {
  safe: "#16a34a",
  balanced: "#d97706",
  fast: "#dc2626",
};

const ROUTE_LABELS: Record<string, string> = {
  safe: "Safest",
  balanced: "Balanced",
  fast: "Fastest",
};

export default function MapView({
  center = DEFAULT_CENTER,
  zoom = 13,
  routes = [],
  activeRoute = null,
  currentLocation = null,
  className,
  showMarker = false,
  markerPosition,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center,
      zoom,
      zoomControl: true,
      attributionControl: false,
    });

    // Use a clean, modern tile style
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors © CARTO",
      }
    ).addTo(map);

    mapInstanceRef.current = map;
    layersRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  // Draw routes
  useEffect(() => {
    if (!layersRef.current) return;
    layersRef.current.clearLayers();

    const safeStart = routes.find((r) => r.type === "safe")?.coordinates[0];
    const safeEnd = routes.find((r) => r.type === "safe")?.coordinates[
      routes.find((r) => r.type === "safe")!.coordinates.length - 1
    ];

    routes.forEach((route) => {
      if (!route.coordinates || route.coordinates.length < 2) return;

      const isActive = activeRoute === route.type;
      const color = ROUTE_COLORS[route.type];
      const weight = isActive ? 5 : 3;
      const opacity = isActive ? 1 : 0.4;

      // Draw route polyline
      const polyline = L.polyline(route.coordinates, {
        color,
        weight,
        opacity,
        dashArray: isActive ? undefined : "8, 8",
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layersRef.current!);

      if (!isActive) {
        polyline.bindTooltip(ROUTE_LABELS[route.type], {
          permanent: false,
          className: "text-xs font-medium",
        });
      }
    });

    // Start marker
    if (safeStart && routes.length > 0) {
      const startIcon = L.divIcon({
        className: "custom-marker",
        html: `<div style="width:24px;height:24px;border-radius:50%;background:#16a34a;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;">
          <div style="width:6px;height:6px;border-radius:50%;background:white;"></div>
        </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      L.marker(safeStart, { icon: startIcon })
        .bindTooltip("Start", { permanent: true, direction: "top", offset: [0, -14], className: "text-xs font-semibold !bg-card !text-foreground !border !border-border !shadow-sm !rounded-lg !px-2 !py-1" })
        .addTo(layersRef.current!);
    }

    // End marker
    if (safeEnd && routes.length > 0) {
      const endIcon = L.divIcon({
        className: "custom-marker",
        html: `<div style="width:24px;height:24px;border-radius:50%;background:#dc2626;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;">
          <div style="width:6px;height:6px;border-radius:50%;background:white;"></div>
        </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      L.marker(safeEnd, { icon: endIcon })
        .bindTooltip("Destination", { permanent: true, direction: "top", offset: [0, -14], className: "text-xs font-semibold !bg-card !text-foreground !border !border-border !shadow-sm !rounded-lg !px-2 !py-1" })
        .addTo(layersRef.current!);
    }

    // Current location marker
    if (currentLocation) {
      const locIcon = L.divIcon({
        className: "custom-marker",
        html: `<div style="width:20px;height:20px;border-radius:50%;background:#0ea5e9;border:3px solid white;box-shadow:0 2px 8px rgba(14,165,233,0.4);animation:pulse 2s infinite;">
          <style>@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}</style>
        </div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker([currentLocation.lat, currentLocation.lng], { icon: locIcon })
        .bindTooltip("You are here", { permanent: true, direction: "top", offset: [0, -14], className: "text-xs font-semibold !bg-card !text-foreground !border !border-border !shadow-sm !rounded-lg !px-2 !py-1" })
        .addTo(layersRef.current!);
    }

    // Fit bounds
    if (routes.length > 0) {
      const allCoords = routes.flatMap((r) => r.coordinates);
      if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords);
        mapInstanceRef.current?.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [routes, activeRoute, currentLocation]);

  // Extra marker
  useEffect(() => {
    if (!showMarker || !markerPosition || !layersRef.current) return;
    const icon = L.divIcon({
      className: "custom-marker",
      html: `<div style="width:24px;height:24px;border-radius:50%;background:#6366f1;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.2);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
    L.marker(markerPosition, { icon }).addTo(layersRef.current);
  }, [showMarker, markerPosition]);

  return (
    <div
      ref={mapRef}
      className={cn(
        "w-full h-full min-h-[300px] rounded-2xl bg-muted",
        className
      )}
    />
  );
}

// Utility to generate demo routes for a given start/end
export function generateDemoRoutes(
  start: [number, number],
  end: [number, number]
): Route[] {
  return [
    {
      type: "safe",
      coordinates: generateRoute(start, end, 0.03, 10),
    },
    {
      type: "balanced",
      coordinates: generateRoute(start, end, 0.005, 8),
    },
    {
      type: "fast",
      coordinates: generateRoute(start, end, -0.02, 6),
    },
  ];
}
