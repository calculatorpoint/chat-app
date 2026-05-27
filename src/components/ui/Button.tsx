import { cn } from "@/lib/utils";
import React from "react";
import { motion, HTMLMotionProps } from "motion/react";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50";
    
    const variants = {
      primary: "bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-500/25",
      secondary: "bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700",
      danger: "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20",
      ghost: "text-slate-300 hover:text-white hover:bg-slate-800",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs rounded-lg",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base rounded-2xl",
      icon: "h-10 w-10 shrink-0",
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
        ) : children}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
