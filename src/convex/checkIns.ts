import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getPending = query({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const now = Date.now();
    const checkIns = await ctx.db
      .query("checkIns")
      .withIndex("by_journey", (q) => q.eq("journeyId", args.journeyId))
      .collect();

    // Find the next unresponded check-in that's due
    return checkIns
      .filter((c) => !c.respondedAt && c.scheduledAt <= now)
      .sort((a, b) => a.scheduledAt - b.scheduledAt)[0] ?? null;
  },
});

export const getMissedCount = query({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const checkIns = await ctx.db
      .query("checkIns")
      .withIndex("by_journey", (q) => q.eq("journeyId", args.journeyId))
      .collect();

    // Count check-ins that are past due and not responded to
    return checkIns.filter(
      (c) => !c.respondedAt && c.scheduledAt < now - 60000 // 1 min grace
    ).length;
  },
});

export const respond = mutation({
  args: {
    checkInId: v.id("checkIns"),
    isVerified: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const checkIn = await ctx.db.get(args.checkInId);
    if (!checkIn || checkIn.userId !== userId) {
      throw new Error("Check-in not found");
    }

    await ctx.db.patch(args.checkInId, {
      respondedAt: Date.now(),
      isVerified: args.isVerified,
    });

    return true;
  },
});

export const getAllForJourney = query({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("checkIns")
      .withIndex("by_journey", (q) => q.eq("journeyId", args.journeyId))
      .collect();
  },
});
