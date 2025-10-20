// supabase/functions/bulk-open-runebox/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BOX_PRICE_BASIC = 1000;
const BOX_PRICE_SPECIAL = 5000;
const MAX_BOXES_PER_REQUEST = 10000;

type BoxType = "basic" | "special";

interface RawRune {
  key: string;
  dropRate: number; // raw weight ภายในพูล
  cap: number | null;
}
interface Rune extends RawRune {
  dropRate: number; // normalized ภายในพูล (sum = 1)
}
interface OpenResult {
  runeKey: string;
  actualGain: number;
  wasCapHit: boolean;
  nonce: string;
}

// === อัตราเหมือน gameConfig ===
// Base 6 (normalize ในพูล)
const BASE_RAW: RawRune[] = [
  { key: "rune_a", dropRate: 0.30, cap: 500 },
  { key: "rune_b", dropRate: 0.22, cap: 300 },
  { key: "rune_c", dropRate: 0.18, cap: 400 },
  { key: "rune_d", dropRate: 0.12, cap: 200 },
  { key: "rune_e", dropRate: 0.12, cap: 200 },
  { key: "rune_f", dropRate: 0.06, cap: null },
];

// Special 7 + Joke (normalize ในพูล)
const SPECIAL_RAW: RawRune[] = [
  { key: "rune_g", dropRate: 0.005, cap: 100 },
  { key: "rune_h", dropRate: 0.004, cap: 80 },
  { key: "rune_i", dropRate: 0.003, cap: 60 },
  { key: "rune_j", dropRate: 0.0025, cap: 50 },
  { key: "rune_k", dropRate: 0.002, cap: 40 },
  { key: "rune_l", dropRate: 0.0015, cap: 30 },
  { key: "rune_m", dropRate: 0.001, cap: 20 },
  { key: "rune_joke", dropRate: 0.0001, cap: null },
];

function normalize<T extends { dropRate: number }>(arr: T[]): T[] {
  const s = arr.reduce((a, b) => a + b.dropRate, 0);
  return s > 0 ? arr.map((r) => ({ ...r, dropRate: r.dropRate / s })) : arr;
}
const BASE: Rune[] = normalize(BASE_RAW) as Rune[];
const SPECIAL: Rune[] = normalize(SPECIAL_RAW) as Rune[];

function poolOf(boxType: BoxType): Rune[] {
  return boxType === "special" ? SPECIAL : BASE;
}
function boxPrice(boxType: BoxType): number {
  return boxType === "special" ? BOX_PRICE_SPECIAL : BOX_PRICE_BASIC;
}

function generateNonce(): string {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

function applyDiminishing(current: number, cap: number | null, gain: number) {
  if (!cap) return gain;
  if (current >= cap) return 0;
  if (current >= cap * 0.9) return gain * 0.5; // 50% โอกาส
  return gain;
}

function rollOnce(inv: Record<string, number>, pool: Rune[], nonce: string): OpenResult {
  const r = Math.random(); // NOTE: ทำ provably fair ได้โดยใช้ hash(nonce, serverSeed)
  let cum = 0;
  for (const rune of pool) {
    cum += rune.dropRate;
    if (r <= cum) {
      const cur = Number(inv[rune.key] ?? 0);
      const fractional = applyDiminishing(cur, rune.cap, 1);
      const gain =
        fractional >= 1
          ? 1
          : fractional <= 0
          ? 0
          : Math.random() < fractional
          ? 1
          : 0;
      return {
        runeKey: rune.key,
        actualGain: gain,
        wasCapHit: rune.cap != null ? cur >= rune.cap : false,
        nonce,
      };
    }
  }
  const last = pool[pool.length - 1];
  const cur = Number(inv[last.key] ?? 0);
  const fractional = applyDiminishing(cur, last.cap, 1);
  const gain =
    fractional >= 1
      ? 1
      : fractional <= 0
      ? 0
      : Math.random() < fractional
      ? 1
      : 0;
  return {
    runeKey: last.key,
    actualGain: gain,
    wasCapHit: last.cap != null ? cur >= last.cap : false,
    nonce,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    // แนะนำแบบนี้: ให้ client ส่ง Authorization: Bearer <JWT> มา
    const { data: { user }, error: uErr } =
      await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (uErr || !user) throw new Error("Unauthorized");

    const body = await req.json().catch(() => ({}));
    const quantity = Math.max(
      1,
      Math.min(MAX_BOXES_PER_REQUEST, Number(body?.quantity) || 1)
    );

    // 🔴 จุดสำคัญ: อ่าน boxType จาก body — ถ้าไม่ใช่ "special" ให้ default = "basic"
    const boxType: BoxType = body?.boxType === "special" ? "special" : "basic";

    console.log(
      `bulk-open-runebox -> user=${user.id} qty=${quantity} boxType=${boxType}`
    );

    // โหลดโปรไฟล์
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("token_balance, rank_shards")
      .eq("id", user.id)
      .single();
    if (pErr || !profile) throw new Error("Profile not found");

    const cost = boxPrice(boxType) * quantity;
    if ((profile.token_balance ?? 0) < cost)
      throw new Error("Insufficient tokens");

    // โหลด inventory
    const { data: inventory, error: iErr } = await supabase
      .from("user_inventory")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (iErr || !inventory) throw new Error("Inventory not found");

    // Roll
    const results: OpenResult[] = [];
    const newInv: Record<string, number> = { ...inventory };
    let totalShards = 0;

    const pool = poolOf(boxType);
    for (let i = 0; i < quantity; i++) {
      const nonce = generateNonce();
      const res = rollOnce(newInv, pool, nonce);

      if (res.actualGain > 0) {
        if (res.runeKey === "rune_f") totalShards += res.actualGain;
        else newInv[res.runeKey] = Number(newInv[res.runeKey] ?? 0) + res.actualGain;
      }
      results.push(res);
    }

    // หักเหรียญ + บวกชาร์ด
    const { error: profErr } = await supabase
      .from("profiles")
      .update({
        token_balance: (profile.token_balance ?? 0) - cost,
        rank_shards: (profile.rank_shards ?? 0) + totalShards,
      })
      .eq("id", user.id);
    if (profErr) throw new Error("Failed to update profile");

    // อัปเดตรูนทั้งหมด
    const ALL_KEYS = [
      "rune_a","rune_b","rune_c","rune_d","rune_e","rune_f",
      "rune_g","rune_h","rune_i","rune_j","rune_k","rune_l","rune_m","rune_joke",
    ];
    const updatePayload: Record<string, number> = {};
    for (const k of ALL_KEYS) updatePayload[k] = Number(newInv[k] ?? 0);

    const { error: invErr } = await supabase
      .from("user_inventory")
      .update(updatePayload)
      .eq("user_id", user.id);
    if (invErr) throw new Error("Failed to update inventory");

    return new Response(
      JSON.stringify({
        success: true,
        boxType,
        results,
        summary: {
          boxesOpened: quantity,
          tokensSpent: cost,
          shardsGained: totalShards,
          newTokenBalance: (profile.token_balance ?? 0) - cost,
          newShardBalance: (profile.rank_shards ?? 0) + totalShards,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("bulk-open-runebox error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
