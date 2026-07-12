import { Router } from "express";
import {
  listPickableMarkets,
  makePick,
  survivorLeaderboard,
  survivorStatus,
} from "../../games/survivor.js";
import { HttpError, asyncHandler } from "../errors.js";

export const survivorRoutes = Router();

survivorRoutes.get(
  "/markets",
  asyncHandler(async (_req, res) => {
    res.json({ markets: await listPickableMarkets() });
  })
);

survivorRoutes.post(
  "/pick",
  asyncHandler(async (req, res) => {
    const { wallet, marketId, outcome, name } = req.body ?? {};
    try {
      res.json(await makePick(wallet, String(marketId ?? ""), Number(outcome), name));
    } catch (err) {
      throw new HttpError(400, (err as Error).message);
    }
  })
);

survivorRoutes.get("/status/:wallet", (req, res) => {
  res.json(survivorStatus(req.params.wallet));
});

survivorRoutes.get("/leaderboard", (_req, res) => {
  res.json(survivorLeaderboard());
});
