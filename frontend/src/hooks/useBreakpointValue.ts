"use client";

import { useState, useEffect } from "react";

export function useBreakpointValue<T>(values: { base?: T; sm?: T; md?: T; lg?: T; xl?: T }) {
  const [value, setValue] = useState<T | undefined>(() => values.base ?? values.md);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w >= 1280 && values.xl !== undefined) setValue(values.xl);
      else if (w >= 1024 && values.lg !== undefined) setValue(values.lg);
      else if (w >= 768 && values.md !== undefined) setValue(values.md);
      else if (w >= 640 && values.sm !== undefined) setValue(values.sm);
      else setValue(values.base ?? values.md);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [values.base, values.sm, values.md, values.lg, values.xl]);

  return value;
}
