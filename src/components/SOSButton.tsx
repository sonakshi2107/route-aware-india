import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Phone,
  MapPin,
  Shield,
  Check,
  CheckCircle,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import {
  sendEmergencySMS,
  getCurrentLocation,
  formatPhoneForSMS,
} from "@/lib/sms";

const HOLD_DURATION_MS = 2000;
const RING_RADIUS = 28;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface SOSButtonProps {
  journeyId?: string;
}

type ModalState =
  | "idle"
  | "no-contact"
  | "getting-location"
  | "sending"
  | "done";

interface Contact {
  name: string;
  phone: string;
}

export default function SOSButton({ journeyId }: SOSButtonProps) {
  const contacts = useQuery(api.trustedContacts.list) ?? [];
  const user = useQuery(api.users.currentUser);
  const triggerAlert = useMutation(api.emergencyAlerts.trigger);

  const [modalState, setModalState] = useState<ModalState>("idle");
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [sentPhones, setSentPhones] = useState<Set<string>>(new Set());
  const [currentSendIndex, setCurrentSendIndex] = useState(0);
  const [locationObtained, setLocationObtained] = useState(false);

  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef(0);
  const holdCompleteRef = useRef(false);
  const locationRef = useRef<{ latitude: number; longitude: number } | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    };
  }, []);

  const resetHold = useCallback(() => {
    setIsHolding(false);
    setProgress(0);
    progressRef.current = 0;
    holdCompleteRef.current = false;
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  /**
   * New flow: hold complete → getLocation → create Google Maps link → sendSMS
   */
  const handleHoldStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (contacts.length === 0) {
        setModalState("no-contact");
        return;
      }

      setIsHolding(true);
      progressRef.current = 0;
      holdCompleteRef.current = false;

      const tick = 50;
      holdTimerRef.current = setInterval(() => {
        progressRef.current += tick / HOLD_DURATION_MS;
        setProgress(Math.min(progressRef.current, 1));

        if (progressRef.current >= 1) {
          if (holdTimerRef.current) clearInterval(holdTimerRef.current);
          holdCompleteRef.current = true;
          setIsHolding(false);
          setProgress(0);

          // Map all contacts, start sending
          const mapped = contacts.map((c) => ({
            name: c.name,
            phone: c.phone,
          }));
          setAllContacts(mapped);
          setSentPhones(new Set());
          setCurrentSendIndex(0);
          setLocationObtained(false);

          // Step 1: Get location immediately
          activateSOS(mapped);
        }
      }, tick);
    },
    [contacts],
  );

  const handleHoldEnd = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!holdCompleteRef.current) {
        resetHold();
      }
    },
    [resetHold],
  );

  /**
   * Full SOS activation: get location → record alert → send SMS to contacts
   */
  const activateSOS = useCallback(
    async (mappedContacts: Contact[]) => {
      setModalState("getting-location");

      // Record alert in DB (non-blocking)
      try {
        await triggerAlert({
          journeyId: journeyId as any,
          type: "manual",
        });
      } catch {
        // Continue even if DB recording fails
      }

      // Step 2: Get location
      const loc = await getCurrentLocation();
      locationRef.current = loc;
      setLocationObtained(!!loc);

      // Step 3: Send SMS to contacts one by one
      setModalState("sending");
    },
    [journeyId, triggerAlert],
  );

  const userName =
    user?.name || user?.email?.split("@")[0] || "A Whereहो user";

  /**
   * Send SMS to current contact, then advance
   */
  const handleSendToCurrent = useCallback(() => {
    const contact = allContacts[currentSendIndex];
    if (!contact) return;

    // Step 3: Create Google Maps link and send SMS
    const formattedPhone = formatPhoneForSMS(contact.phone);
    sendEmergencySMS(
      formattedPhone,
      userName,
      locationRef.current ?? undefined,
    );

    setSentPhones((prev) => new Set(prev).add(contact.phone));

    // Auto-advance to next contact
    if (currentSendIndex < allContacts.length - 1) {
      setTimeout(() => {
        setCurrentSendIndex((i) => i + 1);
      }, 1500);
    }
  }, [currentSendIndex, allContacts, userName]);

  const handleAddContact = useCallback(() => {
    setModalState("idle");
    window.dispatchEvent(new CustomEvent("open-trusted-contacts"));
  }, []);

  const allSent =
    allContacts.length > 0 &&
    allContacts.every((c) => sentPhones.has(c.phone));

  // Auto-mark as done after all sent
  useEffect(() => {
    if (allSent && modalState === "sending") {
      setTimeout(() => setModalState("done"), 800);
    }
  }, [allSent, modalState]);

  return (
    <>
      {/* ===== I FEEL UNSAFE BUTTON ===== */}
      <div className="flex flex-col items-center gap-1.5 flex-1">
        <div className="relative">
          <button
            className="relative w-14 h-14 rounded-full bg-destructive text-white flex items-center justify-center select-none touch-none shadow-lg shadow-destructive/30 transition-transform active:scale-95"
            onMouseDown={handleHoldStart}
            onMouseUp={handleHoldEnd}
            onMouseLeave={handleHoldEnd}
            onTouchStart={handleHoldStart}
            onTouchEnd={handleHoldEnd}
            onTouchCancel={handleHoldEnd}
            aria-label="Press and hold for 2 seconds to alert your trusted contacts"
          >
            <svg
              className="absolute inset-0 -rotate-90"
              width="56"
              height="56"
              viewBox="0 0 56 56"
            >
              <circle
                cx="28"
                cy="28"
                r={RING_RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="4"
              />
              <circle
                cx="28"
                cy="28"
                r={RING_RADIUS}
                fill="none"
                stroke="white"
                strokeWidth="4"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
                strokeLinecap="round"
                className="transition-none"
              />
            </svg>
            <span className="relative z-10 text-[10px] font-bold tracking-tight leading-tight text-center">
              I Feel
              <br />
              Unsafe
            </span>
          </button>
          {isHolding && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-medium text-white whitespace-nowrap"
            >
              {Math.ceil((1 - progress) * 2)}s
            </motion.div>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground text-center leading-tight">
          Press &amp; hold to alert trusted contacts
        </span>
      </div>

      {/* ===== NO TRUSTED CONTACT ===== */}
      <Dialog
        open={modalState === "no-contact"}
        onOpenChange={(open) => {
          if (!open) setModalState("idle");
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              No Trusted Contact Added
            </DialogTitle>
            <DialogDescription>
              Add a trusted contact so they can be alerted in an emergency.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button className="w-full" onClick={handleAddContact}>
              <Phone className="w-4 h-4 mr-2" />
              Add Trusted Contact
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setModalState("idle")}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== GETTING LOCATION ===== */}
      <Dialog
        open={modalState === "getting-location"}
        onOpenChange={() => {}}
      >
        <DialogContent className="sm:max-w-sm pointer-events-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-accent animate-pulse" />
              Getting your location...
            </DialogTitle>
            <DialogDescription>
              Acquiring GPS coordinates for the emergency message.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* ===== SENDING — one-by-one ===== */}
      <Dialog
        open={modalState === "sending"}
        onOpenChange={(open) => {
          if (!open && !allSent) setModalState("idle");
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Sending Alert
            </DialogTitle>
            <DialogDescription className="text-center">
              {locationObtained ? (
                <>
                  Location captured. Tap the contact below to open your
                  messaging app with the emergency message and Google Maps
                  link pre-filled.
                </>
              ) : (
                <>
                  Location unavailable. Tap the contact below to send the
                  emergency message without location.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            {allContacts.map((c, idx) => {
              const sent = sentPhones.has(c.phone);
              const isCurrent = idx === currentSendIndex && !sent;
              return (
                <button
                  key={c.phone}
                  disabled={sent || !isCurrent}
                  onClick={handleSendToCurrent}
                  className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all ${
                    sent
                      ? "bg-safe/5 border-safe/20 opacity-70"
                      : isCurrent
                        ? "bg-destructive/5 border-destructive/40 ring-2 ring-destructive/20"
                        : "bg-card border-border opacity-50"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      sent
                        ? "bg-safe/10"
                        : isCurrent
                          ? "bg-destructive/10"
                          : "bg-muted"
                    }`}
                  >
                    {sent ? (
                      <CheckCircle className="w-4 h-4 text-safe" />
                    ) : (
                      <Phone
                        className={`w-3.5 h-3.5 ${
                          isCurrent ? "text-destructive" : "text-muted-foreground"
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </div>
                  {sent ? (
                    <span className="text-xs font-medium text-safe">Sent</span>
                  ) : isCurrent ? (
                    <span className="text-xs font-medium text-destructive">
                      Tap to send
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">
                      Waiting
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              className="w-full"
              onClick={() => setModalState("idle")}
              variant={allSent ? "default" : "outline"}
            >
              {allSent ? "Done" : "Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== ALL SENT ===== */}
      <Dialog
        open={modalState === "done"}
        onOpenChange={(open) => {
          if (!open) setModalState("idle");
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="mx-auto w-14 h-14 rounded-2xl bg-safe/10 flex items-center justify-center mb-2">
              <Check className="w-7 h-7 text-safe" />
            </div>
            <DialogTitle className="text-center">Alerts Sent</DialogTitle>
            <DialogDescription className="text-center">
              Your messaging app was opened for {allContacts.length} trusted
              contact{allContacts.length > 1 ? "s" : ""}. Tap{" "}
              <span className="font-semibold text-foreground">Send</span> in
              each conversation to deliver the alert.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="w-full"
              onClick={() => setModalState("idle")}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
