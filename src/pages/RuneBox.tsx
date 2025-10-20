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
import { RUNE_DATA, BOX_PRICE, RuneData } from "@/lib/gameConfig";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const STORAGE_KEY = "runeBox.showResults";

type InventoryRecord = Record<string, number> & {
  user_id?: string;
  rune_joke?: number;
};

const RuneBox = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [inventory, setInventory] = useState<InventoryRecord | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [opening, setOpening] = useState(false);
  const [revealedRunes, setRevealedRunes] = useState<any[]>([]);
  const [showResults, setShowResults] = useState<boolean>(true);

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

  /**
   * Stochastic diminishing returns (จำนวนเต็มเท่านั้น)
   * - ถ้าไม่มี cap → ได้ 1 ชิ้นตามปกติ
   * - ถ้าแตะ cap → ได้ 0
   * - ถ้า ≥ 90% ของ cap → มีโอกาส 50% ได้ 1, ไม่งั้น 0 (ลดความเร็วการสะสม)
   * หมายเหตุ: ป้องกันค่าทศนิยมลง DB
   */
  const applyDiminishingReturns = (
    currentCount: number,
    cap: number | null
  ): number => {
    if (!cap) return 1;
    if (currentCount >= cap) return 0;
    const ratio = currentCount / cap;
    if (ratio >= 0.9) {
      return Math.random() < 0.5 ? 1 : 0;
    }
    return 1;
  };

  /**
   * สุ่มรูนจาก RUNE_DATA (อัตราดรอปถูก normalize แล้วให้รวม = 1)
   * - กัน floating drift: ถ้าลูปไม่เจอ (กรณี roll > cumulative) → คืนตัวสุดท้าย
   */
  const rollRune = (currentInventory: InventoryRecord): { rune: RuneData; actualGain: number } => {
    const roll = Math.random();
    let cumulativeRate = 0;

    for (let idx = 0; idx < RUNE_DATA.length; idx++) {
      const rune = RUNE_DATA[idx];
      cumulativeRate += rune.dropRate;
      if (roll <= cumulativeRate) {
        const currentCount = (currentInventory[rune.key] as number) || 0;
        const actualGain = applyDiminishingReturns(currentCount, rune.cap);
        return { rune, actualGain };
      }
    }
    // fallback: คืนตัวสุดท้าย (หายากสุด) เพื่อคุม deterministic
    const last = RUNE_DATA[RUNE_DATA.length - 1];
    const currentCount = (currentInventory[last.key] as number) || 0;
    const actualGain = applyDiminishingReturns(currentCount, last.cap);
    return { rune: last, actualGain };
  };

  const openBoxes = async () => {
    if (!profile || !inventory) return;

    const totalPrice = quantity * BOX_PRICE;
    if (profile.token_balance < totalPrice) {
      toast.error("Not enough tokens!");
      return;
    }

    setOpening(true);

    // ใช้ bulk function เมื่อจำนวนมาก (ควรทำ token deduct + เขียนผลแบบอะตอมมิกฝั่ง server)
    if (quantity >= 100) {
      try {
        const { data, error } = await supabase.functions.invoke('bulk-open-runebox', {
          body: { quantity },
        });
        if (error) throw error;

        if (showResults) {
          setRevealedRunes(
            data.results.map((r: any) => ({
              rune: RUNE_DATA.find(rd => rd.key === r.runeKey)!,
              actualGain: r.actualGain,
              wasCapHit: r.wasCapHit,
            }))
          );
        }

        toast.success(`Opened ${quantity} boxes!${showResults ? " Check your results." : ""}`);
        setOpening(false);
        fetchData();
        return;
      } catch (error: any) {
        toast.error(error.message || "Failed to open boxes");
        setOpening(false);
        return;
      }
    }

    // ⚠️ โหมด client: มี race condition หาก inventory update fail หลังหัก token
    // แนะนำ: สร้าง edge function 'open-runebox' สำหรับกรณี <100 ให้ฝั่ง server ทำธุรกรรมครบชุด
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ token_balance: profile.token_balance - totalPrice })
      .eq("id", profile.id);

    if (updateError) {
      toast.error("Failed to open boxes");
      setOpening(false);
      return;
    }

    // สุ่มผลแบบ client
    const results: any[] = [];
    const newInventory: InventoryRecord = { ...inventory };
    let totalShards = 0;

    for (let i = 0; i < quantity; i++) {
      const { rune, actualGain } = rollRune(newInventory);

      // เก็บเฉพาะจำนวนเต็มเท่านั้น
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

    // อัปเดต inventory—อ้างอิงเฉพาะคอลัมน์รูนที่มีใน schema
    const inventoryUpdate: Record<string, number> = {};
    RUNE_DATA.forEach((rune) => {
      inventoryUpdate[rune.key] = (newInventory[rune.key] as number) || 0;
    });

    const { error: invError } = await supabase
      .from("user_inventory")
      .update(inventoryUpdate)
      .eq("user_id", profile.id);

    if (invError) {
      console.error("Failed to update inventory:", invError);
      // ไม่ rollback token ที่หักไปแล้ว (เหตุผลด้านเดโม) — ย้ายไปทำฝั่ง server จะแก้ปัญหานี้ได้
    }

    // อัปเดต shards (จำนวนเต็ม)
    if (totalShards > 0) {
      const { error: shardError } = await supabase
        .from("profiles")
        .update({ rank_shards: (profile.rank_shards || 0) + totalShards })
        .eq("id", profile.id);

      if (shardError) {
        console.error("Failed to update shards:", shardError);
      }
    }

    setTimeout(() => {
      if (showResults) setRevealedRunes(results);
      setOpening(false);
      fetchData();
      toast.success(`Opened ${quantity} Rune Box${quantity > 1 ? 'es' : ''}!`);
    }, 400); // เร่ง feedback ให้ไวขึ้นได้
  };

  const closeReveal = () => setRevealedRunes([]);

  const getCapStatus = (runeKey: string, cap: number | null) => {
    if (!cap || !inventory) return null;
    const current = (inventory[runeKey] as number) || 0;
    const percentage = (current / cap) * 100;

    if (percentage >= 100) return { color: 'text-red-500', text: 'CAPPED' };
    if (percentage >= 90) return { color: 'text-yellow-500', text: `${percentage.toFixed(0)}% (Diminished)` };
    return { color: 'text-green-500', text: `${Math.max(0, Math.floor(percentage))}%` };
  };

  if (!profile || !inventory) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse neon-text-cyan text-xl">Loading...</div>
      </div>
    );
  }

  const totalCost = quantity * BOX_PRICE;

  // แสดงเปอร์เซ็นต์แบบอ่านง่ายสำหรับรูนหายากมาก
  const formatRatePct = (rate: number) => {
    const p = rate * 100;
    if (p >= 1) return `${p.toFixed(2)}%`;
    if (p >= 0.1) return `${p.toFixed(2)}%`;
    if (p >= 0.01) return `${p.toFixed(3)}%`;
    return "<0.01%";
  };

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
                  onChange={(e) => setQuantity(Math.max(1, Math.min(10000, parseInt(e.target.value) || 1)))}
                  className="cyber-border max-w-[120px]"
                />
                {quantity >= 100 && (
                  <span className="text-xs text-muted-foreground">Uses bulk server processing</span>
                )}
                <span className="text-sm text-muted-foreground">
                  Total: <span className="neon-text-gold font-bold">{formatTokenBalance(totalCost)} tokens</span>
                </span>
              </div>

              {/* Toggle แสดง/ซ่อนผลลัพธ์ */}
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
                      <span className="neon-text-purple font-bold">{formatRatePct(rune.dropRate)}</span>
                      {rune.cap && <span className="text-xs text-yellow-500">Cap: {rune.cap}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reveal Modal: แสดงเฉพาะเมื่อเปิด toggle */}
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
