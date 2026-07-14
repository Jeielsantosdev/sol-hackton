import { Router } from "express";
import { topBoard } from "../../games/leaderboard.js";
import { answerQuiz, startQuiz } from "../../games/quiz.js";
import { asyncHandler } from "../errors.js";

export const quizRoutes = Router();

quizRoutes.post(
  "/start",
  asyncHandler(async (req, res) => {
    const { wallet, name } = req.body ?? {};
    res.json(await startQuiz(wallet, name));
  }),
);

quizRoutes.post("/:id/answer", (req, res) => {
  const { choice } = req.body ?? {};
  res.json(answerQuiz(req.params.id, String(choice ?? "")));
});

quizRoutes.get("/leaderboard", (_req, res) => {
  res.json({ top: topBoard("quiz") });
});
