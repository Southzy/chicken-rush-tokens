import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Home, Shield, DollarSign, Gem } from "lucide-react";
import { toast } from "sonner";
import { formatTokenBalance } from "@/lib/utils";
import { MAX_TOKEN_BALANCE, MAX_SHARD_BALANCE } from "@/lib/gameConfig";

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [tokenAmount, setTokenAmount] = useState(0);
  const [shardAmount, setShardAmount] = useState(0);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    // Check if user has admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      toast.error("Access denied: Admin only");
      navigate("/");
      return;
    }

    setIsAdmin(true);
    fetchUsers();
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, token_balance, rank_shards")
      .order("username");

    if (data) setUsers(data);
  };

  const grantTokens = async () => {
    if (!selectedUser || tokenAmount <= 0) {
      toast.error("Select a user and enter a valid amount");
      return;
    }

    const user = users.find(u => u.id === selectedUser);
    if (!user) return;

    const newBalance = Math.min(user.token_balance + tokenAmount, MAX_TOKEN_BALANCE);

    const { error } = await supabase
      .from("profiles")
      .update({ token_balance: newBalance })
      .eq("id", selectedUser);

    if (error) {
      toast.error("Failed to grant tokens");
      return;
    }

    toast.success(`Granted ${formatTokenBalance(tokenAmount)} tokens to ${user.username}`);
    fetchUsers();
    setTokenAmount(0);
  };

  const grantShards = async () => {
    if (!selectedUser || shardAmount <= 0) {
      toast.error("Select a user and enter a valid amount");
      return;
    }

    const user = users.find(u => u.id === selectedUser);
    if (!user) return;

    const newShards = Math.min(user.rank_shards + shardAmount, MAX_SHARD_BALANCE);

    const { error } = await supabase
      .from("profiles")
      .update({ rank_shards: newShards })
      .eq("id", selectedUser);

    if (error) {
      toast.error("Failed to grant shards");
      return;
    }

    toast.success(`Granted ${shardAmount} shards to ${user.username}`);
    fetchUsers();
    setShardAmount(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse neon-text-cyan text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background via-background to-muted">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,0,0,0.1),transparent_50%)]" />
      
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 relative z-10">
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
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-red-500 flex items-center gap-2">
                <Shield className="w-8 h-8" />
                Admin Panel
              </h1>
              <p className="text-muted-foreground mt-1">Grant tokens and shards to users</p>
            </div>
          </div>
        </div>

        {/* Grant Tokens */}
        <Card className="glass-panel cyber-border">
          <CardHeader>
            <CardTitle className="neon-text-cyan flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Grant Tokens
            </CardTitle>
            <p className="text-xs text-muted-foreground">Max balance: {formatTokenBalance(MAX_TOKEN_BALANCE)}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select User</label>
              <select
                className="w-full p-2 bg-input border border-border rounded-md"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="">-- Select User --</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({formatTokenBalance(user.token_balance)} tokens)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Amount</label>
              <Input
                type="number"
                min="0"
                max={MAX_TOKEN_BALANCE}
                value={tokenAmount}
                onChange={(e) => setTokenAmount(parseInt(e.target.value) || 0)}
                className="cyber-border"
              />
            </div>

            <Button
              className="w-full cyber-border"
              disabled={!selectedUser || tokenAmount <= 0}
              onClick={grantTokens}
            >
              Grant {formatTokenBalance(tokenAmount)} Tokens
            </Button>
          </CardContent>
        </Card>

        {/* Grant Shards */}
        <Card className="glass-panel cyber-border">
          <CardHeader>
            <CardTitle className="neon-text-purple flex items-center gap-2">
              <Gem className="w-5 h-5" />
              Grant Rank Shards
            </CardTitle>
            <p className="text-xs text-muted-foreground">Max balance: {MAX_SHARD_BALANCE.toLocaleString()}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select User</label>
              <select
                className="w-full p-2 bg-input border border-border rounded-md"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="">-- Select User --</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.rank_shards} shards)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Amount</label>
              <Input
                type="number"
                min="0"
                max={MAX_SHARD_BALANCE}
                value={shardAmount}
                onChange={(e) => setShardAmount(parseInt(e.target.value) || 0)}
                className="cyber-border"
              />
            </div>

            <Button
              className="w-full cyber-border"
              disabled={!selectedUser || shardAmount <= 0}
              onClick={grantShards}
            >
              Grant {shardAmount} Shards
            </Button>
          </CardContent>
        </Card>

        {/* User List */}
        <Card className="glass-panel cyber-border">
          <CardHeader>
            <CardTitle className="neon-text-gold">All Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 text-sm">Username</th>
                    <th className="text-right p-2 text-sm">Tokens</th>
                    <th className="text-right p-2 text-sm">Shards</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b border-border/50">
                      <td className="p-2 text-sm">{user.username}</td>
                      <td className="text-right p-2 text-sm neon-text-cyan">
                        {formatTokenBalance(user.token_balance)}
                      </td>
                      <td className="text-right p-2 text-sm neon-text-purple">
                        {user.rank_shards.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
