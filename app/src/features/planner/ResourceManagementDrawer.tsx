import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatInOrgTimezone, fromOrgLocalInput } from "@/lib/timezone";
import type { PlannerTechnician } from "./types";
import type { PlannerBay, ResourceAvailabilityEntry, ResourceTimeOffEntry } from "./hooks";
import { mapErrorToFriendlyMessage } from "@/lib/errorHandling";

interface ResourceManagementDrawerProps {
  open: boolean;
  onClose: () => void;
  technicians: PlannerTechnician[];
  bays: PlannerBay[];
  availability: ResourceAvailabilityEntry[];
  timeOff: ResourceTimeOffEntry[];
  isLoading?: boolean;
  isMutating?: boolean;
  onCreateAvailability: (input: {
    resourceId: string;
    weekday: number;
    startTime: string;
    endTime: string;
  }) => Promise<void>;
  onDeleteAvailability: (input: { id: string }) => Promise<void>;
  onCreateTimeOff: (input: { resourceId: string; startTime: string; endTime: string; reason?: string | null }) => Promise<void>;
  onDeleteTimeOff: (input: { id: string }) => Promise<void>;
}

const WEEKDAYS: { value: string; label: string; numeric: number }[] = [
  { value: "1", label: "Monday", numeric: 1 },
  { value: "2", label: "Tuesday", numeric: 2 },
  { value: "3", label: "Wednesday", numeric: 3 },
  { value: "4", label: "Thursday", numeric: 4 },
  { value: "5", label: "Friday", numeric: 5 },
  { value: "6", label: "Saturday", numeric: 6 },
  { value: "0", label: "Sunday", numeric: 0 },
];

interface AvailabilityFormValues {
  resourceId: string;
  weekday: string;
  startTime: string;
  endTime: string;
}

