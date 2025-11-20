import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Settings as SettingsIcon,
  Building,
  Users,
  Bell,
  Shield,
  CreditCard,
  Globe,
  Mail,
  Phone,
  Clock,
  Database,
  Key,
  Trash2,
  Upload,
  Save
} from "lucide-react";
import { toast } from "sonner";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";

export default function Settings() {
  const [loading, setLoading] = useState(false);

  // Organization settings state
  const [orgSettings, setOrgSettings] = useState({
    name: 'AutoRepair Pro',
    email: 'info@autorepairpro.com',
    phone: '+1 (555) 123-4567',
    address: '123 Main Street, Anytown, ST 12345',
    timezone: 'America/New_York',
    currency: 'USD',
    taxRate: '8.25',
    businessHours: {
      weekdayStart: '07:00',
      weekdayEnd: '18:00',
      saturdayStart: '08:00',
      saturdayEnd: '16:00',
      sundayOpen: false
    }
  });

  const {
    preferences,
    updatePreference,
    savePreferences,
    loading: preferencesLoading,
    saving: preferencesSaving,
    dirty: preferencesDirty,
  } = useNotificationPreferences();

  // User management state
  const [users] = useState([
    { id: 1, name: 'John Doe', email: 'john@autorepairpro.com', role: 'OWNER', active: true },
    { id: 2, name: 'Jane Smith', email: 'jane@autorepairpro.com', role: 'MANAGER', active: true },
    { id: 3, name: 'Mike Johnson', email: 'mike@autorepairpro.com', role: 'TECHNICIAN', active: true },
    { id: 4, name: 'Sarah Williams', email: 'sarah@autorepairpro.com', role: 'SERVICE_ADVISOR', active: false }
  ]);

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      OWNER: 'bg-destructive text-destructive-foreground',
      MANAGER: 'bg-warning text-warning-foreground',
      TECHNICIAN: 'bg-info text-info-foreground',
      SERVICE_ADVISOR: 'bg-success text-success-foreground',
      VIEWER: 'bg-muted text-muted-foreground'
    };
    return colors[role as keyof typeof colors] || colors.VIEWER;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your organization settings and preferences</p>
        </div>
        <Button onClick={handleSaveSettings} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs defaultValue="organization" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Organization Settings */}
        <TabsContent value="organization" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Business Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    value={orgSettings.name}
                    onChange={(e) => setOrgSettings({...orgSettings, name: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="orgEmail">Email Address</Label>
                  <Input
                    id="orgEmail"
                    type="email"
                    value={orgSettings.email}
                    onChange={(e) => setOrgSettings({...orgSettings, email: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="orgPhone">Phone Number</Label>
                  <Input
                    id="orgPhone"
                    value={orgSettings.phone}
                    onChange={(e) => setOrgSettings({...orgSettings, phone: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="orgAddress">Business Address</Label>
                  <Textarea
                    id="orgAddress"
                    value={orgSettings.address}
                    onChange={(e) => setOrgSettings({...orgSettings, address: e.target.value})}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Regional Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={orgSettings.timezone} onValueChange={(value) => 
                    setOrgSettings({...orgSettings, timezone: value})
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={orgSettings.currency} onValueChange={(value) => 
                    setOrgSettings({...orgSettings, currency: value})
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.01"
                    value={orgSettings.taxRate}
                    onChange={(e) => setOrgSettings({...orgSettings, taxRate: e.target.value})}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Business Hours
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Weekday Start</Label>
                    <Input
                      type="time"
                      value={orgSettings.businessHours.weekdayStart}
                      onChange={(e) => setOrgSettings({
                        ...orgSettings,
                        businessHours: {...orgSettings.businessHours, weekdayStart: e.target.value}
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Weekday End</Label>
                    <Input
                      type="time"
                      value={orgSettings.businessHours.weekdayEnd}
                      onChange={(e) => setOrgSettings({
                        ...orgSettings,
                        businessHours: {...orgSettings.businessHours, weekdayEnd: e.target.value}
                      })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Saturday Start</Label>
                    <Input
                      type="time"
                      value={orgSettings.businessHours.saturdayStart}
                      onChange={(e) => setOrgSettings({
                        ...orgSettings,
                        businessHours: {...orgSettings.businessHours, saturdayStart: e.target.value}
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Saturday End</Label>
                    <Input
                      type="time"
                      value={orgSettings.businessHours.saturdayEnd}
                      onChange={(e) => setOrgSettings({
                        ...orgSettings,
                        businessHours: {...orgSettings.businessHours, saturdayEnd: e.target.value}
                      })}
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="sundayOpen"
                    checked={orgSettings.businessHours.sundayOpen}
                    onCheckedChange={(checked) => setOrgSettings({
                      ...orgSettings,
                      businessHours: {...orgSettings.businessHours, sundayOpen: checked}
                    })}
                  />
                  <Label htmlFor="sundayOpen">Open on Sundays</Label>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Management */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
                <Button>
                  <Users className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.name}</span>
                        <Badge className={getRoleBadge(user.role)}>
                          {user.role}
                        </Badge>
                        {!user.active && (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => savePreferences()}
                disabled={!preferencesDirty || preferencesSaving}
              >
                {preferencesSaving ? "Saving..." : "Save changes"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={preferences.notifyEmail}
                    disabled={preferencesLoading || preferencesSaving}
                    onCheckedChange={(checked) => updatePreference('notifyEmail', Boolean(checked))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive urgent notifications via SMS</p>
                  </div>
                  <Switch
                    checked={preferences.notifySms}
                    disabled={preferencesLoading || preferencesSaving}
                    onCheckedChange={(checked) => updatePreference('notifySms', Boolean(checked))}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Appointment Reminders</Label>
                    <p className="text-sm text-muted-foreground">Send automatic appointment reminders</p>
                  </div>
                  <Switch
                    checked={preferences.appointmentReminders}
                    disabled={preferencesLoading || preferencesSaving}
                    onCheckedChange={(checked) => updatePreference('appointmentReminders', Boolean(checked))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Overdue Alerts</Label>
                    <p className="text-sm text-muted-foreground">Alert when work orders are overdue</p>
                  </div>
                  <Switch
                    checked={preferences.overdueAlerts}
                    disabled={preferencesLoading || preferencesSaving}
                    onCheckedChange={(checked) => updatePreference('overdueAlerts', Boolean(checked))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Low Inventory Alerts</Label>
                    <p className="text-sm text-muted-foreground">Alert when inventory is running low</p>
                  </div>
                  <Switch
                    checked={preferences.lowInventoryAlerts}
                    disabled={preferencesLoading || preferencesSaving}
                    onCheckedChange={(checked) => updatePreference('lowInventoryAlerts', Boolean(checked))}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Daily Reports</Label>
                    <p className="text-sm text-muted-foreground">Receive daily performance reports</p>
                  </div>
                  <Switch
                    checked={preferences.dailyReports}
                    disabled={preferencesLoading || preferencesSaving}
                    onCheckedChange={(checked) => updatePreference('dailyReports', Boolean(checked))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly Reports</Label>
                    <p className="text-sm text-muted-foreground">Receive weekly business summaries</p>
                  </div>
                  <Switch
                    checked={preferences.weeklyReports}
                    disabled={preferencesLoading || preferencesSaving}
                    onCheckedChange={(checked) => updatePreference('weeklyReports', Boolean(checked))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Third-Party Integrations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'QuickBooks Online', status: 'connected', description: 'Accounting integration' },
                  { name: 'PartsTech', status: 'disconnected', description: 'Parts ordering system' },
                  { name: 'CARFAX', status: 'connected', description: 'Vehicle history reports' },
                  { name: 'Stripe', status: 'connected', description: 'Payment processing' },
                  { name: 'Twilio', status: 'disconnected', description: 'SMS communications' },
                  { name: 'SendGrid', status: 'connected', description: 'Email services' }
                ].map((integration) => (
                  <div key={integration.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{integration.name}</span>
                        <Badge variant={integration.status === 'connected' ? 'default' : 'secondary'}>
                          {integration.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{integration.description}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      {integration.status === 'connected' ? 'Configure' : 'Connect'}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing & Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Current Plan: Professional</h3>
                    <p className="text-2xl font-bold">$199/month</p>
                    <p className="text-sm text-muted-foreground">Unlimited users • All features included</p>
                    <Button className="mt-4" variant="outline">Change Plan</Button>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Next Billing Date</h3>
                    <p className="text-lg">January 15, 2024</p>
                    <p className="text-sm text-muted-foreground">Your subscription will auto-renew</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-4">Payment Method</h3>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-5 bg-primary rounded"></div>
                      <span>•••• •••• •••• 4242</span>
                      <span className="text-sm text-muted-foreground">Expires 12/26</span>
                    </div>
                    <Button className="mt-4" variant="outline" size="sm">Update</Button>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Usage This Month</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Users</span>
                        <span>4 / Unlimited</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Work Orders</span>
                        <span>1,234 / Unlimited</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Storage</span>
                        <span>2.4 GB / 100 GB</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                  </div>
                  <Button variant="outline">Enable 2FA</Button>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="font-medium">Data & Privacy</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Activity Logging</Label>
                      <p className="text-sm text-muted-foreground">Log all user activities for audit purposes</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Data Retention</Label>
                      <p className="text-sm text-muted-foreground">Automatically delete old data after 7 years</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="font-medium">API Access</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">API Key #1</div>
                        <div className="text-sm text-muted-foreground">Created on Dec 15, 2023</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Active</Badge>
                        <Button variant="outline" size="sm">
                          <Key className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <Button variant="outline">
                      <Key className="mr-2 h-4 w-4" />
                      Generate New API Key
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}