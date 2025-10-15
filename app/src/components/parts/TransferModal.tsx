import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useParts } from "@/hooks/useParts";

interface TransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const mockLocations = [
  { id: "1", name: "Main Warehouse" },
  { id: "2", name: "Service Bay 1" },
  { id: "3", name: "Service Bay 2" },
  { id: "4", name: "Parts Counter" }
];

export function TransferModal({ open, onOpenChange }: TransferModalProps) {
  const [partSearch, setPartSearch] = useState("");
  const [selectedPart, setSelectedPart] = useState("");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  const { parts } = useParts();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart || !fromLocation || !toLocation || !quantity) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (fromLocation === toLocation) {
      toast({
        title: "Validation Error",
        description: "From and To locations must be different.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement transfer API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: "Transfer Created",
        description: "Parts transfer has been initiated successfully."
      });
      
      // Reset form
      setPartSearch("");
      setSelectedPart("");
      setFromLocation("");
      setToLocation("");
      setQuantity("");
      setNotes("");
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create transfer. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredParts = parts.filter(part => 
    part.name.toLowerCase().includes(partSearch.toLowerCase()) ||
    part.sku.toLowerCase().includes(partSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Inter-Branch Transfer</DialogTitle>
          <DialogDescription>
            Transfer parts between different locations or branches.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="part-search">Search Part *</Label>
            <Input
              id="part-search"
              placeholder="Search by name or SKU..."
              value={partSearch}
              onChange={(e) => setPartSearch(e.target.value)}
            />
            {partSearch && filteredParts.length > 0 && (
              <Select value={selectedPart} onValueChange={setSelectedPart}>
                <SelectTrigger>
                  <SelectValue placeholder="Select part" />
                </SelectTrigger>
                <SelectContent>
                  {filteredParts.slice(0, 10).map((part) => (
                    <SelectItem key={part.id} value={part.id}>
                      {part.sku} - {part.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from-location">From Location *</Label>
              <Select value={fromLocation} onValueChange={setFromLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {mockLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="to-location">To Location *</Label>
              <Select value={toLocation} onValueChange={setToLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {mockLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              placeholder="Enter quantity to transfer"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Transfer Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this transfer..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating Transfer..." : "Create Transfer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}