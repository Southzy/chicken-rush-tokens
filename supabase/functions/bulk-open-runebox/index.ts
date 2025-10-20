// supabase/functions/bulk-open-runebox/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---- Prices (ต้องตรงกับ client) ----
const BOX_PRICE_BASIC = 1000;
const BOX_PRICE_SPECIAL = 5000;
const MAX_BOXES_PER_REQUEST = 10000;

type BoxType = "basic" | "special";

interface RawRune {
  key: string;
  dropRate: number;      // raw weight ภายในพูล
  cap: number | null;
}
interface Rune extends RawRune {
  dropRate: number;      // normalized ภายในพูล (sum = 1)
}

interface OpenResult {
  runeKey: string;
  actualGain: number;
  wasCapHit: boolean;
  nonce: string;
}

// ===== อัตราตาม gameConfig (เวอร์ชันแยกพูล) =====
// Base (6) — normalize ในพูล
const BASE_CONFIG_RAW: RawRune[] = [
  { key: "rune_a", dropRate: 0.30, cap: 500 },
  { key: "rune_b", dropRate: 0.22, cap: 300 },
  { key: "rune_c", dropRate: 0.18, cap: 400 },
  { key: "rune_d", dropRate: 0.12, cap: 200 },
  { key: "rune_e", dropRate: 0.12, cap: 200 },
  { key: "rune_f", dropRate: 0.06, cap: null },
];

// Special (7 + Joke) — normalize ในพูล
const SPECIAL_CONFIG_RAW: RawRune[] = [
  { key: "rune_g",    dropRate: 0.005,  cap: 100 },
  { key: "rune_h",    dropRate: 0.004,  cap: 80  },
  { key: "rune_i",    dropRate: 0.003,  cap: 60  },
  { key: "rune_j",    dropRate: 0.0025, cap: 50  },
  { key: "rune_k",    dropRate: 0.002,  cap: 40  },
  { key: "rune_l",    dropRate: 0.0015, cap: 30  },
  { key: "rune_m",    dropRate: 0.001,  cap: 20  },
  { key: "rune_joke", dropRate: 0.0001, cap: null }, // 1 in 10,000 ในพูล Special
];

// ===== Helpers =====
function normalizePool<T extends { dropRate: number }>(arr: T[]): T[] {
  const s = arr.reduce((acc, r) => acc + r.dropRate, 0);
  if (s <= 0) return arr.map(r => ({ ...r }));
  return arr.map(r => ({ ...r, dropRate: r.dropRate / s }));
}

const BASE_CONFIG: Rune[] = normalizePool(BASE_CONFIG_RAW) as Rune[];
const SPECIAL_CONFIG: Rune[] = normalizePool(SPECIAL_CONFIG_RAW) as Rune[];

function getPool(boxType: BoxType): Rune[] {
  return boxType === "special" ? SPECIAL_CONFIG : BASE_CONFIG;
}

function priceOf(boxType: BoxType): number {
  return boxType === "special" ? BOX_PRICE_SPECIAL : BOX_PRICE_BASIC;
}

// RNG nonce (placeholder สำหรับ provably fair)
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Diminishing returns: เมื่อเกิน 90% ของ cap ลดโอกาส 50%
function applyDiminishingReturns(currentCount: number, cap: number | null, gains: number): number {
  if (!cap) return gains;
  const nearCap = cap * 0.9;
  if (currentCount >= cap) return 0;
  if (currentCount >= nearCap) return gains * 0.5; // แปลงเป็น 0/1 ภายหลัง
  return gains;
}

