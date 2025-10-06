import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle, AlertCircle, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ImportSuppliersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportSuppliersModal({ open, onOpenChange }: ImportSuppliersModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    total: number;
    success: number;
    errors: number;
    warnings: string[];
  } | null>(null);

  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['.csv', '.xlsx', '.xls'];
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
      
      if (!validTypes.includes(fileExtension)) {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV or Excel file.",
          variant: "destructive"
        });
        return;
      }

      setFile(selectedFile);
      setImportResults(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select a file to import.",
        variant: "destructive"
      });
      return;
    }

    setImporting(true);
    setProgress(0);

    try {
      // Simulate file processing with progress updates
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Mock import results
      const results = {
        total: 25,
        success: 23,
        errors: 2,
        warnings: [
          "Row 5: Missing VAT ID for supplier 'Universal Parts'",
          "Row 12: Invalid email format for supplier 'Auto Components Ltd'"
        ]
      };

      setImportResults(results);
      
      toast({
        title: "Import Completed",
        description: `Successfully imported ${results.success} of ${results.total} suppliers.`
      });

    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to process the import file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    // In a real app, this would download a CSV template
    const csvContent = "name,code,email,phone,vat_id,currency,payment_terms,lead_time_days,street,city,country\n" +
                      "BMW Parts Direct,BMW001,orders@bmwparts.com,+49301234567,DE123456789,EUR,NET30,5,Motorstraße 123,Munich,Germany\n" +
                      "Mercedes Genuine Parts,MB002,supply@mercedes-parts.de,+49711987654,DE987654321,EUR,NET15,3,Daimlerstraße 456,Stuttgart,Germany";
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'suppliers_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setFile(null);
    setImportResults(null);
    setProgress(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Suppliers</DialogTitle>
          <DialogDescription>
            Import supplier data from a CSV or Excel file. Download the template to see the required format.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Template Download */}
          <div className="p-4 border border-dashed rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Import Template</p>
                  <p className="text-sm text-muted-foreground">Download the CSV template with required columns</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Select Import File</Label>
            <div className="border-2 border-dashed border-muted rounded-lg p-6">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <div className="mt-4">
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-primary hover:text-primary/80">Upload a file</span>
                    <span className="text-muted-foreground"> or drag and drop</span>
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  CSV, XLSX files up to 10MB
                </p>
              </div>
            </div>
            
            {file && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-muted rounded">
                <FileText className="h-4 w-4" />
                <span className="text-sm">{file.name}</span>
                <span className="text-sm text-muted-foreground">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            )}
          </div>

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Import Progress</Label>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Import Results */}
          {importResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold">{importResults.total}</div>
                  <div className="text-sm text-muted-foreground">Total Records</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{importResults.success}</div>
                  <div className="text-sm text-muted-foreground">Imported</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{importResults.errors}</div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
              </div>

              {importResults.warnings.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">Import Warnings:</div>
                    <ul className="text-sm space-y-1">
                      {importResults.warnings.map((warning, index) => (
                        <li key={index} className="text-muted-foreground">• {warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            {importResults ? 'Close' : 'Cancel'}
          </Button>
          {!importResults && (
            <Button onClick={handleImport} disabled={!file || importing}>
              {importing ? 'Importing...' : 'Import Suppliers'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}