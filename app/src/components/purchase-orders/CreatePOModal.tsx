import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useSuppliers } from "@/hooks/useSuppliers"
import { useParts } from "@/hooks/useParts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2 } from "lucide-react"

interface CreatePOModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface POLineItem {
  id: string
  part_id: string
  part_name: string
  part_sku: string
  quantity: number
  unit_cost: number
  line_total: number
}

export function CreatePOModal({ open, onOpenChange }: CreatePOModalProps) {
  const { toast } = useToast()
  const { suppliers } = useSuppliers()
  const { parts } = useParts()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)

  const [formData, setFormData] = useState({
    supplier_id: "",
    expected_delivery_date: "",
    notes: "",
    reference: "",
  })

  const [lineItems, setLineItems] = useState<POLineItem[]>([])

  const addLineItem = () => {
    const newItem: POLineItem = {
      id: Math.random().toString(36).substr(2, 9),
      part_id: "",
      part_name: "",
      part_sku: "",
      quantity: 1,
      unit_cost: 0,
      line_total: 0,
    }
    setLineItems([...lineItems, newItem])
  }

  const updateLineItem = (id: string, field: keyof POLineItem, value: any) => {
    setLineItems(items => items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value }
        
        if (field === 'part_id') {
          const part = parts.find(p => p.id === value)
          if (part) {
            updatedItem.part_name = part.name
            updatedItem.part_sku = part.sku
          }
        }
        
        if (field === 'quantity' || field === 'unit_cost') {
          updatedItem.line_total = updatedItem.quantity * updatedItem.unit_cost
        }
        
        return updatedItem
      }
      return item
    }))
  }

  const removeLineItem = (id: string) => {
    setLineItems(items => items.filter(item => item.id !== id))
  }

  const getTotalAmount = () => {
    return lineItems.reduce((sum, item) => sum + item.line_total, 0)
  }

  const handleSubmit = async () => {
    if (!formData.supplier_id) {
      toast({
        title: "Error",
        description: "Please select a supplier",
        variant: "destructive",
      })
      return
    }

    if (lineItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one line item",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Here you would typically call a backend API to create the PO
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call

      toast({
        title: "Success",
        description: "Purchase order created successfully",
      })

      onOpenChange(false)
      setStep(1)
      setFormData({
        supplier_id: "",
        expected_delivery_date: "",
        notes: "",
        reference: "",
      })
      setLineItems([])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create purchase order",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Create Purchase Order</span>
            <div className="flex space-x-1">
              {[1, 2, 3].map((i) => (
                <Badge key={i} variant={step >= i ? "default" : "secondary"}>
                  {i}
                </Badge>
              ))}
            </div>
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 1: Supplier Selection</h3>
            
            <div>
              <Label htmlFor="supplier">Supplier *</Label>
              <Select value={formData.supplier_id} onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSupplier && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Supplier Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">VAT ID:</span> {selectedSupplier.vat_id || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {selectedSupplier.email || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span> {selectedSupplier.phone || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Payment Terms:</span> {selectedSupplier.payment_terms || 30} days
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expected_delivery_date">Expected Delivery Date</Label>
                <Input
                  id="expected_delivery_date"
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="reference">Reference</Label>
                <Input
                  id="reference"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="PO reference or project code"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Special instructions or notes"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!formData.supplier_id}>
                Next: Add Items
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Step 2: Add Line Items</h3>
              <Button onClick={addLineItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {lineItems.map((item, index) => (
                <Card key={item.id}>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-6 gap-4 items-end">
                      <div className="col-span-2">
                        <Label>Part</Label>
                        <Select 
                          value={item.part_id} 
                          onValueChange={(value) => updateLineItem(item.id, 'part_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select part" />
                          </SelectTrigger>
                          <SelectContent>
                            {parts.map((part) => (
                              <SelectItem key={part.id} value={part.id}>
                                {part.sku} - {part.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>Unit Cost</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_cost}
                          onChange={(e) => updateLineItem(item.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>Line Total</Label>
                        <Input
                          value={item.line_total.toFixed(2)}
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeLineItem(item.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {lineItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No items added yet. Click "Add Item" to get started.
              </div>
            )}

            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <div className="text-right">
                <div className="text-lg font-semibold">
                  Total: €{getTotalAmount().toFixed(2)}
                </div>
                <Button onClick={() => setStep(3)} disabled={lineItems.length === 0}>
                  Next: Review
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 3: Review & Create</h3>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Supplier:</span> {selectedSupplier?.name}
                  </div>
                  <div>
                    <span className="font-medium">Expected Delivery:</span> {formData.expected_delivery_date || 'Not specified'}
                  </div>
                  <div>
                    <span className="font-medium">Reference:</span> {formData.reference || 'None'}
                  </div>
                  <div>
                    <span className="font-medium">Line Items:</span> {lineItems.length}
                  </div>
                </div>
                {formData.notes && (
                  <div className="mt-2">
                    <span className="font-medium">Notes:</span> {formData.notes}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Line Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lineItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <span>{item.part_sku} - {item.part_name}</span>
                      <span>{item.quantity} × €{item.unit_cost.toFixed(2)} = €{item.line_total.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>€{getTotalAmount().toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Creating..." : "Create Purchase Order"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}