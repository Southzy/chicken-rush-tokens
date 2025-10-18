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
  starlight_scout: {
    label: "Starlight Scout 🌟",
    gradient: "from-[#e0e7ff] to-[#c7d2fe]",
  },
  nebula_ranger: {
    label: "Nebula Ranger 🌌",
    gradient: "from-[#a78bfa] to-[#7c3aed]",
  },
  quasar_sentinel: {
    label: "Quasar Sentinel 💫",
    gradient: "from-[#fbbf24] to-[#f59e0b]",
  },
  pulsar_warden: {
    label: "Pulsar Warden ✨",
    gradient: "from-[#06b6d4] to-[#0891b2]",
  },
  eventide_herald: {
    label: "Eventide Herald 🌠",
    gradient: "from-[#ec4899] to-[#be185d]",
  },
  cosmic_arbiter: {
    label: "Cosmic Arbiter 🌌",
    gradient: "from-[#8b5cf6] to-[#6366f1]",
  },
  the_joke: {
    label: "The Joke 🃏",
    gradient: "from-[#ec4899] via-[#a855f7] via-[#06b6d4] to-[#eab308]",
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
