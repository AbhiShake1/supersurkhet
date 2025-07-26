import type { GlobalOptions as ConfettiGlobalOptions, Options as ConfettiOptions } from "canvas-confetti";
import confetti from "canvas-confetti";
import React, { createContext, useCallback, useContext, useEffect, useRef } from "react";

type ConfettiApi = {
  fire: (options?: ConfettiOptions) => void;
};

const ConfettiContext = createContext<ConfettiApi | undefined>(undefined);

export const ConfettiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const instanceRef = useRef<confetti.CreateTypes | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const globalOptions: ConfettiGlobalOptions = { resize: true, useWorker: true };

  useEffect(() => {
    if (canvasRef.current) {
      instanceRef.current = confetti.create(canvasRef.current, globalOptions);
    }
    return () => {
      if (instanceRef.current) {
        instanceRef.current.reset();
        instanceRef.current = null;
      }
    };
  }, [globalOptions]);

  const fire = useCallback(
    (opts?: ConfettiOptions) => {
      if (instanceRef.current) {
        instanceRef.current(opts);
      }
    },
    [],
  );

  const api = React.useMemo(() => ({ fire }), [fire]);

  return (
    <ConfettiContext.Provider value={api}>
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      />
      {children}
    </ConfettiContext.Provider>
  );
};

export const useConfetti = () => {
  const context = useContext(ConfettiContext);
  if (context === undefined) {
    throw new Error("useConfetti must be used within a ConfettiProvider");
  }
  return context;
};
