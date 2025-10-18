import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankBadge } from "@/components/RankBadge";
import { TokenDisplay } from "@/components/TokenDisplay";
import { LogOut, Home } from "lucide-react";
import { toast } from "sonner";
import { formatTokenBalance } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ totalGames: 0, totalWinnings: 0 });

  useEffect(() => {
    fetchProfile();
    fetchStats();
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

  const fetchStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("game_history")
      .select("*")
      .eq("user_id", user.id);

    if (data) {
      setStats({
        totalGames: data.length,
        totalWinnings: data.reduce((sum, game) => sum + game.profit, 0),
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse neon-text-cyan text-xl">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background via-background to-muted">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,204,0.1),transparent_50%)]" />
      
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="cyber-border w-full sm:w-auto"
          >
            <Home className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <Button
            onClick={handleLogout}
            variant="destructive"
            className="w-full sm:w-auto"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Profile Card */}
        <Card className="glass-panel cyber-border">
          <CardHeader>
            <CardTitle className="text-2xl sm:text-3xl neon-text-cyan break-words">
              {profile.username}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-center">
              <RankBadge rank={profile.rank} />
              <TokenDisplay balance={profile.token_balance} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-panel p-4 rounded-lg text-center">
                <div className="text-2xl font-bold neon-text-purple">
                  {stats.totalGames}
                </div>
                <div className="text-sm text-muted-foreground">Total Games</div>
              </div>
              <div className="glass-panel p-4 rounded-lg text-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-2xl font-bold neon-text-gold cursor-help">
                        {formatTokenBalance(stats.totalWinnings)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{stats.totalWinnings.toLocaleString()} tokens</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="text-sm text-muted-foreground">Total Winnings</div>
              </div>
              <div className="glass-panel p-4 rounded-lg text-center">
                <div className="text-2xl font-bold neon-text-cyan">
                  {stats.totalGames > 0 ? ((stats.totalWinnings / stats.totalGames).toFixed(0)) : 0}
                </div>
                <div className="text-sm text-muted-foreground">Avg per Game</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rank Information */}
        <Card className="glass-panel cyber-border">
          <CardHeader>
            <CardTitle className="neon-text-purple">Rank Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between items-center p-3 glass-panel rounded flex-wrap gap-2">
                <span>Nova Cadet 💫</span>
                <span className="text-muted-foreground">Default rank</span>
              </div>
              <div className="flex justify-between items-center p-3 glass-panel rounded">
                <span>Quantum Ranger 🧬</span>
                <span className="text-muted-foreground">+3% trap avoidance</span>
              </div>
              <div className="flex justify-between items-center p-3 glass-panel rounded">
                <span>Cyber Warden 🩵</span>
                <span className="text-muted-foreground">+5% winnings</span>
              </div>
              <div className="flex justify-between items-center p-3 glass-panel rounded">
                <span>Celestial Overlord 🌠</span>
                <span className="text-muted-foreground">+10% winnings</span>
              </div>
              <div className="flex justify-between items-center p-3 glass-panel rounded">
                <span>Eclipse Titan 🌑</span>
                <span className="text-muted-foreground">+15% winnings</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
