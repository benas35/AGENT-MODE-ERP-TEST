import React, { useState } from 'react';
import { Package, Hash, Calendar, MapPin, Search, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { BarcodeScanner } from '@/components/shared/BarcodeScanner';
import { toast } from 'sonner';

interface SerialLotTrackingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partId?: string;
  partName?: string;
  trackingType?: 'SERIAL' | 'LOT' | 'BOTH';
  onSave?: (tracking: TrackingRecord) => void;
}

interface TrackingRecord {
  id?: string;
  partId: string;
  serialNumber?: string;
  lotNumber?: string;
  quantity?: number;
  expiryDate?: string;
  location: string;
  supplier?: string;
  purchaseOrderId?: string;
  receivedDate: string;
  status: 'AVAILABLE' | 'ALLOCATED' | 'SOLD' | 'EXPIRED' | 'QUARANTINE';
  history: TrackingHistory[];
  notes?: string;
}

interface TrackingHistory {
  id: string;
  action: string;
  timestamp: string;
  user: string;
  details: string;
  location?: string;
  quantity?: number;
}

// Mock tracking data
const mockTrackingRecords: TrackingRecord[] = [
  {
    id: '1',
    partId: '1',
    serialNumber: 'SN-BRK-001-240101',
    quantity: 1,
    location: 'A-01-05',
    supplier: 'Brembo',
    purchaseOrderId: 'PO-2024-0001',
    receivedDate: '2024-01-15',
    status: 'AVAILABLE',
    history: [
      {
        id: '1',
        action: 'RECEIVED',
        timestamp: '2024-01-15T10:30:00Z',
        user: 'John Doe',
        details: 'Received from supplier',
        location: 'RECEIVING',
        quantity: 1
      },
      {
        id: '2',
        action: 'MOVED',
        timestamp: '2024-01-15T14:15:00Z',
        user: 'Jane Smith',
        details: 'Moved to storage location',
        location: 'A-01-05',
        quantity: 1
      }
    ]
  },
  {
    id: '2',
    partId: '2',
    lotNumber: 'LOT-OIL-240115',
    quantity: 12,
    expiryDate: '2026-01-15',
    location: 'B-02-10',
    supplier: 'Mobil 1',
    purchaseOrderId: 'PO-2024-0002',
    receivedDate: '2024-01-20',
    status: 'AVAILABLE',
    history: [
      {
        id: '3',
        action: 'RECEIVED',
        timestamp: '2024-01-20T09:00:00Z',
        user: 'Mike Johnson',
        details: 'Lot received and quality checked',
        location: 'RECEIVING',
        quantity: 12
      }
    ]
  }
];

