import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { AutoFormFieldProps } from "../react";
import type React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export const DateField: React.FC<AutoFormFieldProps> = ({
  inputProps,
  error,
  id,
  value,
}) => {
  const { key, ...props } = inputProps;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            error && "border-destructive"
          )}
          {...props}
        >
          <CalendarIcon className="h-4 w-4 mr-2" />
          {value ? format(new Date(value), "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ? new Date(value) : undefined}
          onSelect={(date) => {
            const syntheticEvent = {
              target: {
                name: inputProps.name,
                value: date ? date.toISOString().split('T')[0] : '',
              },
            } as React.ChangeEvent<HTMLInputElement>;
            inputProps.onChange(syntheticEvent);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};
