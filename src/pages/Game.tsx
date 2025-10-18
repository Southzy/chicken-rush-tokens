import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TokenDisplay } from "@/components/TokenDisplay";
import { RankBadge } from "@/components/RankBadge";
import { User, Play, DollarSign, Home } from "lucide-react";
import { toast } from "sonner";

const MULTIPLIERS = [1.12, 1.17, 1.23, 1.31, 1.42, 1.56, 1.74, 2.0, 2.35, 2.88];

const Game = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLane, setCurrentLane] = useState(0);
  const [gameResult, setGameResult] = useState<"win" | "lose" | null>(null);

  useEffect(() => {
    fetchProfile();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        fetchProfile();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

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

  const startGame = async () => {
    if (!profile || betAmount > profile.token_balance) {
      toast.error("Insufficient tokens!");
      return;
    }

    setIsPlaying(true);
    setCurrentLane(0);
    setGameResult(null);

    // Deduct bet amount
    const { error } = await supabase
      .from("profiles")
      .update({ token_balance: profile.token_balance - betAmount })
      .eq("id", profile.id);

    if (error) {
      toast.error("Failed to place bet");
      setIsPlaying(false);
      return;
    }

    fetchProfile();
  };

  const advanceLane = () => {
    if (currentLane >= MULTIPLIERS.length - 1) {
      cashOut();
      return;
    }

    // 30% chance to hit a trap
    const hitTrap = Math.random() < 0.3;

    if (hitTrap) {
      setGameResult("lose");
      setIsPlaying(false);
      saveGameHistory(0, MULTIPLIERS[currentLane]);
      toast.error("💥 You hit a trap! Lost your bet.");
    } else {
      setCurrentLane(currentLane + 1);
    }
  };

  const cashOut = async () => {
    const multiplier = MULTIPLIERS[currentLane];
    const winnings = Math.floor(betAmount * multiplier);

    const { error } = await supabase
      .from("profiles")
      .update({ token_balance: profile.token_balance + winnings })
      .eq("id", profile.id);

    if (!error) {
      setGameResult("win");
      toast.success(`🎉 Cashed out! Won ${winnings} tokens!`);
      saveGameHistory(winnings - betAmount, multiplier);
      fetchProfile();
    }

    setIsPlaying(false);
  };

  const saveGameHistory = async (profit: number, multiplier: number) => {
    await supabase.from("game_history").insert({
      user_id: profile.id,
      bet_amount: betAmount,
      multiplier,
      profit,
    });
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse neon-text-cyan text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-background via-background to-muted">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,204,0.1),transparent_50%)]" />
      
      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="cyber-border"
          >
            <Home className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <h1 className="text-4xl font-bold neon-text-cyan animate-glow-pulse">
            🐔 Chicken Road
          </h1>
          <div className="flex gap-4 items-center">
            <TokenDisplay balance={profile.token_balance} />
            <RankBadge rank={profile.rank} />
            <Button
              onClick={() => navigate("/profile")}
              variant="outline"
              className="cyber-border"
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </Button>
          </div>
        </div>

        {/* Game Area */}
        <Card className="glass-panel cyber-border">
          <CardHeader>
            <CardTitle className="text-2xl neon-text-purple">Race Track</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Multiplier Track */}
            <div className="flex gap-2 overflow-x-auto pb-4">
              {MULTIPLIERS.map((mult, index) => (
                <div
                  key={index}
                  className={`flex-shrink-0 w-20 h-24 glass-panel rounded-lg flex flex-col items-center justify-center transition-all ${
                    index === currentLane && isPlaying
                      ? "cyber-border scale-110"
                      : index < currentLane && isPlaying
                      ? "bg-primary/20"
                      : ""
                  }`}
                >
                  <div className="text-sm text-muted-foreground">Lane {index + 1}</div>
                  <div className={`text-xl font-bold ${index === currentLane && isPlaying ? "neon-text-gold" : "neon-text-cyan"}`}>
                    {mult.toFixed(2)}x
                  </div>
                  {index === currentLane && isPlaying && (
                    <div className="text-2xl animate-bounce">🐔</div>
                  )}
                </div>
              ))}
            </div>

            {/* Controls */}
            {!isPlaying ? (
              <div className="space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="text-sm text-muted-foreground block mb-2">
                      Bet Amount
                    </label>
                    <Input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(Number(e.target.value))}
                      min={10}
                      max={profile.token_balance}
                      className="bg-input border-primary/30"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setBetAmount(10)}
                      variant="outline"
                      size="sm"
                    >
                      10
                    </Button>
                    <Button
                      onClick={() => setBetAmount(50)}
                      variant="outline"
                      size="sm"
                    >
                      50
                    </Button>
                    <Button
                      onClick={() => setBetAmount(100)}
                      variant="outline"
                      size="sm"
                    >
                      100
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={startGame}
                  className="w-full cyber-border bg-primary/10 hover:bg-primary/20 neon-text-cyan font-bold text-lg py-6"
                  disabled={betAmount > profile.token_balance || betAmount < 10}
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Race ({betAmount} tokens)
                </Button>
              </div>
            ) : (
              <div className="flex gap-4">
                <Button
                  onClick={advanceLane}
                  className="flex-1 cyber-border bg-secondary/10 hover:bg-secondary/20 neon-text-purple font-bold text-lg py-6"
                >
                  Continue Running
                </Button>
                <Button
                  onClick={cashOut}
                  className="flex-1 cyber-border bg-accent/10 hover:bg-accent/20 neon-text-gold font-bold text-lg py-6"
                >
                  <DollarSign className="w-5 h-5 mr-2" />
                  Cash Out ({Math.floor(betAmount * MULTIPLIERS[currentLane])} tokens)
                </Button>
              </div>
            )}

            {/* Game Result */}
            {gameResult && (
              <div
                className={`text-center p-6 rounded-lg glass-panel ${
                  gameResult === "win" ? "cyber-border" : "border-2 border-destructive"
                }`}
              >
                <div className={`text-3xl font-bold ${gameResult === "win" ? "neon-text-gold" : "text-destructive"}`}>
                  {gameResult === "win" ? "🎉 Victory!" : "💥 Game Over!"}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* How to Play */}
        <Card className="glass-panel cyber-border">
          <CardHeader>
            <CardTitle className="neon-text-cyan">How to Play</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Place your bet (minimum 10 tokens)</p>
            <p>2. The chicken starts running across lanes</p>
            <p>3. Each lane increases your multiplier</p>
            <p>4. Cash out anytime to secure your winnings</p>
            <p>5. Hit a trap (🔥 or 🕳️) and lose everything!</p>
            <p className="text-primary font-bold mt-4">Risk vs Reward: Higher lanes = bigger multipliers but more traps!</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Game;
