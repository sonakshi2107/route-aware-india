import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";


export const trigger = mutation({
  args: {
    journeyId: v.optional(v.id("journeys")),
    type: v.union(
      v.literal("manual"),
      v.literal("missed_checkins"),
      v.literal("route_deviation")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get trusted contacts to notify
    const contacts = await ctx.db
      .query("trustedContacts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const alert = await ctx.db.insert("emergencyAlerts", {
      userId,
      journeyId: args.journeyId,
      type: args.type,
      triggeredAt: Date.now(),
      notifiedContacts: contacts.map((c) => c._id),
    });

    // SMS notifications handled client-side via sms: URL scheme

    return alert;
  },
});

export const getRecent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("emergencyAlerts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(5);
  },
});

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const alerts = await ctx.db
      .query("emergencyAlerts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(1);
    return alerts[0] ?? null;
  },
});
