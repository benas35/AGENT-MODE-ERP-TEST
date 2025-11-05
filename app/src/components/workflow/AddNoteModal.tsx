import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare } from 'lucide-react';

interface AddNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId: string;
  workOrderNumber: string;
  onNoteAdded?: () => void;
}

export const AddNoteModal: React.FC<AddNoteModalProps> = ({
  open,
  onOpenChange,
  workOrderId,
  workOrderNumber,
  onNoteAdded,
}) => {
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!note.trim()) {
      toast({
        title: "Error",
        description: "Please enter a note before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Here you would typically call your API to save the note
      console.log('Adding note to work order:', {
        workOrderId,
        note: note.trim(),
        noteType,
        timestamp: new Date().toISOString(),
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast({
        title: "Note Added",
        description: `Note added to work order #${workOrderNumber}`,
      });
      
      onNoteAdded?.();
      onOpenChange(false);
      setNote('');
      setNoteType('general');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setNote('');
    setNoteType('general');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Add Note
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Work Order: <span className="font-medium">#{workOrderNumber}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="noteType">Note Type</Label>
              <Select value={noteType} onValueChange={setNoteType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Note</SelectItem>
                  <SelectItem value="internal">Internal Note</SelectItem>
                  <SelectItem value="customer">Customer Communication</SelectItem>
                  <SelectItem value="technician">Technician Note</SelectItem>
                  <SelectItem value="quality">Quality Issue</SelectItem>
                  <SelectItem value="delay">Delay Explanation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Enter your note here..."
                rows={4}
                required
              />
            </div>

            <div className="text-xs text-muted-foreground">
              Note will be timestamped and attributed to your user account.
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !note.trim()}
            >
              {isSubmitting ? 'Adding...' : 'Add Note'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};