import type React from "react"

interface ResizeHandlesProps {
  onResizeStart: (direction: string, e: React.MouseEvent | React.TouchEvent) => void
  onRotateStart: (e: React.MouseEvent | React.TouchEvent) => void
}

export function ResizeHandles({ onResizeStart, onRotateStart }: ResizeHandlesProps) {
  // Prevent clicks on handles from propagating to the element
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, direction: string) => {
    e.stopPropagation()
    onResizeStart(direction, e)
  }

  const handleRotateMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    onRotateStart(e)
  }

  return (
    <>
      {/* Resize handles */}
      <div
        className="absolute top-0 left-0 w-3 h-3 bg-white border border-primary rounded-full cursor-nwse-resize z-20 -translate-x-1/2 -translate-y-1/2 shadow-sm"
        onMouseDown={(e) => handleMouseDown(e, "nw")}
        onTouchStart={(e) => handleMouseDown(e, "nw")}
      />
      <div
        className="absolute top-0 right-0 w-3 h-3 bg-white border border-primary rounded-full cursor-nesw-resize z-20 translate-x-1/2 -translate-y-1/2 shadow-sm"
        onMouseDown={(e) => handleMouseDown(e, "ne")}
        onTouchStart={(e) => handleMouseDown(e, "ne")}
      />
      <div
        className="absolute bottom-0 left-0 w-3 h-3 bg-white border border-primary rounded-full cursor-nesw-resize z-20 -translate-x-1/2 translate-y-1/2 shadow-sm"
        onMouseDown={(e) => handleMouseDown(e, "sw")}
        onTouchStart={(e) => handleMouseDown(e, "sw")}
      />
      <div
        className="absolute bottom-0 right-0 w-3 h-3 bg-white border border-primary rounded-full cursor-nwse-resize z-20 translate-x-1/2 translate-y-1/2 shadow-sm"
        onMouseDown={(e) => handleMouseDown(e, "se")}
        onTouchStart={(e) => handleMouseDown(e, "se")}
      />
      <div
        className="absolute top-0 left-1/2 w-3 h-3 bg-white border border-primary rounded-full cursor-ns-resize z-20 -translate-x-1/2 -translate-y-1/2 shadow-sm"
        onMouseDown={(e) => handleMouseDown(e, "n")}
        onTouchStart={(e) => handleMouseDown(e, "n")}
      />
      <div
        className="absolute bottom-0 left-1/2 w-3 h-3 bg-white border border-primary rounded-full cursor-ns-resize z-20 -translate-x-1/2 translate-y-1/2 shadow-sm"
        onMouseDown={(e) => handleMouseDown(e, "s")}
        onTouchStart={(e) => handleMouseDown(e, "s")}
      />
      <div
        className="absolute left-0 top-1/2 w-3 h-3 bg-white border border-primary rounded-full cursor-ew-resize z-20 -translate-x-1/2 -translate-y-1/2 shadow-sm"
        onMouseDown={(e) => handleMouseDown(e, "w")}
        onTouchStart={(e) => handleMouseDown(e, "w")}
      />
      <div
        className="absolute right-0 top-1/2 w-3 h-3 bg-white border border-primary rounded-full cursor-ew-resize z-20 translate-x-1/2 -translate-y-1/2 shadow-sm"
        onMouseDown={(e) => handleMouseDown(e, "e")}
        onTouchStart={(e) => handleMouseDown(e, "e")}
      />

      {/* Rotation handle */}
      <div
        className="absolute top-0 left-1/2 w-4 h-4 bg-primary rounded-full cursor-grab z-20 -translate-x-1/2 -translate-y-8 shadow-sm flex items-center justify-center"
        onMouseDown={handleRotateMouseDown}
        onTouchStart={handleRotateMouseDown}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M4 12C4 9.87827 4.84285 7.84344 6.34315 6.34315C7.84344 4.84285 9.87827 4 12 4C14.1217 4 16.1566 4.84285 17.6569 6.34315C19.1571 7.84344 20 9.87827 20 12"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20 12L16 16M20 12L16 8"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Rotation guide line */}
      <div className="absolute top-0 left-1/2 w-0.5 h-8 bg-primary -translate-x-1/2 pointer-events-none" />
    </>
  )
}