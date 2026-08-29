import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user === null) return null;
    return user;
  },
});

export const getCurrentUser = async (ctx: QueryCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;
  return await ctx.db.get(userId);
};

export const updateSettings = mutation({
  args: {
    checkInInterval: v.optional(v.number()),
    useBiometric: v.optional(v.boolean()),
    phone: v.optional(v.string()),
    homeLocation: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
        label: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const updates: Record<string, unknown> = {};
    if (args.checkInInterval !== undefined)
      updates.checkInInterval = args.checkInInterval;
    if (args.useBiometric !== undefined)
      updates.useBiometric = args.useBiometric;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.homeLocation !== undefined)
      updates.homeLocation = args.homeLocation;

    await ctx.db.patch(userId, updates);
  },
});