export const SerialLotTrackingModal: React.FC<SerialLotTrackingModalProps> = ({
  open,
  onOpenChange,
  partId = '1',
  partName = 'Brake Pads',
  trackingType = 'BOTH',
  onSave
}) => {
  const [activeTab, setActiveTab] = useState('search');
  const [newRecord, setNewRecord] = useState<Partial<TrackingRecord>>({
    partId,
    status: 'AVAILABLE',
    receivedDate: new Date().toISOString().split('T')[0],
    location: '',
    history: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<TrackingRecord | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'serial' | 'lot' | null>(null);

  const filteredRecords = mockTrackingRecords.filter(record =>
    record.partId === partId &&
    (record.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     record.lotNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     record.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleScan = (barcode: string) => {
    if (scannerTarget === 'serial') {
      setNewRecord(prev => ({ ...prev, serialNumber: barcode }));
    } else if (scannerTarget === 'lot') {
      setNewRecord(prev => ({ ...prev, lotNumber: barcode }));
    }
    setScannerOpen(false);
    setScannerTarget(null);
    toast.success(`${scannerTarget === 'serial' ? 'Serial' : 'Lot'} number scanned: ${barcode}`);
  };

  const openScanner = (target: 'serial' | 'lot') => {
    setScannerTarget(target);
    setScannerOpen(true);
  };

  const handleSaveRecord = () => {
    if (!newRecord.location) {
      toast.error('Please specify a location');
      return;
    }

    if (trackingType === 'SERIAL' && !newRecord.serialNumber) {
      toast.error('Please enter or scan a serial number');
      return;
    }

    if (trackingType === 'LOT' && !newRecord.lotNumber) {
      toast.error('Please enter or scan a lot number');
      return;
    }

    const record: TrackingRecord = {
      id: Date.now().toString(),
      partId: newRecord.partId!,
      serialNumber: newRecord.serialNumber,
      lotNumber: newRecord.lotNumber,
      quantity: newRecord.quantity || 1,
      expiryDate: newRecord.expiryDate,
      location: newRecord.location!,
      supplier: newRecord.supplier,
      purchaseOrderId: newRecord.purchaseOrderId,
      receivedDate: newRecord.receivedDate!,
      status: newRecord.status!,
      history: [
        {
          id: '1',
          action: 'CREATED',
          timestamp: new Date().toISOString(),
          user: 'Current User',
          details: 'Tracking record created',
          location: newRecord.location,
          quantity: newRecord.quantity || 1
        }
      ],
      notes: newRecord.notes
    };

    onSave?.(record);
    toast.success('Tracking record saved');
    
    // Reset form
    setNewRecord({
      partId,
      status: 'AVAILABLE',
      receivedDate: new Date().toISOString().split('T')[0],
      location: '',
      history: []
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-100 text-green-800';
      case 'ALLOCATED': return 'bg-blue-100 text-blue-800';
      case 'SOLD': return 'bg-gray-100 text-gray-800';
      case 'EXPIRED': return 'bg-red-100 text-red-800';
      case 'QUARANTINE': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Serial/Lot Tracking - {partName}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="search">Search & View</TabsTrigger>
              <TabsTrigger value="add">Add New</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Search Serial/Lot Numbers</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by serial number, lot number, or location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => openScanner('serial')}
                  className="mt-6"
                >
                  Scan
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serial/Lot Number</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.map(record => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div>
                              {record.serialNumber && (
                                <div className="flex items-center gap-1">
                                  <Hash className="h-3 w-3" />
                                  <span className="font-mono text-sm">{record.serialNumber}</span>
                                </div>
                              )}
                              {record.lotNumber && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Package className="h-3 w-3" />
                                  <span className="font-mono text-sm">{record.lotNumber}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{record.quantity || 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {record.location}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(record.status)}>
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {record.expiryDate ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(record.expiryDate).toLocaleDateString()}
                              </div>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedRecord(record)}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {selectedRecord && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Tracking Details
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRecord(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Serial Number</Label>
                        <div className="font-mono">{selectedRecord.serialNumber || 'N/A'}</div>
                      </div>
                      <div>
                        <Label>Lot Number</Label>
                        <div className="font-mono">{selectedRecord.lotNumber || 'N/A'}</div>
                      </div>
                      <div>
                        <Label>Supplier</Label>
                        <div>{selectedRecord.supplier || 'N/A'}</div>
                      </div>
                      <div>
                        <Label>Purchase Order</Label>
                        <div>{selectedRecord.purchaseOrderId || 'N/A'}</div>
                      </div>
                    </div>

                    <div>
                      <Label>Transaction History</Label>
                      <div className="mt-2 space-y-2">
                        {selectedRecord.history.map(entry => (
                          <div key={entry.id} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <div className="font-medium">{entry.action}</div>
                              <div className="text-sm text-muted-foreground">{entry.details}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(entry.timestamp).toLocaleString()} by {entry.user}
                              </div>
                            </div>
                            <div className="text-right text-sm">
                              {entry.location && <div>Location: {entry.location}</div>}
                              {entry.quantity && <div>Qty: {entry.quantity}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="add" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Add New Tracking Record</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(trackingType === 'SERIAL' || trackingType === 'BOTH') && (
                    <div>
                      <Label>Serial Number</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter or scan serial number"
                          value={newRecord.serialNumber || ''}
                          onChange={(e) => setNewRecord(prev => ({ ...prev, serialNumber: e.target.value }))}
                        />
                        <Button
                          variant="outline"
                          onClick={() => openScanner('serial')}
                        >
                          Scan
                        </Button>
                      </div>
                    </div>
                  )}

                  {(trackingType === 'LOT' || trackingType === 'BOTH') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Lot Number</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter or scan lot number"
                            value={newRecord.lotNumber || ''}
                            onChange={(e) => setNewRecord(prev => ({ ...prev, lotNumber: e.target.value }))}
                          />
                          <Button
                            variant="outline"
                            onClick={() => openScanner('lot')}
                          >
                            Scan
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={newRecord.quantity || ''}
                          onChange={(e) => setNewRecord(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Location</Label>
                      <Input
                        placeholder="e.g., A-01-05"
                        value={newRecord.location || ''}
                        onChange={(e) => setNewRecord(prev => ({ ...prev, location: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={newRecord.status}
                        onValueChange={(value: 'AVAILABLE' | 'ALLOCATED' | 'SOLD' | 'EXPIRED' | 'QUARANTINE') =>
                          setNewRecord(prev => ({ ...prev, status: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AVAILABLE">Available</SelectItem>
                          <SelectItem value="ALLOCATED">Allocated</SelectItem>
                          <SelectItem value="SOLD">Sold</SelectItem>
                          <SelectItem value="EXPIRED">Expired</SelectItem>
                          <SelectItem value="QUARANTINE">Quarantine</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Supplier</Label>
                      <Input
                        placeholder="Supplier name"
                        value={newRecord.supplier || ''}
                        onChange={(e) => setNewRecord(prev => ({ ...prev, supplier: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Purchase Order</Label>
                      <Input
                        placeholder="PO number"
                        value={newRecord.purchaseOrderId || ''}
                        onChange={(e) => setNewRecord(prev => ({ ...prev, purchaseOrderId: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Received Date</Label>
                      <Input
                        type="date"
                        value={newRecord.receivedDate || ''}
                        onChange={(e) => setNewRecord(prev => ({ ...prev, receivedDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Expiry Date (Optional)</Label>
                      <Input
                        type="date"
                        value={newRecord.expiryDate || ''}
                        onChange={(e) => setNewRecord(prev => ({ ...prev, expiryDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="Additional notes..."
                      value={newRecord.notes || ''}
                      onChange={(e) => setNewRecord(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <Button onClick={handleSaveRecord} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Save Tracking Record
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>All Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockTrackingRecords
                      .flatMap(record => record.history.map(h => ({ ...h, record })))
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map(entry => (
                        <div key={entry.id} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{entry.action}</Badge>
                              <span className="font-medium">{entry.details}</span>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {entry.record.serialNumber && `Serial: ${entry.record.serialNumber}`}
                              {entry.record.lotNumber && `Lot: ${entry.record.lotNumber}`}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(entry.timestamp).toLocaleString()} by {entry.user}
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            {entry.location && <div>Location: {entry.location}</div>}
                            {entry.quantity && <div>Qty: {entry.quantity}</div>}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BarcodeScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleScan}
        title={`Scan ${scannerTarget === 'serial' ? 'Serial' : 'Lot'} Number`}
      />
    </>
  );
};