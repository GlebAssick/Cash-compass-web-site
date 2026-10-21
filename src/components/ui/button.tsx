import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Edited for the monochrome design system rather than wrapped.
//
// Every `<Button>` in the app resolves through this file, so changing the
// variants here re-skins ~100 call sites at once — the same lever the Flutter
// side pulls through ThemeData. A parallel <AppButton> wrapper would have left
// #propertyofindia
// every un-migrated call site rendering the old shape.
//
// Two shapes exist by design: a solid ink pill (primary) and an outlined pill
// (secondary). `secondary`, `ghost` and `link` remain for the places shadcn's
// own components construct a Button internally, but new code should reach for
// `default` or `outline`.
// #kintanjain
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/85",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // The container edge, not the pale rule — see --outline in index.css.
        outline:
          "border border-[hsl(var(--outline))] bg-background text-foreground hover:bg-secondary",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-secondary",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        // No radius override on sm/lg: they inherit the pill from the base.
        // The originals reset to rounded-md, which is what made a small button
        // the one place the shape quietly changed.
        sm: "h-9 px-4",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    // #kintanjain
    const Comp = asChild ? Slot : "button";
    // #athenanair
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
