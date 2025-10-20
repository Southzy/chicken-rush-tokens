import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TokenDisplay } from "@/components/TokenDisplay";
import { Home, Sparkles, Zap, Star } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { formatTokenBalance } from "@/lib/utils";

import {
  BOX_PRICE_BASIC,
  BOX_PRICE_SPECIAL,
  RUNE_BASE,
  RUNE_SPECIAL,
  rollBasicRune,
  rollSpecialRune,
  findRuneData,
  getRankData,
  type RuneKey,
  type RuneData,
  type UserRank,
} from "@/lib/gameConfig";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const STORAGE_KEY = "runeBox.showResults";

type InventoryRecord = Record<string, number> & {
  user_id?: string;
  rune_joke?: number;
};

type BoxType = "basic" | "special";

const BOX_META: Record<BoxType, { title: string; icon: JSX.Element; price: number; pool: RuneData[]; desc: string }> = {
  basic: {
    title: "Basic Box",
    icon: <Zap className="w-5 h-5" />,
    price: BOX_PRICE_BASIC,
    pool: RUNE_BASE,
    desc: "Drop only base runes (common pool).",
  },
  special: {
    title: "Special Box",
    icon: <Star className="w-5 h-5" />,
    price: BOX_PRICE_SPECIAL,
    pool: RUNE_SPECIAL,
    desc: "Drop only special runes (rare + Joke).",
  },
};

function rollByBox(box: BoxType): RuneKey {
  return box === "special" ? rollSpecialRune() : rollBasicRune();
}

