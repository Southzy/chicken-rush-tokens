import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankBadge } from "@/components/RankBadge";
import { TokenDisplay } from "@/components/TokenDisplay";
import { Home, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { RANK_DATA } from "@/lib/gameConfig";
import { formatTokenBalance } from "@/lib/utils";

const SHOP_RANKS = RANK_DATA.filter(r => r.key !== 'nova_cadet' && r.key !== 'the_joke');

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

  const handlePurchase = async (rankData: typeof SHOP_RANKS[0]) => {
    if (!profile) return;

    const isShardPurchase = (rankData.shardCost && rankData.shardCost > 0);
    const cost = isShardPurchase ? rankData.shardCost! : (rankData.price || 0);

    if (isShardPurchase) {
      if (profile.rank_shards < cost) {
        toast.error("Not enough rank shards!");
        return;
      }
    } else {
      if (profile.token_balance < cost) {
        toast.error("Not enough tokens!");
        return;
      }
    }

    setPurchasing(rankData.key);

    const updateData: any = { rank: rankData.key };
    if (isShardPurchase) {
      updateData.rank_shards = profile.rank_shards - cost;
    } else {
      updateData.token_balance = profile.token_balance - cost;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", profile.id);

    if (error) {
      toast.error("Failed to purchase rank");
      setPurchasing(null);
      return;
    }

    toast.success(`Rank upgraded to ${rankData.name}!`);
    setPurchasing(null);
    fetchProfile();
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse neon-text-cyan text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background via-background to-muted">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(138,43,226,0.1),transparent_50%)]" />
      
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate("/")} variant="outline" className="cyber-border">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold neon-text-purple">Rank Shop</h1>
              <p className="text-muted-foreground mt-1">Upgrade your rank</p>
            </div>
          </div>
          <TokenDisplay balance={profile.token_balance} />
        </div>

        <Card className="glass-panel cyber-border">
          <CardHeader>
            <CardTitle className="neon-text-cyan">Your Current Rank</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <RankBadge rank={profile.rank} className="text-lg px-6 py-3" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SHOP_RANKS.map((rankData) => {
            const isShardPurchase = rankData.shardCost && rankData.shardCost > 0;
            const cost = isShardPurchase ? rankData.shardCost : (rankData.price || 0);
            const canAfford = isShardPurchase 
              ? profile.rank_shards >= cost
              : profile.token_balance >= cost;

            return (
              <Card key={rankData.key} className={`glass-panel cyber-border bg-gradient-to-br ${rankData.gradient} bg-opacity-10`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    {rankData.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm"><strong>Luck:</strong> x{rankData.luckMult}</p>
                    <p className="text-sm"><strong>Money:</strong> x{rankData.moneyMult}</p>
                  </div>
                  
                  <div className="text-center py-2">
                    <div className="text-2xl font-bold neon-text-gold">
                      {isShardPurchase ? `${cost} Shards` : formatTokenBalance(cost)}
                    </div>
                  </div>

                  <Button
                    className="w-full cyber-border"
                    disabled={!canAfford || purchasing === rankData.key || profile.rank === rankData.key}
                    onClick={() => handlePurchase(rankData)}
                  >
                    {profile.rank === rankData.key ? "Current Rank" : purchasing === rankData.key ? "Purchasing..." : "Purchase"}
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
