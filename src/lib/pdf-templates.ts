// PDF Template utilities for Work Orders and Invoices
// This would integrate with a PDF generation service like jsPDF or Puppeteer

export interface WorkOrderPDFData {
  workOrderNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  vehicleInfo: string;
  serviceDate: string;
  items: Array<{
    description: string;
    hours?: number;
    rate?: number;
    parts?: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  technician?: string;
  notes?: string;
}

export interface InvoicePDFData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;
  vehicleInfo: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  terms?: string;
  notes?: string;
}

export const generateWorkOrderPDF = async (data: WorkOrderPDFData): Promise<string> => {
  // This would be implemented with actual PDF generation
  // For now, return a placeholder URL
  console.log('Generating Work Order PDF:', data);
  
  // In a real implementation, this would:
  // 1. Use jsPDF or similar to create PDF
  // 2. Upload to Supabase Storage
  // 3. Return the public URL
  
  return 'https://example.com/work-order.pdf';
};

export const generateInvoicePDF = async (data: InvoicePDFData): Promise<string> => {
  // This would be implemented with actual PDF generation
  // For now, return a placeholder URL
  console.log('Generating Invoice PDF:', data);
  
  // In a real implementation, this would:
  // 1. Use jsPDF or similar to create PDF
  // 2. Upload to Supabase Storage  
  // 3. Return the public URL
  
  return 'https://example.com/invoice.pdf';
};

// HTML templates for PDF generation
export const workOrderTemplate = (data: WorkOrderPDFData) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Work Order ${data.workOrderNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .customer-info { margin-bottom: 20px; }
    .vehicle-info { margin-bottom: 20px; background: #f5f5f5; padding: 15px; }
    .items { margin: 20px 0; }
    .items table { width: 100%; border-collapse: collapse; }
    .items th, .items td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    .items th { background-color: #f2f2f2; }
    .totals { margin-top: 20px; text-align: right; }
    .notes { margin-top: 30px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>WORK ORDER</h1>
    <h2>${data.workOrderNumber}</h2>
    <p>Service Date: ${data.serviceDate}</p>
  </div>
  
  <div class="customer-info">
    <h3>Customer Information</h3>
    <p><strong>Name:</strong> ${data.customerName}</p>
    ${data.customerPhone ? `<p><strong>Phone:</strong> ${data.customerPhone}</p>` : ''}
    ${data.customerEmail ? `<p><strong>Email:</strong> ${data.customerEmail}</p>` : ''}
  </div>
  
  <div class="vehicle-info">
    <h3>Vehicle Information</h3>
    <p>${data.vehicleInfo}</p>
  </div>
  
  <div class="items">
    <h3>Services & Parts</h3>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Hours</th>
          <th>Rate</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${data.items.map(item => `
          <tr>
            <td>${item.description}</td>
            <td>${item.hours || '-'}</td>
            <td>$${item.rate?.toFixed(2) || '-'}</td>
            <td>$${((item.hours || 0) * (item.rate || 0)).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <div class="totals">
    <p><strong>Subtotal: $${data.subtotal.toFixed(2)}</strong></p>
    <p><strong>Tax: $${data.tax.toFixed(2)}</strong></p>
    <p><strong>Total: $${data.total.toFixed(2)}</strong></p>
  </div>
  
  ${data.technician ? `<p><strong>Technician:</strong> ${data.technician}</p>` : ''}
  
  ${data.notes ? `
    <div class="notes">
      <h3>Notes</h3>
      <p>${data.notes}</p>
    </div>
  ` : ''}
</body>
</html>
`;

export const invoiceTemplate = (data: InvoicePDFData) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${data.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .company-info { text-align: left; }
    .invoice-info { text-align: right; }
    .customer-info { margin-bottom: 20px; }
    .vehicle-info { margin-bottom: 20px; background: #f5f5f5; padding: 15px; }
    .items { margin: 20px 0; }
    .items table { width: 100%; border-collapse: collapse; }
    .items th, .items td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    .items th { background-color: #f2f2f2; }
    .totals { margin-top: 20px; text-align: right; }
    .payment-terms { margin-top: 30px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <h1>Demo Auto Shop</h1>
      <p>123 Main Street<br>Anytown, ST 12345<br>Phone: (555) 123-4567</p>
    </div>
    <div class="invoice-info">
      <h2>INVOICE</h2>
      <p><strong>Invoice #:</strong> ${data.invoiceNumber}</p>
      <p><strong>Issue Date:</strong> ${data.issueDate}</p>
      <p><strong>Due Date:</strong> ${data.dueDate}</p>
    </div>
  </div>
  
  <div class="customer-info">
    <h3>Bill To:</h3>
    <p><strong>${data.customerName}</strong></p>
    ${data.customerAddress ? `<p>${data.customerAddress}</p>` : ''}
    ${data.customerPhone ? `<p>Phone: ${data.customerPhone}</p>` : ''}
    ${data.customerEmail ? `<p>Email: ${data.customerEmail}</p>` : ''}
  </div>
  
  <div class="vehicle-info">
    <h3>Vehicle:</h3>
    <p>${data.vehicleInfo}</p>
  </div>
  
  <div class="items">
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${data.items.map(item => `
          <tr>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
            <td>$${item.unitPrice.toFixed(2)}</td>
            <td>$${item.total.toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <div class="totals">
    <p>Subtotal: $${data.subtotal.toFixed(2)}</p>
    <p>Tax (${(data.taxRate * 100).toFixed(1)}%): $${data.taxAmount.toFixed(2)}</p>
    <p><strong>Total: $${data.total.toFixed(2)}</strong></p>
  </div>
  
  ${data.terms ? `
    <div class="payment-terms">
      <h3>Payment Terms</h3>
      <p>${data.terms}</p>
    </div>
  ` : ''}
  
  ${data.notes ? `
    <div class="notes">
      <h3>Notes</h3>
      <p>${data.notes}</p>
    </div>
  ` : ''}
  
  <div style="margin-top: 50px; text-align: center; color: #666;">
    <p>Thank you for your business!</p>
  </div>
</body>
</html>
`;