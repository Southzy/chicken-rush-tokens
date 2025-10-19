import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TokenDisplay } from "@/components/TokenDisplay";
import { RankBadge } from "@/components/RankBadge";
import { Home, Play, DollarSign, Shield, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface GameState {
  gameId: string;
  betAmount: number;
  mineCount: number;
  revealedTiles: number[];
  currentMultiplier: number;
  potentialPayout: number;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  isActive: boolean;
}

const Mines = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [mineCount, setMineCount] = useState(3);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [revealedMines, setRevealedMines] = useState<number[]>([]);
  const [clientSeed, setClientSeed] = useState("");
  const [verifyData, setVerifyData] = useState<any>(null);

  useEffect(() => {
    generateClientSeed();
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

  const generateClientSeed = () => {
    const seed = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setClientSeed(seed);
  };

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

    if (mineCount < 1 || mineCount > 24) {
      toast.error("Mines must be between 1 and 24!");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('mines-start', {
        body: {
          betAmount,
          mineCount,
          clientSeed
        }
      });

      if (error) throw error;

      setGameState(data.gameState);
      setRevealedMines([]);
      setVerifyData(null);
      fetchProfile();
      toast.success("Game started!");
    } catch (error: any) {
      toast.error(error.message || "Failed to start game");
    }
  };

  const revealTile = async (tileIndex: number) => {
    if (!gameState || !gameState.isActive || gameState.revealedTiles.includes(tileIndex)) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('mines-reveal', {
        body: {
          gameId: gameState.gameId,
          tileIndex
        }
      });

      if (error) throw error;

      if (data.result === 'mine') {
        setRevealedMines(data.minePositions);
        setVerifyData({
          serverSeed: data.serverSeed,
          clientSeed: gameState.clientSeed,
          nonce: gameState.nonce,
          minePositions: data.minePositions
        });
        setGameState(null);
        fetchProfile();
        toast.error("💥 You hit a mine! Game over.");
      } else {
        setGameState(data.gameState);
        toast.success(`Safe! Multiplier: ${data.gameState.currentMultiplier.toFixed(2)}x`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to reveal tile");
    }
  };

  const cashOut = async () => {
    if (!gameState || !gameState.isActive) return;

    try {
      const { data, error } = await supabase.functions.invoke('mines-cashout', {
        body: {
          gameId: gameState.gameId
        }
      });

      if (error) throw error;

      setRevealedMines(data.minePositions);
      setVerifyData({
        serverSeed: data.serverSeed,
        clientSeed: gameState.clientSeed,
        nonce: gameState.nonce,
        minePositions: data.minePositions
      });
      setGameState(null);
      fetchProfile();
      toast.success(`🎉 Cashed out ${data.payout} tokens!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to cash out");
    }
  };

  const getTileContent = (index: number) => {
    if (gameState?.isActive) {
      if (gameState.revealedTiles.includes(index)) {
        return "💎";
      }
      return "?";
    } else {
      if (revealedMines.includes(index)) {
        return "💣";
      } else if (gameState?.revealedTiles.includes(index)) {
        return "💎";
      }
      return "?";
    }
  };

  const getTileStyle = (index: number) => {
    if (gameState?.isActive) {
      if (gameState.revealedTiles.includes(index)) {
        return "bg-primary/20 border-primary cursor-not-allowed";
      }
      return "bg-muted/50 border-border hover:border-primary hover:bg-primary/10 cursor-pointer";
    } else {
      if (revealedMines.includes(index)) {
        return "bg-destructive/20 border-destructive cursor-not-allowed";
      } else if (gameState?.revealedTiles.includes(index)) {
        return "bg-primary/20 border-primary cursor-not-allowed";
      }
      return "bg-muted/30 border-border cursor-not-allowed";
    }
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,204,0.1),transparent_50%)]" />
      
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="flex gap-2">
            <Button
              onClick={() => navigate("/game-selection")}
              variant="outline"
              className="cyber-border"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Games
            </Button>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="cyber-border"
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold neon-text-purple animate-glow-pulse text-center">
            💣 Mines
          </h1>
          <div className="flex flex-col sm:flex-row gap-4 items-center w-full lg:w-auto">
            <TokenDisplay balance={profile.token_balance} />
            <RankBadge rank={profile.rank} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Controls Panel */}
          <Card className="glass-panel cyber-border lg:col-span-1">
            <CardHeader>
              <CardTitle className="neon-text-cyan">Game Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!gameState?.isActive && (
                <>
                  <div>
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
                    <div className="flex gap-2 mt-2">
                      <Button
                        onClick={() => setBetAmount(10)}
                        variant="outline"
                        size="sm"
                      >
                        10
                      </Button>
                      <Button
                        onClick={() => setBetAmount(100)}
                        variant="outline"
                        size="sm"
                      >
                        100
                      </Button>
                      <Button
                        onClick={() => setBetAmount(1000)}
                        variant="outline"
                        size="sm"
                      >
                        1K
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">
                      Number of Mines (1-24)
                    </label>
                    <Input
                      type="number"
                      value={mineCount}
                      onChange={(e) => setMineCount(Number(e.target.value))}
                      min={1}
                      max={24}
                      className="bg-input border-primary/30"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button
                        onClick={() => setMineCount(3)}
                        variant="outline"
                        size="sm"
                      >
                        3
                      </Button>
                      <Button
                        onClick={() => setMineCount(5)}
                        variant="outline"
                        size="sm"
                      >
                        5
                      </Button>
                      <Button
                        onClick={() => setMineCount(10)}
                        variant="outline"
                        size="sm"
                      >
                        10
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">
                      Client Seed (for fairness)
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={clientSeed}
                        onChange={(e) => setClientSeed(e.target.value)}
                        className="bg-input border-primary/30 font-mono text-xs"
                      />
                      <Button
                        onClick={generateClientSeed}
                        variant="outline"
                        size="sm"
                      >
                        🎲
                      </Button>
                    </div>
                  </div>

                  <Button
                    onClick={startGame}
                    className="w-full cyber-border bg-primary/10 hover:bg-primary/20 neon-text-cyan font-bold text-lg py-6"
                    disabled={betAmount > profile.token_balance || betAmount < 10 || mineCount < 1 || mineCount > 24}
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Game ({betAmount} tokens)
                  </Button>
                </>
              )}

              {gameState?.isActive && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Bet:</span>
                      <span className="neon-text-cyan font-bold">{gameState.betAmount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Mines:</span>
                      <span className="text-destructive font-bold">{gameState.mineCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Revealed:</span>
                      <span className="neon-text-purple font-bold">{gameState.revealedTiles.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Multiplier:</span>
                      <span className="neon-text-gold font-bold text-lg">{gameState.currentMultiplier.toFixed(2)}x</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Potential:</span>
                      <span className="neon-text-gold font-bold text-xl">{gameState.potentialPayout}</span>
                    </div>
                  </div>

                  <Button
                    onClick={cashOut}
                    className="w-full cyber-border bg-accent/10 hover:bg-accent/20 neon-text-gold font-bold text-lg py-6"
                    disabled={gameState.revealedTiles.length === 0}
                  >
                    <DollarSign className="w-5 h-5 mr-2" />
                    Cash Out ({gameState.potentialPayout} tokens)
                  </Button>
                </>
              )}

              {verifyData && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full cyber-border"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Verify Fairness
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass-panel cyber-border max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="neon-text-cyan">Provably Fair Verification</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Server Seed:</p>
                        <p className="font-mono text-xs bg-muted/30 p-2 rounded break-all">{verifyData.serverSeed}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Client Seed:</p>
                        <p className="font-mono text-xs bg-muted/30 p-2 rounded break-all">{verifyData.clientSeed}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Nonce:</p>
                        <p className="font-mono text-xs bg-muted/30 p-2 rounded">{verifyData.nonce}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Mine Positions:</p>
                        <p className="font-mono text-xs bg-muted/30 p-2 rounded">{verifyData.minePositions.join(', ')}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-4">
                        You can verify these values independently using HMAC-SHA256 to ensure the game was fair.
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>

          {/* Game Grid */}
          <Card className="glass-panel cyber-border lg:col-span-2">
            <CardHeader>
              <CardTitle className="neon-text-purple">Mine Field (5x5)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2 sm:gap-3 max-w-lg mx-auto">
                {Array.from({ length: 25 }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => revealTile(index)}
                    disabled={!gameState?.isActive || gameState.revealedTiles.includes(index)}
                    className={`aspect-square rounded-lg border-2 text-3xl sm:text-4xl flex items-center justify-center transition-all ${getTileStyle(index)} ${
                      gameState?.isActive && !gameState.revealedTiles.includes(index) ? 'hover:scale-105' : ''
                    }`}
                  >
                    {getTileContent(index)}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How to Play */}
        <Card className="glass-panel cyber-border">
          <CardHeader>
            <CardTitle className="neon-text-cyan">How to Play Mines</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="space-y-2">
              <p>1. Set your bet amount and number of mines (1-24)</p>
              <p>2. Click "Start Game" to begin</p>
              <p>3. Click tiles to reveal them</p>
              <p>4. Each safe tile increases your multiplier</p>
              <p>5. Cash out anytime to collect winnings</p>
            </div>
            <div className="space-y-2">
              <p>💎 Safe tiles increase your payout</p>
              <p>💣 Hit a mine and lose everything</p>
              <p>🎲 More mines = higher multipliers</p>
              <p>🔐 Provably fair with seed verification</p>
              <p className="text-primary font-bold">Risk vs Reward: More mines = bigger potential wins!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Mines;