interface TimeOffFormValues {
  resourceId: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export const ResourceManagementDrawer = ({
  open,
  onClose,
  technicians,
  bays,
  availability,
  timeOff,
  isLoading = false,
  isMutating = false,
  onCreateAvailability,
  onDeleteAvailability,
  onCreateTimeOff,
  onDeleteTimeOff,
}: ResourceManagementDrawerProps) => {
  const technicianOptions = useMemo(
    () =>
      technicians.map((technician) => ({
        value: technician.resourceId ?? technician.id,
        technicianId: technician.id,
        label: technician.name,
      })),
    [technicians]
  );

  const bayOptions = useMemo(
    () => bays.map((bay) => ({ value: bay.id, label: bay.name })),
    [bays]
  );

  const technicianAvailability = useMemo(
    () =>
      availability.filter((entry) =>
        technicianOptions.some((option) => option.value === entry.resourceId)
      ),
    [availability, technicianOptions]
  );

  const bayAvailability = useMemo(
    () => availability.filter((entry) => bayOptions.some((option) => option.value === entry.resourceId)),
    [availability, bayOptions]
  );

  const technicianTimeOff = useMemo(
    () =>
      timeOff.filter((entry) =>
        technicianOptions.some((option) => option.value === entry.resourceId)
      ),
    [technicianOptions, timeOff]
  );

  const techForm = useForm<AvailabilityFormValues>({
    defaultValues: {
      resourceId: technicianOptions[0]?.value ?? "",
      weekday: "1",
      startTime: "08:00",
      endTime: "17:00",
    },
  });

  const bayForm = useForm<AvailabilityFormValues>({
    defaultValues: {
      resourceId: bayOptions[0]?.value ?? "",
      weekday: "1",
      startTime: "08:00",
      endTime: "17:00",
    },
  });

  const timeOffForm = useForm<TimeOffFormValues>({
    defaultValues: {
      resourceId: technicianOptions[0]?.value ?? "",
      startTime: "",
      endTime: "",
      reason: "",
    },
  });

  useEffect(() => {
    techForm.reset((values) => ({
      ...values,
      resourceId: technicianOptions[0]?.value ?? values.resourceId,
    }));
    timeOffForm.reset((values) => ({
      ...values,
      resourceId: technicianOptions[0]?.value ?? values.resourceId,
    }));
  }, [technicianOptions, techForm, timeOffForm]);

  useEffect(() => {
    bayForm.reset((values) => ({
      ...values,
      resourceId: bayOptions[0]?.value ?? values.resourceId,
    }));
  }, [bayOptions, bayForm]);

  const handleCreateAvailability = async (values: AvailabilityFormValues) => {
    try {
      await onCreateAvailability({
        resourceId: values.resourceId,
        weekday: Number(values.weekday),
        startTime: values.startTime,
        endTime: values.endTime,
      });
      toast({ title: "Availability saved", description: "Availability window added." });
    } catch (error) {
      const friendly = mapErrorToFriendlyMessage(error, "saving availability");
      toast({ title: friendly.title, description: friendly.description, variant: "destructive" });
      throw error;
    }
  };

  const handleCreateTimeOff = async (values: TimeOffFormValues) => {
    try {
      await onCreateTimeOff({
        resourceId: values.resourceId,
        startTime: fromOrgLocalInput(values.startTime),
        endTime: fromOrgLocalInput(values.endTime),
        reason: values.reason.trim() ? values.reason.trim() : null,
      });
      toast({ title: "Time off added", description: "The time off window was created." });
    } catch (error) {
      const friendly = mapErrorToFriendlyMessage(error, "saving time off");
      toast({ title: friendly.title, description: friendly.description, variant: "destructive" });
      throw error;
    }
  };

  const handleDeleteAvailability = async (id: string) => {
    try {
      await onDeleteAvailability({ id });
      toast({ title: "Availability removed" });
    } catch (error) {
      const friendly = mapErrorToFriendlyMessage(error, "removing availability");
      toast({ title: friendly.title, description: friendly.description, variant: "destructive" });
    }
  };

  const handleDeleteTimeOff = async (id: string) => {
    try {
      await onDeleteTimeOff({ id });
      toast({ title: "Time off removed" });
    } catch (error) {
      const friendly = mapErrorToFriendlyMessage(error, "removing time off");
      toast({ title: friendly.title, description: friendly.description, variant: "destructive" });
    }
  };

  return (
    <Drawer open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DrawerContent className="max-h-[95vh] overflow-hidden">
        <DrawerHeader className="space-y-1">
          <DrawerTitle>Resource availability</DrawerTitle>
          <DrawerDescription>
            Configure technician schedules, bay availability, and maintenance time-off across the planner.
          </DrawerDescription>
        </DrawerHeader>
        <Separator />
        <ScrollArea className="h-[60vh] px-6 py-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading resource data…</p>
          ) : (
            <Tabs defaultValue="technicians" className="space-y-4">
              <TabsList>
                <TabsTrigger value="technicians">Technicians</TabsTrigger>
                <TabsTrigger value="bays">Bays</TabsTrigger>
                <TabsTrigger value="timeOff">Time off</TabsTrigger>
              </TabsList>

            <TabsContent value="technicians" className="space-y-4">
              <Form {...techForm}>
                <form
                  onSubmit={techForm.handleSubmit(handleCreateAvailability)}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  <FormField
                    control={techForm.control}
                    name="resourceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Technician</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select technician" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {technicianOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={techForm.control}
                    name="weekday"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weekday</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select weekday" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {WEEKDAYS.map((weekday) => (
                              <SelectItem key={weekday.value} value={weekday.value}>
                                {weekday.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={techForm.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start time</FormLabel>
                        <FormControl>
                          <Input type="time" step={900} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={techForm.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End time</FormLabel>
                        <FormControl>
                          <Input type="time" step={900} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="sm:col-span-2" disabled={isMutating}>
                    Add availability
                  </Button>
                </form>
              </Form>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Existing windows</h3>
                {technicianAvailability.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No availability defined yet.</p>
                ) : (
                  <div className="space-y-2">
                    {technicianAvailability.map((entry) => {
                      const technician = technicianOptions.find((option) => option.value === entry.resourceId);
                      const weekday = WEEKDAYS.find((day) => day.numeric === entry.weekday);
                      return (
                        <div key={entry.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                          <div className="space-y-1">
                            <p className="font-medium">{technician?.label ?? "Technician"}</p>
                            <p className="text-muted-foreground">
                              {weekday?.label ?? `Day ${entry.weekday}`} · {entry.startTime} – {entry.endTime}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleDeleteAvailability(entry.id)}
                            disabled={isMutating}
                          >
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="bays" className="space-y-4">
              <Form {...bayForm}>
                <form
                  onSubmit={bayForm.handleSubmit(handleCreateAvailability)}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  <FormField
                    control={bayForm.control}
                    name="resourceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bay</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select bay" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {bayOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bayForm.control}
                    name="weekday"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weekday</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select weekday" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {WEEKDAYS.map((weekday) => (
                              <SelectItem key={weekday.value} value={weekday.value}>
                                {weekday.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bayForm.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start time</FormLabel>
                        <FormControl>
                          <Input type="time" step={900} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bayForm.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End time</FormLabel>
                        <FormControl>
                          <Input type="time" step={900} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="sm:col-span-2" disabled={isMutating}>
                    Add availability
                  </Button>
                </form>
              </Form>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Existing windows</h3>
                {bayAvailability.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bay availability defined.</p>
                ) : (
                  <div className="space-y-2">
                    {bayAvailability.map((entry) => {
                      const bay = bayOptions.find((option) => option.value === entry.resourceId);
                      const weekday = WEEKDAYS.find((day) => day.numeric === entry.weekday);
                      return (
                        <div key={entry.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                          <div className="space-y-1">
                            <p className="font-medium">{bay?.label ?? "Bay"}</p>
                            <p className="text-muted-foreground">
                              {weekday?.label ?? `Day ${entry.weekday}`} · {entry.startTime} – {entry.endTime}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleDeleteAvailability(entry.id)}
                            disabled={isMutating}
                          >
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="timeOff" className="space-y-4">
              <Form {...timeOffForm}>
                <form
                  onSubmit={timeOffForm.handleSubmit(handleCreateTimeOff)}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  <FormField
                    control={timeOffForm.control}
                    name="resourceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Technician</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select technician" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {technicianOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4">
                    <FormField
                      control={timeOffForm.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Starts at</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" step={900} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={timeOffForm.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ends at</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" step={900} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={timeOffForm.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Reason</FormLabel>
                        <FormControl>
                          <Textarea rows={3} placeholder="Optional note" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="sm:col-span-2" disabled={isMutating}>
                    Add time off
                  </Button>
                </form>
              </Form>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Upcoming time off</h3>
                {technicianTimeOff.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No time off records.</p>
                ) : (
                  <div className="space-y-2">
                    {technicianTimeOff.map((entry) => {
                      const technician = technicianOptions.find((option) => option.value === entry.resourceId);
                      return (
                        <div key={entry.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                          <div className="space-y-1">
                            <p className="font-medium">{technician?.label ?? "Technician"}</p>
                            <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                              <Badge variant="secondary">
                                {formatInOrgTimezone(entry.startTime, "yyyy-MM-dd'T'HH:mm")} –
                                {" "}
                                {formatInOrgTimezone(entry.endTime, "HH:mm")}
                              </Badge>
                              {entry.reason ? <span>{entry.reason}</span> : null}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleDeleteTimeOff(entry.id)}
                            disabled={isMutating}
                          >
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
            </Tabs>
          )}
        </ScrollArea>
        <DrawerFooter className="border-t bg-muted/40 px-6 py-3">
          <Button variant="outline" onClick={onClose} disabled={isMutating}>
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default ResourceManagementDrawer;
