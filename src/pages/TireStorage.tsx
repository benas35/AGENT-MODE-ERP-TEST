import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Camera, Calendar, MapPin, Snowflake, Sun, Leaf, Mountain } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TireSet {
  id: string;
  customer_name: string;
  vehicle_info: string;
  tire_brand: string;
  tire_size: string;
  season: 'SUMMER' | 'WINTER' | 'ALL_SEASON';
  quantity: number;
  rack_location: string;
  position: string;
  stored_date: string;
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  tread_depth: number;
  notes?: string;
  photos?: string[];
  next_reminder_date?: string;
}

// Mock data for tire storage
const mockTireSets: TireSet[] = [
  {
    id: '1',
    customer_name: 'John Smith',
    vehicle_info: '2020 Honda Civic',
    tire_brand: 'Michelin X-Ice',
    tire_size: '215/60R16',
    season: 'WINTER',
    quantity: 4,
    rack_location: 'A-1',
    position: 'Top',
    stored_date: '2024-04-15',
    condition: 'EXCELLENT',
    tread_depth: 8.5,
    notes: 'Customer wants these mounted in October',
    photos: [],
    next_reminder_date: '2024-10-01'
  },
  {
    id: '2',
    customer_name: 'Sarah Johnson',
    vehicle_info: '2019 Toyota RAV4',
    tire_brand: 'Continental ContiSport',
    tire_size: '225/65R17',
    season: 'SUMMER',
    quantity: 4,
    rack_location: 'B-3',
    position: 'Middle',
    stored_date: '2024-09-20',
    condition: 'GOOD',
    tread_depth: 6.2,
    notes: 'Minor sidewall scuff on one tire'
  }
];

const seasonIcons = {
  SUMMER: Sun,
  WINTER: Snowflake,
  ALL_SEASON: Leaf
};

const seasonColors = {
  SUMMER: 'bg-warning/10 text-warning',
  WINTER: 'bg-info/10 text-info',
  ALL_SEASON: 'bg-success/10 text-success'
};

const conditionColors = {
  EXCELLENT: 'bg-success/10 text-success',
  GOOD: 'bg-info/10 text-info',
  FAIR: 'bg-warning/10 text-warning',
  POOR: 'bg-destructive/10 text-destructive'
};

export default function TireStorage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [selectedRack, setSelectedRack] = useState<string>('');
  const [tireSets, setTireSets] = useState<TireSet[]>(mockTireSets);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const filteredTires = tireSets.filter(tire => {
    const matchesSearch = 
      tire.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tire.vehicle_info.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tire.tire_brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tire.tire_size.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSeason = !selectedSeason || tire.season === selectedSeason;
    const matchesRack = !selectedRack || tire.rack_location.startsWith(selectedRack);

    return matchesSearch && matchesSeason && matchesRack;
  });

  const handleCreateTireSet = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Tire set creation will be implemented with photo upload and barcode scanning.",
    });
    setShowCreateDialog(false);
  };

  const racks = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tire Storage</h1>
          <p className="text-muted-foreground">
            Manage seasonal tire storage and track customer tires
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Store Tires
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Store New Tire Set</DialogTitle>
              <DialogDescription>
                Add a new tire set to storage with photos and details
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer Name</Label>
                  <Input id="customer" placeholder="Customer name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle">Vehicle</Label>
                  <Input id="vehicle" placeholder="Year Make Model" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Tire Brand</Label>
                  <Input id="brand" placeholder="Michelin, Bridgestone..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="size">Tire Size</Label>
                  <Input id="size" placeholder="215/60R16" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="season">Season</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select season" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUMMER">Summer</SelectItem>
                      <SelectItem value="WINTER">Winter</SelectItem>
                      <SelectItem value="ALL_SEASON">All Season</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rack">Rack Location</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rack" />
                    </SelectTrigger>
                    <SelectContent>
                      {racks.map(rack => (
                        <SelectItem key={rack} value={rack}>{rack}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TOP">Top</SelectItem>
                      <SelectItem value="MIDDLE">Middle</SelectItem>
                      <SelectItem value="BOTTOM">Bottom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="condition">Condition</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXCELLENT">Excellent</SelectItem>
                      <SelectItem value="GOOD">Good</SelectItem>
                      <SelectItem value="FAIR">Fair</SelectItem>
                      <SelectItem value="POOR">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" placeholder="Additional notes about the tires..." />
              </div>

              <div className="space-y-2">
                <Label>Photos</Label>
                <div className="border-2 border-dashed border-muted-foreground/50 rounded-lg p-8 text-center">
                  <Camera className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">Click to upload or drag and drop tire photos</p>
                  <p className="text-xs text-muted-foreground mt-2">PNG, JPG up to 10MB each</p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTireSet}>
                Store Tires
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by customer, vehicle, brand, or size..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedSeason} onValueChange={setSelectedSeason}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by season" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Seasons</SelectItem>
            <SelectItem value="SUMMER">Summer</SelectItem>
            <SelectItem value="WINTER">Winter</SelectItem>
            <SelectItem value="ALL_SEASON">All Season</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedRack} onValueChange={setSelectedRack}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by rack" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Racks</SelectItem>
            {racks.map(rack => (
              <SelectItem key={rack} value={rack}>Rack {rack}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tire Sets Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTires.map((tireSet) => {
          const SeasonIcon = seasonIcons[tireSet.season];
          
          return (
            <Card key={tireSet.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{tireSet.customer_name}</CardTitle>
                  <Badge className={seasonColors[tireSet.season]}>
                    <SeasonIcon className="mr-1 h-3 w-3" />
                    {tireSet.season.replace('_', ' ')}
                  </Badge>
                </div>
                <CardDescription className="text-sm">
                  {tireSet.vehicle_info}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Brand & Size:</span>
                    <span className="font-medium">{tireSet.tire_brand}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Size:</span>
                    <span className="font-mono">{tireSet.tire_size}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Quantity:</span>
                    <span>{tireSet.quantity} tires</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Location:</span>
                    <span className="flex items-center">
                      <MapPin className="mr-1 h-3 w-3" />
                      {tireSet.rack_location}-{tireSet.position}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Condition:</span>
                    <Badge variant="outline" className={conditionColors[tireSet.condition]}>
                      {tireSet.condition}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tread Depth:</span>
                    <span>{tireSet.tread_depth}mm</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Stored:</span>
                    <span className="flex items-center">
                      <Calendar className="mr-1 h-3 w-3" />
                      {new Date(tireSet.stored_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {tireSet.notes && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    {tireSet.notes}
                  </div>
                )}

                {tireSet.next_reminder_date && (
                  <div className="flex items-center text-xs text-warning">
                    <Calendar className="mr-1 h-3 w-3" />
                    Reminder: {new Date(tireSet.next_reminder_date).toLocaleDateString()}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    View Details
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    Photos
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTires.length === 0 && (
        <div className="text-center py-12">
          <Mountain className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No tire sets found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || selectedSeason || selectedRack
              ? "Try adjusting your filters to see more results."
              : "Store your first set of tires to get started."}
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Store Tires
          </Button>
        </div>
      )}
    </div>
  );
}