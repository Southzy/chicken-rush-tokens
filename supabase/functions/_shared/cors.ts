export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*", // หรือใส่ domain เว็บของคุณแทน
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-client-info, apikey, prefer, x-box-type",
};

export function handleOptions(): Response {
  return new Response("ok", { headers: corsHeaders });
}
