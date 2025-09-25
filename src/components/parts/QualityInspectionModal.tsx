import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Save, AlertTriangle, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface QualityInspectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partId?: string;
  partName?: string;
  onSave?: (inspection: QualityInspection) => void;
}

interface QualityInspection {
  id?: string;
  partId: string;
  inspectorId: string;
  status: 'PASS' | 'FAIL' | 'CONDITIONAL';
  defects: QualityDefect[];
  photos: string[];
  notes: string;
  measurements: Record<string, number>;
  certifications: string[];
  inspectedAt: string;
}

interface QualityDefect {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  location?: string;
  photo?: string;
}

const defectTypes = [
  'Damage',
  'Corrosion',
  'Wear',
  'Manufacturing Defect',
  'Wrong Part',
  'Missing Component',
  'Incorrect Specification',
  'Packaging Issue'
];

const severityColors = {
  LOW: 'bg-blue-100 text-blue-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800'
};

export const QualityInspectionModal: React.FC<QualityInspectionModalProps> = ({
  open,
  onOpenChange,
  partId = '1',
  partName = 'Brake Pads',
  onSave
}) => {
  const [inspection, setInspection] = useState<Partial<QualityInspection>>({
    partId,
    status: 'PASS',
    defects: [],
    photos: [],
    notes: '',
    measurements: {},
    certifications: []
  });
  
  const [newDefect, setNewDefect] = useState<Partial<QualityDefect>>({
    type: '',
    severity: 'LOW',
    description: '',
    location: ''
  });
  
  const [photos, setPhotos] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setPhotos(prev => [...prev, ...files]);
    
    // Convert to data URLs for preview
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setInspection(prev => ({
          ...prev,
          photos: [...(prev.photos || []), dataUrl]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setInspection(prev => ({
      ...prev,
      photos: prev.photos?.filter((_, i) => i !== index) || []
    }));
  };

  const addDefect = () => {
    if (!newDefect.type || !newDefect.description) {
      toast.error('Please fill in defect type and description');
      return;
    }

    const defect: QualityDefect = {
      type: newDefect.type!,
      severity: newDefect.severity!,
      description: newDefect.description!,
      location: newDefect.location
    };

    setInspection(prev => ({
      ...prev,
      defects: [...(prev.defects || []), defect]
    }));

    setNewDefect({
      type: '',
      severity: 'LOW',
      description: '',
      location: ''
    });

    toast.success('Defect added');
  };

  const removeDefect = (index: number) => {
    setInspection(prev => ({
      ...prev,
      defects: prev.defects?.filter((_, i) => i !== index) || []
    }));
  };

  const updateMeasurement = (key: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setInspection(prev => ({
        ...prev,
        measurements: {
          ...prev.measurements,
          [key]: numValue
        }
      }));
    }
  };

  const handleSave = () => {
    const finalInspection: QualityInspection = {
      id: Date.now().toString(),
      partId: inspection.partId!,
      inspectorId: 'current-user',
      status: inspection.status!,
      defects: inspection.defects || [],
      photos: inspection.photos || [],
      notes: inspection.notes || '',
      measurements: inspection.measurements || {},
      certifications: inspection.certifications || [],
      inspectedAt: new Date().toISOString()
    };

    onSave?.(finalInspection);
    toast.success('Quality inspection saved');
    onOpenChange(false);
  };

  const overallStatus = inspection.defects?.some(d => d.severity === 'CRITICAL') 
    ? 'FAIL' 
    : inspection.defects?.some(d => d.severity === 'HIGH') 
    ? 'CONDITIONAL' 
    : 'PASS';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5" />
            Quality Inspection - {partName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="defects">Defects ({inspection.defects?.length || 0})</TabsTrigger>
            <TabsTrigger value="photos">Photos ({inspection.photos?.length || 0})</TabsTrigger>
            <TabsTrigger value="measurements">Measurements</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Inspection Status
                  <Badge className={`${
                    overallStatus === 'PASS' ? 'bg-green-100 text-green-800' :
                    overallStatus === 'CONDITIONAL' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {overallStatus}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Inspector Status</Label>
                    <Select
                      value={inspection.status}
                      onValueChange={(value: 'PASS' | 'FAIL' | 'CONDITIONAL') =>
                        setInspection(prev => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PASS">Pass</SelectItem>
                        <SelectItem value="CONDITIONAL">Conditional</SelectItem>
                        <SelectItem value="FAIL">Fail</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Part ID</Label>
                    <Input value={partId} disabled />
                  </div>
                </div>

                <div>
                  <Label>Inspection Notes</Label>
                  <Textarea
                    placeholder="Enter inspection notes..."
                    value={inspection.notes}
                    onChange={(e) => setInspection(prev => ({ ...prev, notes: e.target.value }))}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="defects" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add New Defect</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Defect Type</Label>
                    <Select
                      value={newDefect.type}
                      onValueChange={(value) => setNewDefect(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select defect type" />
                      </SelectTrigger>
                      <SelectContent>
                        {defectTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Severity</Label>
                    <Select
                      value={newDefect.severity}
                      onValueChange={(value: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') =>
                        setNewDefect(prev => ({ ...prev, severity: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Location (Optional)</Label>
                  <Input
                    placeholder="e.g., Front left corner"
                    value={newDefect.location}
                    onChange={(e) => setNewDefect(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe the defect in detail..."
                    value={newDefect.description}
                    onChange={(e) => setNewDefect(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <Button onClick={addDefect} className="w-full">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Add Defect
                </Button>
              </CardContent>
            </Card>

            {/* Existing Defects */}
            {inspection.defects && inspection.defects.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recorded Defects</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {inspection.defects.map((defect, index) => (
                      <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={severityColors[defect.severity]}>
                              {defect.severity}
                            </Badge>
                            <span className="font-medium">{defect.type}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">{defect.description}</p>
                          {defect.location && (
                            <p className="text-xs text-muted-foreground">Location: {defect.location}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDefect(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="photos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Photo Documentation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Take Photo
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photo
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handlePhotoCapture}
                  className="hidden"
                />

                {inspection.photos && inspection.photos.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    {inspection.photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={photo}
                          alt={`Inspection photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1"
                          onClick={() => removePhoto(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="measurements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Part Measurements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Length (mm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      onChange={(e) => updateMeasurement('length', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Width (mm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      onChange={(e) => updateMeasurement('width', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Height (mm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      onChange={(e) => updateMeasurement('height', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Weight (g)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      onChange={(e) => updateMeasurement('weight', e.target.value)}
                    />
                  </div>
                </div>

                {Object.keys(inspection.measurements || {}).length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Recorded Measurements</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(inspection.measurements || {}).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize">{key}:</span>
                          <span>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Inspection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
