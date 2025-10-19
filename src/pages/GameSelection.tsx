import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TokenDisplay } from "@/components/TokenDisplay";
import { RankBadge } from "@/components/RankBadge";
import { Home, Gamepad2 } from "lucide-react";

const GAMES = [
  {
    id: "chicken-road",
    name: "Chicken Road",
    emoji: "🐔",
    description: "Race across lanes and avoid traps!",
    gradient: "from-cyan-500 to-green-500",
    route: "/game"
  },
  {
    id: "mines",
    name: "Mines",
    emoji: "💣",
    description: "Click tiles carefully and cash out before hitting a mine!",
    gradient: "from-purple-500 to-pink-500",
    route: "/mines"
  }
];

const GameSelection = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

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
      
      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="cyber-border w-full lg:w-auto"
          >
            <Home className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold neon-text-cyan animate-glow-pulse text-center">
            <Gamepad2 className="w-8 h-8 inline-block mr-2" />
            Select a Game
          </h1>
          <div className="flex flex-col sm:flex-row gap-4 items-center w-full lg:w-auto">
            <TokenDisplay balance={profile.token_balance} />
            <RankBadge rank={profile.rank} />
          </div>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {GAMES.map((game) => (
            <Card
              key={game.id}
              className="glass-panel cyber-border hover:scale-105 transition-all cursor-pointer group"
              onClick={() => navigate(game.route)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`text-6xl group-hover:animate-bounce`}>
                    {game.emoji}
                  </div>
                  <div className={`px-4 py-2 rounded-lg bg-gradient-to-r ${game.gradient} opacity-20 group-hover:opacity-40 transition-opacity`}>
                    <Gamepad2 className="w-8 h-8 text-white" />
                  </div>
                </div>
                <CardTitle className={`text-2xl neon-text-cyan mt-4`}>
                  {game.name}
                </CardTitle>
                <CardDescription className="text-muted-foreground text-base">
                  {game.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full cyber-border bg-primary/10 hover:bg-primary/20 neon-text-cyan font-bold"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(game.route);
                  }}
                >
                  Play Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Card */}
        <Card className="glass-panel cyber-border">
          <CardHeader>
            <CardTitle className="neon-text-purple">Game Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• All games use your token balance</p>
            <p>• Win tokens by playing strategically</p>
            <p>• Each game has unique mechanics and multipliers</p>
            <p>• Your rank affects bonuses in some games</p>
            <p className="text-primary font-bold mt-4">Good luck and have fun! 🎮</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GameSelection;
