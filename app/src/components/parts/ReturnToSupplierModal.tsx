import React, { useState } from 'react';
import { RotateCcw, Plus, X, Camera, FileText, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AutoCompleteInput } from '@/components/shared/AutoCompleteInput';
import { toast } from 'sonner';

interface ReturnToSupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId?: string;
  onSave?: (returnRequest: ReturnRequest) => void;
}

interface ReturnRequest {
  id?: string;
  rmaNumber: string;
  supplierId: string;
  supplierName: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'SHIPPED' | 'RECEIVED' | 'COMPLETED' | 'REJECTED';
  items: ReturnItem[];
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  shippedAt?: string;
  expectedCreditAmount: number;
  actualCreditAmount?: number;
  notes?: string;
  attachments: string[];
}

interface ReturnItem {
  id: string;
  partId: string;
  partSku: string;
  partName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  reason: string;
  condition: 'DEFECTIVE' | 'DAMAGED' | 'EXPIRED' | 'WRONG_PART' | 'OVERSTOCKED';
  serialNumbers?: string[];
  lotNumbers?: string[];
  photos?: string[];
}

const returnReasons = [
  'Defective Product',
  'Damaged in Transit',
  'Wrong Part Received',
  'Expired Product',
  'Overstock/No Longer Needed',
  'Quality Issues',
  'Warranty Return',
  'Other'
];

const conditionOptions = [
  { value: 'DEFECTIVE', label: 'Defective', color: 'bg-red-100 text-red-800' },
  { value: 'DAMAGED', label: 'Damaged', color: 'bg-orange-100 text-orange-800' },
  { value: 'EXPIRED', label: 'Expired', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'WRONG_PART', label: 'Wrong Part', color: 'bg-blue-100 text-blue-800' },
  { value: 'OVERSTOCKED', label: 'Overstocked', color: 'bg-gray-100 text-gray-800' }
];

// Mock data for parts search
const mockParts = [
  { id: '1', label: 'Brake Pads - BMW F30', value: 'BRK-PAD-001', metadata: { cost: 45.50 } },
  { id: '2', label: 'Engine Oil Filter', value: 'OIL-FLT-001', metadata: { cost: 12.50 } },
  { id: '3', label: 'Air Filter', value: 'AIR-FLT-001', metadata: { cost: 25.00 } }
];

const mockSuppliers = [
  { id: '1', label: 'Brembo Parts Ltd', value: 'SUP-001' },
  { id: '2', label: 'Bosch Automotive', value: 'SUP-002' },
  { id: '3', label: 'Mann+Hummel', value: 'SUP-003' }
];

