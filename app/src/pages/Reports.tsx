import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
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
  Calendar,
  RefreshCw,
  Activity
} from "lucide-react";
import { format, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useReportingDashboard } from '@/hooks/useReportingDashboard';

const COLORS = ['#1e40af', '#059669', '#dc2626', '#d97706', '#7c2d12'];

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export default function Reports() {
  const [dateRange, setDateRange] = useState<{ from: Date, to?: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [selectedLocation, setSelectedLocation] = useState<'all' | string>('all');
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const loadLocations = async () => {
      const { data } = await supabase.from('locations').select('id, name').order('name');
      setLocations(data ?? []);
    };

    loadLocations();
  }, []);

  const { data, loading, error, refresh } = useReportingDashboard({
    startDate: dateRange.from,
    endDate: dateRange.to ?? new Date(),
    period,
    locationId: selectedLocation === 'all' ? null : selectedLocation,
  });

  const revenueTrend = useMemo(
    () => data.salesByPeriod.map((entry) => ({
      label: format(new Date(entry.period_start), period === 'day' ? 'MMM d' : period === 'month' ? 'MMM yyyy' : 'MMM d'),
      ...entry,
    })),
    [data.salesByPeriod, period]
  );

  const appointmentByDay = useMemo(
    () => data.appointments.byDayOfWeek
      .slice()
      .sort((a, b) => a.dow - b.dow)
      .map((item) => ({ ...item, label: item.day })),
    [data.appointments.byDayOfWeek]
  );

  const appointmentByHour = useMemo(
    () => data.appointments.byHour
      .slice()
      .sort((a, b) => a.hour - b.hour),
    [data.appointments.byHour]
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Business performance, sales, operational efficiency, and inventory health</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
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

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load analytics</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <DatePickerWithRange date={dateRange} onDateChange={(range) => setDateRange(range as { from: Date, to?: Date })} />
            </div>

            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={period} onValueChange={(value: 'day' | 'week' | 'month') => setPeriod(value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Sales</TabsTrigger>
          <TabsTrigger value="operational">Operational</TabsTrigger>
          <TabsTrigger value="employee">Employee</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[{
              title: 'Total Revenue',
              value: currency.format(data.totals.revenue),
              icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
            }, {
              title: 'Work Orders',
              value: data.totals.workOrders.toLocaleString(),
              icon: <Wrench className="h-4 w-4 text-muted-foreground" />,
            }, {
              title: 'Avg. Ticket',
              value: currency.format(data.totals.avgTicket),
              icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
            }, {
              title: 'Active Customers',
              value: data.totals.customers.toLocaleString(),
              icon: <Users className="h-4 w-4 text-muted-foreground" />,
            }].map((kpi, idx) => (
              <Card key={kpi.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                  {kpi.icon}
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-6 w-24" />
                  ) : (
                    <div className="text-2xl font-bold">{kpi.value}</div>
                  )}
                  {!loading && (
                    <p className="text-xs text-muted-foreground">Current period</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Revenue & Work Orders Trend</CardTitle>
              <Badge variant="outline" className="flex items-center gap-1">
                <Activity className="h-3 w-3" /> {period.toUpperCase()}
              </Badge>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-72 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Bar yAxisId="right" dataKey="work_orders" fill="#8884d8" name="Work Orders" />
                    <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2} name="Revenue" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Service Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={data.serviceMix}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="revenue"
                        >
                          {data.serviceMix.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => currency.format(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3">
                      {data.serviceMix.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-sm">{item.service_type}</span>
                          </div>
                          <span className="text-sm font-medium">{currency.format(item.revenue)}</span>
                        </div>
                      ))}
                      {data.serviceMix.length === 0 && (
                        <p className="text-sm text-muted-foreground">No line items in this window.</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <Skeleton className="h-48 w-full" />
                ) : data.customers.topCustomers.map((customer) => (
                  <div key={customer.customer_id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{customer.first_name} {customer.last_name}</p>
                      <p className="text-sm text-muted-foreground">{customer.invoices} invoices</p>
                    </div>
                    <span className="font-semibold">{currency.format(customer.revenue)}</span>
                  </div>
                ))}
                {!loading && data.customers.topCustomers.length === 0 && (
                  <p className="text-sm text-muted-foreground">No customers recorded in this period.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Technician</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-72 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.salesByTechnician}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="technician_name" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip formatter={(value: number) => currency.format(value)} />
                      <Bar dataKey="revenue" fill="#1e40af" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Lifetime Value</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <Skeleton className="h-28 w-full" />
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total invoiced</span>
                      <span className="text-lg font-semibold">{currency.format(data.customers.lifetimeValue)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Avg per customer</span>
                      <span className="text-lg font-semibold">{currency.format(data.customers.avgPerCustomer)}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operational" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[{
              title: 'Avg Repair Time',
              value: `${data.cycleTimes.avgRepairHours.toFixed(1)} hrs`,
              icon: <Clock className="h-4 w-4 text-muted-foreground" />
            }, {
              title: 'Avg Cycle Time',
              value: `${data.cycleTimes.avgCycleHours.toFixed(1)} hrs`,
              icon: <Activity className="h-4 w-4 text-muted-foreground" />
            }, {
              title: 'Bay Utilization',
              value: data.bayUtilization.length
                ? `${Math.round((data.bayUtilization[0].utilization_pct ?? 0)).toString()}% top bay`
                : 'N/A',
              icon: <Car className="h-4 w-4 text-muted-foreground" />
            }, {
              title: 'Appointment Volume',
              value: appointmentByDay.reduce((sum, day) => sum + day.appointments, 0).toString(),
              icon: <Calendar className="h-4 w-4 text-muted-foreground" />
            }].map((metric) => (
              <Card key={metric.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                  {metric.icon}
                </CardHeader>
                <CardContent>
                  {loading ? <Skeleton className="h-6 w-16" /> : <div className="text-xl font-semibold">{metric.value}</div>}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Bay Utilization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : data.bayUtilization.map((bay) => (
                <div key={bay.bay_id ?? bay.bay_name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{bay.bay_name ?? 'Unassigned Bay'}</p>
                    <p className="text-sm text-muted-foreground">{bay.appointments} appointments</p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{bay.utilization_pct ? `${bay.utilization_pct}%` : '0%'}</div>
                    <p className="text-xs text-muted-foreground">{bay.booked_hours.toFixed(1)} hrs booked</p>
                  </div>
                </div>
              ))}
              {!loading && data.bayUtilization.length === 0 && (
                <p className="text-sm text-muted-foreground">No bay bookings in this window.</p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Appointment Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={appointmentByDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="appointments" fill="#0ea5e9" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hour of Day</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={appointmentByHour}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="appointments" stroke="#1e40af" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Vehicle Service History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : data.customers.vehicleHistory.map((vehicle) => (
                <div key={vehicle.vehicle_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                    <p className="text-sm text-muted-foreground">{vehicle.visits} visits</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {vehicle.last_visit ? `Last: ${format(new Date(vehicle.last_visit), 'MMM d, yyyy')}` : 'No completion date'}
                  </div>
                </div>
              ))}
              {!loading && data.customers.vehicleHistory.length === 0 && (
                <p className="text-sm text-muted-foreground">No vehicle visits captured in this range.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employee" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Technician Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <Skeleton className="h-48 w-full" />
                ) : data.salesByTechnician.map((tech) => (
                  <div key={tech.technician_id ?? tech.technician_name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h3 className="font-medium">{tech.technician_name ?? 'Unassigned'}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{tech.work_orders} work orders</span>
                        <Badge variant="outline">
                          {tech.efficiency ? `${Math.round(tech.efficiency * 100)}%` : 'N/A'} efficiency
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{currency.format(tech.revenue)}</div>
                      <div className="text-sm text-muted-foreground">{tech.hours_worked.toFixed(1)} hours</div>
                    </div>
                  </div>
                ))}
                {!loading && data.salesByTechnician.length === 0 && (
                  <p className="text-sm text-muted-foreground">No technician assignments for this period.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Inventory Value</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-6 w-24" /> : <div className="text-2xl font-bold">{currency.format(data.inventory.stockValue)}</div>}
                <p className="text-xs text-muted-foreground">Current stock value</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Low Stock Items</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-6 w-16" /> : <div className="text-2xl font-bold text-warning">{data.inventory.lowStockCount}</div>}
                <p className="text-xs text-muted-foreground">Items below reorder point</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top Usage (Parts)</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-24 w-full" />
                ) : data.inventory.topUsage.map((item) => (
                  <div key={item.inventory_item_id ?? item.name} className="flex items-center justify-between text-sm">
                    <span>{item.name ?? 'Untracked Part'}</span>
                    <span className="font-medium">{item.quantity_used} used</span>
                  </div>
                ))}
                {!loading && data.inventory.topUsage.length === 0 && (
                  <p className="text-sm text-muted-foreground">No parts consumed in this window.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Supplier Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : data.inventory.supplierPerformance.map((supplier) => (
                <div key={supplier.supplier_id ?? supplier.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{supplier.name ?? 'Unnamed Supplier'}</p>
                    <p className="text-xs text-muted-foreground">{supplier.parts_supplied} stocked SKUs</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    Avg cost: {supplier.avg_cost ? currency.format(supplier.avg_cost) : 'N/A'}
                  </div>
                </div>
              ))}
              {!loading && data.inventory.supplierPerformance.length === 0 && (
                <p className="text-sm text-muted-foreground">No suppliers with inventory in this period.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
