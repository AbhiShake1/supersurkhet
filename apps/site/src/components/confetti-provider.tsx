import confetti from "canvas-confetti";
import React, {
  createContext,
  useCallback,
  useContext
} from "react";

type ConfettiApi = {
  fire: () => void;
};

const ConfettiContext = createContext<ConfettiApi | undefined>(undefined);

export const ConfettiProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const fire = useCallback(() => {
    const end = Date.now() + 3 * 1000; // 3 seconds
    const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];

    const frame = () => {
      if (Date.now() > end) return;

      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors: colors,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors: colors,
      });

      requestAnimationFrame(frame);
    };

    frame();
    // confettiRef.current?.fire(opts);
  }, []);

  const api = React.useMemo(() => ({ fire }), [fire]);

  return (
    <ConfettiContext.Provider value={api}>{children}</ConfettiContext.Provider>
  );
};

export const useConfetti = () => {
  const context = useContext(ConfettiContext);
  if (context === undefined) {
    throw new Error("useConfetti must be used within a ConfettiProvider");
  }
  return context;
};
