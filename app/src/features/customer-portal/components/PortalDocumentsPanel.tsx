import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PortalMessage } from "../hooks/usePortalData";

interface Props {
  messages: PortalMessage[];
}

export const PortalDocumentsPanel = ({ messages }: Props) => {
  const documents = messages
    .filter((message) => message.metadata && (message.metadata as any).type === "estimate")
    .map((message) => ({
      id: message.id,
      title: (message.metadata as any).subject ?? "Serviso pasiūlymas",
      link: (message.metadata as any).link as string | undefined,
      body: message.body,
      createdAt: message.createdAt,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dokumentai</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Kol kas nėra prisegtų sąmatų ar sąskaitų.</p>
        ) : (
          documents.map((document) => (
            <div key={document.id} className="rounded-lg border p-4">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">{document.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(document.createdAt).toLocaleString("lt-LT")}
                  </p>
                </div>
                {document.link && (
                  <Button asChild size="sm" className="mt-2 md:mt-0">
                    <a href={document.link} target="_blank" rel="noreferrer">
                      Peržiūrėti
                    </a>
                  </Button>
                )}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{document.body}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
