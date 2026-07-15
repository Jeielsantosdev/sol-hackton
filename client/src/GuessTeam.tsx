import { useEffect, useRef, useState } from "react";
import Navbar from "./Navbar";
import { useLang } from "./i18n";
import { LoginPanel, useAccount, useAccountCta } from "./chain/account";
import { api } from "./chain/http";
import HowTo from "./components/HowTo";
import Leaderboard from "./components/Leaderboard";
import { celebrateCorrect, celebrateWin } from "./celebration";
import { playSfx } from "./sfx";
import { teamFlag } from "./flags";

/* Guess the Team (Fase 5): quiz de 5 rodadas contra o motor server-side
   (/api/quiz) — o raio-X estatístico de uma seleção e 4 opções; a resposta
   certa só existe no servidor (mesma regra de ouro anti-fraude das runs). */

interface RoundView {
  id: string;
  round: number;
  totalRounds: number;
  score: number;
  streak: number;
  expiresAt: number; // epoch ms
  options: string[];
  clues: {
    stage?: string;
    goalsFor: number;
    goalsAgainst: number;
    corners: number;
    yellowCards: number;
    possession: number;
  };
}

interface AnswerView {
  correct: boolean;
  late: boolean;
  points: number;
  answer: string;
  opponent: string;
  score: number;
  streak: number;
  finished: boolean;
  next: RoundView | null;
}

