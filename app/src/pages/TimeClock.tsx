import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Clock, 
  Play, 
  Pause, 
  Square,
  Coffee,
  Calendar,
  Timer,
  Users
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { format } from "date-fns";
import { toast } from "sonner";

export default function TimeClock() {
  const { 
    currentEntry, 
    todayEntries, 
    weekSummary,
    loading, 
    clockIn, 
    clockOut, 
    startBreak, 
    endBreak 
  } = useTimeTracking();

  const [notes, setNotes] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClockIn = async () => {
    try {
      await clockIn(notes);
      setNotes('');
      toast.success('Clocked in successfully');
    } catch (error) {
      toast.error('Failed to clock in');
    }
  };

  const handleClockOut = async () => {
    try {
      await clockOut(notes);
      setNotes('');
      toast.success('Clocked out successfully');
    } catch (error) {
      toast.error('Failed to clock out');
    }
  };

  const handleStartBreak = async () => {
    try {
      await startBreak();
      toast.success('Break started');
    } catch (error) {
      toast.error('Failed to start break');
    }
  };

  const handleEndBreak = async () => {
    try {
      await endBreak();
      toast.success('Break ended');
    } catch (error) {
      toast.error('Failed to end break');
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CLOCKED_IN': return 'bg-success';
      case 'ON_BREAK': return 'bg-warning';
      case 'CLOCKED_OUT': return 'bg-muted';
      default: return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CLOCKED_IN': return <Play className="h-3 w-3" />;
      case 'ON_BREAK': return <Coffee className="h-3 w-3" />;
      case 'CLOCKED_OUT': return <Square className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Time Clock</h1>
          <p className="text-muted-foreground">Track your work hours and manage time entries</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-mono font-bold">{format(currentTime, 'HH:mm:ss')}</p>
          <p className="text-sm text-muted-foreground">{format(currentTime, 'EEEE, MMMM do, yyyy')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clock In/Out Controls */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Current Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentEntry ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Badge className={`${getStatusColor(currentEntry.status)} text-white`}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(currentEntry.status)}
                        {currentEntry.status === 'CLOCKED_IN' ? 'Working' : 
                         currentEntry.status === 'ON_BREAK' ? 'On Break' : 'Clocked Out'}
                      </div>
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Since {format(new Date(currentEntry.clock_in), 'HH:mm')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {currentEntry.status === 'CLOCKED_IN' && (
                      <>
                        <Button onClick={handleStartBreak} variant="outline">
                          <Coffee className="mr-2 h-4 w-4" />
                          Start Break
                        </Button>
                        <Button onClick={handleClockOut} className="bg-destructive text-destructive-foreground">
                          <Square className="mr-2 h-4 w-4" />
                          Clock Out
                        </Button>
                      </>
                    )}
                    
                    {currentEntry.status === 'ON_BREAK' && (
                      <>
                        <Button onClick={handleEndBreak} className="bg-success text-success-foreground">
                          <Play className="mr-2 h-4 w-4" />
                          End Break
                        </Button>
                        <Button onClick={handleClockOut} variant="outline">
                          <Square className="mr-2 h-4 w-4" />
                          Clock Out
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-muted-foreground">You are currently clocked out</p>
                  <Button onClick={handleClockIn} className="bg-success text-success-foreground">
                    <Play className="mr-2 h-4 w-4" />
                    Clock In
                  </Button>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium mb-2 block">Notes (optional)</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about your work session..."
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Today's Entries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Time Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayEntries.length === 0 ? (
                <p className="text-muted-foreground">No time entries for today</p>
              ) : (
                <div className="space-y-3">
                  {todayEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className={`${getStatusColor(entry.status)} text-white`}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(entry.status)}
                              {entry.status === 'CLOCKED_IN' ? 'Working' : 
                               entry.status === 'ON_BREAK' ? 'On Break' : 'Completed'}
                            </div>
                          </Badge>
                          <span className="text-sm">
                            {format(new Date(entry.clock_in), 'HH:mm')} - {' '}
                            {entry.clock_out ? format(new Date(entry.clock_out), 'HH:mm') : 'Ongoing'}
                          </span>
                        </div>
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground">{entry.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {entry.total_minutes ? formatDuration(entry.total_minutes) : 'Ongoing'}
                        </p>
                        {entry.break_minutes > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Break: {formatDuration(entry.break_minutes)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Weekly Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Hours</span>
                  <span className="font-medium">{formatDuration(weekSummary.totalMinutes)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Days Worked</span>
                  <span className="font-medium">{weekSummary.daysWorked}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg. Daily Hours</span>
                  <span className="font-medium">
                    {weekSummary.daysWorked > 0 
                      ? formatDuration(Math.round(weekSummary.totalMinutes / weekSummary.daysWorked))
                      : '0h 0m'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Break Time</span>
                  <span className="font-medium">{formatDuration(weekSummary.totalBreakMinutes)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center p-4 bg-success/10 rounded-lg">
                <p className="text-2xl font-bold text-success">40h</p>
                <p className="text-sm text-muted-foreground">Target Weekly Hours</p>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-2xl font-bold text-primary">
                  {Math.round((weekSummary.totalMinutes / (40 * 60)) * 100)}%
                </p>
                <p className="text-sm text-muted-foreground">Weekly Progress</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}