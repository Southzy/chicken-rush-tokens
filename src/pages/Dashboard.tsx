import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankBadge } from "@/components/RankBadge";
import { TokenDisplay } from "@/components/TokenDisplay";
import { User, ShoppingBag, Package, Gamepad2, Zap } from "lucide-react";
import { toast } from "sonner";
import { formatTokenBalance } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ totalGames: 0, totalWinnings: 0 });
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
    fetchLeaderboard();

    // Refresh leaderboard every 5 minutes
    const interval = setInterval(() => {
      fetchLeaderboard();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const checkAuth = async () => {
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
    fetchStats(user.id);
  };

  const fetchStats = async (userId: string) => {
    const { data } = await supabase
      .from("game_history")
      .select("*")
      .eq("user_id", userId);

    if (data) {
      setStats({
        totalGames: data.length,
        totalWinnings: data.reduce((sum, game) => sum + game.profit, 0),
      });
    }
  };

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("username, token_balance, rank, rank_shards")
      .order("rank_shards", { ascending: false })
      .limit(10);

    if (data) setLeaderboard(data);
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
      
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold neon-text-cyan mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {profile.username}!</p>
          </div>
          <TokenDisplay balance={profile.token_balance} />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-panel cyber-border">
            <CardContent className="p-6">
              <div className="text-2xl font-bold neon-text-purple mb-2">
                {stats.totalGames}
              </div>
              <div className="text-sm text-muted-foreground">Total Games Played</div>
            </CardContent>
          </Card>

          <Card className="glass-panel cyber-border">
            <CardContent className="p-6">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-2xl font-bold neon-text-gold mb-2 cursor-help">
                      {formatTokenBalance(stats.totalWinnings)}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-mono">{stats.totalWinnings.toLocaleString()} tokens</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="text-sm text-muted-foreground">Total Winnings</div>
            </CardContent>
          </Card>

          <Card className="glass-panel cyber-border">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-2">Current Rank</div>
                <RankBadge rank={profile.rank} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card 
            className="glass-panel cyber-border hover:scale-105 transition-transform cursor-pointer"
            onClick={() => navigate("/game")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 neon-text-cyan">
                <Gamepad2 className="w-6 h-6" />
                Play Game
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Start playing Chicken Road and win tokens!
              </p>
            </CardContent>
          </Card>

          <Card 
            className="glass-panel cyber-border hover:scale-105 transition-transform cursor-pointer"
            onClick={() => navigate("/shop")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 neon-text-purple">
                <ShoppingBag className="w-6 h-6" />
                Rank Shop
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Upgrade your rank and unlock bonuses!
              </p>
            </CardContent>
          </Card>

          <Card 
            className="glass-panel cyber-border hover:scale-105 transition-transform cursor-pointer"
            onClick={() => navigate("/lootbox")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 neon-text-gold">
                <Package className="w-6 h-6" />
                Loot Boxes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Open boxes and collect powerful emojis!
              </p>
            </CardContent>
          </Card>

          <Card 
            className="glass-panel cyber-border hover:scale-105 transition-transform cursor-pointer"
            onClick={() => navigate("/runebox")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 neon-text-purple">
                <Zap className="w-6 h-6" />
                Rune Box
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Collect runes to enhance your stats!
              </p>
            </CardContent>
          </Card>

          <Card 
            className="glass-panel cyber-border hover:scale-105 transition-transform cursor-pointer"
            onClick={() => navigate("/profile")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-6 h-6" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View your stats and emoji collection!
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard */}
        <Card className="glass-panel cyber-border">
          <CardHeader>
            <CardTitle className="neon-text-cyan">Leaderboard</CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground">Updates every 5 minutes</p>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading leaderboard...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2 sm:p-3 text-xs sm:text-sm">Rank</th>
                      <th className="text-left p-2 sm:p-3 text-xs sm:text-sm">Player</th>
                      <th className="text-left p-2 sm:p-3 text-xs sm:text-sm">Level</th>
                      <th className="text-right p-2 sm:p-3 text-xs sm:text-sm">Shards</th>
                      <th className="text-right p-2 sm:p-3 text-xs sm:text-sm">Tokens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((player, index) => (
                      <tr 
                        key={player.username} 
                        className={`border-b border-border/50 ${
                          player.username === profile?.username ? 'bg-primary/10' : ''
                        }`}
                      >
                        <td className="p-2 sm:p-3">
                          <span className={`text-xs sm:text-sm font-bold ${
                            index === 0 ? 'neon-text-gold' :
                            index === 1 ? 'text-gray-400' :
                            index === 2 ? 'text-amber-600' :
                            'text-muted-foreground'
                          }`}>
                            #{index + 1}
                          </span>
                        </td>
                        <td className="p-2 sm:p-3 text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">
                          {player.username}
                        </td>
                        <td className="p-2 sm:p-3">
                          <RankBadge rank={player.rank} />
                        </td>
                        <td className="text-right p-2 sm:p-3 text-xs sm:text-sm font-bold neon-text-purple">
                          {player.rank_shards?.toLocaleString() || 0}
                        </td>
                        <td className="text-right p-2 sm:p-3 text-xs sm:text-sm font-bold neon-text-cyan">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">
                                  {formatTokenBalance(player.token_balance)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-mono">{player.token_balance.toLocaleString()} tokens</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