export default function GuessTeam() {
  const { t } = useLang();
  const account = useAccount();
  const accountCta = useAccountCta();

  const [round, setRound] = useState<RoundView | null>(null);
  const [outcome, setOutcome] = useState<AnswerView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [leftMs, setLeftMs] = useState(0);
  const [totalMs, setTotalMs] = useState(1);
  const [lbKey, setLbKey] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    document.title = t.quiz.docTitle;
  }, [t]);

  useEffect(() => () => window.clearInterval(timer.current), []);

  // countdown da rodada: barra de tensão + auto-timeout (registra como erro)
  useEffect(() => {
    if (!round || outcome) return;
    const id = window.setInterval(() => {
      const left = round.expiresAt - Date.now();
      setLeftMs(Math.max(0, left));
      if (left <= 0) {
        window.clearInterval(id);
        answer("");
      }
    }, 100);
    timer.current = id;
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, outcome]);

  function adoptRound(r: RoundView) {
    setRound(r);
    setOutcome(null);
    const total = r.expiresAt - Date.now();
    setTotalMs(Math.max(1, total));
    setLeftMs(Math.max(0, total));
  }

  async function start() {
    if (!account.address) return;
    setBusy(true);
    setError("");
    try {
      const r: RoundView = await api("/api/quiz/start", {
        wallet: account.address,
        name: account.displayName ?? undefined,
      });
      adoptRound(r);
      playSfx("click");
    } catch (e) {
      console.error("[quiz] start falhou:", e);
      setError(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function answer(choice: string) {
    if (!round || outcome) return;
    window.clearInterval(timer.current);
    try {
      const res: AnswerView = await api(`/api/quiz/${round.id}/answer`, { choice });
      setOutcome(res);
      if (res.finished) setLbKey((k) => k + 1);
      if (res.correct) {
        if (res.streak >= 3) celebrateWin();
        else celebrateCorrect(res.streak);
        playSfx(res.streak >= 3 ? "win" : "correct");
      } else {
        playSfx("wrong");
      }
    } catch (e) {
      console.error("[quiz] answer falhou:", e);
      setError(String((e as Error).message));
      setRound(null);
    }
  }

  const pct = Math.round((leftMs / totalMs) * 100);
  const clueLabels = t.quiz.clues;

  return (
    <div className="game-page">
      <Navbar
        links={[
          { label: t.nav.home, href: "#/" },
          { label: t.nav.games, href: "#/jogos" },
          { label: t.nav.wallet, href: "#/carteira" },
        ]}
        cta={
          accountCta ?? {
            label: account.busy ? t.staked.connecting : t.staked.connect,
            onClick: () => account.connectWallet(),
          }
        }
      />

      <div className="shell">
        <header className="game-hero">
          <h1 className="game-question">{t.quiz.title}</h1>
          <p className="game-sub">{t.quiz.sub}</p>
        </header>

        <HowTo steps={t.howto.quiz.steps} profit={t.howto.quiz.profit} />

        {error && <p className="dim center run-error">⚠️ {error}</p>}
        {!account.address && <LoginPanel note={t.quiz.connectFirst} />}

        {account.address && !round && (
          <div className="endgame">
            <button className="primary staked-cta" disabled={busy} onClick={start}>
              {t.quiz.start}
            </button>
          </div>
        )}

        {round && (
          <div className="card arcade-card">
            <p className="mono center dim">
              {t.quiz.roundLabel(round.round, round.totalRounds)} ·{" "}
              {t.quiz.finalScore(outcome?.score ?? round.score)}
            </p>

            {!outcome ? (
              <>
                <h2 className="arcade-question">{t.quiz.whoPlayed}</h2>
                <div
                  className={`arcade-timer ${pct < 35 ? "urgent" : ""}`}
                  role="timer"
                  aria-label={`${Math.ceil(leftMs / 1000)}s`}
                >
                  <div className="arcade-timer-fill" style={{ width: `${pct}%` }} />
                </div>

                <dl className="quiz-clues">
                  {round.clues.stage && (
                    <div className="quiz-clue">
                      <dt>{clueLabels.stage}</dt>
                      <dd>{round.clues.stage}</dd>
                    </div>
                  )}
                  <div className="quiz-clue">
                    <dt>{clueLabels.goalsFor}</dt>
                    <dd className="mono">{round.clues.goalsFor}</dd>
                  </div>
                  <div className="quiz-clue">
                    <dt>{clueLabels.goalsAgainst}</dt>
                    <dd className="mono">{round.clues.goalsAgainst}</dd>
                  </div>
                  <div className="quiz-clue">
                    <dt>{clueLabels.corners}</dt>
                    <dd className="mono">{round.clues.corners}</dd>
                  </div>
                  <div className="quiz-clue">
                    <dt>{clueLabels.yellowCards}</dt>
                    <dd className="mono">{round.clues.yellowCards}</dd>
                  </div>
                  <div className="quiz-clue">
                    <dt>{clueLabels.possession}</dt>
                    <dd className="mono">{round.clues.possession}%</dd>
                  </div>
                </dl>

                <div className="quiz-options">
                  {round.options.map((team) => (
                    <button key={team} className="quiz-option" onClick={() => answer(team)}>
                      <span aria-hidden="true">{teamFlag(team)}</span> {team}
                    </button>
                  ))}
                </div>
                {round.streak > 0 && (
                  <p className="mono center">{t.arcade.streakChip(round.streak)}</p>
                )}
              </>
            ) : (
              <div className="arcade-result">
                <p className={`arcade-verdict ${outcome.correct ? "ok" : "bad"}`}>
                  {outcome.late
                    ? t.quiz.tooLate
                    : outcome.correct
                    ? t.quiz.hit(outcome.points)
                    : t.quiz.missWas(outcome.answer)}
                </p>
                <p className="dim">
                  {teamFlag(outcome.answer)} {outcome.answer}{" "}
                  {t.quiz.vsWas(outcome.opponent)}
                  {outcome.streak > 0 && <> · {t.arcade.streakChip(outcome.streak)}</>}
                </p>
                {outcome.finished ? (
                  <>
                    <p className="mono center">{t.quiz.finalScore(outcome.score)}</p>
                    <button className="primary" onClick={start} disabled={busy}>
                      {t.quiz.playAgain}
                    </button>
                  </>
                ) : (
                  <button
                    className="primary"
                    onClick={() => outcome.next && adoptRound(outcome.next)}
                  >
                    {t.quiz.next}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <Leaderboard url="/api/quiz/leaderboard" you={account.address} refreshKey={lbKey} />

        <footer>{t.game.gameFooter}</footer>
      </div>
    </div>
  );
}
