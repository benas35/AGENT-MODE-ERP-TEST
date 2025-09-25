import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Bell, Mail, MessageSquare, Phone } from 'lucide-react';

interface NotifyCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId: string;
  workOrderNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  onNotificationSent?: () => void;
}

export const NotifyCustomerModal: React.FC<NotifyCustomerModalProps> = ({
  open,
  onOpenChange,
  workOrderId,
  workOrderNumber,
  customerName,
  customerPhone,
  customerEmail,
  onNotificationSent,
}) => {
  const { toast } = useToast();
  const [messageType, setMessageType] = useState('status_update');
  const [channels, setChannels] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [useTemplate, setUseTemplate] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const messageTemplates = {
    status_update: `Hi ${customerName}, we wanted to update you on your ${new Date().getFullYear()} vehicle service. Work order #${workOrderNumber} is currently in progress. We'll notify you when it's ready for pickup.`,
    ready_pickup: `Good news ${customerName}! Your vehicle service is complete. Work order #${workOrderNumber} is ready for pickup. Please call us to schedule a convenient time.`,
    delay_notice: `Hi ${customerName}, we wanted to let you know that work order #${workOrderNumber} will take a bit longer than expected. We'll keep you updated on the progress.`,
    approval_needed: `Hi ${customerName}, we've identified additional work needed for your vehicle (work order #${workOrderNumber}). Please call us to discuss the details and provide approval.`,
    custom: customMessage,
  };

  const handleChannelToggle = (channel: string) => {
    setChannels(prev => 
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const getMessage = () => {
    return useTemplate ? messageTemplates[messageType as keyof typeof messageTemplates] : customMessage;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (channels.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one communication channel.",
        variant: "destructive",
      });
      return;
    }

    const message = getMessage();
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Here you would typically call your API to send notifications
      console.log('Sending customer notification:', {
        workOrderId,
        channels,
        messageType,
        message,
        customerPhone,
        customerEmail,
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const channelNames = channels.map(c => {
        switch (c) {
          case 'sms': return 'SMS';
          case 'email': return 'Email';
          case 'call': return 'Phone Call';
          default: return c;
        }
      }).join(' & ');

      toast({
        title: "Notification Sent",
        description: `Customer notified via ${channelNames}`,
      });
      
      onNotificationSent?.();
      onOpenChange(false);
      
      // Reset form
      setChannels([]);
      setCustomMessage('');
      setMessageType('status_update');
      setUseTemplate(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send notification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notify Customer
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <div>Customer: <span className="font-medium">{customerName}</span></div>
              <div>Work Order: <span className="font-medium">#{workOrderNumber}</span></div>
            </div>

            {/* Communication Channels */}
            <div className="space-y-2">
              <Label>Send Via</Label>
              <div className="grid grid-cols-1 gap-2">
                {customerPhone && (
                  <div className="flex items-center space-x-2 p-2 border rounded">
                    <Checkbox
                      id="sms"
                      checked={channels.includes('sms')}
                      onCheckedChange={() => handleChannelToggle('sms')}
                    />
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <Label htmlFor="sms" className="flex-1">
                      SMS to {customerPhone}
                    </Label>
                  </div>
                )}

                {customerEmail && (
                  <div className="flex items-center space-x-2 p-2 border rounded">
                    <Checkbox
                      id="email"
                      checked={channels.includes('email')}
                      onCheckedChange={() => handleChannelToggle('email')}
                    />
                    <Mail className="w-4 h-4 text-green-600" />
                    <Label htmlFor="email" className="flex-1">
                      Email to {customerEmail}
                    </Label>
                  </div>
                )}

                {customerPhone && (
                  <div className="flex items-center space-x-2 p-2 border rounded">
                    <Checkbox
                      id="call"
                      checked={channels.includes('call')}
                      onCheckedChange={() => handleChannelToggle('call')}
                    />
                    <Phone className="w-4 h-4 text-orange-600" />
                    <Label htmlFor="call" className="flex-1">
                      Schedule phone call to {customerPhone}
                    </Label>
                  </div>
                )}
              </div>
            </div>

            {/* Message Type */}
            <div className="space-y-2">
              <Label>Message Type</Label>
              <Select value={messageType} onValueChange={setMessageType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status_update">Status Update</SelectItem>
                  <SelectItem value="ready_pickup">Ready for Pickup</SelectItem>
                  <SelectItem value="delay_notice">Delay Notice</SelectItem>
                  <SelectItem value="approval_needed">Approval Needed</SelectItem>
                  <SelectItem value="custom">Custom Message</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Use Template Toggle */}
            {messageType !== 'custom' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="useTemplate"
                  checked={useTemplate}
                  onCheckedChange={(checked) => setUseTemplate(!!checked)}
                />
                <Label htmlFor="useTemplate">Use template message</Label>
              </div>
            )}

            {/* Message Preview/Editor */}
            <div className="space-y-2">
              <Label htmlFor="message">
                {useTemplate && messageType !== 'custom' ? 'Message Preview' : 'Custom Message'}
              </Label>
              <Textarea
                id="message"
                value={getMessage()}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Enter your custom message..."
                rows={4}
                disabled={useTemplate && messageType !== 'custom'}
                className={useTemplate && messageType !== 'custom' ? 'bg-muted' : ''}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || channels.length === 0}
            >
              {isSubmitting ? 'Sending...' : 'Send Notification'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};