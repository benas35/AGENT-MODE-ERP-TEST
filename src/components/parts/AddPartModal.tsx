import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useParts } from "@/hooks/useParts"
import { useSuppliers } from "@/hooks/useSuppliers"

interface AddPartModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddPartModal({ open, onOpenChange }: AddPartModalProps) {
  const { toast } = useToast()
  const { createPart } = useParts()
  const { suppliers } = useSuppliers()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    sku: "",
    part_no: "",
    name: "",
    description: "",
    brand: "",
    uom: "ea",
    category_id: "",
    default_supplier_id: "",
    reorder_point: "0",
    reorder_qty: "0",
    min_stock: "0",
    max_stock: "0",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await createPart({
        ...formData,
        reorder_point: parseFloat(formData.reorder_point) || 0,
        reorder_qty: parseFloat(formData.reorder_qty) || 0,
        min_stock: parseFloat(formData.min_stock) || 0,
        max_stock: parseFloat(formData.max_stock) || 0,
        is_serialized: false,
        track_lot: false,
        cost_method: 'average',
        attributes: {},
        active: true,
      })

      toast({
        title: "Success",
        description: "Part created successfully",
      })

      onOpenChange(false)
      setFormData({
        sku: "",
        part_no: "",
        name: "",
        description: "",
        brand: "",
        uom: "ea",
        category_id: "",
        default_supplier_id: "",
        reorder_point: "0",
        reorder_qty: "0",
        min_stock: "0",
        max_stock: "0",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create part",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Part</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="part_no">Part Number *</Label>
              <Input
                id="part_no"
                value={formData.part_no}
                onChange={(e) => setFormData({ ...formData, part_no: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="uom">Unit of Measure</Label>
              <Select value={formData.uom} onValueChange={(value) => setFormData({ ...formData, uom: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ea">Each</SelectItem>
                  <SelectItem value="box">Box</SelectItem>
                  <SelectItem value="pkg">Package</SelectItem>
                  <SelectItem value="set">Set</SelectItem>
                  <SelectItem value="kit">Kit</SelectItem>
                  <SelectItem value="m">Meter</SelectItem>
                  <SelectItem value="kg">Kilogram</SelectItem>
                  <SelectItem value="l">Liter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="supplier">Default Supplier</Label>
            <Select value={formData.default_supplier_id} onValueChange={(value) => setFormData({ ...formData, default_supplier_id: value })}>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reorder_point">Reorder Point</Label>
              <Input
                id="reorder_point"
                type="number"
                min="0"
                step="0.01"
                value={formData.reorder_point}
                onChange={(e) => setFormData({ ...formData, reorder_point: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="reorder_qty">Reorder Quantity</Label>
              <Input
                id="reorder_qty"
                type="number"
                min="0"
                step="0.01"
                value={formData.reorder_qty}
                onChange={(e) => setFormData({ ...formData, reorder_qty: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min_stock">Min Stock</Label>
              <Input
                id="min_stock"
                type="number"
                min="0"
                step="0.01"
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="max_stock">Max Stock</Label>
              <Input
                id="max_stock"
                type="number"
                min="0"
                step="0.01"
                value={formData.max_stock}
                onChange={(e) => setFormData({ ...formData, max_stock: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Part"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}