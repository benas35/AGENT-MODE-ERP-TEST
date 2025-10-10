import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useParts } from "@/hooks/useParts";

interface StockAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partId?: string;
}

const adjustmentReasons = [
  { value: "cycle_count", label: "Cycle Count" },
  { value: "damage", label: "Damage/Loss" },
  { value: "found", label: "Found Stock" },
  { value: "expired", label: "Expired/Obsolete" },
  { value: "transfer_out", label: "Transfer Out" },
  { value: "transfer_in", label: "Transfer In" },
  { value: "other", label: "Other" }
];

export function StockAdjustmentModal({ open, onOpenChange, partId }: StockAdjustmentModalProps) {
  const [partSearch, setPartSearch] = useState("");
  const [selectedPart, setSelectedPart] = useState("");
  const [adjustmentType, setAdjustmentType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  const { parts } = useParts();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart || !adjustmentType || !quantity || !reason) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement stock adjustment API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: "Stock Adjustment Created",
        description: "Stock levels have been updated successfully."
      });
      
      // Reset form
      setPartSearch("");
      setSelectedPart("");
      setAdjustmentType("");
      setQuantity("");
      setReason("");
      setNotes("");
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create stock adjustment. Please try again.",
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
          <DialogTitle>Stock Adjustment</DialogTitle>
          <DialogDescription>
            Create a stock adjustment to correct inventory discrepancies.
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

          <div className="space-y-2">
            <Label htmlFor="adjustment-type">Adjustment Type *</Label>
            <Select value={adjustmentType} onValueChange={setAdjustmentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select adjustment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="increase">Increase Stock</SelectItem>
                <SelectItem value="decrease">Decrease Stock</SelectItem>
                <SelectItem value="set">Set Stock Level</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              placeholder="Enter quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {adjustmentReasons.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this adjustment..."
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
              {loading ? "Creating..." : "Create Adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}