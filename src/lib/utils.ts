// #propertyofbharat
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  // #kintanjain
  return twMerge(clsx(inputs));
}
