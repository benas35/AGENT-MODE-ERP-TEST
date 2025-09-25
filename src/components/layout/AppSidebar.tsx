import { 
  LayoutDashboard, 
  Users, 
  Car, 
  ClipboardList, 
  Calendar,
  Package,
  FileText,
  Settings,
  Clock,
  DollarSign,
  GitBranch,
  CalendarDays,
  Building2,
  Truck
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Workflow",
    url: "/workflow",
    icon: GitBranch,
  },
  {
    title: "Planner",
    url: "/planner",
    icon: CalendarDays,
  },
  {
    title: "Work Orders",
    url: "/work-orders",
    icon: ClipboardList,
  },
  {
    title: "Customers",
    url: "/customers",
    icon: Users,
  },
  {
    title: "Vehicles",
    url: "/vehicles", 
    icon: Car,
  },
  {
    title: "Inventory",
    url: "/inventory",
    icon: Package,
  },
  {
    title: "Parts",
    url: "/parts",
    icon: Package,
  },
  {
    title: "Purchase Orders",
    url: "/purchase-orders", 
    icon: FileText,
  },
  {
    title: "Suppliers",
    url: "/suppliers",
    icon: Building2,
  },
  {
    title: "Estimates",
    url: "/estimates",
    icon: FileText,
  },
  {
    title: "Invoices",
    url: "/invoices",
    icon: FileText,
  },
  {
    title: "Time Clock",
    url: "/time-clock",
    icon: Clock,
  },
  {
    title: "Tire Storage",
    url: "/tire-storage",
    icon: Truck,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: DollarSign,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === "collapsed";
  
  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 border-b border-border">
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-bold text-primary">AutoRepair ERP</h1>
              <p className="text-sm text-muted-foreground">Professional Shop Management</p>
            </div>
          )}
          {isCollapsed && (
            <div className="text-center">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">AR</span>
              </div>
            </div>
          )}
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    tooltip={isCollapsed ? item.title : undefined}
                  >
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}