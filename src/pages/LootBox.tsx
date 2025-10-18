import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TokenDisplay } from "@/components/TokenDisplay";
import { Home, Package, Sparkles } from "lucide-react";
import { toast } from "sonner";

const LootBox = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [lootBoxes, setLootBoxes] = useState<any[]>([]);
  const [opening, setOpening] = useState<string | null>(null);
  const [revealedEmoji, setRevealedEmoji] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
    fetchLootBoxes();
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

  const fetchLootBoxes = async () => {
    const { data } = await supabase
      .from("loot_boxes")
      .select("*")
      .order("price", { ascending: true });

    if (data) setLootBoxes(data);
  };

  const openBox = async (box: any) => {
    if (!profile) return;

    if (profile.token_balance < box.price) {
      toast.error("Not enough tokens!");
      return;
    }

    setOpening(box.id);

    // Deduct tokens
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ token_balance: profile.token_balance - box.price })
      .eq("id", profile.id);

    if (updateError) {
      toast.error("Failed to open box");
      setOpening(null);
      return;
    }

    // Get random emoji
    const { data: emojis } = await supabase
      .from("emojis")
      .select("*");

    if (emojis && emojis.length > 0) {
      // Simulate random selection with secret chance
      const isSecret = Math.random() < box.secret_chance;
      let selectedEmoji;

      if (isSecret) {
        const secretEmojis = emojis.filter(e => e.rarity === 'secret');
        selectedEmoji = secretEmojis.length > 0 
          ? secretEmojis[Math.floor(Math.random() * secretEmojis.length)]
          : emojis[Math.floor(Math.random() * emojis.length)];
      } else {
        const nonSecretEmojis = emojis.filter(e => e.rarity !== 'secret');
        selectedEmoji = nonSecretEmojis.length > 0
          ? nonSecretEmojis[Math.floor(Math.random() * nonSecretEmojis.length)]
          : emojis[Math.floor(Math.random() * emojis.length)];
      }

      // Add emoji to user's collection
      const { error: insertError } = await supabase
        .from("user_emojis")
        .insert({
          user_id: profile.id,
          emoji_id: selectedEmoji.id,
        });

      if (insertError && !insertError.message.includes('unique')) {
        console.error("Error adding emoji:", insertError);
      }

      // Show reveal animation
      setTimeout(() => {
        setRevealedEmoji({ ...selectedEmoji, isSecret });
        setOpening(null);
        fetchProfile();
      }, 2000);
    }
  };

  const closeReveal = () => {
    setRevealedEmoji(null);
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,215,0,0.1),transparent_50%)]" />
      
      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="cyber-border"
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <div>
              <h1 className="text-4xl font-bold neon-text-gold flex items-center gap-2">
                <Package className="w-8 h-8" />
                Loot Boxes
              </h1>
              <p className="text-muted-foreground mt-1">Open boxes and collect powerful emojis!</p>
            </div>
          </div>
          <TokenDisplay balance={profile.token_balance} />
        </div>

        {/* Loot Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {lootBoxes.map((box) => (
            <Card 
              key={box.id} 
              className={`glass-panel cyber-border relative overflow-hidden ${
                opening === box.id ? 'animate-pulse' : ''
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
              
              <CardHeader>
                <CardTitle className="relative z-10 text-2xl neon-text-gold flex items-center gap-2">
                  <Package className="w-6 h-6" />
                  {box.name}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="relative z-10 space-y-4">
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">📦</div>
                  <div className="text-sm text-muted-foreground">
                    {box.emoji_pool_size} emojis available
                  </div>
                  <div className="text-sm neon-text-purple mt-2">
                    {(box.secret_chance * 100).toFixed(0)}% secret chance
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 glass-panel rounded">
                  <span className="text-muted-foreground">Price:</span>
                  <span className="neon-text-gold font-bold text-lg">
                    {box.price.toLocaleString()} tokens
                  </span>
                </div>

                <Button
                  className="w-full cyber-border neon-text-gold text-lg py-6"
                  disabled={profile.token_balance < box.price || opening !== null}
                  onClick={() => openBox(box)}
                >
                  {opening === box.id ? (
                    <>
                      <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                      Opening...
                    </>
                  ) : (
                    <>
                      <Package className="w-5 h-5 mr-2" />
                      Open Now
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Reveal Modal */}
      {revealedEmoji && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <Card className={`glass-panel cyber-border max-w-md w-full mx-4 ${
            revealedEmoji.isSecret ? 'border-red-500 shadow-[0_0_30px_rgba(255,0,0,0.5)]' : ''
          }`}>
            <CardHeader>
              <CardTitle className="text-center">
                {revealedEmoji.isSecret && (
                  <div className="neon-text-gold text-3xl mb-4 animate-pulse">
                    ⭐ SECRET! ⭐
                  </div>
                )}
                <div className="text-2xl neon-text-cyan">You received:</div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-8xl mb-4 animate-bounce">{revealedEmoji.emoji_symbol}</div>
                <div className="text-3xl font-bold neon-text-purple mb-2">
                  {revealedEmoji.name}
                </div>
                <div className="text-lg text-muted-foreground capitalize mb-4">
                  {revealedEmoji.rarity} • {revealedEmoji.effect_type}
                </div>
                <div className="text-xl neon-text-gold">
                  +{revealedEmoji.bonus_percentage}% Bonus
                </div>
              </div>
              <Button 
                className="w-full cyber-border"
                onClick={closeReveal}
              >
                Awesome!
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default LootBox;
