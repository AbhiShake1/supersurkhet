import type React from "react"

import { Button } from "@/components/ui/button"
import { SidebarProvider } from "./ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, FolderOpen, Moon, Plus, Redo, Save, Sun, Trash2, Undo, Upload } from "lucide-react"
import { useEffect, useState } from "react"
import { AppSidebar } from "./app-sidebar"
import { HistoryProvider, useHistory } from "./history-provider"
import { LayoutCanvas } from "./layout-canvas"
import { PreviewMode } from "./preview-mode"
import { toast } from "sonner"

// Define types for our layout data
export type ElementType =
    | "chair"
    | "sofa"
    | "table"
    | "wall"
    | "door"
    | "window"
    | "stairs"
    | "garden"
    | "bar"
    | "kitchen"
    | "bathroom"
    | "plant"
    | "decoration"

export type ElementSize = "small" | "medium" | "large" | "custom"

export interface LayoutElement {
    id: string
    type: ElementType
    subType?: string
    size: ElementSize
    capacity?: number
    width: number
    height: number
    x: number
    y: number
    rotation: number
    label: string
    color?: string
    customProperties?: Record<string, any>
}

export interface Floor {
    id: string
    name: string
    elements: LayoutElement[]
    width: number
    height: number
    backgroundColor: string
}

export interface RestaurantLayout {
    name: string
    floors: Floor[]
    version: string
}

const DEFAULT_FLOOR_WIDTH = 1000
const DEFAULT_FLOOR_HEIGHT = 800

export function RestaurantLayoutEditor() {
    return <HistoryProvider>
        <_RestaurantLayoutEditor />
    </HistoryProvider>
}

