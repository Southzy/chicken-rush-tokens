import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankBadge } from "@/components/RankBadge";
import { TokenDisplay } from "@/components/TokenDisplay";
import { LogOut, Home } from "lucide-react";
import { toast } from "sonner";

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
    <div className="min-h-screen p-6 bg-gradient-to-br from-background via-background to-muted">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,204,0.1),transparent_50%)]" />
      
      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center">
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="cyber-border"
          >
            <Home className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <Button
            onClick={handleLogout}
            variant="destructive"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Profile Card */}
        <Card className="glass-panel cyber-border">
          <CardHeader>
            <CardTitle className="text-3xl neon-text-cyan">
              {profile.username}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-4 items-center">
              <RankBadge rank={profile.rank} />
              <TokenDisplay balance={profile.token_balance} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-panel p-4 rounded-lg text-center">
                <div className="text-2xl font-bold neon-text-purple">
                  {stats.totalGames}
                </div>
                <div className="text-sm text-muted-foreground">Total Games</div>
              </div>
              <div className="glass-panel p-4 rounded-lg text-center">
                <div className="text-2xl font-bold neon-text-gold">
                  {stats.totalWinnings.toLocaleString()}
                </div>
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
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-3 glass-panel rounded">
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
