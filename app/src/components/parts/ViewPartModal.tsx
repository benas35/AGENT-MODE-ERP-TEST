import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Part } from "@/hooks/useParts"
import { useSuppliers } from "@/hooks/useSuppliers"

interface ViewPartModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  part: Part | null
  onEdit: () => void
}

export function ViewPartModal({ open, onOpenChange, part, onEdit }: ViewPartModalProps) {
  const { suppliers } = useSuppliers()

  if (!part) return null

  const supplier = suppliers.find(s => s.id === part.default_supplier_id)
  const stockLevel = 0 // TODO: Fetch from inventory balance
  const stockStatus = stockLevel <= (part.reorder_point || 0) ? 'Low Stock' : 'In Stock'
  const stockVariant = stockLevel <= (part.reorder_point || 0) ? 'destructive' : 'default'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Part Details</span>
            <Badge variant={stockVariant}>{stockStatus}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">SKU</label>
                <p className="text-sm">{part.sku}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Part Number</label>
                <p className="text-sm">{part.part_no}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-sm font-semibold">{part.name}</p>
              </div>
              {part.description && (
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-sm">{part.description}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Brand</label>
                <p className="text-sm">{part.brand || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Unit of Measure</label>
                <p className="text-sm">{part.uom}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Inventory Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Inventory Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Quantity on Hand</label>
                <p className="text-sm font-semibold">{stockLevel}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Available</label>
                <p className="text-sm">0</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Allocated</label>
                <p className="text-sm">0</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Reorder Point</label>
                <p className="text-sm">{part.reorder_point || 0}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Reorder Quantity</label>
                <p className="text-sm">{part.reorder_qty || 0}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Min Stock</label>
                <p className="text-sm">{part.min_stock || 0}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Max Stock</label>
                <p className="text-sm">{part.max_stock || 0}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Supplier Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Supplier Information</h3>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Default Supplier</label>
              <p className="text-sm">{supplier?.name || 'None assigned'}</p>
            </div>
          </div>

          <Separator />

          {/* System Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">System Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <p className="text-sm">
                  <Badge variant={part.active ? 'default' : 'secondary'}>
                    {part.active ? 'Active' : 'Inactive'}
                  </Badge>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Serial Tracked</label>
                <p className="text-sm">{part.is_serialized ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Lot Tracked</label>
                <p className="text-sm">{part.track_lot ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p className="text-sm">{new Date(part.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onEdit}>
            Edit Part
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}