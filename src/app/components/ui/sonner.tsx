"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover, #fff)",
          "--normal-text": "var(--popover-foreground, #1a1a2e)",
          "--normal-border": "var(--border, #e5e7eb)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
