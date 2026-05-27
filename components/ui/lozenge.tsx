import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const lozengeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-[#DFE1E6] text-[#42526E]",
        success: "bg-[#E3FCEF] text-[#006644]",
        warning: "bg-[#FFFAE6] text-[#974F0C]",
        error: "bg-[#FFEBE6] text-[#BF2600]",
        info: "bg-[#DEEBFF] text-[#0747A6]",
        purple: "bg-[#EAE6FF] text-[#403294]",
        progress: "bg-[#DEEBFF] text-[#0052CC]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Lozenge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof lozengeVariants>) {
  return (
    <span
      className={cn(lozengeVariants({ variant }), className)}
      {...props}
    />
  );
}

/** Map swimlane name → lozenge variant (Jira status colors) */
export function swimlaneLozengeVariant(
  name: string
): VariantProps<typeof lozengeVariants>["variant"] {
  const n = name.toLowerCase();
  if (n.includes("done") || n.includes("complete")) return "success";
  if (n.includes("progress") || n.includes("doing")) return "progress";
  if (n.includes("review") || n.includes("test")) return "warning";
  if (n.includes("block")) return "error";
  if (n.includes("backlog")) return "default";
  if (n.includes("todo") || n.includes("to do")) return "info";
  return "default";
}

export { Lozenge, lozengeVariants };
