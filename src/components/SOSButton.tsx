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
import { toast } from "sonner";
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
  | "confirm"
  | "getting-location"
  | "send-to-all";

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
  const [sentContacts, setSentContacts] = useState<Set<string>>(new Set());

  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef(0);
  const holdCompleteRef = useRef(false);

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

          setAllContacts(
            contacts.map((c) => ({ name: c.name, phone: c.phone })),
          );
          setModalState("confirm");
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

  const handleSendSOS = useCallback(async () => {
    setModalState("getting-location");

    try {
      await triggerAlert({
        journeyId: journeyId as any,
        type: "manual",
      });
    } catch {
      // Continue even if DB recording fails
    }

    const location = await getCurrentLocation();
    setSentContacts(new Set());
    setModalState("send-to-all");
  }, [journeyId, triggerAlert]);

  const handleSendToContact = useCallback(
    (contact: Contact) => {
      const formattedPhone = formatPhoneForSMS(contact.phone);
      sendEmergencySMS(
        formattedPhone,
        user?.name ?? "Someone",
        locationRef.current ?? undefined,
      );
      setSentContacts((prev) => new Set(prev).add(contact.phone));
    },
    [user],
  );

  const handleAddContact = useCallback(() => {
    setModalState("idle");
    window.dispatchEvent(new CustomEvent("open-trusted-contacts"));
  }, []);

  const locationRef = useRef<{ latitude: number; longitude: number } | null>(
    null,
  );

  // Update locationRef when modalState changes
  useEffect(() => {
    if (modalState === "getting-location") {
      getCurrentLocation().then((loc) => {
        locationRef.current = loc;
      });
    }
  }, [modalState]);

  const allSent =
    allContacts.length > 0 && sentContacts.size === allContacts.length;

  return (
    <>
      {/* SOS Button */}
      <div className="flex flex-col items-center gap-1.5 flex-1">
        <div className="relative">
          <button
            className="relative w-14 h-14 rounded-full bg-destructive text-white font-bold text-lg flex items-center justify-center select-none touch-none shadow-lg shadow-destructive/30 transition-transform active:scale-95"
            onMouseDown={handleHoldStart}
            onMouseUp={handleHoldEnd}
            onMouseLeave={handleHoldEnd}
            onTouchStart={handleHoldStart}
            onTouchEnd={handleHoldEnd}
            onTouchCancel={handleHoldEnd}
            aria-label="Press and hold SOS for 2 seconds to alert your trusted contacts"
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
            <span className="relative z-10 text-base font-bold tracking-wide">
              SOS
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
          Press &amp; hold to alert
        </span>
      </div>

      {/* No trusted contact dialog */}
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

      {/* Confirm SOS — shows all contacts */}
      <Dialog
        open={modalState === "confirm"}
        onOpenChange={(open) => {
          if (!open) setModalState("idle");
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Send Emergency Alert?
            </DialogTitle>
            <DialogDescription>
              This will open your messaging app for each of your{" "}
              <span className="font-semibold text-foreground">
                {allContacts.length} trusted contact
                {allContacts.length > 1 ? "s" : ""}
              </span>
              :
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            {allContacts.map((c) => (
              <div
                key={c.phone}
                className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.phone}</p>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button variant="destructive" className="w-full" onClick={handleSendSOS}>
              <AlertTriangle className="w-4 h-4 mr-2" />
              Send SOS to All Contacts
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

      {/* Getting location dialog */}
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
              Preparing emergency message with your current coordinates.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Send to all contacts — one-by-one */}
      <Dialog
        open={modalState === "send-to-all"}
        onOpenChange={(open) => {
          if (!open && !allSent) setModalState("idle");
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            {allSent ? (
              <div className="mx-auto w-14 h-14 rounded-2xl bg-safe/10 flex items-center justify-center mb-2">
                <Check className="w-7 h-7 text-safe" />
              </div>
            ) : (
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Send Alert to Each Contact
              </DialogTitle>
            )}
            {allSent ? (
              <>
                <DialogTitle className="text-center">
                  All Alerts Sent
                </DialogTitle>
                <DialogDescription className="text-center">
                  Your messaging app was opened for all{" "}
                  {allContacts.length} trusted contacts. Tap{" "}
                  <span className="font-semibold text-foreground">Send</span> in
                  each conversation to deliver the alert.
                </DialogDescription>
              </>
            ) : (
              <DialogDescription className="text-center">
                Tap each contact below to open your messaging app with the
                emergency message pre-filled. Tap{" "}
                <span className="font-semibold text-foreground">Send</span> in
                your messaging app for each one.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-2 py-1">
            {allContacts.map((c) => {
              const sent = sentContacts.has(c.phone);
              return (
                <button
                  key={c.phone}
                  disabled={sent}
                  onClick={() => handleSendToContact(c)}
                  className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all ${
                    sent
                      ? "bg-safe/5 border-safe/20 opacity-70"
                      : "bg-card border-border hover:border-destructive/40 hover:bg-destructive/5"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      sent ? "bg-safe/10" : "bg-destructive/10"
                    }`}
                  >
                    {sent ? (
                      <CheckCircle className="w-4 h-4 text-safe" />
                    ) : (
                      <Phone className="w-3.5 h-3.5 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </div>
                  {sent ? (
                    <span className="text-xs font-medium text-safe">Sent</span>
                  ) : (
                    <span className="text-xs font-medium text-destructive">
                      Tap to send
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
    </>
  );
}
