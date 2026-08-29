import { query } from "./_generated/server";

/** Check if Twilio SMS is configured — call from the dashboard to show a banner */
export const checkSmsConfig = query({
  args: {},
  handler: async () => {
    const hasSid = !!process.env.TWILIO_ACCOUNT_SID;
    const hasToken = !!process.env.TWILIO_AUTH_TOKEN;
    const hasNumber = !!process.env.TWILIO_PHONE_NUMBER;
    return {
      configured: hasSid && hasToken && hasNumber,
      hasSid,
      hasToken,
      hasNumber,
    };
  },
});
