import { useEffect, useRef, useState } from "react";
import Navbar from "./Navbar";
import { useLang } from "./i18n";
import { LoginPanel, useAccount, useAccountCta } from "./chain/account";
import Leaderboard from "./components/Leaderboard";
import { celebrateCorrect, celebrateWin } from "./celebration";
import { playSfx } from "./sfx";
import { teamFlag } from "./flags";

/* Motor arcade dos eventos relâmpago: Penalty Predictor (e, com a mesma UI,
   o Live Challenge quando sair de "em construção"). Modo demo: o server
   simula o evento com probabilidades reais e guarda o resultado secreto. */

type ArcadeGame = "penalty" | "live";

interface ArcadeEvent {
  id: string;
  game: ArcadeGame;
  home: string;
  away: string;
  kind: "penalty" | "nextGoal" | "corner" | "card";
  minute: number;
  expiresAt: number; // epoch ms
  reward: [number, number];
  streak: number;
}

interface Outcome {
  correct: boolean;
  late: boolean;
  secret: number;
  points: number;
  streak: number;
}

export default function Arcade({ game }: { game: ArcadeGame }) {
  const { t } = useLang();
  const account = useAccount();
  const accountCta = useAccountCta();
  const texts = game === "penalty" ? t.arcade.penalty : t.arcade.live;

  const [event, setEvent] = useState<ArcadeEvent | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [leftMs, setLeftMs] = useState(0);
  const [totalMs, setTotalMs] = useState(1);
  const [lbKey, setLbKey] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    document.title = texts.docTitle;
  }, [texts]);

  useEffect(() => () => window.clearInterval(timer.current), []);

  // countdown do evento: barra de tensão + auto-timeout
  useEffect(() => {
    if (!event || outcome) return;
    const id = window.setInterval(() => {
      const left = event.expiresAt - Date.now();
      setLeftMs(Math.max(0, left));
      if (left <= 0) {
        window.clearInterval(id);
        answer(-1); // estourou: registra como erro e zera a sequência
      }
    }, 100);
    timer.current = id;
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, outcome]);

  async function next() {
    if (!account.address) return;
    setBusy(true);
    setError("");
    setOutcome(null);
    try {
      const res = await fetch(`/api/arcade/${game}/next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: account.address }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setEvent(json);
      const total = json.expiresAt - Date.now();
      setTotalMs(Math.max(1, total));
      setLeftMs(Math.max(0, total));
      playSfx("click");
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function answer(choice: number) {
    if (!event || outcome) return;
    window.clearInterval(timer.current);
    try {
      const res = await fetch(`/api/arcade/${game}/answer/${event.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice, name: account.displayName ?? undefined }),
      });
      const json: Outcome = await res.json();
      if (!res.ok) throw new Error((json as any).error ?? `HTTP ${res.status}`);
      setOutcome(json);
      setLbKey((k) => k + 1);
      if (json.correct) {
        if (json.streak >= 3) celebrateWin();
        else celebrateCorrect(json.streak);
        playSfx(json.streak >= 3 ? "win" : "correct");
      } else {
        playSfx("wrong");
      }
    } catch (e) {
      setError(String((e as Error).message));
      setEvent(null);
    }
  }

  const pct = Math.round((leftMs / totalMs) * 100);

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
          <h1 className="game-question">{texts.title}</h1>
          <p className="game-sub">{texts.sub}</p>
        </header>

        {error && <p className="dim center run-error">⚠️ {error}</p>}
        {!account.address && <LoginPanel note={t.arcade.connectFirst} />}

        {account.address && !event && (
          <div className="endgame">
            <button className="primary staked-cta" disabled={busy} onClick={next}>
              {texts.start}
            </button>
            <p className="dim devnet-note">{t.arcade.demoNote}</p>
          </div>
        )}

        {event && (
          <div className="card arcade-card">
            <p className="arcade-event">
              <span aria-hidden="true">{teamFlag(event.home)}</span>{" "}
              {texts.event(event.home, event.away, event.minute)}{" "}
              <span aria-hidden="true">{teamFlag(event.away)}</span>
            </p>
            <h2 className="arcade-question">{t.arcade.questions[event.kind]}</h2>

            {!outcome ? (
              <>
                <div
                  className={`arcade-timer ${pct < 35 ? "urgent" : ""}`}
                  role="timer"
                  aria-label={`${Math.ceil(leftMs / 1000)}s`}
                >
                  <div className="arcade-timer-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="guess-buttons arcade-buttons">
                  <button className="hi" onClick={() => answer(0)}>
                    {texts.optA}
                    <small>{t.arcade.rewardChip(event.reward[0])}</small>
                  </button>
                  <button className="lo" onClick={() => answer(1)}>
                    {texts.optB}
                    <small>{t.arcade.rewardChip(event.reward[1])}</small>
                  </button>
                </div>
                {event.streak > 0 && (
                  <p className="mono center">{t.arcade.streakChip(event.streak)}</p>
                )}
              </>
            ) : (
              <div className="arcade-result">
                <p className={`arcade-verdict ${outcome.correct ? "ok" : "bad"}`}>
                  {outcome.late
                    ? t.arcade.tooLate
                    : outcome.correct
                    ? t.arcade.hit(outcome.points)
                    : t.arcade.miss}
                </p>
                <p className="dim">
                  {outcome.secret === 0 ? texts.optA : texts.optB}
                  {outcome.streak > 0 && <> · {t.arcade.streakChip(outcome.streak)}</>}
                </p>
                <button className="primary" onClick={next}>
                  {t.arcade.next}
                </button>
              </div>
            )}
          </div>
        )}

        <Leaderboard
          url={`/api/arcade/${game}/leaderboard`}
          you={account.address}
          refreshKey={lbKey}
        />

        <footer>{t.game.gameFooter}</footer>
      </div>
    </div>
  );
}
