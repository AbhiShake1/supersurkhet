import type React from "react"

import { useState, useRef, useEffect } from "react"
import type { Floor, LayoutElement } from "./restaurant-layout-editor"
import { Button } from "@/components/ui/button"
import { Trash2, RotateCw, ZoomIn, ZoomOut, Copy, Lock, Unlock, Maximize2, Minimize2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ElementRenderer } from "./element-renderer"
import { ResizeHandles } from "./resize-handles"
import { useHistory } from "./history-provider"
import { toast } from "sonner"

interface LayoutCanvasProps {
  floor: Floor
  onUpdateElements: (elements: LayoutElement[]) => void
  darkMode?: boolean
}

export function LayoutCanvas({ floor, onUpdateElements, darkMode = false }: LayoutCanvasProps) {
  const { push } = useHistory()
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [draggedElementId, setDraggedElementId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [resizeDirection, setResizeDirection] = useState<string | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [lockedElements, setLockedElements] = useState<Set<string>>(new Set())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [lastEvent, setLastEvent] = useState<string>("No events yet")
  const [rotationStartAngle, setRotationStartAngle] = useState(0)
  const [rotationStartMouseAngle, setRotationStartMouseAngle] = useState(0)
  const [initialElements, setInitialElements] = useState<LayoutElement[]>([])

  // Update canvas size on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setCanvasSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    }

    updateSize()
    window.addEventListener("resize", updateSize)
    return () => window.removeEventListener("resize", updateSize)
  }, [])

  // Save initial elements state for history
  useEffect(() => {
    setInitialElements([...floor.elements])
  }, [floor.id])

  const handleElementClick = (elementId: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    setSelectedElementId(elementId)
    setLastEvent(`Element clicked: ${elementId}`)
  }

  const handleCanvasClick = () => {
    setSelectedElementId(null)
    setLastEvent("Canvas clicked")
  }

  // Simplified drag and drop implementation
  const handleElementMouseDown = (elementId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Don't allow dragging locked elements
    if (lockedElements.has(elementId)) {
      setLastEvent(`Cannot drag locked element: ${elementId}`)
      return
    }

    const element = floor.elements.find((el) => el.id === elementId)
    if (!element) return

    setDraggedElementId(elementId)
    setSelectedElementId(elementId)
    setIsDragging(true)

    // Save initial state for history
    setInitialElements([...floor.elements])

    // Calculate offset from mouse position to element position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top

    setDragOffset({ x: offsetX, y: offsetY })
    setLastEvent(`Mouse down on element: ${elementId}, offset: ${offsetX.toFixed(0)},${offsetY.toFixed(0)}`)

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault()

      if (!containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const x = (moveEvent.clientX - containerRect.left - offsetX + position.x) / scale
      const y = (moveEvent.clientY - containerRect.top - offsetY + position.y) / scale

      setLastEvent(`Dragging element: ${elementId}, pos: ${x.toFixed(0)},${y.toFixed(0)}`)

      // Update element position
      const updatedElements = floor.elements.map((el) =>
        el.id === elementId
          ? {
              ...el,
              x: Math.max(0, Math.min(x, floor.width - el.width)),
              y: Math.max(0, Math.min(y, floor.height - el.height)),
            }
          : el,
      )

      onUpdateElements(updatedElements)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setDraggedElementId(null)
      setLastEvent(`Element dropped: ${elementId}`)

      // Add to history if position changed
      if (JSON.stringify(initialElements) !== JSON.stringify(floor.elements)) {
        push(floor.elements)
      }

      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  const handleElementTouchStart = (elementId: string, e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Don't allow dragging locked elements
    if (lockedElements.has(elementId)) {
      setLastEvent(`Cannot drag locked element: ${elementId}`)
      return
    }

    const element = floor.elements.find((el) => el.id === elementId)
    if (!element) return

    setDraggedElementId(elementId)
    setSelectedElementId(elementId)
    setIsDragging(true)

    // Save initial state for history
    setInitialElements([...floor.elements])

    // Calculate offset from touch position to element position
    const touch = e.touches[0]
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const offsetX = touch.clientX - rect.left
    const offsetY = touch.clientY - rect.top

    setDragOffset({ x: offsetX, y: offsetY })
    setLastEvent(`Touch start on element: ${elementId}, offset: ${offsetX.toFixed(0)},${offsetY.toFixed(0)}`)

    const handleTouchMove = (moveEvent: TouchEvent) => {
      moveEvent.preventDefault()

      if (!containerRef.current || moveEvent.touches.length !== 1) return

      const touch = moveEvent.touches[0]
      const containerRect = containerRef.current.getBoundingClientRect()
      const x = (touch.clientX - containerRect.left - offsetX + position.x) / scale
      const y = (touch.clientY - containerRect.top - offsetY + position.y) / scale

      setLastEvent(`Dragging element (touch): ${elementId}, pos: ${x.toFixed(0)},${y.toFixed(0)}`)

      // Update element position
      const updatedElements = floor.elements.map((el) =>
        el.id === elementId
          ? {
              ...el,
              x: Math.max(0, Math.min(x, floor.width - el.width)),
              y: Math.max(0, Math.min(y, floor.height - el.height)),
            }
          : el,
      )

      onUpdateElements(updatedElements)
    }

    const handleTouchEnd = () => {
      setIsDragging(false)
      setDraggedElementId(null)
      setLastEvent(`Element dropped (touch): ${elementId}`)

      // Add to history if position changed
      if (JSON.stringify(initialElements) !== JSON.stringify(floor.elements)) {
        push(floor.elements)
      }

      document.removeEventListener("touchmove", handleTouchMove, { capture: true })
      document.removeEventListener("touchend", handleTouchEnd)
      document.removeEventListener("touchcancel", handleTouchEnd)
    }

    document.addEventListener("touchmove", handleTouchMove, { passive: false, capture: true })
    document.addEventListener("touchend", handleTouchEnd)
    document.addEventListener("touchcancel", handleTouchEnd)
  }

  // Handle resize functionality
  const handleResizeStart = (elementId: string, direction: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (lockedElements.has(elementId)) {
      setLastEvent(`Cannot resize locked element: ${elementId}`)
      return
    }

    setIsResizing(true)
    setResizeDirection(direction)
    setSelectedElementId(elementId)
    setLastEvent(`Resize start: ${elementId}, direction: ${direction}`)

    // Save initial state for history
    setInitialElements([...floor.elements])

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY

    const element = floor.elements.find((el) => el.id === elementId)
    if (!element) return

    const handleResizeMove = (moveEvent: MouseEvent | TouchEvent) => {
      moveEvent.preventDefault()

      if (!containerRef.current) return

      const moveClientX = "touches" in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX
      const moveClientY = "touches" in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY

      const containerRect = containerRef.current.getBoundingClientRect()
      const deltaX = (moveClientX - clientX) / scale
      const deltaY = (moveClientY - clientY) / scale

      setLastEvent(`Resizing: ${elementId}, delta: ${deltaX.toFixed(0)},${deltaY.toFixed(0)}`)

      const updatedElements = floor.elements.map((el) => {
        if (el.id !== elementId) return el

        let newWidth = el.width
        let newHeight = el.height
        let newX = el.x
        let newY = el.y

        // Handle different resize directions
        if (direction.includes("e")) {
          newWidth = Math.max(20, el.width + deltaX)
        }
        if (direction.includes("w")) {
          newWidth = Math.max(20, el.width - deltaX)
          newX = el.x + deltaX
        }
        if (direction.includes("s")) {
          newHeight = Math.max(20, el.height + deltaY)
        }
        if (direction.includes("n")) {
          newHeight = Math.max(20, el.height - deltaY)
          newY = el.y + deltaY
        }

        // Ensure element stays within bounds
        newX = Math.max(0, Math.min(newX, floor.width - newWidth))
        newY = Math.max(0, Math.min(newY, floor.height - newHeight))

        return {
          ...el,
          width: newWidth,
          height: newHeight,
          x: newX,
          y: newY,
        }
      })

      onUpdateElements(updatedElements)
    }

    const handleResizeEnd = () => {
      setIsResizing(false)
      setResizeDirection(null)
      setLastEvent(`Resize end: ${elementId}`)

      // Add to history if dimensions changed
      if (JSON.stringify(initialElements) !== JSON.stringify(floor.elements)) {
        push(floor.elements)
      }

      document.removeEventListener("mousemove", handleResizeMove as any)
      document.removeEventListener("touchmove", handleResizeMove as any, { capture: true })
      document.removeEventListener("mouseup", handleResizeEnd)
      document.removeEventListener("touchend", handleResizeEnd)
    }

    document.addEventListener("mousemove", handleResizeMove as any)
    document.addEventListener("touchmove", handleResizeMove as any, { passive: false, capture: true })
    document.addEventListener("mouseup", handleResizeEnd)
    document.addEventListener("touchend", handleResizeEnd)
  }

  // Handle rotation functionality
  const handleRotateStart = (elementId: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (lockedElements.has(elementId)) {
      setLastEvent(`Cannot rotate locked element: ${elementId}`)
      return
    }

    setIsRotating(true)
    setSelectedElementId(elementId)
    setLastEvent(`Rotation start: ${elementId}`)

    // Save initial state for history
    setInitialElements([...floor.elements])

    const element = floor.elements.find((el) => el.id === elementId)
    if (!element) return

    // Get element center position
    const elementCenterX = element.x + element.width / 2
    const elementCenterY = element.y + element.height / 2

    // Get mouse/touch position
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY

    // Calculate angle between element center and mouse position
    const containerRect = containerRef.current?.getBoundingClientRect()
    if (!containerRect) return

    const canvasX = (clientX - containerRect.left + position.x) / scale
    const canvasY = (clientY - containerRect.top + position.y) / scale

    const startAngle = Math.atan2(canvasY - elementCenterY, canvasX - elementCenterX) * (180 / Math.PI)
    setRotationStartAngle(element.rotation)
    setRotationStartMouseAngle(startAngle)

    const handleRotateMove = (moveEvent: MouseEvent | TouchEvent) => {
      moveEvent.preventDefault()

      const moveClientX = "touches" in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX
      const moveClientY = "touches" in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY

      if (!containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const canvasX = (moveClientX - containerRect.left + position.x) / scale
      const canvasY = (moveClientY - containerRect.top + position.y) / scale

      const currentAngle = Math.atan2(canvasY - elementCenterY, canvasX - elementCenterX) * (180 / Math.PI)
      const angleDelta = currentAngle - rotationStartMouseAngle

      // Calculate new rotation, keeping it between 0-360
      let newRotation = (rotationStartAngle + angleDelta) % 360
      if (newRotation < 0) newRotation += 360

      // Snap to 15 degree increments when holding shift
      if ("shiftKey" in moveEvent && moveEvent.shiftKey) {
        newRotation = Math.round(newRotation / 15) * 15
      }

      setLastEvent(`Rotating: ${elementId}, angle: ${newRotation.toFixed(0)}°`)

      const updatedElements = floor.elements.map((el) => (el.id === elementId ? { ...el, rotation: newRotation } : el))

      onUpdateElements(updatedElements)
    }

    const handleRotateEnd = () => {
      setIsRotating(false)
      setLastEvent(`Rotation end: ${elementId}`)

      // Add to history if rotation changed
      if (JSON.stringify(initialElements) !== JSON.stringify(floor.elements)) {
        push(floor.elements)
      }

      document.removeEventListener("mousemove", handleRotateMove as any)
      document.removeEventListener("touchmove", handleRotateMove as any, { capture: true })
      document.removeEventListener("mouseup", handleRotateEnd)
      document.removeEventListener("touchend", handleRotateEnd)
    }

    document.addEventListener("mousemove", handleRotateMove as any)
    document.addEventListener("touchmove", handleRotateMove as any, { passive: false, capture: true })
    document.addEventListener("mouseup", handleRotateEnd)
    document.addEventListener("touchend", handleRotateEnd)
  }

  // Canvas panning
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Middle mouse button or Alt+left click for panning
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault()
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
      setLastEvent("Canvas panning started")

      const handlePanMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault()

        const dx = moveEvent.clientX - panStart.x
        const dy = moveEvent.clientY - panStart.y

        setPosition({
          x: position.x - dx,
          y: position.y - dy,
        })

        setPanStart({ x: moveEvent.clientX, y: moveEvent.clientY })
        setLastEvent(`Panning: dx=${dx.toFixed(0)}, dy=${dy.toFixed(0)}`)
      }

      const handlePanMouseUp = () => {
        setIsPanning(false)
        setLastEvent("Canvas panning ended")

        document.removeEventListener("mousemove", handlePanMouseMove)
        document.removeEventListener("mouseup", handlePanMouseUp)
      }

      document.addEventListener("mousemove", handlePanMouseMove)
      document.addEventListener("mouseup", handlePanMouseUp)
    }
  }

  const handleCanvasTouchStart = (e: React.TouchEvent) => {
    // Two finger touch for panning
    if (e.touches.length === 2) {
      e.preventDefault()
      setIsPanning(true)

      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2

      setPanStart({ x: centerX, y: centerY })
      setLastEvent("Canvas panning started (touch)")

      // Initial distance for pinch zoom
      const initialDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )

      const handlePanTouchMove = (moveEvent: TouchEvent) => {
        moveEvent.preventDefault()

        if (moveEvent.touches.length !== 2) return

        const centerX = (moveEvent.touches[0].clientX + moveEvent.touches[1].clientX) / 2
        const centerY = (moveEvent.touches[0].clientY + moveEvent.touches[1].clientY) / 2

        const dx = centerX - panStart.x
        const dy = centerY - panStart.y

        setPosition({
          x: position.x - dx,
          y: position.y - dy,
        })

        setPanStart({ x: centerX, y: centerY })

        // Handle pinch zoom
        const currentDistance = Math.hypot(
          moveEvent.touches[0].clientX - moveEvent.touches[1].clientX,
          moveEvent.touches[0].clientY - moveEvent.touches[1].clientY,
        )

        const delta = currentDistance / initialDistance

        if (Math.abs(delta - 1) > 0.05) {
          const newScale = Math.max(0.5, Math.min(2, scale * delta))
          setScale(newScale)
          setLastEvent(`Pinch zoom: scale=${newScale.toFixed(2)}`)
        } else {
          setLastEvent(`Panning (touch): dx=${dx.toFixed(0)}, dy=${dy.toFixed(0)}`)
        }
      }

      const handlePanTouchEnd = () => {
        setIsPanning(false)
        setLastEvent("Canvas panning ended (touch)")

        document.removeEventListener("touchmove", handlePanTouchMove, { capture: true })
        document.removeEventListener("touchend", handlePanTouchEnd)
        document.removeEventListener("touchcancel", handlePanTouchEnd)
      }

      document.addEventListener("touchmove", handlePanTouchMove, { passive: false, capture: true })
      document.addEventListener("touchend", handlePanTouchEnd)
      document.addEventListener("touchcancel", handlePanTouchEnd)
    }
  }

  const deleteElement = (elementId: string) => {
    // Save initial state for history
    setInitialElements([...floor.elements])

    const updatedElements = floor.elements.filter((element) => element.id !== elementId)
    onUpdateElements(updatedElements)
    setSelectedElementId(null)
    setLastEvent(`Element deleted: ${elementId}`)

    // Add to history
    push(updatedElements)
  }

  const rotateElement = (elementId: string) => {
    // Save initial state for history
    setInitialElements([...floor.elements])

    const updatedElements = floor.elements.map((element) =>
      element.id === elementId ? { ...element, rotation: (element.rotation + 90) % 360 } : element,
    )
    onUpdateElements(updatedElements)
    setLastEvent(`Element rotated: ${elementId}`)

    // Add to history
    push(updatedElements)
  }

  const duplicateElement = (elementId: string) => {
    const elementToDuplicate = floor.elements.find((element) => element.id === elementId)
    if (!elementToDuplicate) return

    // Save initial state for history
    setInitialElements([...floor.elements])

    const newElement = {
      ...elementToDuplicate,
      id: `element-${Date.now()}`,
      x: elementToDuplicate.x + 20,
      y: elementToDuplicate.y + 20,
    }

    const updatedElements = [...floor.elements, newElement]
    onUpdateElements(updatedElements)
    setLastEvent(`Element duplicated: ${elementId} → ${newElement.id}`)

    // Add to history
    push(updatedElements)

    toast.success("Element duplicated")
  }

  const toggleLockElement = (elementId: string) => {
    const newLockedElements = new Set(lockedElements)

    if (newLockedElements.has(elementId)) {
      newLockedElements.delete(elementId)
      setLastEvent(`Element unlocked: ${elementId}`)
      toast.success("Element unlocked")
    } else {
      newLockedElements.add(elementId)
      setLastEvent(`Element locked: ${elementId}`)
      toast.success("Element locked")
    }

    setLockedElements(newLockedElements)
  }

  const zoomIn = () => {
    setScale((prev) => {
      const newScale = Math.min(prev + 0.1, 2)
      setLastEvent(`Zoomed in: ${newScale.toFixed(2)}`)
      return newScale
    })
  }

  const zoomOut = () => {
    setScale((prev) => {
      const newScale = Math.max(prev - 0.1, 0.5)
      setLastEvent(`Zoomed out: ${newScale.toFixed(2)}`)
      return newScale
    })
  }

  const resetView = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
    setLastEvent("View reset")
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch((err) => {
        toast.error("Fullscreen error")
      })
    } else {
      document.exitFullscreen()
    }
    setIsFullscreen(!isFullscreen)
    setLastEvent(isFullscreen ? "Exited fullscreen" : "Entered fullscreen")
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedElementId) return

      // Delete key to delete element
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        deleteElement(selectedElementId)
      }

      // R key to rotate element
      if (e.key === "r" || e.key === "R") {
        e.preventDefault()
        rotateElement(selectedElementId)
      }

      // Ctrl+D to duplicate element
      if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) {
        e.preventDefault()
        duplicateElement(selectedElementId)
      }

      // L key to lock/unlock element
      if (e.key === "l" || e.key === "L") {
        e.preventDefault()
        toggleLockElement(selectedElementId)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedElementId])

  const selectedElement = selectedElementId ? floor.elements.find((element) => element.id === selectedElementId) : null

  // Set cursor style based on dragging state
  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = "grabbing"
    } else if (isResizing) {
      document.body.style.cursor =
        resizeDirection?.includes("e") && resizeDirection?.includes("s")
          ? "nwse-resize"
          : resizeDirection?.includes("w") && resizeDirection?.includes("s")
            ? "nesw-resize"
            : resizeDirection?.includes("e") || resizeDirection?.includes("w")
              ? "ew-resize"
              : "ns-resize"
    } else if (isRotating) {
      document.body.style.cursor = "grabbing"
    } else {
      document.body.style.cursor = ""
    }

    return () => {
      document.body.style.cursor = ""
    }
  }, [isDragging, isResizing, isRotating, resizeDirection])

  return (
    <div
      ref={containerRef}
      className={cn("relative flex-1 overflow-hidden border", darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-100")}
      onMouseDown={handleCanvasMouseDown}
      onTouchStart={handleCanvasTouchStart}
      onClick={handleCanvasClick}
    >
      {/* Controls */}
      <div
        className={cn(
          "absolute top-4 right-4 z-10 flex flex-col gap-2 rounded-md shadow-md p-1",
          darkMode ? "bg-gray-800" : "bg-white",
        )}
      >
        <Button variant="ghost" size="icon" onClick={zoomIn} title="Zoom In">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="text-xs text-center font-medium">{Math.round(scale * 100)}%</div>
        <Button variant="ghost" size="icon" onClick={zoomOut} title="Zoom Out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleFullscreen} title="Toggle Fullscreen">
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Canvas */}
      <div ref={canvasRef} className="w-full h-full overflow-hidden">
        <div
          className="relative transition-all duration-300"
          style={{
            width: `${floor.width}px`,
            height: `${floor.height}px`,
            transform: `scale(${scale})`,
            transformOrigin: "0 0",
            backgroundColor: floor.backgroundColor,
            marginLeft: `-${position.x}px`,
            marginTop: `-${position.y}px`,
          }}
        >
          {/* Grid lines */}
          <div className="absolute inset-0">
            {Array.from({ length: Math.ceil(floor.width / 50) }).map((_, i) => (
              <div
                key={`v-${i}`}
                className={cn("absolute top-0 bottom-0 border-r", darkMode ? "border-gray-700" : "border-gray-200")}
                style={{ left: `${i * 50}px` }}
              />
            ))}
            {Array.from({ length: Math.ceil(floor.height / 50) }).map((_, i) => (
              <div
                key={`h-${i}`}
                className={cn("absolute left-0 right-0 border-b", darkMode ? "border-gray-700" : "border-gray-200")}
                style={{ top: `${i * 50}px` }}
              />
            ))}
          </div>

          {/* Elements */}
          {floor.elements.map((element) => (
            <div
              key={element.id}
              className={cn(
                "absolute transition-shadow",
                selectedElementId === element.id ? "z-10" : "shadow",
                lockedElements.has(element.id) ? "cursor-not-allowed" : "cursor-move",
                isDragging && draggedElementId === element.id ? "opacity-80" : "opacity-100",
              )}
              style={{
                left: `${element.x}px`,
                top: `${element.y}px`,
                width: `${element.width}px`,
                height: `${element.height}px`,
                transform: `rotate(${element.rotation}deg)`,
                transformOrigin: "center center",
              }}
              onClick={(e) => handleElementClick(element.id, e)}
              onMouseDown={(e) => handleElementMouseDown(element.id, e)}
              onTouchStart={(e) => handleElementTouchStart(element.id, e)}
            >
              <ElementRenderer
                element={element}
                isLocked={lockedElements.has(element.id)}
                isSelected={selectedElementId === element.id}
                darkMode={darkMode}
              />

              {/* Resize and rotate handles */}
              {selectedElementId === element.id && !lockedElements.has(element.id) && (
                <ResizeHandles
                  onResizeStart={(direction, e) => handleResizeStart(element.id, direction, e)}
                  onRotateStart={(e) => handleRotateStart(element.id, e)}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Selected element controls */}
      {selectedElement && (
        <div
          className={cn(
            "absolute bottom-4 left-4 p-3 rounded-lg shadow-lg flex flex-wrap items-center gap-2 z-10 max-w-full",
            darkMode ? "bg-gray-800" : "bg-white",
          )}
        >
          <Button variant="outline" size="sm" onClick={() => rotateElement(selectedElement.id)}>
            <RotateCw className="h-4 w-4 mr-1" />
            Rotate 90°
          </Button>
          <Button variant="outline" size="sm" onClick={() => duplicateElement(selectedElement.id)}>
            <Copy className="h-4 w-4 mr-1" />
            Duplicate
          </Button>
          <Button variant="outline" size="sm" onClick={() => toggleLockElement(selectedElement.id)}>
            {lockedElements.has(selectedElement.id) ? (
              <>
                <Unlock className="h-4 w-4 mr-1" />
                Unlock
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-1" />
                Lock
              </>
            )}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => deleteElement(selectedElement.id)}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      )}

      {/* Touch instructions */}
      <div
        className={cn(
          "absolute bottom-4 right-4 p-2 rounded-md text-xs hidden sm:block",
          darkMode ? "bg-gray-800/80 text-gray-300" : "bg-white/80 text-muted-foreground",
        )}
      >
        <p>Alt + Drag to pan • Two fingers to pan/zoom on touch devices</p>
      </div>

      {/* Visual indicator when dragging */}
      {isDragging && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black text-white px-3 py-1 rounded-full text-sm z-50">
          Dragging element...
        </div>
      )}

      {/* Visual indicator when resizing */}
      {isResizing && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black text-white px-3 py-1 rounded-full text-sm z-50">
          Resizing element...
        </div>
      )}

      {/* Visual indicator when rotating */}
      {isRotating && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black text-white px-3 py-1 rounded-full text-sm z-50">
          Rotating element... (Hold Shift to snap to 15°)
        </div>
      )}
    </div>
  )
}