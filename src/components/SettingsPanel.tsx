import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Shield, Clock, LogOut } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentInterval?: number;
  currentBiometric?: boolean;
}

export default function SettingsPanel({
  open,
  onOpenChange,
  currentInterval = 10,
  currentBiometric = false,
}: SettingsPanelProps) {
  const [interval, setInterval] = useState(currentInterval.toString());
  const [useBiometric, setUseBiometric] = useState(currentBiometric);
  const [loading, setLoading] = useState(false);
  const updateSettings = useMutation(api.users.updateSettings);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setInterval(currentInterval.toString());
    setUseBiometric(currentBiometric);
  }, [currentInterval, currentBiometric, open]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateSettings({
        checkInInterval: parseInt(interval),
        useBiometric,
      });
      toast.success("Settings saved");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save settings");
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure your safety preferences and journey settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Check-in interval */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              <Label className="text-sm font-medium">Check-in Interval</Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              How often you'll be asked "Are you okay?" during a journey.
            </p>
            <Select value={interval} onValueChange={setInterval}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Every 5 minutes</SelectItem>
                <SelectItem value="10">Every 10 minutes</SelectItem>
                <SelectItem value="15">Every 15 minutes</SelectItem>
                <SelectItem value="20">Every 20 minutes</SelectItem>
                <SelectItem value="30">Every 30 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Biometric toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-accent" />
                <Label className="text-sm font-medium">
                  Biometric Verification
                </Label>
              </div>
              <Switch
                checked={useBiometric}
                onCheckedChange={setUseBiometric}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Use fingerprint or face ID for check-in verification. Falls back
              to password if unavailable.
            </p>
          </div>

          <div className="border-t border-border pt-4">
            <Button
              variant="ghost"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
