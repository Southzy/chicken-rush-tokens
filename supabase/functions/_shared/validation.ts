import { z } from "zod";

export const RuneboxSchema = z.object({
  userId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10000),
  boxType: z.string().min(1),
  clientSeed: z.string().min(1),
});

export const MinesRevealSchema = z.object({
  userId: z.string().uuid(),
  gameId: z.string().uuid(),
  tile: z.number().int().min(0).max(24),
  betTokens: z.number().int().positive(),
  mines: z.number().int().min(1).max(24),
  clientSeed: z.string().min(1),
  nonce: z.number().int().min(0),
});
