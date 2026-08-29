import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Phone } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

interface EmergencyButtonProps {
  journeyId?: string;
  onTriggered?: () => void;
}

export default function EmergencyButton({
  journeyId,
  onTriggered,
}: EmergencyButtonProps) {
  const [open, setOpen] = useState(false);
  const triggerAlert = useMutation(api.emergencyAlerts.trigger);

  const handleEmergency = async () => {
    try {
      await triggerAlert({
        journeyId: journeyId as any,
        type: "manual",
      });
      toast.error("Emergency alert sent!", {
        description:
          "Your trusted contacts have been notified. Stay safe.",
      });
      onTriggered?.();
    } catch {
      toast.error("Failed to send alert. Please try again.");
    }
    setOpen(false);
  };

  const handleCall100 = () => {
    window.open("tel:100", "_self");
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="destructive"
        size="lg"
        className="w-full rounded-xl h-14 text-base font-bold gap-2.5 shadow-lg shadow-destructive/20 hover:shadow-destructive/30 transition-shadow"
        onClick={() => setOpen(true)}
      >
        <Phone className="w-5 h-5" />
        I Feel Unsafe
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Emergency Alert
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will call emergency services (100) and alert your trusted
              contacts with your current location. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              onClick={handleCall100}
              className="w-full bg-destructive hover:bg-destructive/90"
            >
              <Phone className="w-4 h-4 mr-2" />
              Call 100 Now
            </AlertDialogAction>
            <AlertDialogAction
              onClick={handleEmergency}
              className="w-full border border-border bg-background text-foreground hover:bg-muted"
            >
              Alert Trusted Contacts Only
            </AlertDialogAction>
            <AlertDialogCancel className="w-full">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
