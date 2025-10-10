import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import type { PortalWorkOrder } from "../hooks/usePortalData";

interface Props {
  workOrder: PortalWorkOrder | null;
}

export const PortalMediaGallery = ({ workOrder }: Props) => {
  if (!workOrder) {
    return null;
  }

  const combinedMedia = [
    ...(workOrder.vehicle?.media ?? []),
    ...workOrder.media,
  ];

  if (!combinedMedia.length) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">Nėra įkeltų nuotraukų.</CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4">
        {combinedMedia.map((item) => (
          <Card key={item.id} className="w-56 flex-shrink-0 overflow-hidden">
            <CardContent className="p-0">
              <AspectRatio ratio={4 / 3}>
                {item.publicUrl ? (
                  <img
                    src={item.publicUrl}
                    alt={item.caption ?? item.kind ?? item.category ?? "Nuotrauka"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                    {item.caption ?? "Peržiūra negalima"}
                  </div>
                )}
              </AspectRatio>
              <div className="space-y-2 p-3">
                <Badge variant="outline">{item.kind ?? item.category ?? "Nuotrauka"}</Badge>
                {item.caption && <p className="text-xs text-muted-foreground">{item.caption}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};
