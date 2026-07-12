import { Router } from "express";
import { getChain } from "../../chain/client.js";
import {
  INFINITE_CAP_STREAK,
  INFINITE_LADDER_BPS,
  MIN_STAKE_LAMPORTS,
  RUN_ODDS_BPS,
  cashoutRun,
  createRun,
  getRun,
  guessRun,
  listRunsByWallet,
  runView,
} from "../../chain/runs.js";
import { HttpError, asyncHandler } from "../errors.js";
import { requireChain } from "../middleware.js";

export const runsRoutes = Router();

runsRoutes.get("/config", (_req, res) => {
  res.json({
    enabled: Boolean(getChain()),
    odds: RUN_ODDS_BPS,
    minStakeLamports: MIN_STAKE_LAMPORTS,
    infiniteLadder: INFINITE_LADDER_BPS,
    infiniteCap: INFINITE_CAP_STREAK,
  });
});

runsRoutes.post(
  "/",
  requireChain,
  asyncHandler(async (req, res) => {
    const { wallet, target, stakeLamports, mode } = req.body ?? {};
    if (typeof wallet !== "string" || !wallet) {
      throw new HttpError(400, "wallet obrigatória");
    }
    try {
      res.json(
        await createRun(
          wallet,
          Number(target),
          Number(stakeLamports),
          mode === "infinite" ? "infinite" : "target"
        )
      );
    } catch (err) {
      throw new HttpError(400, (err as Error).message);
    }
  })
);

runsRoutes.get("/wallet/:wallet", (req, res) => {
  res.json({ runs: listRunsByWallet(req.params.wallet) });
});

runsRoutes.get("/:id", (req, res) => {
  const run = getRun(req.params.id);
  if (!run) throw new HttpError(404, "run não encontrada");
  res.json(runView(run));
});

runsRoutes.post(
  "/:id/guess",
  asyncHandler(async (req, res) => {
    const dir = req.body?.dir;
    if (dir !== "higher" && dir !== "lower") {
      throw new HttpError(400, "dir deve ser higher|lower");
    }
    try {
      res.json(await guessRun(req.params.id, dir));
    } catch (err) {
      throw new HttpError(400, (err as Error).message);
    }
  })
);

runsRoutes.post(
  "/:id/cashout",
  asyncHandler(async (req, res) => {
    try {
      res.json(await cashoutRun(req.params.id));
    } catch (err) {
      throw new HttpError(400, (err as Error).message);
    }
  })
);