function _RestaurantLayoutEditor() {
    const { push } = useHistory()
    const initialLayout: RestaurantLayout = {
        name: "My Restaurant",
        version: "1.0",
        floors: [
            {
                id: "floor-1",
                name: "Ground Floor",
                elements: [],
                width: DEFAULT_FLOOR_WIDTH,
                height: DEFAULT_FLOOR_HEIGHT,
                backgroundColor: "#ffffff",
            },
        ],
    }

    const [layout, setLayout] = useState<RestaurantLayout>(initialLayout)

    // Initialize history with initial layout
    useEffect(() => {
        push(initialLayout)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Subscribe to history changes
    useEffect(() => {
        const unsubscribe = document.addEventListener('historychange', (e: any) => {
            if (e.detail?.state) {
                setLayout(e.detail.state)
            }
        })
        return () => document.removeEventListener('historychange', unsubscribe as any)
    }, [])

    const updateLayoutWithHistory = (newLayout: RestaurantLayout) => {
        setLayout(newLayout)
        push(newLayout)
    }

    const [darkMode, setDarkMode] = useState<boolean>(true)
    const [previewMode, setPreviewMode] = useState<boolean>(false)
    const [activeFloor, setActiveFloor] = useState<string>("floor-1")

    // Apply dark mode class to body
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add("dark")
        } else {
            document.documentElement.classList.remove("dark")
        }
    }, [darkMode])

    function getOrdinalSuffix(num: number): string {
        const j = num % 10
        const k = num % 100
        if (j === 1 && k !== 11) return "st"
        if (j === 2 && k !== 12) return "nd"
        if (j === 3 && k !== 13) return "rd"
        return "th"
    }

    const addNewFloor = () => {
        const newFloorId = `floor-${layout.floors.length + 1}`
        const newFloorName = `${layout.floors.length}${getOrdinalSuffix(layout.floors.length)} Floor`

        setLayout({
            ...layout,
            floors: [
                ...layout.floors,
                {
                    id: newFloorId,
                    name: newFloorName,
                    elements: [],
                    width: DEFAULT_FLOOR_WIDTH,
                    height: DEFAULT_FLOOR_HEIGHT,
                    backgroundColor: darkMode ? "#1a1a1a" : "#ffffff",
                },
            ],
        })

        setActiveFloor(newFloorId)

        toast.success("Floor added")
    }

    const renameFloor = (floorId: string, newName: string) => {
        updateLayoutWithHistory({
            ...layout,
            floors: layout.floors.map((floor) => (floor.id === floorId ? { ...floor, name: newName } : floor)),
        })
    }

    const deleteFloor = (floorId: string) => {
        if (layout.floors.length <= 1) {
            toast.error("Cannot delete floor")
            return
        }

        updateLayoutWithHistory({
            ...layout,
            floors: layout.floors.filter((floor) => floor.id !== floorId),
        })

        if (activeFloor === floorId) {
            setActiveFloor(layout.floors[0].id)
        }

        toast.success("Floor deleted")
    }

    const saveLayout = () => {
        // In a real app, this would save to a database
        const layoutData = JSON.stringify({ ...layout })
        localStorage.setItem("restaurantLayout", layoutData)

        toast.success("Layout saved")
    }

    const loadLayout = () => {
        // In a real app, this would load from a database
        const savedLayout = localStorage.getItem("restaurantLayout")

        if (savedLayout) {
            try {
                const parsedLayout = JSON.parse(savedLayout) as RestaurantLayout
                setLayout(parsedLayout)
                setActiveFloor(parsedLayout.floors[0].id)

                toast.success("Layout loaded")
            } catch (error) {
                toast.error("Error loading layout")
            }
        } else {
            toast.error("No saved layout")
        }
    }

    const exportLayout = () => {
        const dataStr = JSON.stringify(layout, null, 2)
        const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)

        const exportFileDefaultName = `layout.json`

        const linkElement = document.createElement("a")
        linkElement.setAttribute("href", dataUri)
        linkElement.setAttribute("download", exportFileDefaultName)
        linkElement.click()

        toast.success("Layout exported")
    }

    const importLayout = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const importedLayout = JSON.parse(e.target?.result as string) as RestaurantLayout
                updateLayoutWithHistory(importedLayout)
                setActiveFloor(importedLayout.floors[0].id)

                toast.success("Layout imported")
            } catch (error) {
                toast.error("Error importing layout")
            }
        }
        reader.readAsText(file)

        // Reset the input value so the same file can be imported again if needed
        event.target.value = ""
    }

    const updateElements = (floorId: string, newElements: LayoutElement[]) => {
        updateLayoutWithHistory({
            ...layout,
            floors: layout.floors.map((floor) => (floor.id === floorId ? { ...floor, elements: newElements } : floor)),
        })
    }

    const updateFloorProperties = (floorId: string, properties: Partial<Floor>) => {
        updateLayoutWithHistory({
            ...layout,
            floors: layout.floors.map((floor) => (floor.id === floorId ? { ...floor, ...properties } : floor)),
        })
    }

    const currentFloor = layout.floors.find((floor) => floor.id === activeFloor) || layout.floors[0]

    const toggleDarkMode = () => {
        setDarkMode(!darkMode)
    }

    return (
        <SidebarProvider>
            <div
                className={`flex flex-col h-screen transition-colors duration-300 ${darkMode ? "dark bg-gray-900 text-white" : "bg-background"}`}
            >
                {/* Header */}
                <header className={`border-b p-4 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-card"}`}>
                    <div className="container flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 flex-wrap">
                            <HistoryControls />

                            <Button variant="outline" size="sm" onClick={loadLayout}>
                                <FolderOpen className="mr-2 h-4 w-4" />
                                Load
                            </Button>
                            <Button variant="outline" size="sm" onClick={exportLayout}>
                                <Download className="mr-2 h-4 w-4" />
                                Export
                            </Button>
                            <div className="relative">
                                <Button variant="outline" size="sm" asChild>
                                    <label>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Import
                                        <input type="file" accept=".json" className="sr-only" onChange={importLayout} />
                                    </label>
                                </Button>
                            </div>
                            <Button variant="outline" size="sm" onClick={toggleDarkMode}>
                                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPreviewMode(!previewMode)}
                                className={previewMode ? "bg-primary text-primary-foreground" : ""}
                            >
                                {previewMode ? "Exit Preview" : "Preview Mode"}
                            </Button>
                            <Button size="sm" onClick={saveLayout}>
                                <Save className="mr-2 h-4 w-4" />
                                Save
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Main Editor Area */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex">
                            {/* Sidebar */}
                            <AppSidebar
                                currentFloor={currentFloor}
                                onAddElement={(element) => {
                                    const newElements = [...currentFloor.elements, element]
                                    updateElements(currentFloor.id, newElements)
                                }}
                                onUpdateFloor={(properties) => {
                                    updateFloorProperties(currentFloor.id, properties)
                                }}
                                darkMode={darkMode}
                                onToggleDarkMode={toggleDarkMode}
                                previewMode={previewMode}
                                onTogglePreview={() => setPreviewMode(!previewMode)}
                            />

                            {/* Canvas Area */}
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Floor Tabs */}
                                <div className={`border-b p-2 ${darkMode ? "bg-gray-800/40 border-gray-700" : "bg-muted/40"}`}>
                                    <Tabs value={activeFloor} onValueChange={setActiveFloor} className="w-full">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                            <TabsList className={`h-auto flex-wrap ${darkMode ? "bg-gray-700" : ""}`}>
                                                {layout.floors.map((floor) => (
                                                    <TabsTrigger key={floor.id} value={floor.id} className="relative group">
                                                        <span>{floor.name}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 absolute right-0 top-0 -mt-2 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                deleteFloor(floor.id)
                                                            }}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                            <span className="sr-only">Delete floor</span>
                                                        </Button>
                                                    </TabsTrigger>
                                                ))}
                                            </TabsList>
                                            <Button variant="outline" size="sm" onClick={addNewFloor}>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Add Floor
                                            </Button>
                                        </div>

                                        {layout.floors.map((floor) => (
                                            <TabsContent key={floor.id} value={floor.id} className="m-0 flex-1 overflow-hidden">
                                                {previewMode ? (
                                                    <PreviewMode floor={floor} darkMode={darkMode} />
                                                ) : (
                                                    <LayoutCanvas
                                                        floor={floor}
                                                        onUpdateElements={(newElements) => updateElements(floor.id, newElements)}
                                                        darkMode={darkMode}
                                                    />
                                                )}
                                            </TabsContent>
                                        ))}
                                    </Tabs>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SidebarProvider>
    )
}

function HistoryControls() {
    const { canUndo, canRedo, undo, redo } = useHistory()

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && canUndo) {
                e.preventDefault()
                undo()
            } else if (((e.ctrlKey || e.metaKey) && e.key === 'y' && canRedo) ||
                ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z' && canRedo)) {
                e.preventDefault()
                redo()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [canUndo, canRedo, undo, redo])

    return (
        <>
            <Button variant="outline" size="icon" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
                <Undo className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">
                <Redo className="h-4 w-4" />
            </Button>
        </>
    )
}