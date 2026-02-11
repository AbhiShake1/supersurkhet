import { DateTimeInput } from '@/components/datetime-input';
import { DateTimePicker } from '@/components/datetime-picker';
import type { AutoFormFieldProps } from '../react';
import React from 'react';
import { cn } from '@/lib/utils';

export const DateTimeField: React.FC<AutoFormFieldProps> = ({
  inputProps,
  error,
  id,
  value,
}) => {
  const { key, ...props } = inputProps;
  const [date, setDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined,
  );

  const handleDateChange = (newDate: Date | undefined) => {
    setDate(newDate);
    const syntheticEvent = {
      target: {
        name: inputProps.name,
        value: newDate ? newDate.toISOString() : '',
      },
    } as React.ChangeEvent<HTMLInputElement>;
    inputProps.onChange(syntheticEvent);
  };

  return (
    <div className="flex gap-2">
      <DateTimePicker
        value={date}
        onChange={handleDateChange}
        modal={true}
        renderTrigger={({ setOpen }) => (
          <DateTimeInput
            {...props}
            id={id}
            value={date}
            onChange={handleDateChange}
            onCalendarClick={() => setOpen(true)}
            disabled={inputProps.disabled}
            className={cn(error && 'border-destructive')}
            clearable
          />
        )}
      />
    </div>
  );
};
