import React, { useState, useMemo } from 'react';
import { AlertTriangle, Check, X, Eye, Calculator } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface ThreeWayMatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrderId?: string;
  goodsReceiptId?: string;
  invoiceId?: string;
  onApprove?: (matchResult: MatchResult) => void;
}

interface DocumentLine {
  id: string;
  partSku: string;
  partName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  description?: string;
}

interface MatchResult {
  status: 'MATCHED' | 'VARIANCE' | 'REJECTED';
  variances: Variance[];
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
}

interface Variance {
  type: 'QUANTITY' | 'PRICE' | 'AMOUNT' | 'MISSING_LINE' | 'EXTRA_LINE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  poValue?: number;
  grnValue?: number;
  invoiceValue?: number;
  difference?: number;
  lineId?: string;
}

// Mock data for demonstration
const mockPOLines: DocumentLine[] = [
  { id: '1', partSku: 'BRK-001', partName: 'Brake Pads', quantity: 10, unitPrice: 45.50, lineTotal: 455.00 },
  { id: '2', partSku: 'OIL-001', partName: 'Engine Oil', quantity: 5, unitPrice: 25.00, lineTotal: 125.00 },
  { id: '3', partSku: 'FLT-001', partName: 'Oil Filter', quantity: 5, unitPrice: 12.50, lineTotal: 62.50 }
];

const mockGRNLines: DocumentLine[] = [
  { id: '1', partSku: 'BRK-001', partName: 'Brake Pads', quantity: 8, unitPrice: 45.50, lineTotal: 364.00 }, // Quantity variance
  { id: '2', partSku: 'OIL-001', partName: 'Engine Oil', quantity: 5, unitPrice: 25.00, lineTotal: 125.00 },
  { id: '3', partSku: 'FLT-001', partName: 'Oil Filter', quantity: 5, unitPrice: 12.50, lineTotal: 62.50 }
];

const mockInvoiceLines: DocumentLine[] = [
  { id: '1', partSku: 'BRK-001', partName: 'Brake Pads', quantity: 8, unitPrice: 47.00, lineTotal: 376.00 }, // Price variance
  { id: '2', partSku: 'OIL-001', partName: 'Engine Oil', quantity: 5, unitPrice: 25.00, lineTotal: 125.00 },
  { id: '3', partSku: 'FLT-001', partName: 'Oil Filter', quantity: 5, unitPrice: 12.50, lineTotal: 62.50 },
  { id: '4', partSku: 'SHP-001', partName: 'Shipping Charge', quantity: 1, unitPrice: 15.00, lineTotal: 15.00 } // Extra line
];