// สุ่มจากพูลเดียว (ตามชนิดกล่อง)
function rollFromPool(currentInventory: Record<string, number>, pool: Rune[], nonce: string): OpenResult {
  // NOTE: ผลิตภัณฑ์จริงควรใช้ hash(nonce, serverSeed, ...) แทน Math.random()
  const _hashInput = nonce + Date.now().toString();
  const r = Math.random();

  let cum = 0;
  for (const rune of pool) {
    cum += rune.dropRate;
    if (r <= cum) {
      const cur = Number(currentInventory[rune.key] ?? 0);
      const fractional = applyDiminishingReturns(cur, rune.cap, 1);
      const gain = fractional >= 1 ? 1 : (fractional <= 0 ? 0 : (Math.random() < fractional ? 1 : 0));
      return {
        runeKey: rune.key,
        actualGain: gain,
        wasCapHit: rune.cap != null ? cur >= rune.cap : false,
        nonce,
      };
    }
  }
  // Guard
  const last = pool[pool.length - 1];
  const cur = Number(currentInventory[last.key] ?? 0);
  const fractional = applyDiminishingReturns(cur, last.cap, 1);
  const gain = fractional >= 1 ? 1 : (fractional <= 0 ? 0 : (Math.random() < fractional ? 1 : 0));
  return { runeKey: last.key, actualGain: gain, wasCapHit: last.cap != null ? cur >= last.cap : false, nonce };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const { data: { user }, error: userErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !user) throw new Error("Unauthorized");

    // Body
    const body = await req.json().catch(() => ({} as any));
    const quantityRaw = Number(body?.quantity);
    const quantity = Math.max(1, Math.min(MAX_BOXES_PER_REQUEST, isFinite(quantityRaw) ? quantityRaw : 1));

    // ✅ รับ boxType จาก client (default = basic สำหรับ backward-compat)
    const boxType: BoxType = body?.boxType === "special" ? "special" : "basic";

    console.log(`bulk-open-runebox: user=${user.id} quantity=${quantity} boxType=${boxType}`);

    // Profile
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("token_balance, rank_shards")
      .eq("id", user.id)
      .single();
    if (pErr || !profile) throw new Error("Profile not found");

    const totalCost = priceOf(boxType) * quantity;
    if ((profile.token_balance ?? 0) < totalCost) throw new Error("Insufficient tokens");

    // Inventory
    const { data: inventory, error: iErr } = await supabase
      .from("user_inventory")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (iErr || !inventory) throw new Error("Inventory not found");

    // Roll
    const results: OpenResult[] = [];
    const newInventory: Record<string, number> = { ...inventory };
    let totalShards = 0;

    const pool = getPool(boxType);

    for (let i = 0; i < quantity; i++) {
      const nonce = generateNonce();
      const res = rollFromPool(newInventory, pool, nonce);

      if (res.actualGain > 0) {
        if (res.runeKey === "rune_f") {
          totalShards += res.actualGain;
        } else {
          newInventory[res.runeKey] = Number(newInventory[res.runeKey] ?? 0) + res.actualGain;
        }
      }
      results.push(res);
    }

    // Update profile (charge tokens + add shards)
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        token_balance: (profile.token_balance ?? 0) - totalCost,
        rank_shards: (profile.rank_shards ?? 0) + totalShards,
      })
      .eq("id", user.id);
    if (profileErr) throw new Error("Failed to update profile");

    // Update inventory (เฉพาะคีย์รูน)
    const ALL_RUNE_KEYS = [
      "rune_a","rune_b","rune_c","rune_d","rune_e","rune_f",
      "rune_g","rune_h","rune_i","rune_j","rune_k","rune_l","rune_m","rune_joke"
    ];
    const updatePayload: Record<string, number> = {};
    for (const k of ALL_RUNE_KEYS) updatePayload[k] = Number(newInventory[k] ?? 0);

    const { error: invErr } = await supabase
      .from("user_inventory")
      .update(updatePayload)
      .eq("user_id", user.id);
    if (invErr) throw new Error("Failed to update inventory");

    return new Response(JSON.stringify({
      success: true,
      boxType,
      results,
      summary: {
        boxesOpened: quantity,
        tokensSpent: totalCost,
        shardsGained: totalShards,
        newTokenBalance: (profile.token_balance ?? 0) - totalCost,
        newShardBalance: (profile.rank_shards ?? 0) + totalShards,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("Error in bulk-open-runebox:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
