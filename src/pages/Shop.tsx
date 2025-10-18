import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankBadge } from "@/components/RankBadge";
import { TokenDisplay } from "@/components/TokenDisplay";
import { Home, Sparkles } from "lucide-react";
import { toast } from "sonner";

type UserRank = Database["public"]["Enums"]["user_rank"];

const RANK_DATA: Array<{
  rank: UserRank;
  name: string;
  price: number;
  color: string;
  effect: string;
  bonus: string;
}> = [
  {
    rank: "quantum_ranger" as UserRank,
    name: "Quantum Ranger 🧬",
    price: 2000,
    color: "from-[#33ccff] to-[#9933ff]",
    effect: "Pulse glow",
    bonus: "+3% chance to avoid traps",
  },
  {
    rank: "cyber_warden" as UserRank,
    name: "Cyber Warden 🩵",
    price: 5000,
    color: "from-[#00ffcc] to-[#00cc66]",
    effect: "Glitch text",
    bonus: "+5% winnings",
  },
  {
    rank: "celestial_overlord" as UserRank,
    name: "Celestial Overlord 🌠",
    price: 10000,
    color: "from-[#ffd700] to-[#00ffff]",
    effect: "Orbit sparkle",
    bonus: "+10% winnings",
  },
  {
    rank: "eclipse_titan" as UserRank,
    name: "Eclipse Titan 🌑",
    price: 20000,
    color: "from-[#1a0033] to-[#9900ff]",
    effect: "Shadow aura",
    bonus: "+15% winnings",
  },
];

const Shop = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) setProfile(data);
  };

  const handlePurchase = async (rankData: typeof RANK_DATA[0]) => {
    if (!profile) return;

    if (profile.token_balance < rankData.price) {
      toast.error("Not enough tokens!");
      return;
    }

    setPurchasing(rankData.rank);

    const { error } = await supabase
      .from("profiles")
      .update({
        rank: rankData.rank,
        token_balance: profile.token_balance - rankData.price,
      })
      .eq("id", profile.id);

    if (error) {
      toast.error("Failed to purchase rank");
      console.error(error);
    } else {
      toast.success(`Successfully upgraded to ${rankData.name}!`);
      fetchProfile();
    }

    setPurchasing(null);
  };

  const getRankIndex = (rank: string) => {
    const ranks = ["nova_cadet", "quantum_ranger", "cyber_warden", "celestial_overlord", "eclipse_titan"];
    return ranks.indexOf(rank);
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse neon-text-cyan text-xl">Loading...</div>
      </div>
    );
  }

  const currentRankIndex = getRankIndex(profile.rank);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background via-background to-muted">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(138,43,226,0.1),transparent_50%)]" />
      
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="cyber-border shrink-0"
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold neon-text-purple flex items-center gap-2">
                <Sparkles className="w-8 h-8" />
                Rank Shop
              </h1>
              <p className="text-muted-foreground mt-1">Upgrade your rank and unlock powerful bonuses</p>
            </div>
          </div>
          <TokenDisplay balance={profile.token_balance} />
        </div>

        {/* Current Rank */}
        <Card className="glass-panel cyber-border">
          <CardHeader>
            <CardTitle className="neon-text-cyan">Your Current Rank</CardTitle>
          </CardHeader>
          <CardContent>
            <RankBadge rank={profile.rank} />
          </CardContent>
        </Card>

        {/* Available Ranks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {RANK_DATA.map((rankData, index) => {
            const isOwned = getRankIndex(rankData.rank) <= currentRankIndex;
            const canPurchase = profile.token_balance >= rankData.price && !isOwned;

            return (
              <Card 
                key={rankData.rank} 
                className={`glass-panel cyber-border relative overflow-hidden ${
                  isOwned ? 'opacity-60' : ''
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${rankData.color} opacity-10`} />
                
                <CardHeader>
                  <CardTitle className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <span className="text-xl sm:text-2xl">{rankData.name}</span>
                    {isOwned && <span className="text-xs sm:text-sm neon-text-cyan">OWNED</span>}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="relative z-10 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <span className="text-sm text-muted-foreground">Price:</span>
                      <span className="neon-text-gold font-bold text-base sm:text-lg">
                        {rankData.price.toLocaleString()} tokens
                      </span>
                    </div>
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <span className="text-sm text-muted-foreground">Effect:</span>
                      <span className="text-sm">{rankData.effect}</span>
                    </div>
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <span className="text-sm text-muted-foreground">Bonus:</span>
                      <span className="neon-text-purple font-bold text-sm">{rankData.bonus}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full cyber-border"
                    disabled={!canPurchase || purchasing === rankData.rank}
                    onClick={() => handlePurchase(rankData)}
                  >
                    {purchasing === rankData.rank ? (
                      "Processing..."
                    ) : isOwned ? (
                      "Already Owned"
                    ) : !canPurchase && !isOwned ? (
                      "Not Enough Tokens"
                    ) : (
                      "Purchase Now"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Shop;
