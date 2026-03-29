"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CalendarIcon, Search, ChevronLeft, ChevronRight, History } from "lucide-react";
import { format, subDays, addDays } from "date-fns";

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const [open, setOpen] = useState(false);

  const goToPrevDay = () => {
    onDateChange(subDays(selectedDate, 1));
  };

  const goToNextDay = () => {
    if (selectedDate < new Date()) {
      onDateChange(addDays(selectedDate, 1));
    }
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={goToPrevDay}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-9 min-w-[180px] justify-start text-left font-normal gap-2"
            >
              <CalendarIcon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <span>{format(selectedDate, "MMMM d, yyyy")}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  onDateChange(date);
                  setOpen(false);
                }
              }}
              disabled={(date) => date > new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={goToNextDay}
          disabled={selectedDate >= new Date()}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={goToToday}
        className="gap-1.5 text-xs"
      >
        <History className="h-3.5 w-3.5" />
        Jump to Today
      </Button>
    </div>
  );
}
