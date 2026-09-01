import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

const PORT = process.env.PORT || 4000;

// In-memory stores (replace with DB in production)
const journeys = {};
const userLocations = {};

// ────────────────────────────────────────────
// REST API
// ────────────────────────────────────────────

/**
 * Compute routes between two points.
 * Returns stubbed safe / balanced / fast routes.
 * TODO: replace with Mapbox Directions or OpenRouteService.
 */
app.post("/api/route/compute", (req, res) => {
  const { start, end } = req.body; // { lat, lng }

  if (!start || !end) {
    return res.status(400).json({ error: "start and end are required" });
  }

  const routes = [
    {
      id: "r1",
      name: "Green (Safest)",
      color: "green",
      eta: 1800,
      geometry: null,
      safety_score: 0.92,
    },
    {
      id: "r2",
      name: "Yellow (Balanced)",
      color: "yellow",
      eta: 1600,
      geometry: null,
      safety_score: 0.78,
    },
    {
      id: "r3",
      name: "Red (Fastest)",
      color: "red",
      eta: 1400,
      geometry: null,
      safety_score: 0.61,
    },
  ];

  res.json({ routes });
});

/**
 * Start a journey.
 * Stores it in memory and emits a socket event so trusted contacts can follow.
 */
app.post("/api/journey/start", (req, res) => {
  const { userId, routeId, start, end, expectedArrival } = req.body;

  if (!userId || !routeId || !start || !end) {
    return res.status(400).json({ error: "missing required fields" });
  }

  const id = `j_${Date.now()}`;
  journeys[id] = {
    id,
    userId,
    routeId,
    start,
    end,
    expectedArrival,
    status: "ongoing",
    createdAt: Date.now(),
  };

  io.emit("journey-started", {
    journeyId: id,
    userId,
    start,
    end,
    expectedArrival,
  });

  res.json({ journeyId: id });
});

/**
 * Update live position during an active journey.
 * Broadcasts to all subscribers via socket.
 */
app.post("/api/journey/update", (req, res) => {
  const { journeyId, lat, lng, timestamp } = req.body;

  if (!journeys[journeyId]) {
    return res.status(404).json({ error: "journey not found" });
  }

  userLocations[journeyId] = { lat, lng, timestamp };

  io.emit("journey-position", { journeyId, lat, lng, timestamp });

  res.json({ ok: true });
});

/**
 * "I Feel Unsafe" trigger.
 * Returns a flag so the frontend can start discreet biometric / PIN verification.
 */
app.post("/api/journey/i-feel-unsafe", (_req, res) => {
  res.json({ requireVerification: true });
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", journeys: Object.keys(journeys).length });
});

// ────────────────────────────────────────────
// Socket.io
// ────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log(`[Socket] connected: ${socket.id}`);

  // A trusted contact subscribes to a journey's live updates
  socket.on("subscribe-journey", (journeyId) => {
    console.log(`[Socket] ${socket.id} subscribed to journey ${journeyId}`);
    socket.join(`journey_${journeyId}`);

    // Send latest position if available
    if (userLocations[journeyId]) {
      socket.emit("journey-position", {
        journeyId,
        ...userLocations[journeyId],
      });
    }
  });

  socket.on("unsubscribe-journey", (journeyId) => {
    socket.leave(`journey_${journeyId}`);
  });

  socket.on("disconnect", () => {
    console.log(`[Socket] disconnected: ${socket.id}`);
  });
});

// ────────────────────────────────────────────
// Start
// ────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`[Whereहो] Server running on http://localhost:${PORT}`);
});
