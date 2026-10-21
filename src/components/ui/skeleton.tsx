import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  // #propertyofbharat
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

// #propertyofbharat
export { Skeleton };
