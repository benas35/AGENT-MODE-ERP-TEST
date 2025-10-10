import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PortalMessage } from "../hooks/usePortalData";

interface Props {
  messages: PortalMessage[];
  isLoading: boolean;
  onSend: (payload: { body: string }) => Promise<void>;
}

export const PortalMessagePanel = ({ messages, isLoading, onSend }: Props) => {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      await onSend({ body: body.trim() });
      setBody("");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Žinutės</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex-1 space-y-3 overflow-y-auto pr-2">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-3/4" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Kol kas nėra žinučių. Čia matysite serviso patarimus ir savo atsakymus.</p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`rounded-lg border p-3 text-sm ${
                  message.direction === "customer" ? "bg-muted" : "bg-background"
                }`}
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{message.direction === "customer" ? "Jūs" : "Serviso komanda"}</span>
                  <span>{new Date(message.createdAt).toLocaleString("lt-LT")}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap leading-relaxed">{message.body}</p>
              </div>
            ))
          )}
        </div>
        <div className="space-y-2">
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Įrašykite žinutę patarėjui..."
            className="min-h-[80px]"
          />
          <div className="flex justify-end">
            <Button onClick={handleSend} disabled={sending || !body.trim()}>{sending ? "Siunčiama..." : "Siųsti"}</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
