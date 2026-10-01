import React from "react";
import './LiquidGlassButton.scss'

export interface LiquidGlassButtonProps {
  icon?: React.ReactNode;
  text?: string;
  action?: () => void;
  className?: string;
  children?: React.JSX.Element
}

export default function LiquidGlassButton({
  icon,
  text,
  action,
  className = "",
  children
}: LiquidGlassButtonProps) {
  return (
    <button className={`liquid-glass-button ${className}`} onClick={action}>
      {icon && icon}
      {text && text}
      {children && children}
    </button>
  );
}