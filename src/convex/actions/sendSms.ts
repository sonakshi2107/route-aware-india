"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import twilio from "twilio";

function getClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error(
      "Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN."
    );
  }
  return twilio(accountSid, authToken);
}

function getFromNumber() {
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    throw new Error("TWILIO_PHONE_NUMBER not configured.");
  }
  return from;
}

async function sendSms(to: string, body: string) {
  const client = getClient();
  const from = getFromNumber();
  const message = await client.messages.create({ body, from, to });
  return message.sid;
}

/** Send journey start notification to a trusted contact */
export const sendJourneyStartSms = action({
  args: {
    toPhone: v.string(),
    userName: v.string(),
    startLocation: v.string(),
    endLocation: v.string(),
    estimatedTime: v.string(),
  },
  handler: async (_ctx, args) => {
    const body = [
      `Whereहो Safety Alert`,
      ``,
      `${args.userName} has started a journey.`,
      `From: ${args.startLocation}`,
      `To: ${args.endLocation}`,
      `Estimated arrival: ${args.estimatedTime}`,
      ``,
      `Track their safety at whereho.app`,
    ].join("\n");

    return await sendSms(args.toPhone, body);
  },
});

/** Send emergency alert SMS to a trusted contact */
export const sendEmergencySms = action({
  args: {
    toPhone: v.string(),
    userName: v.string(),
    alertType: v.string(),
    location: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const locationLine = args.location
      ? `Location: ${args.location}`
      : "Location: Unknown";

    const body = [
      `🚨 Whereहो EMERGENCY ALERT`,
      ``,
      `${args.userName} has triggered an emergency alert.`,
      `Type: ${args.alertType}`,
      locationLine,
      ``,
      `Please contact them immediately or call emergency services (100).`,
    ].join("\n");

    return await sendSms(args.toPhone, body);
  },
});

/** Send route deviation alert SMS */
export const sendDeviationSms = action({
  args: {
    toPhone: v.string(),
    userName: v.string(),
    startLocation: v.string(),
    endLocation: v.string(),
  },
  handler: async (_ctx, args) => {
    const body = [
      `⚠️ Whereहो Route Deviation`,
      ``,
      `${args.userName} has deviated from their planned route.`,
      `Planned: ${args.startLocation} → ${args.endLocation}`,
      ``,
      `Please check on them immediately.`,
    ].join("\n");

    return await sendSms(args.toPhone, body);
  },
});

/** Send missed check-in alert SMS */
export const sendMissedCheckInSms = action({
  args: {
    toPhone: v.string(),
    userName: v.string(),
    missedCount: v.number(),
  },
  handler: async (_ctx, args) => {
    const body = [
      `⚠️ Whereहो Missed Check-in`,
      ``,
      `${args.userName} has missed ${args.missedCount} consecutive safety check-in(s).`,
      ``,
      `Please contact them immediately or call emergency services (100) if you are concerned.`,
    ].join("\n");

    return await sendSms(args.toPhone, body);
  },
});
