import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buttonVariants } from './button';
import { cn } from './utils';

type Month = {
  number: number;
  name: string;
};

const MONTHS: Month[][] = [
  [
    { number: 0, name: '1月' },
    { number: 1, name: '2月' },
    { number: 2, name: '3月' },
    { number: 3, name: '4月' },
  ],
  [
    { number: 4, name: '5月' },
    { number: 5, name: '6月' },
    { number: 6, name: '7月' },
    { number: 7, name: '8月' },
  ],
  [
    { number: 8, name: '9月' },
    { number: 9, name: '10月' },
    { number: 10, name: '11月' },
    { number: 11, name: '12月' },
  ],
];

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary' | null | undefined;

type MonthPickerProps = React.HTMLAttributes<HTMLDivElement> & {
  selectedMonth?: Date;
  onMonthSelect?: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  callbacks?: {
    yearLabel?: (year: number) => string;
    monthLabel?: (month: Month) => string;
  };
  variant?: {
    calendar?: {
      main?: ButtonVariant;
      selected?: ButtonVariant;
    };
    chevrons?: ButtonVariant;
  };
};

function isDisabledMonth(month: Month, menuYear: number, minDate?: Date, maxDate?: Date, disabledDates?: Date[]) {
  if (maxDate && (menuYear > maxDate.getFullYear() || (menuYear === maxDate.getFullYear() && month.number > maxDate.getMonth()))) {
    return true;
  }

  if (minDate && (menuYear < minDate.getFullYear() || (menuYear === minDate.getFullYear() && month.number < minDate.getMonth()))) {
    return true;
  }

  return disabledDates?.some((date) => date.getFullYear() === menuYear && date.getMonth() === month.number) ?? false;
}

function selectMonth(
  month: Month,
  menuYear: number,
  setSelectedYear: (year: number) => void,
  setSelectedMonthNumber: (month: number) => void,
  onMonthSelect?: (date: Date) => void,
) {
  setSelectedYear(menuYear);
  setSelectedMonthNumber(month.number);
  onMonthSelect?.(new Date(menuYear, month.number, 1));
}

function MonthPicker({
  selectedMonth,
  onMonthSelect,
  minDate,
  maxDate,
  disabledDates,
  callbacks,
  variant,
  className,
  ...props
}: MonthPickerProps) {
  const [selectedYear, setSelectedYear] = React.useState(selectedMonth?.getFullYear() ?? new Date().getFullYear());
  const [selectedMonthNumber, setSelectedMonthNumber] = React.useState(selectedMonth?.getMonth() ?? new Date().getMonth());
  const [menuYear, setMenuYear] = React.useState(selectedYear);

  React.useEffect(() => {
    if (!selectedMonth) return;
    setSelectedYear(selectedMonth.getFullYear());
    setSelectedMonthNumber(selectedMonth.getMonth());
    setMenuYear(selectedMonth.getFullYear());
  }, [selectedMonth]);

  const normalizedMinDate = minDate && maxDate && minDate > maxDate ? maxDate : minDate;

  return (
    <div className={cn('min-w-[320px] p-3', className)} {...props}>
      <div className="flex flex-col gap-4">
        <div className="relative flex items-center justify-center pt-1">
          <button
            type="button"
            aria-label="上一年"
            onClick={() => setMenuYear((year) => year - 1)}
            className={cn(
              buttonVariants({ variant: variant?.chevrons ?? 'outline' }),
              'absolute left-1 h-7 w-7 p-0'
            )}
          >
            <ChevronLeft className="opacity-50" />
          </button>
          <div className="text-sm font-medium">
            {callbacks?.yearLabel ? callbacks.yearLabel(menuYear) : `${menuYear}年`}
          </div>
          <button
            type="button"
            aria-label="下一年"
            onClick={() => setMenuYear((year) => year + 1)}
            className={cn(
              buttonVariants({ variant: variant?.chevrons ?? 'outline' }),
              'absolute right-1 h-7 w-7 p-0'
            )}
          >
            <ChevronRight className="opacity-50" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {MONTHS.flat().map((month) => {
            const selected = month.number === selectedMonthNumber && menuYear === selectedYear;
            const disabled = isDisabledMonth(month, menuYear, normalizedMinDate, maxDate, disabledDates);
            return (
              <button
                key={month.number}
                type="button"
                data-testid={`month-picker-month-${month.number + 1}`}
                aria-selected={selected}
                disabled={disabled}
                onMouseDown={(event) => {
                  if (disabled) return;
                  event.preventDefault();
                  selectMonth(month, menuYear, setSelectedYear, setSelectedMonthNumber, onMonthSelect);
                }}
                onClick={() => selectMonth(month, menuYear, setSelectedYear, setSelectedMonthNumber, onMonthSelect)}
                className={cn(
                  buttonVariants({
                    variant: selected ? variant?.calendar?.selected ?? 'default' : variant?.calendar?.main ?? 'ghost',
                  }),
                  'h-9 px-0 font-normal'
                )}
              >
                {callbacks?.monthLabel ? callbacks.monthLabel(month) : month.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

MonthPicker.displayName = 'MonthPicker';

export { MonthPicker };
