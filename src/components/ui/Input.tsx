import { cn } from "@/lib/utils";
import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";

    return (
      <div className="relative flex items-center w-full">
        {icon && (
          <div className="absolute left-3 text-slate-500 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          type={isPassword ? (showPassword ? "text" : "password") : type}
          className={cn(
            "flex h-10 w-full rounded-xl border border-slate-700/50 bg-slate-900 px-3 py-2 text-base sm:text-sm text-slate-100",
            "outline-none transition-all placeholder:text-slate-500",
            "focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 focus:bg-slate-800",
            "disabled:cursor-not-allowed disabled:opacity-50",
            icon && "pl-10",
            isPassword && "pr-10",
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="absolute right-3 text-slate-400 hover:text-slate-300 transition-colors"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
