import { GripVertical } from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { cn } from "@/lib/utils";

const ResizablePanelGroup = ({ className, ...props }: React.ComponentProps<typeof Group>) => (
  <Group
    className={cn("flex h-full w-full data-[panel-group-direction=vertical]:flex-col", className)}
    {...props}
  />
);

const ResizablePanel = Panel;

const ResizableHandle = ({
  withHandle = true,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean;
}) => (
  <Separator
    className={cn(
      "relative flex w-1.5 items-center justify-center bg-[#171717] hover:bg-[#10B981]/50 active:bg-[#10B981] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#10B981] data-[panel-group-direction=vertical]:h-1.5 data-[panel-group-direction=vertical]:w-full cursor-col-resize data-[panel-group-direction=vertical]:cursor-row-resize select-none z-10",
      className,
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-20 flex h-7 w-3.5 items-center justify-center rounded-sm border border-[#262626] bg-[#0A0A0A] text-[#64748B] hover:text-[#10B981] transition-colors shadow-md">
        <GripVertical className="h-3.5 w-3.5" />
      </div>
    )}
  </Separator>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
