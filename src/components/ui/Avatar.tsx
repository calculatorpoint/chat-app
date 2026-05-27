import React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  src?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
}

export function Avatar({ className, src, fallback, size = "md", online, ...props }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false);
  const sizeMap = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  // Reset img error if src changes
  React.useEffect(() => {
    setImgError(false);
  }, [src]);

  return (
    <div className={cn("relative inline-block", className)} {...props}>
      <div 
        className={cn(
          "rounded-full border border-slate-700 bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center translate-z-0",
          sizeMap[size]
        )}
      >
        {src && !imgError ? (
          <img 
             src={src} 
             alt="Avatar" 
             className="w-full h-full object-cover" 
             onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-slate-400 font-bold uppercase overflow-hidden">
            {fallback?.charAt(0) || "U"}
          </span>
        )}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full shadow-emerald-500/50 shadow-sm" />
      )}
    </div>
  );
}
