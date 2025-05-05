import type React from "react"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

interface DragOverlayProps {
  isDragging: boolean
  children?: React.ReactNode
}

export function DragOverlay({ isDragging, children }: DragOverlayProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted || !isDragging) return null

  // Create a portal to render the overlay at the document body level
  return createPortal(
    <div
      className="fixed inset-0 bg-black/5 pointer-events-none z-50 flex items-center justify-center"
      style={{ cursor: "grabbing" }}
    >
      <div className="bg-white/80 px-3 py-1 rounded-full text-sm font-medium shadow-lg">Dragging element...</div>
      {children}
    </div>,
    document.body,
  )
}