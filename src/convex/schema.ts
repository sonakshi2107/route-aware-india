import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema(
  {
    ...authTables,

    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      phone: v.optional(v.string()),
      checkInInterval: v.optional(v.number()), // minutes, default 10
      useBiometric: v.optional(v.boolean()),
      homeLocation: v.optional(
        v.object({
          lat: v.number(),
          lng: v.number(),
          label: v.string(),
        })
      ),
    }).index("email", ["email"]),

    trustedContacts: defineTable({
      userId: v.id("users"),
      name: v.string(),
      phone: v.string(),
      relationship: v.optional(v.string()),
      isPrimary: v.boolean(),
    }).index("by_user", ["userId"]),

    journeys: defineTable({
      userId: v.id("users"),
      startLocation: v.string(),
      endLocation: v.string(),
      startCoords: v.object({ lat: v.number(), lng: v.number() }),
      endCoords: v.object({ lat: v.number(), lng: v.number() }),
      routeType: v.union(
        v.literal("safe"),
        v.literal("balanced"),
        v.literal("fast")
      ),
      safetyScore: v.number(),
      status: v.union(
        v.literal("planned"),
        v.literal("active"),
        v.literal("completed"),
        v.literal("cancelled")
      ),
      expectedArrival: v.number(),
      actualArrival: v.optional(v.number()),
      deviationDetected: v.boolean(),
      notifiedTrustedContact: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_status", ["userId", "status"]),

    checkIns: defineTable({
      journeyId: v.id("journeys"),
      userId: v.id("users"),
      scheduledAt: v.number(),
      respondedAt: v.optional(v.number()),
      isVerified: v.boolean(),
    })
      .index("by_journey", ["journeyId"])
      .index("by_user_scheduled", ["userId", "scheduledAt"]),

    emergencyAlerts: defineTable({
      userId: v.id("users"),
      journeyId: v.optional(v.id("journeys")),
      type: v.union(
        v.literal("manual"),
        v.literal("missed_checkins"),
        v.literal("route_deviation")
      ),
      triggeredAt: v.number(),
      notifiedContacts: v.array(v.id("trustedContacts")),
    }).index("by_user", ["userId"]),
  },
  {
    schemaValidation: false,
  }
);

export default schema;
