import type React from "react"

import { useState, useEffect } from "react"
import type { Floor, LayoutElement } from "./restaurant-layout-editor"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, Maximize2, Minimize2, RotateCw, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

interface PreviewModeProps {
    floor: Floor
    darkMode: boolean
}

export function PreviewMode({ floor, darkMode }: PreviewModeProps) {
    const [viewMode, setViewMode] = useState<"2d" | "3d" | "firstPerson">("3d")
    const [rotation, setRotation] = useState(0)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [showLabels, setShowLabels] = useState(true)
    const [ambientLight, setAmbientLight] = useState(darkMode ? 0.3 : 0.7)

    // Update ambient light when dark mode changes
    useEffect(() => {
        setAmbientLight(darkMode ? 0.3 : 0.7)
    }, [darkMode])

    // Handle fullscreen
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`)
            })
        } else {
            document.exitFullscreen()
        }
    }

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement)
        }

        document.addEventListener("fullscreenchange", handleFullscreenChange)
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }, [])

    // Rotate view
    const rotateView = (direction: "clockwise" | "counterclockwise") => {
        setRotation((prev) => {
            const change = direction === "clockwise" ? 90 : -90
            return (prev + change) % 360
        })
    }

    // Get element shadow based on lighting
    const getElementShadow = (element: LayoutElement) => {
        const shadowOpacity = darkMode ? 0.5 : 0.2
        const shadowSize = Math.max(element?.width ?? 0, element?.height ?? 0) * 0.1

        return `0 ${shadowSize}px ${shadowSize * 2}px rgba(0, 0, 0, ${shadowOpacity})`
    }

    // Get element style with 3D effects
    const getElementStyle = (element: LayoutElement) => {
        const style: React.CSSProperties = {
            position: "absolute",
            left: `${element.x}px`,
            top: `${element.y}px`,
            width: `${element.width}px`,
            height: `${element.height}px`,
            transform: `rotate(${element.rotation}deg)`,
            transformOrigin: "center center",
            transition: "all 0.3s ease-out",
            boxShadow: getElementShadow(element),
        }

        // Add 3D perspective effects based on element type
        switch (element.type) {
            case "table":
                style.backgroundColor = element.color || "#8B4513"
                style.borderRadius = "4px"
                style.boxShadow = `0 4px 8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.1), 0 ${element.height * 0.7}px 0 -${element.height * 0.6}px rgba(0, 0, 0, 0.2)`
                break
            case "chair":
                style.backgroundColor = element.color || "#5c6ac4"
                style.borderRadius = "50% 50% 10% 10%"
                style.boxShadow = `0 2px 4px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.1), 0 ${element.height * 0.5}px 0 -${element.height * 0.4}px rgba(0, 0, 0, 0.2)`
                break
            case "sofa":
                style.backgroundColor = element.color || "#9c6ac4"
                style.borderRadius = "10px 10px 5px 5px"
                style.boxShadow = `0 3px 6px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.1), 0 ${element.height * 0.6}px 0 -${element.height * 0.5}px rgba(0, 0, 0, 0.2)`
                break
            case "wall":
                style.backgroundColor = element.color || "#d1d5db"
                style.boxShadow = `0 0 10px rgba(0, 0, 0, 0.2)`
                break
            case "door":
                style.backgroundColor = element.color || "#f3f4f6"
                style.border = "2px solid #9ca3af"
                break
            case "window":
                style.backgroundColor = element.color || "#e0f2fe"
                style.border = "2px solid #0ea5e9"
                style.opacity = 0.8
                break
            case "bar":
                style.backgroundColor = element.color || "#fef3c7"
                style.borderRadius = "4px"
                style.boxShadow = `0 4px 8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.1), 0 ${element.height * 0.7}px 0 -${element.height * 0.6}px rgba(0, 0, 0, 0.2)`
                break
            case "kitchen":
                style.backgroundColor = element.color || "#fee2e2"
                style.borderRadius = "4px"
                style.boxShadow = `0 4px 8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.1)`
                break
            case "bathroom":
                style.backgroundColor = element.color || "#dbeafe"
                style.borderRadius = "4px"
                style.boxShadow = `0 4px 8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.1)`
                break
            case "plant":
                style.backgroundColor = element.color || "#ecfdf5"
                style.borderRadius = "50%"
                style.boxShadow = `0 4px 8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.1)`
                break
            default:
                style.backgroundColor = element.color || "#f3f4f6"
                style.borderRadius = "4px"
        }

        return style
    }

    // Render the floor with 3D effects
    return (
        <div className="relative w-full h-full overflow-hidden">
            {/* Controls */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-white dark:bg-gray-800 rounded-md shadow-md p-1">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewMode("2d")}
                    className={viewMode === "2d" ? "bg-primary text-primary-foreground" : ""}
                    title="2D View"
                >
                    <span className="text-xs font-bold">2D</span>
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewMode("3d")}
                    className={viewMode === "3d" ? "bg-primary text-primary-foreground" : ""}
                    title="3D View"
                >
                    <span className="text-xs font-bold">3D</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => rotateView("clockwise")} title="Rotate Clockwise">
                    <RotateCw className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => rotateView("counterclockwise")}
                    title="Rotate Counter-clockwise"
                >
                    <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowLabels(!showLabels)}
                    title={showLabels ? "Hide Labels" : "Show Labels"}
                >
                    {showLabels ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
            </div>

            {/* Preview Canvas */}
            <div
                className={cn(
                    "w-full h-full overflow-auto transition-all duration-500",
                    darkMode ? "bg-gray-900" : "bg-gray-100",
                )}
                style={{
                    backgroundColor: floor.backgroundColor,
                    perspective: viewMode === "3d" ? "1000px" : "none",
                }}
            >
                <div
                    className="relative transition-transform duration-500"
                    style={{
                        width: `${floor.width}px`,
                        height: `${floor.height}px`,
                        transform:
                            viewMode === "3d" ? `rotateX(30deg) rotateZ(${rotation}deg) scale(0.8)` : `rotateZ(${rotation}deg)`,
                        transformOrigin: "center center",
                        transformStyle: "preserve-3d",
                        boxShadow: viewMode === "3d" ? "0 20px 50px rgba(0, 0, 0, 0.3)" : "none",
                    }}
                >
                    {/* Floor grid */}
                    <div
                        className={cn(
                            "absolute inset-0 transition-opacity duration-300",
                            viewMode === "3d" ? "opacity-30" : "opacity-10",
                        )}
                    >
                        {Array.from({ length: Math.ceil((floor?.width ?? 50) / 50) }).map((_, i) => (
                            <div
                                key={`v-${i}`}
                                className={`absolute top-0 bottom-0 border-r ${darkMode ? "border-gray-700" : "border-gray-300"}`}
                                style={{ left: `${i * 50}px` }}
                            />
                        ))}
                        {Array.from({ length: Math.ceil((floor?.height ?? 50) / 50) }).map((_, i) => (
                            <div
                                key={`h-${i}`}
                                className={`absolute left-0 right-0 border-b ${darkMode ? "border-gray-700" : "border-gray-300"}`}
                                style={{ top: `${i * 50}px` }}
                            />
                        ))}
                    </div>

                    {/* Floor elements */}
                    {floor?.elements.map((element) => (
                        <div key={element.id} style={getElementStyle(element)} className="transition-all duration-300">
                            {/* Element label */}
                            {showLabels && element.label && (
                                <div className="absolute bottom-0 left-0 right-0 text-center text-xs font-medium bg-black/70 text-white p-0.5 truncate rounded-b-sm">
                                    {element.label}
                                </div>
                            )}

                            {/* Capacity indicator */}
                            {showLabels && !!element.capacity && (
                                <div className="absolute top-0 right-0 bg-primary text-background text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                                    {element.capacity}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Ambient lighting effect */}
                    <div
                        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                        style={{
                            background: darkMode
                                ? `radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,${1 - ambientLight}) 100%)`
                                : `radial-gradient(circle at 50% 50%, rgba(255,255,255,0) 0%, rgba(0,0,0,${0.1}) 100%)`,
                            opacity: viewMode === "3d" ? 1 : 0.5,
                        }}
                    />
                </div>
            </div>

            {/* Preview mode message */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
                Preview Mode - Switch back to edit mode to make changes
            </div>
        </div>
    )
}