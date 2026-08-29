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
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  UserPlus,
  Trash2,
  Star,
  Phone,
  Users,
  X,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { validatePhoneNumber } from "@/lib/sms";
import { motion, AnimatePresence } from "framer-motion";

interface TrustedContactsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TrustedContactsManager({
  open,
  onOpenChange,
}: TrustedContactsManagerProps) {
  const contacts = useQuery(api.trustedContacts.list) ?? [];
  const addContact = useMutation(api.trustedContacts.add);
  const removeContact = useMutation(api.trustedContacts.remove);
  const updateContact = useMutation(api.trustedContacts.update);

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const handleAdd = async () => {
    if (!name.trim() || !phone.trim()) return;

    if (!validatePhoneNumber(phone.trim())) {
      setPhoneError("Enter a valid Indian phone number (10 digits)");
      return;
    }
    setPhoneError("");

    setLoading(true);
    try {
      await addContact({
        name: name.trim(),
        phone: phone.trim(),
        relationship: relationship.trim() || undefined,
        isPrimary: contacts.length === 0, // First contact is primary
      });
      toast.success(`${name.trim()} added as trusted contact`);
      setName("");
      setPhone("");
      setRelationship("");
      setShowAdd(false);
    } catch {
      toast.error("Failed to add contact");
    }
    setLoading(false);
  };

  const handleRemove = async (contactId: string, contactName: string) => {
    try {
      await removeContact({ contactId: contactId as any });
      toast.success(`${contactName} removed`);
    } catch {
      toast.error("Failed to remove contact");
    }
  };

  const handleSetPrimary = async (contactId: string) => {
    try {
      await updateContact({ contactId: contactId as any, isPrimary: true });
      toast.success("Primary contact updated");
    } catch {
      toast.error("Failed to update");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" />
            Trusted Contacts
          </DialogTitle>
          <DialogDescription>
            Your trusted circle will be notified automatically during every journey and in the event of an emergency.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <AnimatePresence>
            {contacts.map((contact) => (
              <motion.div
                key={contact._id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card className="border-border/60">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">
                        {contact.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {contact.name}
                        </p>
                        {contact.isPrimary && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        <span>{contact.phone}</span>
                        {contact.relationship && (
                          <>
                            <span>•</span>
                            <span>{contact.relationship}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!contact.isPrimary && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleSetPrimary(contact._id)}
                          title="Set as primary"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() =>
                          handleRemove(contact._id, contact.name)
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {contacts.length === 0 && !showAdd && (
            <div className="text-center py-8">
              <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                No trusted contacts added yet. Add someone to receive real-time journey updates and emergency alerts.
              </p>
            </div>
          )}

          {showAdd ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-accent/30 bg-accent/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Add Contact</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setShowAdd(false);
                        setName("");
                        setPhone("");
                        setRelationship("");
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="Full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <Input
                      placeholder="Phone number"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (phoneError) setPhoneError("");
                      }}
                      type="tel"
                      className={phoneError ? "border-destructive" : ""}
                    />
                    {phoneError && (
                      <p className="text-xs text-destructive">{phoneError}</p>
                    )}
                    <Input
                      placeholder="Relationship (e.g., mother, friend, partner)"
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleAdd}
                    disabled={loading || !name.trim() || !phone.trim()}
                  >
                    {loading ? "Adding..." : "Add Contact"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => setShowAdd(true)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Trusted Contact
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
