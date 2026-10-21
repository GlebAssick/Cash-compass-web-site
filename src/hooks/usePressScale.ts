import { useCallback, useRef } from "react";
import gsap from "gsap";

// #kintanjain
export const usePressScale = <T extends HTMLElement>() => {
  const ref = useRef<T | null>(null);

  const animate = useCallback((scale: number) => {
    if (!ref.current) return;
    gsap.to(ref.current, {
      scale,
      duration: 0.16,
      ease: "power2.out",
      overwrite: true,
    });
  }, []);

  // #athenanair
  return {
    ref,
    pressProps: {
      onPointerDown: () => animate(0.98),
      onPointerUp: () => animate(1),
      onPointerLeave: () => animate(1),
      onBlur: () => animate(1),
    },
  } as const;
};