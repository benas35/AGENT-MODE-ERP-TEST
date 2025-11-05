import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePortalSession } from "../hooks/usePortalSession";
import { usePortalPreferences } from "../hooks/usePortalData";

export const PortalPreferencesForm = () => {
  const { session } = usePortalSession();
  const mutation = usePortalPreferences();

  if (!session) return null;

  const prefs = session.preferences;

  const handleChange = (key: keyof typeof prefs, value: boolean) => {
    mutation.mutate({
      ...prefs,
      [key]: value,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pranešimų nustatymai</CardTitle>
        <CardDescription>Pasirinkite kaip norite gauti pranešimus apie darbo eigą.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium">El. paštas</Label>
            <p className="text-xs text-muted-foreground">Gauti visus pranešimus į el. paštą.</p>
          </div>
          <Switch
            checked={prefs.notify_email}
            onCheckedChange={(checked) => handleChange("notify_email", checked)}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium">SMS žinutės</Label>
            <p className="text-xs text-muted-foreground">Greiti atnaujinimai į mobilų telefoną.</p>
          </div>
          <Switch
            checked={prefs.notify_sms}
            onCheckedChange={(checked) => handleChange("notify_sms", checked)}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium">WhatsApp (netrukus)</Label>
            <p className="text-xs text-muted-foreground">Bandomoji funkcija. Įjungus priminimai bus siunčiami per WhatsApp.</p>
          </div>
          <Switch
            checked={prefs.notify_whatsapp}
            onCheckedChange={(checked) => handleChange("notify_whatsapp", checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
};