export const ReturnToSupplierModal: React.FC<ReturnToSupplierModalProps> = ({
  open,
  onOpenChange,
  supplierId,
  onSave
}) => {
  const [returnRequest, setReturnRequest] = useState<Partial<ReturnRequest>>({
    rmaNumber: `RMA-${Date.now()}`,
    supplierId: supplierId || '',
    supplierName: '',
    reason: '',
    status: 'PENDING',
    items: [],
    requestedAt: new Date().toISOString(),
    expectedCreditAmount: 0,
    attachments: []
  });

  const [newItem, setNewItem] = useState<Partial<ReturnItem>>({
    quantity: 1,
    condition: 'DEFECTIVE',
    reason: ''
  });

  const [photos, setPhotos] = useState<File[]>([]);

  const handleAddItem = () => {
    if (!newItem.partId || !newItem.quantity || !newItem.reason) {
      toast.error('Please fill in all required fields for the return item');
      return;
    }

    const selectedPart = mockParts.find(p => p.id === newItem.partId);
    if (!selectedPart) return;

    const item: ReturnItem = {
      id: Date.now().toString(),
      partId: newItem.partId!,
      partSku: selectedPart.value,
      partName: selectedPart.label,
      quantity: newItem.quantity!,
      unitCost: selectedPart.metadata.cost,
      totalCost: newItem.quantity! * selectedPart.metadata.cost,
      reason: newItem.reason!,
      condition: newItem.condition!,
      serialNumbers: newItem.serialNumbers,
      lotNumbers: newItem.lotNumbers,
      photos: newItem.photos
    };

    setReturnRequest(prev => ({
      ...prev,
      items: [...(prev.items || []), item],
      expectedCreditAmount: (prev.expectedCreditAmount || 0) + item.totalCost
    }));

    // Reset form
    setNewItem({
      quantity: 1,
      condition: 'DEFECTIVE',
      reason: ''
    });

    toast.success('Item added to return request');
  };

  const removeItem = (itemId: string) => {
    const item = returnRequest.items?.find(i => i.id === itemId);
    if (item) {
      setReturnRequest(prev => ({
        ...prev,
        items: prev.items?.filter(i => i.id !== itemId) || [],
        expectedCreditAmount: (prev.expectedCreditAmount || 0) - item.totalCost
      }));
    }
  };

  const handleSave = () => {
    if (!returnRequest.supplierId || !returnRequest.reason || !returnRequest.items?.length) {
      toast.error('Please fill in supplier, reason, and add at least one item');
      return;
    }

    const finalRequest: ReturnRequest = {
      id: Date.now().toString(),
      rmaNumber: returnRequest.rmaNumber!,
      supplierId: returnRequest.supplierId!,
      supplierName: returnRequest.supplierName!,
      reason: returnRequest.reason!,
      status: returnRequest.status!,
      items: returnRequest.items!,
      requestedBy: 'current-user',
      requestedAt: returnRequest.requestedAt!,
      expectedCreditAmount: returnRequest.expectedCreditAmount!,
      notes: returnRequest.notes,
      attachments: returnRequest.attachments!
    };

    onSave?.(finalRequest);
    toast.success('Return request created');
    onOpenChange(false);
  };

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setPhotos(prev => [...prev, ...files]);
    
    // Convert to data URLs for preview
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setNewItem(prev => ({
          ...prev,
          photos: [...(prev.photos || []), dataUrl]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const getConditionColor = (condition: string) => {
    const option = conditionOptions.find(c => c.value === condition);
    return option?.color || 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Return to Supplier (RMA Request)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Return Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>RMA Number</Label>
                  <Input
                    value={returnRequest.rmaNumber}
                    onChange={(e) => setReturnRequest(prev => ({ ...prev, rmaNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={returnRequest.status}
                    onValueChange={(value: 'PENDING' | 'APPROVED' | 'SHIPPED' | 'RECEIVED' | 'COMPLETED' | 'REJECTED') =>
                      setReturnRequest(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="SHIPPED">Shipped</SelectItem>
                      <SelectItem value="RECEIVED">Received</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Supplier</Label>
                <AutoCompleteInput
                  placeholder="Search suppliers..."
                  options={mockSuppliers}
                  onSelect={(supplier) => {
                    setReturnRequest(prev => ({
                      ...prev,
                      supplierId: supplier.id,
                      supplierName: supplier.label
                    }));
                  }}
                  value={returnRequest.supplierName}
                />
              </div>

              <div>
                <Label>Return Reason</Label>
                <Select
                  value={returnRequest.reason}
                  onValueChange={(value) => setReturnRequest(prev => ({ ...prev, reason: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select return reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {returnReasons.map(reason => (
                      <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional notes about this return..."
                  value={returnRequest.notes}
                  onChange={(e) => setReturnRequest(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Add Return Items */}
          <Card>
            <CardHeader>
              <CardTitle>Add Return Item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Part</Label>
                <AutoCompleteInput
                  placeholder="Search parts..."
                  options={mockParts}
                  onSelect={(part) => {
                    setNewItem(prev => ({
                      ...prev,
                      partId: part.id,
                      partSku: part.value,
                      partName: part.label
                    }));
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Condition</Label>
                  <Select
                    value={newItem.condition}
                    onValueChange={(value: 'DEFECTIVE' | 'DAMAGED' | 'EXPIRED' | 'WRONG_PART' | 'OVERSTOCKED') =>
                      setNewItem(prev => ({ ...prev, condition: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {conditionOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Item Reason</Label>
                  <Select
                    value={newItem.reason}
                    onValueChange={(value) => setNewItem(prev => ({ ...prev, reason: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {returnReasons.map(reason => (
                        <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Serial Numbers (Optional)</Label>
                  <Input
                    placeholder="Comma-separated serial numbers"
                    value={newItem.serialNumbers?.join(', ') || ''}
                    onChange={(e) => setNewItem(prev => ({
                      ...prev,
                      serialNumbers: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }))}
                  />
                </div>
                <div>
                  <Label>Lot Numbers (Optional)</Label>
                  <Input
                    placeholder="Comma-separated lot numbers"
                    value={newItem.lotNumbers?.join(', ') || ''}
                    onChange={(e) => setNewItem(prev => ({
                      ...prev,
                      lotNumbers: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }))}
                  />
                </div>
              </div>

              <div>
                <Label>Photos (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoCapture}
                    className="hidden"
                    id="photo-upload"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('photo-upload')?.click()}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Add Photos
                  </Button>
                  {newItem.photos && newItem.photos.length > 0 && (
                    <Badge variant="secondary">
                      {newItem.photos.length} photo(s) added
                    </Badge>
                  )}
                </div>
              </div>

              <Button onClick={handleAddItem} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Item to Return
              </Button>
            </CardContent>
          </Card>

          {/* Return Items List */}
          {returnRequest.items && returnRequest.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Return Items
                  <Badge variant="secondary">
                    {returnRequest.items.length} item(s)
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returnRequest.items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.partName}</div>
                            <div className="text-sm text-muted-foreground">{item.partSku}</div>
                          </div>
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>
                          <Badge className={getConditionColor(item.condition)}>
                            {conditionOptions.find(c => c.value === item.condition)?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.reason}</TableCell>
                        <TableCell>${item.totalCost.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Expected Credit Amount:</span>
                    <span className="text-lg font-bold">
                      ${returnRequest.expectedCreditAmount?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <FileText className="h-4 w-4 mr-2" />
            Create RMA Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};