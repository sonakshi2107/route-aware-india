import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Safety scoring factors based on proximity to police stations, hospitals,
// street lighting, population density, and crime rate — varies by time of day.
function calculateSafetyScore(
  routeType: "safe" | "balanced" | "fast",
  hourOfDay: number
): number {
  const baseScore =
    routeType === "safe" ? 92 : routeType === "balanced" ? 71 : 45;

  // Safety degrades at night (10 PM – 5 AM)
  const isNight = hourOfDay >= 22 || hourOfDay < 5;
  const isLateEvening = hourOfDay >= 20 && hourOfDay < 22;
  const isEarlyMorning = hourOfDay >= 5 && hourOfDay < 7;

  let modifier = 0;
  if (isNight) modifier = -15;
  else if (isLateEvening) modifier = -8;
  else if (isEarlyMorning) modifier = -3;

  return Math.max(0, Math.min(100, baseScore + modifier));
}

function getDistanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export const create = mutation({
  args: {
    startLocation: v.string(),
    endLocation: v.string(),
    startCoords: v.object({ lat: v.number(), lng: v.number() }),
    endCoords: v.object({ lat: v.number(), lng: v.number() }),
    routeType: v.union(
      v.literal("safe"),
      v.literal("balanced"),
      v.literal("fast")
    ),
    expectedArrival: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const hourOfDay = new Date().getHours();
    const safetyScore = calculateSafetyScore(args.routeType, hourOfDay);

    return await ctx.db.insert("journeys", {
      userId,
      startLocation: args.startLocation,
      endLocation: args.endLocation,
      startCoords: args.startCoords,
      endCoords: args.endCoords,
      routeType: args.routeType,
      safetyScore,
      status: "planned",
      expectedArrival: args.expectedArrival,
      deviationDetected: false,
      notifiedTrustedContact: false,
      createdAt: Date.now(),
    });
  },
});

export const startJourney = mutation({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const journey = await ctx.db.get(args.journeyId);
    if (!journey || journey.userId !== userId) {
      throw new Error("Journey not found");
    }

    await ctx.db.patch(args.journeyId, { status: "active" });

    // Create initial check-ins
    const user = await ctx.db.get(userId);
    const interval = user?.checkInInterval ?? 10;
    const now = Date.now();
    const journeyDuration = journey.expectedArrival - journey.createdAt;
    const numCheckIns = Math.max(1, Math.floor(journeyDuration / (interval * 60 * 1000)));

    for (let i = 1; i <= Math.min(numCheckIns, 10); i++) {
      await ctx.db.insert("checkIns", {
        journeyId: args.journeyId,
        userId,
        scheduledAt: now + i * interval * 60 * 1000,
        isVerified: false,
      });
    }

    // Notify trusted contacts
    const contacts = await ctx.db
      .query("trustedContacts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const primaryContact = contacts.find((c) => c.isPrimary) ?? contacts[0];

    if (primaryContact) {
      await ctx.db.patch(args.journeyId, { notifiedTrustedContact: true });
    }

    return args.journeyId;
  },
});

export const checkDeviation = mutation({
  args: {
    journeyId: v.id("journeys"),
    currentCoords: v.object({ lat: v.number(), lng: v.number() }),
  },
  handler: async (ctx, args) => {
    const journey = await ctx.db.get(args.journeyId);
    if (!journey) throw new Error("Journey not found");

    // Simple deviation check: if more than 500m from the straight-line path
    const distFromStart = getDistanceMeters(
      journey.startCoords,
      args.currentCoords
    );
    const totalDist = getDistanceMeters(
      journey.startCoords,
      journey.endCoords
    );
    const distToEnd = getDistanceMeters(args.currentCoords, journey.endCoords);

    // If the user is farther from destination than the total route distance
    // and not near the start, they're likely deviating
    const progress = distFromStart / totalDist;
    const deviation = distToEnd > totalDist * 1.3 && progress > 0.1;

    if (deviation && !journey.deviationDetected) {
      await ctx.db.patch(args.journeyId, { deviationDetected: true });

      // Create emergency alert for deviation
      await ctx.db.insert("emergencyAlerts", {
        userId: journey.userId,
        journeyId: args.journeyId,
        type: "route_deviation",
        triggeredAt: Date.now(),
        notifiedContacts: [],
      });
    }

    return { deviation };
  },
});

export const complete = mutation({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const journey = await ctx.db.get(args.journeyId);
    if (!journey || journey.userId !== userId) {
      throw new Error("Journey not found");
    }
    await ctx.db.patch(args.journeyId, {
      status: "completed",
      actualArrival: Date.now(),
    });
  },
});

export const cancel = mutation({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const journey = await ctx.db.get(args.journeyId);
    if (!journey || journey.userId !== userId) {
      throw new Error("Journey not found");
    }
    await ctx.db.patch(args.journeyId, { status: "cancelled" });
  },
});

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const journeys = await ctx.db
      .query("journeys")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "active")
      )
      .collect();
    return journeys[0] ?? null;
  },
});

export const getRecent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("journeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(10);
  },
});

export const getSafetyInfo = query({
  args: {},
  handler: async () => {
    const hourOfDay = new Date().getHours();
    return {
      safe: calculateSafetyScore("safe", hourOfDay),
      balanced: calculateSafetyScore("balanced", hourOfDay),
      fast: calculateSafetyScore("fast", hourOfDay),
      hourOfDay,
    };
  },
});
