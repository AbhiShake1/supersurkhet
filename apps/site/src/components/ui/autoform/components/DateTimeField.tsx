import { format } from "date-fns";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";
import type { AutoFormFieldProps } from "@autoform/react";
import type React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

export const DateTimeField: React.FC<AutoFormFieldProps> = ({
	inputProps,
	error,
	id,
	value,
	field,
}) => {
	const { key, ...props } = inputProps;
	const [date, setDate] = React.useState<Date | undefined>(
		value ? new Date(value) : undefined
	);

	// Extract time from value for time input
	const timeValue = value ? format(new Date(value), "HH:mm") : "";

	const handleDateChange = (date: Date | undefined) => {
		setDate(date);
		let newDateTime: Date | undefined = date;

		// If there was a time value before, preserve it
		if (date && timeValue) {
			const [hours, minutes] = timeValue.split(":").map(Number);
			newDateTime = new Date(date);
			newDateTime.setHours(hours, minutes, 0, 0);
		} else if (date) {
			// If no time previously, set to 00:00
			newDateTime = new Date(date);
			newDateTime.setHours(0, 0, 0, 0);
		}

		const syntheticEvent = {
			target: {
				name: inputProps.name,
				value: newDateTime ? newDateTime.toISOString() : '',
			},
		} as React.ChangeEvent<HTMLInputElement>;
		inputProps.onChange(syntheticEvent);
	};

	const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const time = e.target.value;
		if (time && date) {
			const [hours, minutes] = time.split(":").map(Number);
			const newDateTime = new Date(date);
			newDateTime.setHours(hours, minutes, 0, 0);

			const syntheticEvent = {
				target: {
					name: inputProps.name,
					value: newDateTime.toISOString(),
				},
			} as React.ChangeEvent<HTMLInputElement>;
			inputProps.onChange(syntheticEvent);
		} else if (date) {
			// If no time but date exists, preserve the date and set time to 00:00
			const newDateTime = new Date(date);
			newDateTime.setHours(0, 0, 0, 0);

			const syntheticEvent = {
				target: {
					name: inputProps.name,
					value: newDateTime.toISOString(),
				},
			} as React.ChangeEvent<HTMLInputElement>;
			inputProps.onChange(syntheticEvent);
		}
	};

	return (
		<div className="flex gap-2">
			<div className="flex-1">
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							id={`${id}-date`}
							className={cn(
								"w-full justify-start text-left font-normal",
								!date && "text-muted-foreground",
								error && "border-destructive"
							)}
						>
							<CalendarIcon className="h-4 w-4 mr-2" />
							{date ? format(date, "PPP") : <span>Pick a date</span>}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
						<Calendar
							mode="single"
							selected={date}
							onSelect={handleDateChange}
							initialFocus
						/>
					</PopoverContent>
				</Popover>
			</div>
			<div className="flex-1">
				<Input
					id={`${id}-time`}
					type="time"
					value={timeValue}
					onChange={handleTimeChange}
					step="1"
					className={cn(
						"bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none",
						error && "border-destructive"
					)}
					placeholder="Select time"
				/>
			</div>
		</div>
	);
};