import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

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

    // Send emergency SMS to all trusted contacts
    const user = await ctx.db.get(userId);
    const userName = user?.name ?? "Someone";
    const alertTypeLabel =
      args.type === "manual"
        ? "Manual Emergency"
        : args.type === "missed_checkins"
        ? "Missed Check-ins"
        : "Route Deviation";

    // Get current location from journey if available
    let location: string | undefined;
    if (args.journeyId) {
      const journey = await ctx.db.get(args.journeyId);
      if (journey) {
        location = `${journey.startLocation} → ${journey.endLocation}`;
      }
    }

    for (const contact of contacts) {
      if (contact.phone) {
        ctx.scheduler.runAfter(0, api.actions.sendSms.sendEmergencySms, {
          toPhone: contact.phone,
          userName,
          alertType: alertTypeLabel,
          location,
        });
      }
    }

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
