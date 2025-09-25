import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Clock,
  Users,
  Car,
  Wrench,
  Download,
  Filter,
  Calendar
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

const COLORS = ['#1e40af', '#059669', '#dc2626', '#d97706', '#7c2d12'];

// Mock data for reports
const mockRevenueData = [
  { month: 'Jan', revenue: 45000, workOrders: 89 },
  { month: 'Feb', revenue: 52000, workOrders: 104 },
  { month: 'Mar', revenue: 48000, workOrders: 96 },
  { month: 'Apr', revenue: 58000, workOrders: 116 },
  { month: 'May', revenue: 62000, workOrders: 124 },
  { month: 'Jun', revenue: 55000, workOrders: 110 }
];

const mockServiceData = [
  { name: 'Oil Change', value: 35, color: '#1e40af' },
  { name: 'Brake Service', value: 28, color: '#059669' },
  { name: 'Tire Service', value: 20, color: '#dc2626' },
  { name: 'Engine Repair', value: 12, color: '#d97706' },
  { name: 'Other', value: 5, color: '#7c2d12' }
];

const mockTechnicianData = [
  { name: 'Carlos Rodriguez', hours: 168, efficiency: 94, revenue: 12500 },
  { name: 'Mike Johnson', hours: 156, efficiency: 87, revenue: 11200 },
  { name: 'Sarah Williams', hours: 142, efficiency: 91, revenue: 10800 },
  { name: 'David Chen', hours: 134, efficiency: 89, revenue: 9600 }
];

export default function Reports() {
  const [dateRange, setDateRange] = useState<{from: Date, to?: Date}>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [reportType, setReportType] = useState('overview');
  const [selectedLocation, setSelectedLocation] = useState('all');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Comprehensive business intelligence and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Date Range and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
            </div>
            
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="main">Main Shop</SelectItem>
                <SelectItem value="north">North Branch</SelectItem>
              </SelectContent>
            </Select>

            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Overview</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="operational">Operational</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="operational">Operational</TabsTrigger>
          <TabsTrigger value="employee">Employee</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$320,000</div>
                <p className="text-xs text-muted-foreground">
                  +12% from last period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Work Orders</CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">639</div>
                <p className="text-xs text-muted-foreground">
                  +8% from last period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Ticket</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$501</div>
                <p className="text-xs text-muted-foreground">
                  +3% from last period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Customer Count</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,234</div>
                <p className="text-xs text-muted-foreground">
                  +15% from last period
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue & Work Orders Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Bar yAxisId="right" dataKey="workOrders" fill="#8884d8" />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#82ca9d" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Service Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Service Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={mockServiceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {mockServiceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {mockServiceData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Labor</span>
                    <div className="text-right">
                      <div className="font-medium">$192,000</div>
                      <div className="text-sm text-muted-foreground">60%</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Parts</span>
                    <div className="text-right">
                      <div className="font-medium">$96,000</div>
                      <div className="text-sm text-muted-foreground">30%</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Subcontract</span>
                    <div className="text-right">
                      <div className="font-medium">$32,000</div>
                      <div className="text-sm text-muted-foreground">10%</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profit Margins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Gross Profit Margin</span>
                      <span className="font-medium text-success">65%</span>
                    </div>
                    <div className="w-full bg-muted h-2 rounded-full">
                      <div className="bg-success h-2 rounded-full" style={{width: '65%'}}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Labor Efficiency</span>
                      <span className="font-medium text-warning">78%</span>
                    </div>
                    <div className="w-full bg-muted h-2 rounded-full">
                      <div className="bg-warning h-2 rounded-full" style={{width: '78%'}}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Parts Markup</span>
                      <span className="font-medium text-info">42%</span>
                    </div>
                    <div className="w-full bg-muted h-2 rounded-full">
                      <div className="bg-info h-2 rounded-full" style={{width: '42%'}}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Employee Tab */}
        <TabsContent value="employee" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Technician Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockTechnicianData.map((tech, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h3 className="font-medium">{tech.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{tech.hours}h worked</span>
                        <Badge variant="outline">
                          {tech.efficiency}% efficiency
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${tech.revenue.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Revenue generated</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Inventory Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$45,678</div>
                <p className="text-xs text-muted-foreground">Current stock value</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Low Stock Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">23</div>
                <p className="text-xs text-muted-foreground">Items below reorder point</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Inventory Turnover</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4.2x</div>
                <p className="text-xs text-muted-foreground">Annual turnover rate</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}