import { Coins } from "lucide-react";
import { formatTokenBalance } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TokenDisplayProps {
  balance: number;
  className?: string;
}

export const TokenDisplay = ({ balance, className = "" }: TokenDisplayProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 glass-panel px-4 py-2 rounded-lg cursor-help ${className}`}>
            <Coins className="w-5 h-5 text-primary" />
            <span className="font-bold neon-text-cyan text-lg">
              {formatTokenBalance(balance)}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-mono">{balance.toLocaleString()} tokens</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
