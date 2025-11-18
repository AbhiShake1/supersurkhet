import { useTheme } from "@/contexts/theme-context";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps extends React.ComponentProps<typeof Button> { }

export function ThemeToggle({ className, ...props }: ThemeToggleProps) {
  const { isDarkMode, toggleDarkMode } = useTheme();

  const handleThemeToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const { clientX: x, clientY: y } = event;
    toggleDarkMode({ x, y });
  };

  return (
    <Button
      className={cn("cursor-pointer", className)}
      variant="outline"
      size="icon"
      onClick={handleThemeToggle}
      {...props}
    >
      {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
