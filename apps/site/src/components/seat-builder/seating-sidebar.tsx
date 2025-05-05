import { useState } from "react"
import type { Floor, LayoutElement, ElementType, ElementSize } from "./restaurant-layout-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  RockingChairIcon as ChairIcon,
  Sofa,
  Square,
  StepBackIcon as Stairs,
  TreesIcon as Tree,
  DoorOpenIcon as Door,
  Columns,
  GlassWater,
  Bath,
  UtensilsCrossed,
  Flower2,
  AppWindowIcon as Window,
  PaintBucket,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SeatingSidebarProps {
  currentFloor: Floor
  onAddElement: (element: LayoutElement) => void
  onUpdateFloor: (properties: Partial<Floor>) => void
}

export function SeatingSidebar({ currentFloor, onAddElement, onUpdateFloor }: SeatingSidebarProps) {
  const [elementType, setElementType] = useState<ElementType>("chair")
  const [elementSize, setElementSize] = useState<ElementSize>("medium")
  const [capacity, setCapacity] = useState<number>(1)
  const [label, setLabel] = useState<string>("")
  const [color, setColor] = useState<string>("")
  const [floorColor, setFloorColor] = useState<string>(currentFloor.backgroundColor || "#ffffff")

  const handleAddElement = () => {
    const dimensions = getElementDimensions(elementType, elementSize)

    const newElement: LayoutElement = {
      id: `element-${Date.now()}`,
      type: elementType,
      size: elementSize,
      width: dimensions.width,
      height: dimensions.height,
      capacity: ["chair", "sofa", "table"].includes(elementType) ? capacity : 0,
      x: 100,
      y: 100,
      rotation: 0,
      label,
      color: color || undefined,
    }

    onAddElement(newElement)

    // Reset label after adding
    setLabel("")
  }

  const updateFloorBackground = () => {
    onUpdateFloor({
      backgroundColor: floorColor,
    })
  }

  const getElementDimensions = (type: ElementType, size: ElementSize) => {
    let baseWidth = 40
    let baseHeight = 40

    // Adjust base size based on element type
    switch (type) {
      case "table":
        baseWidth = 80
        baseHeight = 80
        break
      case "sofa":
        baseWidth = 80
        baseHeight = 40
        break
      case "wall":
        baseWidth = 100
        baseHeight = 10
        break
      case "door":
        baseWidth = 60
        baseHeight = 10
        break
      case "window":
        baseWidth = 60
        baseHeight = 10
        break
      case "stairs":
        baseWidth = 80
        baseHeight = 120
        break
      case "garden":
        baseWidth = 120
        baseHeight = 120
        break
      case "bar":
        baseWidth = 150
        baseHeight = 60
        break
      case "kitchen":
        baseWidth = 150
        baseHeight = 100
        break
      case "bathroom":
        baseWidth = 80
        baseHeight = 80
        break
      default:
        baseWidth = 40
        baseHeight = 40
    }

    // Adjust size based on selected size
    let sizeMultiplier = 1
    switch (size) {
      case "small":
        sizeMultiplier = 0.75
        break
      case "medium":
        sizeMultiplier = 1
        break
      case "large":
        sizeMultiplier = 1.5
        break
      case "custom":
        sizeMultiplier = 1
        break
    }

    return {
      width: baseWidth * sizeMultiplier,
      height: baseHeight * sizeMultiplier,
    }
  }

  return (
    <div className="w-72 border-r bg-card flex flex-col overflow-auto">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Layout Options</h2>
        <p className="text-sm text-muted-foreground">Configure and add elements to your layout</p>
      </div>

      <div className="p-4 flex-1 overflow-auto">
        <Tabs defaultValue="add-elements" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="add-elements">Add Elements</TabsTrigger>
            <TabsTrigger value="floor-settings">Floor Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="add-elements" className="space-y-4 pt-4">
            <Accordion type="single" collapsible defaultValue="seating">
              <AccordionItem value="seating">
                <AccordionTrigger>Seating</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={elementType === "chair" ? "default" : "outline"}
                      className={cn("flex flex-col items-center justify-center h-20 gap-1")}
                      onClick={() => setElementType("chair")}
                    >
                      <ChairIcon className="h-8 w-8" />
                      <span className="text-xs">Chair</span>
                    </Button>
                    <Button
                      variant={elementType === "sofa" ? "default" : "outline"}
                      className={cn("flex flex-col items-center justify-center h-20 gap-1")}
                      onClick={() => setElementType("sofa")}
                    >
                      <Sofa className="h-8 w-8" />
                      <span className="text-xs">Sofa</span>
                    </Button>
                    <Button
                      variant={elementType === "table" ? "default" : "outline"}
                      className={cn("flex flex-col items-center justify-center h-20 gap-1")}
                      onClick={() => setElementType("table")}
                    >
                      <Square className="h-8 w-8" />
                      <span className="text-xs">Table</span>
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="structure">
                <AccordionTrigger>Structure</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={elementType === "wall" ? "default" : "outline"}
                      className={cn("flex flex-col items-center justify-center h-20 gap-1")}
                      onClick={() => setElementType("wall")}
                    >
                      <Columns className="h-8 w-8" />
                      <span className="text-xs">Wall</span>
                    </Button>
                    <Button
                      variant={elementType === "door" ? "default" : "outline"}
                      className={cn("flex flex-col items-center justify-center h-20 gap-1")}
                      onClick={() => setElementType("door")}
                    >
                      <Door className="h-8 w-8" />
                      <span className="text-xs">Door</span>
                    </Button>
                    <Button
                      variant={elementType === "window" ? "default" : "outline"}
                      className={cn("flex flex-col items-center justify-center h-20 gap-1")}
                      onClick={() => setElementType("window")}
                    >
                      <Window className="h-8 w-8" />
                      <span className="text-xs">Window</span>
                    </Button>
                    <Button
                      variant={elementType === "stairs" ? "default" : "outline"}
                      className={cn("flex flex-col items-center justify-center h-20 gap-1")}
                      onClick={() => setElementType("stairs")}
                    >
                      <Stairs className="h-8 w-8" />
                      <span className="text-xs">Stairs</span>
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="areas">
                <AccordionTrigger>Areas</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={elementType === "garden" ? "default" : "outline"}
                      className={cn("flex flex-col items-center justify-center h-20 gap-1")}
                      onClick={() => setElementType("garden")}
                    >
                      <Tree className="h-8 w-8" />
                      <span className="text-xs">Garden</span>
                    </Button>
                    <Button
                      variant={elementType === "bar" ? "default" : "outline"}
                      className={cn("flex flex-col items-center justify-center h-20 gap-1")}
                      onClick={() => setElementType("bar")}
                    >
                      <GlassWater className="h-8 w-8" />
                      <span className="text-xs">Bar</span>
                    </Button>
                    <Button
                      variant={elementType === "kitchen" ? "default" : "outline"}
                      className={cn("flex flex-col items-center justify-center h-20 gap-1")}
                      onClick={() => setElementType("kitchen")}
                    >
                      <UtensilsCrossed className="h-8 w-8" />
                      <span className="text-xs">Kitchen</span>
                    </Button>
                    <Button
                      variant={elementType === "bathroom" ? "default" : "outline"}
                      className={cn("flex flex-col items-center justify-center h-20 gap-1")}
                      onClick={() => setElementType("bathroom")}
                    >
                      <Bath className="h-8 w-8" />
                      <span className="text-xs">Bathroom</span>
                    </Button>
                    <Button
                      variant={elementType === "plant" ? "default" : "outline"}
                      className={cn("flex flex-col items-center justify-center h-20 gap-1")}
                      onClick={() => setElementType("plant")}
                    >
                      <Flower2 className="h-8 w-8" />
                      <span className="text-xs">Plant</span>
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="space-y-2">
              <Label>Size</Label>
              <Select value={elementSize} onValueChange={(value) => setElementSize(value as ElementSize)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {["chair", "sofa", "table"].includes(elementType) && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Capacity</Label>
                  <span className="text-sm">
                    {capacity} {capacity === 1 ? "person" : "people"}
                  </span>
                </div>
                <Slider value={[capacity]} min={1} max={12} step={1} onValueChange={(value) => setCapacity(value[0])} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="element-label">Label (Optional)</Label>
              <Input
                id="element-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., VIP, Reserved"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="element-color">Color (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="element-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-9 p-1"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#RRGGBB"
                  className="flex-1"
                />
              </div>
            </div>

            <Button className="w-full" onClick={handleAddElement}>
              Add to Layout
            </Button>
          </TabsContent>

          <TabsContent value="floor-settings" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="floor-name">Floor Name</Label>
              <Input id="floor-name" value={currentFloor.name} disabled readOnly />
            </div>

            <div className="space-y-2">
              <Label htmlFor="floor-color">Floor Background Color</Label>
              <div className="flex gap-2">
                <Input
                  id="floor-color"
                  type="color"
                  value={floorColor}
                  onChange={(e) => setFloorColor(e.target.value)}
                  className="w-12 h-9 p-1"
                />
                <Input
                  value={floorColor}
                  onChange={(e) => setFloorColor(e.target.value)}
                  placeholder="#RRGGBB"
                  className="flex-1"
                />
                <Button variant="outline" size="icon" onClick={updateFloorBackground}>
                  <PaintBucket className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Element Count</Label>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-muted rounded-md">
                  <div className="text-lg font-semibold">
                    {currentFloor.elements.filter((s) => ["chair", "sofa", "table"].includes(s.type)).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Seating</div>
                </div>
                <div className="p-2 bg-muted rounded-md">
                  <div className="text-lg font-semibold">
                    {currentFloor.elements.filter((s) => ["wall", "door", "window", "stairs"].includes(s.type)).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Structure</div>
                </div>
                <div className="p-2 bg-muted rounded-md">
                  <div className="text-lg font-semibold">
                    {
                      currentFloor.elements.filter((s) =>
                        ["garden", "bar", "kitchen", "bathroom", "plant"].includes(s.type),
                      ).length
                    }
                  </div>
                  <div className="text-xs text-muted-foreground">Areas</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Total Capacity</Label>
              <div className="p-3 bg-muted rounded-md text-center">
                <div className="text-2xl font-bold">
                  {currentFloor.elements.reduce((total, element) => total + (element.capacity || 0), 0)}
                </div>
                <div className="text-sm text-muted-foreground">People</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="p-4 border-t">
        <div className="text-xs text-muted-foreground">
          <strong>Tips:</strong>
          <ul className="mt-1 space-y-1 list-disc list-inside">
            <li>Drag and drop elements to position them</li>
            <li>Use Alt + Drag to pan the canvas</li>
            <li>On touch devices, use two fingers to pan and zoom</li>
            <li>Select an element to rotate, duplicate, lock or delete it</li>
          </ul>
        </div>
      </div>
    </div>
  )
}