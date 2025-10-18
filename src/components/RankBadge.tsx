interface RankBadgeProps {
  rank: string;
  className?: string;
}

const rankConfig = {
  nova_cadet: {
    label: "Nova Cadet 💫",
    gradient: "from-[#99ccff] to-white",
  },
  quantum_ranger: {
    label: "Quantum Ranger 🧬",
    gradient: "from-[#33ccff] to-[#9933ff]",
  },
  cyber_warden: {
    label: "Cyber Warden 🩵",
    gradient: "from-[#00ffcc] to-[#00cc66]",
  },
  celestial_overlord: {
    label: "Celestial Overlord 🌠",
    gradient: "from-[#ffd700] to-[#00ffff]",
  },
  eclipse_titan: {
    label: "Eclipse Titan 🌑",
    gradient: "from-[#1a0033] to-[#9900ff]",
  },
};

export const RankBadge = ({ rank, className = "" }: RankBadgeProps) => {
  const config = rankConfig[rank as keyof typeof rankConfig] || rankConfig.nova_cadet;

  return (
    <div
      className={`inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r ${config.gradient} text-sm font-bold ${className}`}
    >
      {config.label}
    </div>
  );
};
