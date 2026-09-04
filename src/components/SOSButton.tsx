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
import { AlertTriangle, Phone, MapPin, Shield, Check } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { Id } from "@/convex/_generated/dataModel";
import {
  sendEmergencySMS,
  getCurrentLocation,
  formatPhoneForSMS,
} from "@/lib/sms";

const HOLD_DURATION_MS = 2000;
const RING_RADIUS = 28;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface SOSButtonProps {
  journeyId?: Id<"journeys">;
}

type ModalState =
  | "idle"
  | "no-contact"
  | "confirm"
  | "sending-location"
  | "app-opened";

export default function SOSButton({ journeyId }: SOSButtonProps) {
  const contactsRaw = useQuery(api.trustedContacts.list);
  const contacts = contactsRaw ?? [];
  const user = useQuery(api.users.currentUser);
  const triggerAlert = useMutation(api.emergencyAlerts.trigger);

  const [modalState, setModalState] = useState<ModalState>("idle");
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [selectedContact, setSelectedContact] = useState<{
    name: string;
    phone: string;
  } | null>(null);

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

          const primary = contacts.find((c) => c.isPrimary) ?? contacts[0];
          setSelectedContact({
            name: primary.name,
            phone: primary.phone,
          });
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
    if (!selectedContact) return;

    setModalState("sending-location");

    try {
      await triggerAlert({
        journeyId: journeyId,
        type: "manual",
      });
    } catch {
      // Continue even if DB recording fails
    }

    const location = await getCurrentLocation();
    const formattedPhone = formatPhoneForSMS(selectedContact.phone);
    const opened = sendEmergencySMS(
      formattedPhone,
      user?.name ?? "Someone",
      location ?? undefined,
    );

    if (opened) {
      setModalState("app-opened");
    } else {
      toast.error("Could not open messaging app", {
        description:
          "Your browser may not support the sms: scheme. Try calling your contact directly.",
      });
      setModalState("idle");
    }
  }, [selectedContact, journeyId, triggerAlert, user]);

  const handleAddContact = useCallback(() => {
    setModalState("idle");
    window.dispatchEvent(new CustomEvent("open-trusted-contacts"));
  }, []);

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
            aria-label="Press and hold SOS for 2 seconds to alert your trusted contact"
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

      {/* Confirm SOS dialog */}
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
              Send emergency alert to{" "}
              <span className="font-semibold text-foreground">
                {selectedContact?.name}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleSendSOS}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Send SOS
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
        open={modalState === "sending-location"}
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

      {/* SMS app opened dialog */}
      <Dialog
        open={modalState === "app-opened"}
        onOpenChange={(open) => {
          if (!open) setModalState("idle");
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="mx-auto w-14 h-14 rounded-2xl bg-safe/10 flex items-center justify-center mb-2">
              <Check className="w-7 h-7 text-safe" />
            </div>
            <DialogTitle className="text-center">
              Emergency Alert Ready
            </DialogTitle>
            <DialogDescription className="text-center">
              Your messaging app has been opened. Please tap{" "}
              <span className="font-semibold text-foreground">Send</span> to
              send the alert to{" "}
              <span className="font-semibold text-foreground">
                {selectedContact?.name}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button className="w-full" onClick={() => setModalState("idle")}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
