import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TokenDisplay } from "@/components/TokenDisplay";
import { Home, ArrowRightLeft, Crown } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { formatTokenBalance } from "@/lib/utils";
import { EXCHANGE_RATES } from "@/lib/gameConfig";

const Exchange = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [inventory, setInventory] = useState<any>(null);
  const [tokenAmount, setTokenAmount] = useState(1);
  const [shardAmount, setShardAmount] = useState(1);
  const [processing, setProcessing] = useState(false);

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
    }
  };

  const exchangeForTokens = async () => {
    if (!profile || !inventory) return;

    const jokeRunes = inventory.rune_joke || 0;
    if (jokeRunes < tokenAmount) {
      toast.error("Not enough Joke Runes!");
      return;
    }

    setProcessing(true);

    const tokensToGain = tokenAmount * EXCHANGE_RATES.jokeRuneToTokens;
    const currentBalance = typeof profile.token_balance === 'string' ? parseInt(profile.token_balance) : profile.token_balance;
    const newTokenBalance = currentBalance + tokensToGain;
    const newJokeRunes = jokeRunes - tokenAmount;

    // Update profile tokens
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ token_balance: newTokenBalance.toString() })
      .eq("id", profile.id);

    if (profileError) {
      toast.error("Failed to exchange");
      setProcessing(false);
      return;
    }

    // Update inventory
    const { error: invError } = await supabase
      .from("user_inventory")
      .update({ rune_joke: newJokeRunes.toString() })
      .eq("user_id", profile.id);

    if (invError) {
      toast.error("Failed to update inventory");
      setProcessing(false);
      return;
    }

    toast.success(`Exchanged ${tokenAmount} Joke Rune${tokenAmount > 1 ? 's' : ''} for ${formatTokenBalance(tokensToGain)} tokens!`);
    setProcessing(false);
    fetchData();
  };

  const exchangeForShards = async () => {
    if (!profile || !inventory) return;

    const jokeRunes = inventory.rune_joke || 0;
    if (jokeRunes < shardAmount) {
      toast.error("Not enough Joke Runes!");
      return;
    }

    setProcessing(true);

    const shardsToGain = shardAmount * EXCHANGE_RATES.jokeRuneToShards;
    const currentShards = typeof profile.rank_shards === 'string' ? parseInt(profile.rank_shards) : profile.rank_shards;
    const newShards = currentShards + shardsToGain;
    const newJokeRunes = jokeRunes - shardAmount;

    // Update profile shards
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ rank_shards: newShards })
      .eq("id", profile.id);

    if (profileError) {
      toast.error("Failed to exchange");
      setProcessing(false);
      return;
    }

    // Update inventory
    const { error: invError } = await supabase
      .from("user_inventory")
      .update({ rune_joke: newJokeRunes.toString() })
      .eq("user_id", profile.id);

    if (invError) {
      toast.error("Failed to update inventory");
      setProcessing(false);
      return;
    }

    toast.success(`Exchanged ${shardAmount} Joke Rune${shardAmount > 1 ? 's' : ''} for ${shardsToGain} shards!`);
    setProcessing(false);
    fetchData();
  };

  const redeemTheJokeRank = async () => {
    if (!profile || !inventory) return;

    const jokeRunes = inventory.rune_joke || 0;
    if (jokeRunes < EXCHANGE_RATES.jokeRuneForTheJokeRank) {
      toast.error(`Need ${EXCHANGE_RATES.jokeRuneForTheJokeRank} Joke Runes to unlock The Joke rank!`);
      return;
    }

    if (profile.rank === 'the_joke') {
      toast.error("You already have The Joke rank!");
      return;
    }

    setProcessing(true);

    const newJokeRunes = jokeRunes - EXCHANGE_RATES.jokeRuneForTheJokeRank;

    // Update rank
    const { error: rankError } = await supabase
      .from("profiles")
      .update({ rank: 'the_joke' })
      .eq("id", profile.id);

    if (rankError) {
      toast.error("Failed to unlock rank");
      setProcessing(false);
      return;
    }

    // Update inventory
    const { error: invError } = await supabase
      .from("user_inventory")
      .update({ rune_joke: newJokeRunes.toString() })
      .eq("user_id", profile.id);

    if (invError) {
      toast.error("Failed to update inventory");
      setProcessing(false);
      return;
    }

    toast.success("🃏 You've unlocked The Joke rank! 🃏");
    setProcessing(false);
    fetchData();
  };

  if (!profile || !inventory) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse neon-text-cyan text-xl">Loading...</div>
      </div>
    );
  }

  const jokeRunes = inventory.rune_joke || 0;

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background via-background to-muted">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(236,72,153,0.1),transparent_50%)]" />
      
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 relative z-10">
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
                <ArrowRightLeft className="w-8 h-8" />
                Joke Rune Exchange
              </h1>
              <p className="text-muted-foreground mt-1">Convert your rare Joke Runes into rewards!</p>
            </div>
          </div>
          <TokenDisplay balance={profile.token_balance} />
        </div>

        {/* Current Balance */}
        <Card className="glass-panel cyber-border">
          <CardHeader>
            <CardTitle className="neon-text-cyan">Your Joke Rune Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="text-6xl mb-4">🃏</div>
              <div className="text-4xl font-bold neon-text-gold">{formatTokenBalance(jokeRunes, 0)}</div>
              <div className="text-muted-foreground mt-2">Joke Runes Available</div>
            </div>
          </CardContent>
        </Card>

        {/* Exchange for Tokens */}
        <Card className="glass-panel cyber-border">
          <CardHeader>
            <CardTitle className="neon-text-purple">Exchange for Tokens</CardTitle>
            <p className="text-sm text-muted-foreground">1 Joke Rune = {formatTokenBalance(EXCHANGE_RATES.jokeRuneToTokens)} Tokens</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium min-w-[80px]">Amount:</label>
              <Input
                type="number"
                min="1"
                max={jokeRunes}
                value={tokenAmount}
                onChange={(e) => setTokenAmount(Math.max(1, Math.min(jokeRunes, parseInt(e.target.value) || 1)))}
                className="cyber-border max-w-[120px]"
              />
              <span className="text-sm text-muted-foreground">
                = <span className="neon-text-gold font-bold">{formatTokenBalance(tokenAmount * EXCHANGE_RATES.jokeRuneToTokens)} tokens</span>
              </span>
            </div>
            <Button
              className="w-full cyber-border"
              disabled={jokeRunes < tokenAmount || processing}
              onClick={exchangeForTokens}
            >
              Exchange for Tokens
            </Button>
          </CardContent>
        </Card>

        {/* Exchange for Shards */}
        <Card className="glass-panel cyber-border">
          <CardHeader>
            <CardTitle className="neon-text-purple">Exchange for Rank Shards</CardTitle>
            <p className="text-sm text-muted-foreground">1 Joke Rune = {EXCHANGE_RATES.jokeRuneToShards} Shards</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium min-w-[80px]">Amount:</label>
              <Input
                type="number"
                min="1"
                max={jokeRunes}
                value={shardAmount}
                onChange={(e) => setShardAmount(Math.max(1, Math.min(jokeRunes, parseInt(e.target.value) || 1)))}
                className="cyber-border max-w-[120px]"
              />
              <span className="text-sm text-muted-foreground">
                = <span className="neon-text-purple font-bold">{shardAmount * EXCHANGE_RATES.jokeRuneToShards} shards</span>
              </span>
            </div>
            <Button
              className="w-full cyber-border"
              disabled={jokeRunes < shardAmount || processing}
              onClick={exchangeForShards}
            >
              Exchange for Shards
            </Button>
          </CardContent>
        </Card>

        {/* Redeem The Joke Rank */}
        <Card className="glass-panel cyber-border holographic">
          <CardHeader>
            <CardTitle className="neon-text-gold flex items-center gap-2">
              <Crown className="w-5 h-5" />
              Unlock "The Joke" Rank
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Cost: {EXCHANGE_RATES.jokeRuneForTheJokeRank} Joke Runes
            </p>
            <p className="text-xs text-muted-foreground">
              Grants: 10x Luck & Money Multiplier
            </p>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-4">
              <div className="text-6xl mb-2">🃏</div>
              <div className="text-sm">
                Progress: {jokeRunes} / {EXCHANGE_RATES.jokeRuneForTheJokeRank}
              </div>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div 
                  className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((jokeRunes / EXCHANGE_RATES.jokeRuneForTheJokeRank) * 100, 100)}%` }}
                />
              </div>
            </div>
            <Button
              className="w-full cyber-border text-lg py-6"
              disabled={jokeRunes < EXCHANGE_RATES.jokeRuneForTheJokeRank || processing || profile.rank === 'the_joke'}
              onClick={redeemTheJokeRank}
            >
              {profile.rank === 'the_joke' ? "Already Unlocked!" : "Unlock The Joke Rank"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Exchange;
