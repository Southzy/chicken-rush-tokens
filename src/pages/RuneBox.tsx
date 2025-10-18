import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TokenDisplay } from "@/components/TokenDisplay";
import { Home, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { formatTokenBalance } from "@/lib/utils";

type RuneType = 'rune_a' | 'rune_b' | 'rune_c' | 'rune_d' | 'rune_e' | 'rune_f';

interface RuneData {
  key: string;
  name: string;
  symbol: string;
  effect: string;
  dropRate: number;
  cap: number | null;
  color: string;
}

const RUNE_DATA: RuneData[] = [
  { key: 'rune_a', name: 'Aether Rune', symbol: '✨', effect: '+0.001 Luck', dropRate: 0.30, cap: 500, color: 'from-cyan-500 to-blue-500' },
  { key: 'rune_b', name: 'Blaze Rune', symbol: '🔥', effect: '+0.004 Money Multiplier', dropRate: 0.22, cap: 300, color: 'from-orange-500 to-red-500' },
  { key: 'rune_c', name: 'Chrono Rune', symbol: '⏰', effect: '+0.0005 Luck & +0.001 Money', dropRate: 0.18, cap: 400, color: 'from-purple-500 to-pink-500' },
  { key: 'rune_d', name: 'Dusk Rune', symbol: '🌙', effect: '+0.25% Emoji Luck bonus', dropRate: 0.12, cap: 200, color: 'from-indigo-500 to-purple-500' },
  { key: 'rune_e', name: 'Ember Rune', symbol: '💎', effect: '+0.25% Emoji Money bonus', dropRate: 0.12, cap: 200, color: 'from-yellow-500 to-orange-500' },
  { key: 'rune_f', name: 'Fate Rune', symbol: '⭐', effect: '+1 Rank Shard', dropRate: 0.06, cap: null, color: 'from-gold to-yellow-500' },
];

const BOX_PRICE = 1000;

const RuneBox = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [inventory, setInventory] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [opening, setOpening] = useState(false);
  const [revealedRunes, setRevealedRunes] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileData) setProfile(profileData);

    const { data: inventoryData } = await supabase
      .from("user_inventory")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (inventoryData) {
      setInventory(inventoryData);
    } else {
      // Create inventory if doesn't exist
      const { data: newInventory } = await supabase
        .from("user_inventory")
        .insert({ user_id: user.id })
        .select()
        .single();
      if (newInventory) setInventory(newInventory);
    }
  };

  const applyDiminishingReturns = (currentCount: number, cap: number | null, gains: number): number => {
    if (!cap) return gains;
    
    const nearCapThreshold = cap * 0.9;
    if (currentCount >= cap) return 0;
    if (currentCount >= nearCapThreshold) {
      return gains * 0.5;
    }
    return gains;
  };

  const rollRune = (currentInventory: any): { rune: RuneData; actualGain: number } => {
    const roll = Math.random();
    let cumulativeRate = 0;
    
    for (const rune of RUNE_DATA) {
      cumulativeRate += rune.dropRate;
      if (roll <= cumulativeRate) {
        const currentCount = currentInventory[rune.key] || 0;
        const actualGain = applyDiminishingReturns(currentCount, rune.cap, 1);
        return { rune, actualGain };
      }
    }
    
    return { rune: RUNE_DATA[0], actualGain: 1 };
  };

  const openBoxes = async () => {
    if (!profile || !inventory) return;

    const totalPrice = quantity * BOX_PRICE;
    if (profile.token_balance < totalPrice) {
      toast.error("Not enough tokens!");
      return;
    }

    setOpening(true);

    // Deduct tokens
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ token_balance: profile.token_balance - totalPrice })
      .eq("id", profile.id);

    if (updateError) {
      toast.error("Failed to open boxes");
      setOpening(false);
      return;
    }

    // Roll runes
    const results: any[] = [];
    const newInventory = { ...inventory };
    let totalShards = 0;

    for (let i = 0; i < quantity; i++) {
      const { rune, actualGain } = rollRune(newInventory);
      
      if (rune.key === 'rune_f') {
        totalShards += actualGain;
      } else {
        newInventory[rune.key] = (newInventory[rune.key] || 0) + actualGain;
      }
      
      results.push({ rune, actualGain, wasCapHit: actualGain === 0 });
    }

    // Update inventory
    const inventoryUpdate: any = {};
    RUNE_DATA.forEach(rune => {
      if (rune.key !== 'rune_f') {
        inventoryUpdate[rune.key] = newInventory[rune.key];
      }
    });

    const { error: invError } = await supabase
      .from("user_inventory")
      .update(inventoryUpdate)
      .eq("user_id", profile.id);

    if (invError) {
      console.error("Failed to update inventory:", invError);
    }

    // Update rank shards if any Fate Runes
    if (totalShards > 0) {
      const { error: shardError } = await supabase
        .from("profiles")
        .update({ rank_shards: profile.rank_shards + totalShards })
        .eq("id", profile.id);

      if (shardError) {
        console.error("Failed to update shards:", shardError);
      }
    }

    setTimeout(() => {
      setRevealedRunes(results);
      setOpening(false);
      fetchData();
      toast.success(`Opened ${quantity} Rune Box${quantity > 1 ? 'es' : ''}!`);
    }, 2000);
  };

  const closeReveal = () => {
    setRevealedRunes([]);
  };

  const getCapStatus = (runeKey: string, cap: number | null) => {
    if (!cap || !inventory) return null;
    const current = inventory[runeKey] || 0;
    const percentage = (current / cap) * 100;
    
    if (percentage >= 100) return { color: 'text-red-500', text: 'CAPPED' };
    if (percentage >= 90) return { color: 'text-yellow-500', text: `${percentage.toFixed(0)}% (Diminished)` };
    return { color: 'text-green-500', text: `${percentage.toFixed(0)}%` };
  };

  if (!profile || !inventory) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse neon-text-cyan text-xl">Loading...</div>
      </div>
    );
  }

  const totalCost = quantity * BOX_PRICE;

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background via-background to-muted">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(138,43,226,0.1),transparent_50%)]" />
      
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 relative z-10">
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
                <Zap className="w-8 h-8" />
                Rune Box
              </h1>
              <p className="text-muted-foreground mt-1">Collect powerful runes to enhance your stats!</p>
            </div>
          </div>
          <TokenDisplay balance={profile.token_balance} />
        </div>

        {/* Current Inventory */}
        <Card className="glass-panel cyber-border">
          <CardHeader>
            <CardTitle className="neon-text-cyan">Your Rune Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {RUNE_DATA.map((rune) => {
                const count = inventory[rune.key] || 0;
                const capStatus = getCapStatus(rune.key, rune.cap);
                
                return (
                  <div key={rune.key} className={`glass-panel p-3 rounded-lg border bg-gradient-to-br ${rune.color} bg-opacity-10`}>
                    <div className="text-3xl text-center mb-1">{rune.symbol}</div>
                    <div className="text-xs text-center font-bold">{rune.name}</div>
                    <div className="text-lg text-center neon-text-gold font-bold mt-1">
                      {formatTokenBalance(count, 0)}
                    </div>
                    {capStatus && (
                      <div className={`text-xs text-center mt-1 ${capStatus.color}`}>
                        {capStatus.text}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-3 glass-panel rounded-lg">
              <div className="text-sm text-muted-foreground">Rank Shards: <span className="neon-text-gold font-bold">{profile.rank_shards}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Opening Interface */}
        <Card className="glass-panel cyber-border">
          <CardHeader>
            <CardTitle className="neon-text-purple flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Open Rune Boxes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📦</div>
              <div className="text-2xl font-bold neon-text-cyan mb-2">Rune Box</div>
              <div className="text-lg neon-text-gold">{BOX_PRICE} tokens per box</div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium min-w-[80px]">Quantity:</label>
                <Input
                  type="number"
                  min="1"
                  max="10000"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  className="cyber-border max-w-[120px]"
                />
                <span className="text-sm text-muted-foreground">Total: <span className="neon-text-gold font-bold">{formatTokenBalance(totalCost)} tokens</span></span>
              </div>

              <Button
                className="w-full cyber-border py-6 text-lg"
                disabled={profile.token_balance < totalCost || opening}
                onClick={openBoxes}
              >
                {opening ? (
                  <>
                    <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                    Opening {quantity} Box{quantity > 1 ? 'es' : ''}...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Open {quantity} Box{quantity > 1 ? 'es' : ''}
                  </>
                )}
              </Button>
            </div>

            {/* Drop Rates */}
            <div className="mt-6">
              <h3 className="text-sm font-bold mb-3 neon-text-cyan">Drop Rates & Effects</h3>
              <div className="space-y-2">
                {RUNE_DATA.map((rune) => (
                  <div key={rune.key} className="flex justify-between items-center text-xs p-2 glass-panel rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{rune.symbol}</span>
                      <span>{rune.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{rune.effect}</span>
                      <span className="neon-text-purple font-bold">{(rune.dropRate * 100).toFixed(0)}%</span>
                      {rune.cap && <span className="text-xs text-yellow-500">Cap: {rune.cap}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reveal Modal */}
      {revealedRunes.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card className="glass-panel cyber-border max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-center neon-text-purple text-2xl">
                Runes Obtained!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {revealedRunes.map((result, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-center justify-between p-4 glass-panel rounded-lg border bg-gradient-to-r ${result.rune.color} bg-opacity-20`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{result.rune.symbol}</div>
                    <div>
                      <div className="font-bold">{result.rune.name}</div>
                      <div className="text-sm text-muted-foreground">{result.rune.effect}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {result.wasCapHit ? (
                      <div className="text-red-500 font-bold">CAP REACHED</div>
                    ) : result.actualGain < 1 ? (
                      <div className="text-yellow-500 font-bold">+{result.actualGain.toFixed(2)} (Diminished)</div>
                    ) : (
                      <div className="neon-text-gold font-bold text-xl">+{result.actualGain}</div>
                    )}
                  </div>
                </div>
              ))}
              <Button 
                className="w-full cyber-border mt-4"
                onClick={closeReveal}
              >
                Awesome!
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RuneBox;
