"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, useDayPicker, useNavigation } from "react-day-picker"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center mb-4",
        caption_label: "hidden",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Caption: CustomCaption,
      }}
      locale={fr}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

function CustomCaption(props: {
  displayMonth: Date;
}) {
  const { goToMonth, nextMonth, previousMonth } = useNavigation()
  const { fromYear, toYear } = useDayPicker()
  const { displayMonth } = props;

  const handleYearChange = (value: string) => {
    const newDate = new Date(displayMonth);
    newDate.setFullYear(parseInt(value, 10));
    goToMonth(newDate);
  };

  const handleMonthChange = (value: string) => {
    const newDate = new Date(displayMonth);
    newDate.setMonth(parseInt(value, 10));
    goToMonth(newDate);
  };
  
  const years = React.useMemo(() => {
    const start = fromYear || new Date().getFullYear() - 100;
    const end = toYear || new Date().getFullYear();
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [fromYear, toYear]);

  const months = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => i);
  }, []);

  return (
    <div className="flex items-center justify-center gap-2">
       <button
        disabled={!previousMonth}
        onClick={() => previousMonth && goToMonth(previousMonth)}
        className={cn(buttonVariants({variant: 'outline'}), 'h-7 w-7 p-0')}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <Select
        value={displayMonth.getFullYear().toString()}
        onValueChange={handleYearChange}
      >
        <SelectTrigger className="w-[100px] focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={displayMonth.getMonth().toString()}
        onValueChange={handleMonthChange}
      >
        <SelectTrigger className="w-[120px] focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((month) => (
            <SelectItem key={month} value={month.toString()}>
              {format(new Date(2000, month), "MMMM", { locale: fr })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button
        disabled={!nextMonth}
        onClick={() => nextMonth && goToMonth(nextMonth)}
        className={cn(buttonVariants({variant: 'outline'}), 'h-7 w-7 p-0')}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

export { Calendar }
