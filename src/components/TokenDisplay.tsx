import { Coins } from "lucide-react";

interface TokenDisplayProps {
  balance: number;
  className?: string;
}

export const TokenDisplay = ({ balance, className = "" }: TokenDisplayProps) => {
  return (
    <div className={`flex items-center gap-2 glass-panel px-4 py-2 rounded-lg ${className}`}>
      <Coins className="w-5 h-5 text-primary" />
      <span className="font-bold neon-text-cyan text-lg">
        {balance.toLocaleString()}
      </span>
    </div>
  );
};
