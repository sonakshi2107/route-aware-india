import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("trustedContacts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    relationship: v.optional(v.string()),
    isPrimary: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // If marking as primary, unset other primaries
    if (args.isPrimary) {
      const existing = await ctx.db
        .query("trustedContacts")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const contact of existing) {
        if (contact.isPrimary) {
          await ctx.db.patch(contact._id, { isPrimary: false });
        }
      }
    }

    return await ctx.db.insert("trustedContacts", {
      userId,
      name: args.name,
      phone: args.phone,
      relationship: args.relationship,
      isPrimary: args.isPrimary,
    });
  },
});

export const remove = mutation({
  args: { contactId: v.id("trustedContacts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.userId !== userId) {
      throw new Error("Contact not found");
    }
    await ctx.db.delete(args.contactId);
  },
});

export const update = mutation({
  args: {
    contactId: v.id("trustedContacts"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    relationship: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.userId !== userId) {
      throw new Error("Contact not found");
    }

    if (args.isPrimary) {
      const existing = await ctx.db
        .query("trustedContacts")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const c of existing) {
        if (c.isPrimary && c._id !== args.contactId) {
          await ctx.db.patch(c._id, { isPrimary: false });
        }
      }
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.relationship !== undefined) updates.relationship = args.relationship;
    if (args.isPrimary !== undefined) updates.isPrimary = args.isPrimary;

    await ctx.db.patch(args.contactId, updates);
  },
});
