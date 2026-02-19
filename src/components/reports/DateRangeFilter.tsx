import { useState } from 'react';
import { format, startOfWeek, startOfMonth, subWeeks, subMonths } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DateRangeFilterProps {
  from: Date | undefined;
  to: Date | undefined;
  onFromChange: (date: Date | undefined) => void;
  onToChange: (date: Date | undefined) => void;
}

const presets = [
  { label: 'This Week', getRange: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: new Date() }) },
  { label: 'Last 4 Weeks', getRange: () => ({ from: subWeeks(new Date(), 4), to: new Date() }) },
  { label: 'This Month', getRange: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: 'Last 3 Months', getRange: () => ({ from: subMonths(new Date(), 3), to: new Date() }) },
];

export function DateRangeFilter({ from, to, onFromChange, onToChange }: DateRangeFilterProps) {
  const hasFilter = from || to;

  const clearFilter = () => {
    onFromChange(undefined);
    onToChange(undefined);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset buttons */}
      <div className="flex gap-1 flex-wrap">
        {presets.map(preset => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            className="text-xs h-7 px-2"
            onClick={() => {
              const { from: f, to: t } = preset.getRange();
              onFromChange(f);
              onToChange(t);
            }}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Custom date pickers */}
      <div className="flex items-center gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("text-xs h-7 px-2 justify-start", !from && "text-muted-foreground")}>
              <CalendarIcon className="h-3 w-3 mr-1" />
              {from ? format(from, 'dd MMM') : 'From'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={from} onSelect={onFromChange} initialFocus className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>

        <span className="text-xs text-muted-foreground">–</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("text-xs h-7 px-2 justify-start", !to && "text-muted-foreground")}>
              <CalendarIcon className="h-3 w-3 mr-1" />
              {to ? format(to, 'dd MMM') : 'To'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={to} onSelect={onToChange} initialFocus className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>

        {hasFilter && (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={clearFilter}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
