import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"

interface HistoryState<T = any> {
  past: T[]
  present: T | null
  future: T[]
}

interface HistoryContextType {
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  push: (state: any) => void
  replace: (state: any) => void
  clear: () => void
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined)

interface HistoryProviderProps {
  children: ReactNode
  limit?: number
}

export function HistoryProvider({ children, limit = 50 }: HistoryProviderProps) {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: null,
    future: [],
  })

  const canUndo = history.past.length > 0
  const canRedo = history.future.length > 0

  const emitStateChange = useCallback((state: any) => {
    const event = new CustomEvent('historychange', { detail: { state } })
    document.dispatchEvent(event)
  }, [])

  const undo = useCallback(() => {
    setHistory((currentHistory) => {
      if (currentHistory.past.length === 0) return currentHistory

      const previous = currentHistory.past[currentHistory.past.length - 1]
      const newPast = currentHistory.past.slice(0, currentHistory.past.length - 1)

      return {
        past: newPast,
        present: previous,
        future: [currentHistory.present, ...currentHistory.future].filter(Boolean) as any[],
      }

      emitStateChange(previous)
    })
  }, [emitStateChange])

  const redo = useCallback(() => {
    setHistory((currentHistory) => {
      if (currentHistory.future.length === 0) return currentHistory

      const next = currentHistory.future[0]
      const newFuture = currentHistory.future.slice(1)

      return {
        past: [...currentHistory.past, currentHistory.present].filter(Boolean) as any[],
        present: next,
        future: newFuture,
      }

      emitStateChange(next)
    })
  }, [emitStateChange])

  const push = useCallback(
    (newPresent: any) => {
      setHistory((currentHistory) => {
        // Don't store the same state twice in a row
        if (JSON.stringify(currentHistory.present) === JSON.stringify(newPresent)) {
          return currentHistory
        }

        return {
          past: [...currentHistory.past, currentHistory.present].filter(Boolean).slice(-limit),
          present: newPresent,
          future: [],
        }
      })
    },
    [limit],
  )

  const replace = useCallback((newPresent: any) => {
    setHistory((currentHistory) => ({
      ...currentHistory,
      present: newPresent,
    }))
  }, [])

  const clear = useCallback(() => {
    setHistory({
      past: [],
      present: null,
      future: [],
    })
  }, [])

  // Add keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        if (e.shiftKey) {
          // Ctrl+Shift+Z or Cmd+Shift+Z for Redo
          if (canRedo) {
            e.preventDefault()
            redo()
          }
        } else {
          // Ctrl+Z or Cmd+Z for Undo
          if (canUndo) {
            e.preventDefault()
            undo()
          }
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        // Ctrl+Y or Cmd+Y for Redo
        if (canRedo) {
          e.preventDefault()
          redo()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [canUndo, canRedo, undo, redo])

  return (
    <HistoryContext.Provider
      value={{
        canUndo,
        canRedo,
        undo,
        redo,
        push,
        replace,
        clear,
      }}
    >
      {children}
    </HistoryContext.Provider>
  )
}

export function useHistory() {
  const context = useContext(HistoryContext)
  if (context === undefined) {
    throw new Error("useHistory must be used within a HistoryProvider")
  }
  return context
}