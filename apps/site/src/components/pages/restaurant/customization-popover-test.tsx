"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Item, 
  ItemContent, 
  ItemTitle, 
  ItemDescription, 
  ItemActions, 
  ItemHeader,
  ItemGroup
} from "@/components/ui/item";
import { ChefHat, X } from "lucide-react";

interface CustomizationOption {
  id: string;
  label: string;
  price?: number;
}

const CUSTOMIZATION_OPTIONS: CustomizationOption[] = [
  { id: "extra-cheese", label: "Extra Cheese", price: 50 },
  { id: "no-onions", label: "No Onions" },
  { id: "extra-sauce", label: "Extra Sauce", price: 30 },
  { id: "spicy-level", label: "Extra Spicy" },
  { id: "well-done", label: "Well Done" },
  { id: "rare-cooked", label: "Rare Cooked" },
  { id: "extra-olives", label: "Extra Olives", price: 40 },
  { id: "gluten-free", label: "Gluten Free" },
];

interface CustomizationPopoverProps {
  itemId: string;
  onCustomizationsChange: (customizations: Record<string, boolean>) => void;
}

export function CustomizationPopover({ itemId, onCustomizationsChange }: CustomizationPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customizations, setCustomizations] = useState<Record<string, boolean>>({});
  const [customText, setCustomText] = useState("");

  // Sync checkbox selections with custom text
  const updateCustomTextFromCheckboxes = () => {
    const selectedOptions = Object.entries(customizations)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => {
        const option = CUSTOMIZATION_OPTIONS.find(opt => opt.id === id);
        return option ? option.label : "";
      })
      .filter(label => label);

    // Add any custom text that isn't a predefined option
    const customItems = customText.split(",").map(item => item.trim())
      .filter(item => item && !CUSTOMIZATION_OPTIONS.some(opt => 
        opt.label.toLowerCase() === item.toLowerCase()));

    const allItems = [...selectedOptions, ...customItems];
    const newText = allItems.join(", ");
    
    if (newText !== customText) {
      setCustomText(newText);
    }
  };

  const handleCheckboxChange = (id: string, checked: boolean) => {
    setCustomizations(prev => ({
      ...prev,
      [id]: checked
    }));
  };

  const handleCustomTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomText(e.target.value);
  };

  const handleApply = () => {
    onCustomizationsChange(customizations);
    setIsOpen(false);
  };

  const handleClearAll = () => {
    setCustomizations({});
    setCustomText("");
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 w-10 p-0 hover:bg-primary/10 transition-all duration-300"
        >
          <ChefHat className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        align="end" 
        className="w-80 p-0 rounded-2xl border-border shadow-2xl"
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-lg">Customize Your Order</h4>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-6 w-6 p-0"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Add special requests or modifications
          </p>
        </div>
        
        <div className="max-h-96 overflow-y-auto p-4">
          <div className="space-y-3">
            <ItemGroup className="gap-2">
              {CUSTOMIZATION_OPTIONS.map((option) => (
                <Item 
                  key={option.id} 
                  className="p-3 hover:bg-accent/50 transition-colors"
                >
                  <ItemContent>
                    <ItemHeader>
                      <ItemTitle className="font-medium">
                        {option.label}
                      </ItemTitle>
                      {option.price && (
                        <span className="text-sm font-medium text-primary">
                          +Rs. {option.price}
                        </span>
                      )}
                    </ItemHeader>
                  </ItemContent>
                  <ItemActions>
                    <Checkbox
                      checked={!!customizations[option.id]}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange(option.id, !!checked)
                      }
                      className="rounded-sm"
                    />
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          </div>
          
          <div className="mt-6">
            <label className="text-sm font-medium mb-2 block">
              Additional Requests
            </label>
            <Textarea
              placeholder="e.g., Extra spicy, No onions, Well done..."
              value={customText}
              onChange={handleCustomTextChange}
              className="min-h-[100px] resize-none rounded-xl border-border focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>
        
        <div className="p-4 border-t border-border flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleClearAll}
            className="flex-1 rounded-xl border-border hover:bg-muted"
          >
            Clear All
          </Button>
          <Button 
            onClick={handleApply}
            className="flex-1 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all duration-300"
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}