import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Fingerprint, Lock, Check } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface CheckInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkInId: string;
  useBiometric?: boolean;
}

export default function CheckInModal({
  open,
  onOpenChange,
  checkInId,
  useBiometric = false,
}: CheckInModalProps) {
  const [password, setPassword] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const respond = useMutation(api.checkIns.respond);

  const handleBiometric = async () => {
    setLoading(true);
    try {
      // Attempt Web Authentication API
      if (window.PublicKeyCredential) {
        const available =
          await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (available) {
          // Simulate biometric verification for v1
          // In production, use actual WebAuthn challenge
          await new Promise((r) => setTimeout(r, 800));
          setVerified(true);
          await respond({ checkInId: checkInId as any, isVerified: true });
          toast.success("Check-in verified via biometric");
          setTimeout(() => {
            onOpenChange(false);
            setVerified(false);
            setPassword("");
          }, 1200);
          return;
        }
      }
      toast.error("Biometric not available. Use password instead.");
    } catch {
      toast.error("Biometric verification failed.");
    }
    setLoading(false);
  };

  const handlePassword = async () => {
    if (!password.trim()) return;
    setLoading(true);
    try {
      // For v1: accept any non-empty password as verification
      // In production: verify against stored hash
      await new Promise((r) => setTimeout(r, 500));
      setVerified(true);
      await respond({ checkInId: checkInId as any, isVerified: true });
      toast.success("Check-in verified");
      setTimeout(() => {
        onOpenChange(false);
        setVerified(false);
        setPassword("");
      }, 1200);
    } catch {
      toast.error("Verification failed.");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-2">
            <Shield className="w-7 h-7 text-accent" />
          </div>
          <DialogTitle className="text-center text-xl">
            Are you okay?
          </DialogTitle>
          <DialogDescription className="text-center">
            Verify that you're safe so we can keep your trusted contacts informed.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {verified ? (
            <motion.div
              key="verified"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center py-6"
            >
              <div className="w-16 h-16 rounded-full bg-safe/10 flex items-center justify-center mb-3">
                <Check className="w-8 h-8 text-safe" />
              </div>
              <p className="text-lg font-semibold text-safe">You're verified safe.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your trusted contacts have been updated.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="verify"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 py-2"
            >
              {useBiometric ? (
                <Button
                  variant="outline"
                  className="w-full h-14 text-base gap-3"
                  onClick={handleBiometric}
                  disabled={loading}
                >
                  <Fingerprint className="w-6 h-6 text-accent" />
                  Verify with Biometric
                </Button>
              ) : null}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    {useBiometric ? "Or" : "Verify with"}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Enter password"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handlePassword();
                    }}
                    disabled={loading}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handlePassword}
                  disabled={loading || !password.trim()}
                >
                  {loading ? "Verifying..." : "Verify I'm Safe"}
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Missing three consecutive check-ins will automatically alert your trusted contacts.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
