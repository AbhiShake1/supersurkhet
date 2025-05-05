import type React from "react"
import type { LayoutElement } from "./restaurant-layout-editor"
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
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ElementRendererProps {
  element: LayoutElement
  isLocked?: boolean
  isSelected?: boolean
  darkMode?: boolean
}

export function ElementRenderer({
  element,
  isLocked = false,
  isSelected = false,
  darkMode = false,
}: ElementRendererProps) {
  const renderIcon = () => {
    const iconProps = {
      className: cn("w-full h-full p-2", isLocked ? "opacity-50" : "opacity-100"),
      strokeWidth: 1.5,
      title: `${element.type}${element.label ? `: ${element.label}` : ""}`,
    }

    switch (element.type) {
      case "chair":
        return <ChairIcon {...iconProps} className={cn(iconProps.className, "text-blue-600")} />
      case "sofa":
        return <Sofa {...iconProps} className={cn(iconProps.className, "text-purple-600")} />
      case "table":
        return <Square {...iconProps} className={cn(iconProps.className, "text-cyan-600")} />
      case "stairs":
        return <Stairs {...iconProps} className={cn(iconProps.className, "text-amber-700")} />
      case "garden":
        return <Tree {...iconProps} className={cn(iconProps.className, "text-green-600")} />
      case "door":
        return <Door {...iconProps} className={cn(iconProps.className, "text-gray-700")} />
      case "wall":
        return <Columns {...iconProps} className={cn(iconProps.className, "text-gray-800")} />
      case "window":
        return <Window {...iconProps} className={cn(iconProps.className, "text-sky-400")} />
      case "bar":
        return <GlassWater {...iconProps} className={cn(iconProps.className, "text-amber-500")} />
      case "bathroom":
        return <Bath {...iconProps} className={cn(iconProps.className, "text-blue-400")} />
      case "kitchen":
        return <UtensilsCrossed {...iconProps} className={cn(iconProps.className, "text-red-500")} />
      case "plant":
      case "decoration":
        return <Flower2 {...iconProps} className={cn(iconProps.className, "text-green-500")} />
      default:
        return <div className="w-full h-full bg-gray-300 flex items-center justify-center">{element.type}</div>
    }
  }

  const getRealisticStyle = () => {
    const style: React.CSSProperties = {
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      boxShadow: isSelected
        ? `0 0 0 2px rgba(59, 130, 246, 0.5), 0 4px 6px -1px rgba(0, 0, 0, ${darkMode ? 0.3 : 0.1}), 0 2px 4px -1px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.06})`
        : `0 1px 3px rgba(0, 0, 0, ${darkMode ? 0.3 : 0.1}), 0 1px 2px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.06})`,
      transition: "box-shadow 0.2s, transform 0.2s",
    }

    if (element.color) {
      style.backgroundColor = element.color
    }

    switch (element.type) {
      case "chair":
        style.borderRadius = "50%"
        style.backgroundColor = style.backgroundColor || (darkMode ? "#3b82f6" : "#3b82f6")
        style.backgroundImage =
          "radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 70%)"
        style.boxShadow = isSelected
          ? `0 0 0 2px rgba(59, 130, 246, 0.5), 0 4px 6px -1px rgba(0, 0, 0, ${darkMode ? 0.3 : 0.2}), 0 2px 4px -1px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1})`
          : `0 2px 4px rgba(0, 0, 0, ${darkMode ? 0.3 : 0.2}), inset 0 -2px 3px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1}), inset 0 2px 2px rgba(255, 255, 255, ${darkMode ? 0.1 : 0.2})`
        break
      case "sofa":
        style.borderRadius = "16px"
        style.backgroundColor = style.backgroundColor || (darkMode ? "#8b5cf6" : "#8b5cf6")
        style.backgroundImage = `linear-gradient(to bottom, rgba(255, 255, 255, ${darkMode ? 0.05 : 0.1}) 0%, rgba(255, 255, 255, 0) 50%, rgba(0, 0, 0, ${darkMode ? 0.1 : 0.05}) 100%)`
        style.boxShadow = isSelected
          ? `0 0 0 2px rgba(139, 92, 246, 0.5), 0 4px 6px -1px rgba(0, 0, 0, ${darkMode ? 0.3 : 0.2}), 0 2px 4px -1px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1})`
          : `0 2px 4px rgba(0, 0, 0, ${darkMode ? 0.3 : 0.2}), inset 0 -2px 3px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1}), inset 0 2px 2px rgba(255, 255, 255, ${darkMode ? 0.1 : 0.2})`
        break
      case "table":
        style.borderRadius = "4px"
        style.backgroundColor = style.backgroundColor || (darkMode ? "#0891b2" : "#0891b2")
        style.backgroundImage = `linear-gradient(45deg, rgba(255, 255, 255, ${darkMode ? 0.05 : 0.1}) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, ${darkMode ? 0.05 : 0.1}) 50%, rgba(255, 255, 255, ${darkMode ? 0.05 : 0.1}) 75%, transparent 75%, transparent)`
        style.backgroundSize = "10px 10px"
        style.boxShadow = isSelected
          ? `0 0 0 2px rgba(8, 145, 178, 0.5), 0 4px 6px -1px rgba(0, 0, 0, ${darkMode ? 0.3 : 0.2}), 0 2px 4px -1px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1})`
          : `0 2px 4px rgba(0, 0, 0, ${darkMode ? 0.3 : 0.2}), inset 0 -2px 3px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1}), inset 0 2px 2px rgba(255, 255, 255, ${darkMode ? 0.1 : 0.2})`
        break
      case "wall":
        style.backgroundColor = style.backgroundColor || (darkMode ? "#374151" : "#d1d5db")
        style.backgroundImage = `linear-gradient(90deg, rgba(0, 0, 0, ${darkMode ? 0.1 : 0.05}) 1px, transparent 1px), linear-gradient(rgba(0, 0, 0, ${darkMode ? 0.1 : 0.05}) 1px, transparent 1px)`
        style.backgroundSize = "20px 20px"
        style.boxShadow = isSelected
          ? `0 0 0 2px rgba(209, 213, 219, 0.5), 0 4px 6px -1px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1}), 0 2px 4px -1px rgba(0, 0, 0, ${darkMode ? 0.15 : 0.06})`
          : `0 1px 3px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1}), 0 1px 2px rgba(0, 0, 0, ${darkMode ? 0.15 : 0.06})`
        break
      case "door":
        style.backgroundColor = style.backgroundColor || (darkMode ? "#1f2937" : "#f3f4f6")
        style.borderStyle = "solid"
        style.borderWidth = "2px"
        style.borderColor = darkMode ? "#4b5563" : "#9ca3af"
        style.backgroundImage = `linear-gradient(to right, rgba(0, 0, 0, ${darkMode ? 0.1 : 0.05}) 0%, rgba(0, 0, 0, 0) 20%, rgba(0, 0, 0, 0) 80%, rgba(0, 0, 0, ${darkMode ? 0.1 : 0.05}) 100%)`
        style.boxShadow = isSelected
          ? `0 0 0 2px rgba(156, 163, 175, 0.5), 0 4px 6px -1px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1}), 0 2px 4px -1px rgba(0, 0, 0, ${darkMode ? 0.15 : 0.06})`
          : `0 1px 3px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1}), 0 1px 2px rgba(0, 0, 0, ${darkMode ? 0.15 : 0.06})`
        break
      case "window":
        style.backgroundColor = style.backgroundColor || (darkMode ? "#1e3a8a" : "#e0f2fe")
        style.borderStyle = "solid"
        style.borderWidth = "2px"
        style.borderColor = darkMode ? "#3b82f6" : "#0ea5e9"
        style.backgroundImage = `linear-gradient(45deg, rgba(255, 255, 255, ${darkMode ? 0.1 : 0.2}) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, ${darkMode ? 0.1 : 0.2}) 50%, rgba(255, 255, 255, ${darkMode ? 0.1 : 0.2}) 75%, transparent 75%, transparent)`
        style.backgroundSize = "10px 10px"
        style.boxShadow = isSelected
          ? `0 0 0 2px rgba(14, 165, 233, 0.5), 0 4px 6px -1px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1}), 0 2px 4px -1px rgba(0, 0, 0, ${darkMode ? 0.15 : 0.06})`
          : `0 1px 3px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1}), 0 1px 2px rgba(0, 0, 0, ${darkMode ? 0.15 : 0.06})`
        break
      case "stairs":
        style.backgroundColor = style.backgroundColor || (darkMode ? "#78350f" : "#fef3c7")
        style.backgroundImage = `repeating-linear-gradient(45deg, rgba(0, 0, 0, ${darkMode ? 0.1 : 0.05}) 0px, rgba(0, 0, 0, ${darkMode ? 0.1 : 0.05}) 5px, transparent 5px, transparent 10px)`
        style.boxShadow = isSelected
          ? `0 0 0 2px rgba(254, 243, 199, 0.5), 0 4px 6px -1px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1}), 0 2px 4px -1px rgba(0, 0, 0, ${darkMode ? 0.15 : 0.06})`
          : `0 1px 3px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1}), 0 1px 2px rgba(0, 0, 0, ${darkMode ? 0.15 : 0.06})`
        break
      case "garden":
        style.backgroundColor = style.backgroundColor || (darkMode ? "#064e3b" : "#d1fae5")
        style.backgroundImage = `radial-gradient(circle, rgba(16, 185, 129, ${darkMode ? 0.2 : 0.1}) 10%, transparent 10%), radial-gradient(circle, rgba(16, 185, 129, ${darkMode ? 0.2 : 0.1}) 10%, transparent 10%)`
        style.backgroundSize = "20px 20px"
        style.backgroundPosition = "0 0, 10px 10px"
        style.boxShadow = isSelected
          ? `0 0 0 2px rgba(209, 250, 229, 0.5), 0 4px 6px -1px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1}), 0 2px 4px -1px rgba(0, 0, 0, ${darkMode ? 0.15 : 0.06})`
          : `0 1px 3px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1}), 0 1px 2px rgba(0, 0, 0, ${darkMode ? 0.15 : 0.06})`
        break
      case "bar":
        style.backgroundColor = style.backgroundColor || (darkMode ? "#92400e" : "#fef3c7")
        style.backgroundImage = `linear-gradient(to right, rgba(217, 119, 6, ${darkMode ? 0.2 : 0.1}) 0%, rgba(217, 119, 6, ${darkMode ? 0.2 : 0.1}) 100%)`
        style.boxShadow = isSelected
          ? `0 0 0 2px rgba(254, 243, 199, 0.5), 0 4px 6px -1px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1}), 0 2px 4px -1px rgba(0, 0, 0, ${darkMode ? 0.15 : 0.06})`
          : `0 1px 3px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1}), 0 1px 2px rgba(0, 0, 0, ${darkMode ? 0.15 : 0.06})`
        break
      case "kitchen":
        style.backgroundColor = style.backgroundColor || (darkMode ? "#7f1d1d" : "#fee2e2")
        style.backgroundImage = `repeating-linear-gradient(0deg, rgba(220, 38, 38, ${darkMode ? 0.1 : 0.05}) 0px, rgba(220, 38, 38, ${darkMode ? 0.1 : 0.05}) 1px, transparent 1px, transparent 10px)`
        style.boxShadow = isSelected
          ? `0 0 0 2px rgba(254, 226, 226, 0.5), 0 4px 6px -1px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1}), 0 2px 4px -1px rgba(0, 0, 0, ${darkMode ? 0.15 : 0.06})`
          : `0 1px 3px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1}), 0 1px 2px rgba(0, 0, 0, ${darkMode ? 0.15 : 0.06})`
        break
      case "bathroom":
        style.backgroundColor = style.backgroundColor || (darkMode ? "#1e3a8a" : "#dbeafe")
        style.backgroundImage = `linear-gradient(45deg, rgba(59, 130, 246, ${darkMode ? 0.1 : 0.05}) 25%, transparent 25%, transparent 50%, rgba(59, 130, 246, ${darkMode ? 0.1 : 0.05}) 50%, rgba(59, 130, 246, ${darkMode ? 0.1 : 0.05}) 75%, transparent 75%, transparent)`
        style.backgroundSize = "10px 10px"
        style.boxShadow = isSelected
          ? `0 0 0 2px rgba(219, 234, 254, 0.5), 0 4px 6px -1px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1}), 0 2px 4px -1px rgba(0, 0, 0, ${darkMode ? 0.15 : 0.06})`
          : `0 1px 3px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1}), 0 1px 2px rgba(0, 0, 0, ${darkMode ? 0.15 : 0.06})`
        break
      case "plant":
        style.backgroundColor = style.backgroundColor || (darkMode ? "#064e3b" : "#ecfdf5")
        style.backgroundImage = `radial-gradient(circle, rgba(16, 185, 129, ${darkMode ? 0.3 : 0.2}) 0%, transparent 70%)`
        style.boxShadow = isSelected
          ? `0 0 0 2px rgba(236, 253, 245, 0.5), 0 4px 6px -1px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1}), 0 2px 4px -1px rgba(0, 0, 0, ${darkMode ? 0.15 : 0.06})`
          : `0 1px 3px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1}), 0 1px 2px rgba(0, 0, 0, ${darkMode ? 0.15 : 0.06})`
        break
      default:
        style.backgroundColor = style.backgroundColor || (darkMode ? "#374151" : "#f3f4f6")
        style.boxShadow = isSelected
          ? `0 0 0 2px rgba(243, 244, 246, 0.5), 0 4px 6px -1px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1}), 0 2px 4px -1px rgba(0, 0, 0, ${darkMode ? 0.15 : 0.06})`
          : `0 1px 3px rgba(0, 0, 0, ${darkMode ? 0.2 : 0.1}), 0 1px 2px rgba(0, 0, 0, ${darkMode ? 0.15 : 0.06})`
    }

    if (isLocked) {
      style.opacity = 0.7
      style.cursor = "not-allowed"
    } else {
      style.cursor = "move"
    }

    return style
  }

  return (
    <div style={getRealisticStyle()}>
      {renderIcon()}
      {element.label && (
        <div className="absolute bottom-0 left-0 right-0 text-center text-xs font-medium bg-black/50 text-white p-0.5 truncate rounded-b-sm">
          {element.label}
        </div>
      )}
      {element.capacity && element.capacity > 0 && (
        <div className="absolute top-0 right-0 bg-primary text-background text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
          {element.capacity}
        </div>
      )}
      {isLocked && (
        <div className="absolute inset-0 bg-black/10 flex items-center justify-center rounded-sm">
          <div className="bg-white/80 p-1 rounded-full shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}