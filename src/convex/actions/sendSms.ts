"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import twilio from "twilio";

function getConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  return { accountSid, authToken, fromNumber };
}

function getClient() {
  const { accountSid, authToken } = getConfig();
  if (!accountSid || !authToken) {
    throw new Error(
      "Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in your project's Keys tab."
    );
  }
  return twilio(accountSid, authToken);
}

function getFromNumber() {
  const { fromNumber } = getConfig();
  if (!fromNumber) {
    throw new Error(
      "TWILIO_PHONE_NUMBER not configured. Set it in your project's Keys tab."
    );
  }
  return fromNumber;
}

async function sendSms(to: string, body: string) {
  const client = getClient();
  const from = getFromNumber();
  console.log(`[Whereहो SMS] Sending to ${to} from ${from}`);
  const message = await client.messages.create({ body, from, to });
  console.log(`[Whereहो SMS] Sent successfully. SID: ${message.sid}`);
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

    try {
      return await sendSms(args.toPhone, body);
    } catch (err) {
      console.error(`[Whereहो SMS] Failed to send journey start SMS to ${args.toPhone}:`, err);
      throw err;
    }
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

    try {
      return await sendSms(args.toPhone, body);
    } catch (err) {
      console.error(`[Whereहो SMS] Failed to send emergency SMS to ${args.toPhone}:`, err);
      throw err;
    }
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

    try {
      return await sendSms(args.toPhone, body);
    } catch (err) {
      console.error(`[Whereहो SMS] Failed to send deviation SMS to ${args.toPhone}:`, err);
      throw err;
    }
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

    try {
      return await sendSms(args.toPhone, body);
    } catch (err) {
      console.error(`[Whereहो SMS] Failed to send missed check-in SMS to ${args.toPhone}:`, err);
      throw err;
    }
  },
});
