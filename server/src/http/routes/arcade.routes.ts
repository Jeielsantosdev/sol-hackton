import { Router } from "express";
import {
  answerEvent,
  arcadeLeaderboard,
  nextEvent,
  type ArcadeGame,
} from "../../games/arcade.js";
import { HttpError, asyncHandler } from "../errors.js";

export const arcadeRoutes = Router();

function gameParam(raw: string): ArcadeGame {
  if (raw !== "penalty" && raw !== "live") {
    throw new HttpError(404, "jogo arcade desconhecido");
  }
  return raw;
}

arcadeRoutes.post(
  "/:game/next",
  asyncHandler(async (req, res) => {
    const game = gameParam(req.params.game);
    const { wallet } = req.body ?? {};
    try {
      res.json(await nextEvent(game, wallet));
    } catch (err) {
      throw new HttpError(400, (err as Error).message);
    }
  })
);

arcadeRoutes.post("/:game/answer/:id", (req, res) => {
  gameParam(req.params.game);
  const { choice, name } = req.body ?? {};
  try {
    res.json(answerEvent(req.params.id, Number(choice), name));
  } catch (err) {
    throw new HttpError(400, (err as Error).message);
  }
});

arcadeRoutes.get("/:game/leaderboard", (req, res) => {
  res.json({ top: arcadeLeaderboard(gameParam(req.params.game)) });
});
