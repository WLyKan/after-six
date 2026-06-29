import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { MonthPicker } from './ui/monthpicker';
import { cn } from './ui/utils';

interface MonthSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  minDate?: Date;
  maxDate?: Date;
}

function parseMonthValue(value: string): Date {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

function formatMonthValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(value: string): string {
  const date = parseMonthValue(value);
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

export function MonthSelect({ value, onValueChange, minDate, maxDate }: MonthSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedMonth = parseMonthValue(value);

  return (
    <div className="relative">
      <Button
        type="button"
        data-testid="month-select-trigger"
        variant="outline"
        className={cn('w-40 justify-start font-normal')}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <CalendarIcon data-icon="inline-start" />
        {formatMonthLabel(value)}
      </Button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 rounded-md border bg-popover text-popover-foreground shadow-md">
        <MonthPicker
          selectedMonth={selectedMonth}
          minDate={minDate}
          maxDate={maxDate}
          onMonthSelect={(date) => {
            onValueChange(formatMonthValue(date));
            setOpen(false);
          }}
        />
        </div>
      )}
    </div>
  );
}