export const ThreeWayMatchModal: React.FC<ThreeWayMatchModalProps> = ({
  open,
  onOpenChange,
  purchaseOrderId = 'PO-2024-0001',
  goodsReceiptId = 'GRN-2024-0001',
  invoiceId = 'INV-2024-0001',
  onApprove
}) => {
  const [notes, setNotes] = useState('');
  const [selectedTab, setSelectedTab] = useState('summary');

  // Calculate variances
  const variances = useMemo(() => {
    const found: Variance[] = [];

    // Check for quantity variances
    mockPOLines.forEach(poLine => {
      const grnLine = mockGRNLines.find(g => g.partSku === poLine.partSku);
      const invLine = mockInvoiceLines.find(i => i.partSku === poLine.partSku);

      if (grnLine && grnLine.quantity !== poLine.quantity) {
        found.push({
          type: 'QUANTITY',
          severity: Math.abs(grnLine.quantity - poLine.quantity) > 2 ? 'HIGH' : 'MEDIUM',
          description: `Quantity variance on ${poLine.partName}`,
          poValue: poLine.quantity,
          grnValue: grnLine.quantity,
          invoiceValue: invLine?.quantity,
          difference: grnLine.quantity - poLine.quantity,
          lineId: poLine.id
        });
      }

      if (invLine && invLine.unitPrice !== poLine.unitPrice) {
        const priceDiff = invLine.unitPrice - poLine.unitPrice;
        found.push({
          type: 'PRICE',
          severity: Math.abs(priceDiff) > 5 ? 'HIGH' : priceDiff > 1 ? 'MEDIUM' : 'LOW',
          description: `Price variance on ${poLine.partName}`,
          poValue: poLine.unitPrice,
          grnValue: grnLine?.unitPrice,
          invoiceValue: invLine.unitPrice,
          difference: priceDiff,
          lineId: poLine.id
        });
      }
    });

    // Check for extra lines in invoice
    mockInvoiceLines.forEach(invLine => {
      const poLine = mockPOLines.find(p => p.partSku === invLine.partSku);
      if (!poLine) {
        found.push({
          type: 'EXTRA_LINE',
          severity: invLine.lineTotal > 50 ? 'HIGH' : 'MEDIUM',
          description: `Extra line item: ${invLine.partName}`,
          invoiceValue: invLine.lineTotal,
          lineId: invLine.id
        });
      }
    });

    return found;
  }, []);

  const matchStatus = variances.length === 0 ? 'MATCHED' : 
                     variances.some(v => v.severity === 'HIGH') ? 'REJECTED' : 'VARIANCE';

  const totals = {
    po: mockPOLines.reduce((sum, line) => sum + line.lineTotal, 0),
    grn: mockGRNLines.reduce((sum, line) => sum + line.lineTotal, 0),
    invoice: mockInvoiceLines.reduce((sum, line) => sum + line.lineTotal, 0)
  };

  const handleApprove = () => {
    const result: MatchResult = {
      status: matchStatus === 'REJECTED' ? 'REJECTED' : variances.length > 0 ? 'VARIANCE' : 'MATCHED',
      variances,
      approvedBy: 'current-user',
      approvedAt: new Date().toISOString(),
      notes
    };

    onApprove?.(result);
    toast.success(`Three-way match ${result.status.toLowerCase()}`);
    onOpenChange(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'bg-red-100 text-red-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'MATCHED': return 'bg-green-100 text-green-800';
      case 'VARIANCE': return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Three-Way Match Analysis
          </DialogTitle>
        </DialogHeader>

        {/* Status Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="font-semibold">Match Status</h3>
                  <Badge className={getStatusColor(matchStatus)}>
                    {matchStatus}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  <div>PO: {purchaseOrderId}</div>
                  <div>GRN: {goodsReceiptId}</div>
                  <div>Invoice: {invoiceId}</div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-muted-foreground mb-1">Total Variances</div>
                <div className="text-2xl font-bold text-red-600">
                  {variances.length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="variances">
              Variances ({variances.length})
            </TabsTrigger>
            <TabsTrigger value="details">Line Details</TabsTrigger>
            <TabsTrigger value="totals">Totals</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Purchase Order</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totals.po.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">{mockPOLines.length} lines</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Goods Receipt</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totals.grn.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">{mockGRNLines.length} lines</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Invoice</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totals.invoice.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">{mockInvoiceLines.length} lines</div>
                </CardContent>
              </Card>
            </div>

            {variances.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Key Variances</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {variances.slice(0, 3).map((variance, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <Badge className={getSeverityColor(variance.severity)}>
                            {variance.severity}
                          </Badge>
                          <span className="text-sm">{variance.description}</span>
                        </div>
                        {variance.difference && (
                          <span className="text-sm font-medium">
                            {variance.type === 'PRICE' ? '$' : ''}{Math.abs(variance.difference)}
                          </span>
                        )}
                      </div>
                    ))}
                    {variances.length > 3 && (
                      <div className="text-sm text-muted-foreground text-center">
                        +{variances.length - 3} more variances
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="variances" className="space-y-4">
            {variances.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <h3 className="text-lg font-semibold mb-2">Perfect Match!</h3>
                  <p className="text-muted-foreground">
                    All documents match perfectly with no variances detected.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {variances.map((variance, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getSeverityColor(variance.severity)}>
                              {variance.severity}
                            </Badge>
                            <Badge variant="outline">
                              {variance.type.replace('_', ' ')}
                            </Badge>
                          </div>
                          <h4 className="font-medium mb-1">{variance.description}</h4>
                          
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">PO Value:</span>
                              <div className="font-medium">
                                {variance.poValue !== undefined ? 
                                  (variance.type === 'PRICE' ? `$${variance.poValue}` : variance.poValue) : 
                                  'N/A'
                                }
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">GRN Value:</span>
                              <div className="font-medium">
                                {variance.grnValue !== undefined ? 
                                  (variance.type === 'PRICE' ? `$${variance.grnValue}` : variance.grnValue) : 
                                  'N/A'
                                }
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Invoice Value:</span>
                              <div className="font-medium">
                                {variance.invoiceValue !== undefined ? 
                                  (variance.type === 'PRICE' ? `$${variance.invoiceValue}` : variance.invoiceValue) : 
                                  'N/A'
                                }
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Difference:</span>
                              <div className={`font-medium ${variance.difference && variance.difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {variance.difference !== undefined ? 
                                  `${variance.difference > 0 ? '+' : ''}${variance.type === 'PRICE' ? '$' : ''}${variance.difference}` : 
                                  'N/A'
                                }
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Line Item Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Part</TableHead>
                        <TableHead>PO Qty</TableHead>
                        <TableHead>GRN Qty</TableHead>
                        <TableHead>Inv Qty</TableHead>
                        <TableHead>PO Price</TableHead>
                        <TableHead>Inv Price</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockPOLines.map(poLine => {
                        const grnLine = mockGRNLines.find(g => g.partSku === poLine.partSku);
                        const invLine = mockInvoiceLines.find(i => i.partSku === poLine.partSku);
                        const hasVariance = variances.some(v => v.lineId === poLine.id);
                        
                        return (
                          <TableRow key={poLine.id} className={hasVariance ? 'bg-yellow-50' : ''}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{poLine.partName}</div>
                                <div className="text-sm text-muted-foreground">{poLine.partSku}</div>
                              </div>
                            </TableCell>
                            <TableCell>{poLine.quantity}</TableCell>
                            <TableCell className={grnLine?.quantity !== poLine.quantity ? 'text-red-600 font-medium' : ''}>
                              {grnLine?.quantity || 'N/A'}
                            </TableCell>
                            <TableCell>{invLine?.quantity || 'N/A'}</TableCell>
                            <TableCell>${poLine.unitPrice}</TableCell>
                            <TableCell className={invLine?.unitPrice !== poLine.unitPrice ? 'text-red-600 font-medium' : ''}>
                              {invLine ? `$${invLine.unitPrice}` : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {hasVariance ? (
                                <Badge variant="destructive">Variance</Badge>
                              ) : (
                                <Badge variant="default">Match</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      
                      {/* Extra invoice lines */}
                      {mockInvoiceLines.filter(invLine => 
                        !mockPOLines.some(poLine => poLine.partSku === invLine.partSku)
                      ).map(invLine => (
                        <TableRow key={`extra-${invLine.id}`} className="bg-red-50">
                          <TableCell>
                            <div>
                              <div className="font-medium">{invLine.partName}</div>
                              <div className="text-sm text-muted-foreground">{invLine.partSku}</div>
                            </div>
                          </TableCell>
                          <TableCell>N/A</TableCell>
                          <TableCell>N/A</TableCell>
                          <TableCell>{invLine.quantity}</TableCell>
                          <TableCell>N/A</TableCell>
                          <TableCell>${invLine.unitPrice}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">Extra Line</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="totals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Purchase Order Total:</span>
                    <span className="font-medium">${totals.po.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Goods Receipt Total:</span>
                    <span className="font-medium">${totals.grn.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Invoice Total:</span>
                    <span className="font-medium">${totals.invoice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 text-lg font-bold">
                    <span>Net Variance:</span>
                    <span className={totals.invoice - totals.po > 0 ? 'text-red-600' : 'text-green-600'}>
                      ${Math.abs(totals.invoice - totals.po).toFixed(2)}
                      {totals.invoice - totals.po > 0 ? ' Over' : ' Under'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Approval Notes</label>
            <Textarea
              placeholder="Add notes about this three-way match..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {matchStatus === 'REJECTED' ? (
            <Button variant="destructive" onClick={handleApprove}>
              <X className="h-4 w-4 mr-2" />
              Reject Match
            </Button>
          ) : (
            <Button onClick={handleApprove}>
              <Check className="h-4 w-4 mr-2" />
              {matchStatus === 'VARIANCE' ? 'Approve with Variances' : 'Approve Match'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};