const RuneBox = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [inventory, setInventory] = useState<InventoryRecord | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [opening, setOpening] = useState(false);
  const [revealedRunes, setRevealedRunes] = useState<any[]>([]);
  const [showResults, setShowResults] = useState<boolean>(true);
  const [boxType, setBoxType] = useState<BoxType>("basic");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) setShowResults(saved === "true");
    fetchData();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(showResults));
  }, [showResults]);

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
      setInventory(inventoryData as InventoryRecord);
    } else {
      const { data: newInventory } = await supabase
        .from("user_inventory")
        .insert({ user_id: user.id })
        .select()
        .single();
      if (newInventory) setInventory(newInventory as InventoryRecord);
    }
  };

  const rankKey: UserRank = (
    profile?.rank ?? profile?.current_rank ?? profile?.user_rank ?? 'nova_cadet'
  ) as UserRank;
  const rankData = getRankData(rankKey) ?? getRankData('nova_cadet')!;
  const rankLuckMult = typeof rankData?.luckMult === 'number' ? rankData.luckMult : 1;

  const applyDiminishingReturns = (currentCount: number, cap: number | null): number => {
    if (!cap) return 1;
    if (currentCount >= cap) return 0;
    const ratio = currentCount / cap;
    if (ratio >= 0.9) return Math.random() < 0.5 ? 1 : 0;
    return 1;
  };

  const rollRune = (currentInventory: InventoryRecord): { rune: RuneData; actualGain: number } => {
    const key = rollByBox(boxType);
    const rune = findRuneData(key)!;
    const currentCount = (currentInventory[key] as number) || 0;
    const actualGain = applyDiminishingReturns(currentCount, rune.cap);
    return { rune, actualGain };
  };

  const openBoxes = async () => {
    if (!profile || !inventory) return;

    const pricePerBox = BOX_META[boxType].price;
    const totalPrice = quantity * pricePerBox;

    if (profile.token_balance < totalPrice) {
      toast.error("Not enough tokens!");
      return;
    }

    setOpening(true);

    // ✅ Bulk path (>= 10) — ส่งเฉพาะ body (ไม่มี header custom เพื่อเลี่ยง CORS)
    if (quantity >= 1000) {
      try {
        const { data, error } = await supabase.functions.invoke('bulk-open-runebox', {
          body: { quantity, boxType },
        });
        if (error) throw error;

        if (showResults) {
          setRevealedRunes(
            data.results.map((r: any) => ({
              rune: findRuneData(r.runeKey as RuneKey)!,
              actualGain: r.actualGain,
              wasCapHit: r.wasCapHit,
            }))
          );
        }

        toast.success(`Opened ${quantity} ${BOX_META[boxType].title}${quantity > 1 ? 'es' : ''}!`);
        setOpening(false);
        fetchData();
        return;
      } catch (error: any) {
        toast.error(error.message || "Failed to open boxes");
        setOpening(false);
        return;
      }
    }

    // Client path (< 10)
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ token_balance: profile.token_balance - totalPrice })
      .eq("id", profile.id);

    if (updateError) {
      toast.error("Failed to open boxes");
      setOpening(false);
      return;
    }

    const results: any[] = [];
    const newInventory: InventoryRecord = { ...inventory };
    let totalShards = 0;

    for (let i = 0; i < quantity; i++) {
      const { rune, actualGain } = rollRune(newInventory);
      const grant = Math.max(0, Math.floor(actualGain));

      if (grant > 0) {
        if (rune.key === 'rune_f') {
          totalShards += grant;
        } else {
          newInventory[rune.key] = ((newInventory[rune.key] as number) || 0) + grant;
        }
      }

      const cap = rune.cap ?? Infinity;
      const currentAfter = (newInventory[rune.key] as number) || 0;
      const wasCapHit = cap !== Infinity && currentAfter >= cap;

      results.push({ rune, actualGain: grant, wasCapHit });
    }

    // Update inventory columns for all rune keys
    const inventoryUpdate: Record<string, number> = {};
    [...RUNE_BASE, ...RUNE_SPECIAL].forEach((r) => {
      inventoryUpdate[r.key] = (newInventory[r.key] as number) || 0;
    });

    const { error: invError } = await supabase
      .from("user_inventory")
      .update(inventoryUpdate)
      .eq("user_id", profile.id);

    if (invError) {
      console.error("Failed to update inventory:", invError);
    }

    if (totalShards > 0) {
      const { error: shardError } = await supabase
        .from("profiles")
        .update({ rank_shards: (profile.rank_shards || 0) + totalShards })
        .eq("id", profile.id);
      if (shardError) console.error("Failed to update shards:", shardError);
    }

    setTimeout(() => {
      if (showResults) setRevealedRunes(results);
      setOpening(false);
      fetchData();
      toast.success(`Opened ${quantity} ${BOX_META[boxType].title}${quantity > 1 ? 'es' : ''}!`);
    }, 300);
  };

  const closeReveal = () => setRevealedRunes([]);

  const getCapStatus = (runeKey: string, cap: number | null) => {
    if (!cap || !inventory) return null;
    const current = (inventory[runeKey] as number) || 0;
    const percentage = (current / cap) * 100;

    if (percentage >= 100) return { color: 'text-red-500', text: 'CAPPED' };
    if (percentage >= 90) return { color: 'text-yellow-500', text: `${Math.floor(percentage)}% (Diminished)` };
    return { color: 'text-green-500', text: `${Math.floor(percentage)}%` };
    };

  if (!profile || !inventory) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse neon-text-cyan text-xl">Loading...</div>
      </div>
    );
  }

  const pricePerBox = BOX_META[boxType].price;
  const totalCost = quantity * pricePerBox;

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background via-background to-muted">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(138,43,226,0.1),transparent_50%)]" />

      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
            <Button onClick={() => navigate("/")} variant="outline" className="cyber-border shrink-0">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold neon-text-purple flex items-center gap-2">
                <Zap className="w-8 h-8" />
                Rune Box
              </h1>
              <p className="text-muted-foreground mt-1">Collect powerful runes to enhance your stats!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Rank: <span className="font-semibold">{(getRankData(profile?.rank as UserRank)?.name) ?? "Unknown"}</span> · Luck x{(getRankData(profile?.rank as UserRank)?.luckMult ?? 1).toFixed(2)}
              </p>
            </div>
          </div>
          <TokenDisplay balance={profile.token_balance} />
        </div>

        {/* Box Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.keys(BOX_META) as BoxType[]).map(type => (
            <button
              key={type}
              onClick={() => setBoxType(type)}
              className={`glass-panel border rounded-xl p-4 text-left transition hover:scale-[1.01] ${
                boxType === type ? 'ring-2 ring-purple-500' : ''
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {BOX_META[type].icon}
                {BOX_META[type].title}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{BOX_META[type].desc}</div>
              <div className="text-sm mt-2">
                Price: <span className="neon-text-gold font-bold">{BOX_META[type].price}</span> tokens
              </div>
            </button>
          ))}
        </div>

        {/* Inventory */}
        <Card className="glass-panel cyber-border">
          <CardHeader>
            <CardTitle className="neon-text-cyan">Your Rune Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {[...RUNE_BASE, ...RUNE_SPECIAL].map((rune) => {
                const count = (inventory[rune.key] as number) || 0;
                const capStatus = getCapStatus(rune.key, rune.cap);
                return (
                  <div key={rune.key} className={`glass-panel p-3 rounded-lg border bg-gradient-to-br ${rune.color} bg-opacity-10`}>
                    <div className="text-3xl text-center mb-1">{rune.symbol}</div>
                    <div className="text-xs text-center font-bold">{rune.name}</div>
                    <div className="text-lg text-center neon-text-gold font-bold mt-1">
                      {formatTokenBalance(Math.floor(count), 0)}
                    </div>
                    {capStatus && (
                      <div className={`text-xs text-center mt-1 ${capStatus.color}`}>{capStatus.text}</div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-3 glass-panel rounded-lg">
              <div className="text-sm text-muted-foreground">
                Rank Shards: <span className="neon-text-gold font-bold">{formatTokenBalance(profile.rank_shards ?? 0, 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Opening */}
        <Card className="glass-panel cyber-border">
          <CardHeader>
            <CardTitle className="neon-text-purple flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Open {BOX_META[boxType].title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-6">
              <div className="text-6xl mb-4">{boxType === "special" ? "💎" : "📦"}</div>
              <div className="text-2xl font-bold neon-text-cyan mb-2">{BOX_META[boxType].title}</div>
              <div className="text-lg neon-text-gold">{BOX_META[boxType].price} tokens per box</div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium min-w-[80px]">Quantity:</label>
                <Input
                  type="number"
                  min="1"
                  max="10000"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(10000, parseInt(e.target.value) || 1)))}
                  className="cyber-border max-w-[120px]"
                />
                {quantity >= 10 && (
                  <span className="text-xs text-muted-foreground">Uses bulk server processing</span>
                )}
                <span className="text-sm text-muted-foreground">
                  Total: <span className="neon-text-gold font-bold">{formatTokenBalance(totalCost)} tokens</span>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Switch id="show-results" checked={showResults} onCheckedChange={setShowResults} />
                <Label htmlFor="show-results" className="cursor-pointer">Show results modal</Label>
              </div>

              <Button
                className="w-full cyber-border py-6 text-lg"
                disabled={profile.token_balance < totalCost || opening}
                onClick={openBoxes}
              >
                {opening ? (
                  <>
                    <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                    Opening {quantity} {BOX_META[boxType].title}{quantity > 1 ? 'es' : ''}...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Open {quantity} {BOX_META[boxType].title}{quantity > 1 ? 'es' : ''}
                  </>
                )}
              </Button>
            </div>

            {/* Drop Rates for this box */}
            <div className="mt-6">
              <h3 className="text-sm font-bold mb-3 neon-text-cyan">Drop Rates & Effects — {BOX_META[boxType].title}</h3>
              <div className="space-y-2">
                {BOX_META[boxType].pool.map((rune) => (
                  <div key={rune.key} className="flex justify-between items-center text-xs p-2 glass-panel rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{rune.symbol}</span>
                      <span>{rune.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{rune.effect}</span>
                      <span className="neon-text-purple font-bold">{(rune.dropRate * 100).toFixed(3)}%</span>
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
      {showResults && revealedRunes.length > 0 && (
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
                    ) : result.actualGain === 0 ? (
                      <div className="text-yellow-500 font-bold">Diminished</div>
                    ) : (
                      <div className="neon-text-gold font-bold text-xl">+{result.actualGain}</div>
                    )}
                  </div>
                </div>
              ))}
              <Button className="w-full cyber-border mt-4" onClick={closeReveal}>
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
