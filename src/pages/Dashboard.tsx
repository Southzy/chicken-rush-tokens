import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankBadge } from "@/components/RankBadge";
import { TokenDisplay } from "@/components/TokenDisplay";
import { User, ShoppingBag, Package, Gamepad2 } from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ totalGames: 0, totalWinnings: 0 });

  useEffect(() => {
    checkAuth();
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
      
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold neon-text-cyan mb-2">Dashboard</h1>
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
              <div className="text-2xl font-bold neon-text-gold mb-2">
                {stats.totalWinnings.toLocaleString()}
              </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Recent Games */}
        <Card className="glass-panel cyber-border">
          <CardHeader>
            <CardTitle className="neon-text-cyan">Recent Games</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.totalGames === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No games played yet. Start playing to see your history!
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Game history will appear here
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
