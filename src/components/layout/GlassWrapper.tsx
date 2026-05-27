import React from "react";
import { cn } from "@/lib/utils";

interface GlassWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
  intensity?: "light" | "medium" | "heavy";
}

export function GlassWrapper({ children, className, intensity = "medium", ...props }: GlassWrapperProps) {
  const intensityMap = {
    light: "bg-slate-900/40 backdrop-blur-sm",
    medium: "bg-slate-900/60 backdrop-blur-md",
    heavy: "bg-slate-900/80 backdrop-blur-xl",
  };

  return (
    <div 
      className={cn(
        "border border-slate-800/50 shadow-xl", 
        intensityMap[intensity], 
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
