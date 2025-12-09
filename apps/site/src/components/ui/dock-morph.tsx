"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { motion, AnimatePresence } from "framer-motion"
import { Home, Search, Bell, User, Settings, ExternalLink } from "lucide-react"
import { z } from "zod"

// Schemas
const DockItemSchema = z.object({
  icon: z.custom<React.ComponentType<{ className?: string }>>(
    (val) => typeof val === "function",
    { message: "Icon must be a valid React component" }
  ),
  label: z.string()
    .min(1, "Label cannot be empty")
    .max(30, "Label must be 30 characters or less"),
  onClick: z.function().args().returns(z.void()).optional(),
  href: z.string().url().optional(),
  external: z.boolean().default(false),
})

const DockMorphSchema = z.object({
  className: z.string().optional(),
  position: z.enum(["bottom", "top", "left", "right"]).default("bottom"),
  
})

export type DockItem = z.infer<typeof DockItemSchema>
export type DockMorphProps = z.infer<typeof DockMorphSchema> & {
  children?: React.ReactNode
}

// Default Dock Items
const defaultDockItems: DockItem[] = [
  { 
    icon: Home, 
    label: "Home", 
    onClick: () => alert("Home clicked"),
    external: false 
  },
  { 
    icon: Search, 
    label: "Search", 
    onClick: () => alert("Search clicked"),
    external: false 
  },
  { 
    icon: Bell, 
    label: "Notifications", 
    onClick: () => alert("Notifications clicked"),
    external: false 
  },
  { 
    icon: User, 
    label: "Profile", 
    onClick: () => alert("Profile clicked"),
    external: false 
  },
  { 
    icon: Settings, 
    label: "Settings", 
    onClick: () => alert("Settings clicked"),
    external: false 
  },
]

// Utility Functions
export function validateDockProps(props: unknown): DockMorphProps {
  try {
    return {
      ...DockMorphSchema.parse(props),
      children: (props as any).children
    }
  } catch (error) {
    console.error("DockMorph: Invalid props received, using defaults", error)
    return {
      position: "bottom",
    }
  }
}

export function createDockItem(
  icon: React.ComponentType<{ className?: string }>,
  label: string,
  onClick?: () => void,
  href?: string,
  external?: boolean
): DockItem {
  return DockItemSchema.parse({ 
    icon, 
    label, 
    onClick, 
    href, 
    external: external || false 
  })
}

// DockItem Component 
interface DockItemProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick?: () => void
  href?: string
  external?: boolean
}

export function DockItem(props: DockItemProps) {
  
  return null
}
DockItem.displayName = "DockItem"

// DockMorph Component
export default function DockMorph(initialProps: DockMorphProps) {
  const { className, position = "bottom", children } = React.useMemo(
    () => validateDockProps(initialProps),
    [initialProps]
  )

  const [hovered, setHovered] = React.useState<number | null>(null)

  // Convert children into dock items
  const parseChildren = (): DockItem[] => {
    const items: DockItem[] = []
    
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        // Get the component name more reliably
        const componentName = (child.type as any).displayName || 
                             (child.type as any).name
        
        if (componentName === "DockItem") {
          const element = child as React.ReactElement<DockItemProps>
          try {
            // Validate and create dock item
            const dockItem = DockItemSchema.parse({
              icon: element.props.icon,
              label: element.props.label,
              onClick: element.props.onClick,
              href: element.props.href,
              external: element.props.external || false,
            })
            items.push(dockItem)
          } catch (error) {
            console.error("Invalid DockItem props:", error)
          }
        }
      }
    })
    
    return items
  }

  let dockItems: DockItem[] = parseChildren()

  // Fallback to default items if no valid children
  if (dockItems.length === 0) {
    dockItems = defaultDockItems
  }

  const isVertical = position === "left" || position === "right"

  const positionClasses = {
    bottom: "fixed bottom-6 left-1/2 -translate-x-1/2",
    top: "fixed top-6 left-1/2 -translate-x-1/2",
    left: "fixed left-6 top-1/2 -translate-y-1/2",
    right: "fixed right-6 top-1/2 -translate-y-1/2",
  }

  const tooltipSide = {
    bottom: "top",
    top: "bottom",
    left: "right",
    right: "left",
  } as const

  // Handle item click
  const handleItemClick = React.useCallback((item: DockItem, e: React.MouseEvent) => {
    if (item.href) {
      e.preventDefault()
      if (item.external) {
        window.open(item.href, '_blank', 'noopener,noreferrer')
      } else {
        window.location.href = item.href
      }
    } else if (item.onClick) {
      item.onClick()
    }
  }, [])

  return (
    <div className={cn("z-50 flex items-center justify-center", positionClasses[position], className)}>
      <TooltipProvider delayDuration={100}>
        <div
          className={cn(
            "relative flex items-center gap-6 p-3 rounded-3xl",
            isVertical ? "flex-col gap-4 px-4 py-8" : "flex-row",
            "bg-background/30 backdrop-blur-xl shadow-lg border",
            "dark:border-white/10 border-black/10"
          )}
        >
          {dockItems.map((item, i) => (
            <Tooltip key={`${item.label}-${i}`}>
              <TooltipTrigger asChild>
                <div
                  className="relative flex items-center justify-center"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <AnimatePresence>
                    {hovered === i && (
                      <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1.4, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className={cn(
                          "absolute inset-0 rounded-full -z-10",
                          "bg-gradient-to-tr from-primary/40 via-primary/20 to-transparent",
                          "backdrop-blur-2xl shadow-md dark:shadow-primary/20"
                        )}
                      />
                    )}
                  </AnimatePresence>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative z-10 rounded-full hover:scale-110 transition-transform"
                    onClick={(e) => handleItemClick(item, e)}
                    aria-label={item.label}
                    asChild={!!item.href}
                  >
                    {item.href ? (
                      <a
                        href={item.href}
                        target={item.external ? "_blank" : "_self"}
                        rel={item.external ? "noopener noreferrer" : undefined}
                        className="flex items-center justify-center w-full h-full"
                        onClick={(e) => e.preventDefault()}
                      >
                        <item.icon className="h-6 w-6" />
                        {item.external && (
                          <ExternalLink className="absolute -top-1 -right-1 h-3 w-3 text-primary" />
                        )}
                      </a>
                    ) : (
                      <div className="flex items-center justify-center w-full h-full">
                        <item.icon className="h-6 w-6" />
                      </div>
                    )}
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side={tooltipSide[position]} className="text-xs">
                <div className="flex items-center gap-1">
                  {item.label}
                  {item.external && (
                    <ExternalLink className="h-3 w-3 ml-1" />
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  )
}

export { DockItemSchema, DockMorphSchema }