import { Router } from "express";
import { topBoard } from "../../games/leaderboard.js";
import { answerQuiz, startQuiz } from "../../games/quiz.js";
import { HttpError, asyncHandler } from "../errors.js";

export const quizRoutes = Router();

quizRoutes.post(
  "/start",
  asyncHandler(async (req, res) => {
    const { wallet, name } = req.body ?? {};
    try {
      res.json(await startQuiz(wallet, name));
    } catch (err) {
      throw new HttpError(400, (err as Error).message);
    }
  })
);

quizRoutes.post("/:id/answer", (req, res) => {
  const { choice } = req.body ?? {};
  try {
    res.json(answerQuiz(req.params.id, String(choice ?? "")));
  } catch (err) {
    throw new HttpError(400, (err as Error).message);
  }
});

quizRoutes.get("/leaderboard", (_req, res) => {
  res.json({ top: topBoard("quiz") });
});
