import { useEffect, useRef, useState } from "react";
import markIcon from "./assets/mark.png";

/* ---------- dados estáticos de apresentação ---------- */

const TICKER = [
  { match: "Brasil 2×1 Argentina", stat: "🚩 11 escanteios", kind: "corner" },
  { match: "França 0×0 Japão", stat: "🟨 3 amarelos", kind: "card" },
  { match: "EUA 3×2 México", stat: "⚽ 5 gols", kind: "goal" },
  { match: "Espanha 1×1 Alemanha", stat: "🕐 54% posse", kind: "poss" },
  { match: "Marrocos 2×0 Croácia", stat: "🚩 7 escanteios", kind: "corner" },
  { match: "Inglaterra 4×1 Gana", stat: "⚽ 5 gols", kind: "goal" },
  { match: "Portugal 2×2 Uruguai", stat: "🟨 6 amarelos", kind: "card" },
  { match: "Senegal 1×0 Polônia", stat: "🕐 48% posse", kind: "poss" },
];

// grade de negações, estilo "o que o produto NÃO é"
const NOTS = [
  "Apostas com dinheiro real",
  "Cadastro ou e-mail",
  "Carteira cripto obrigatória",
  "Pay-to-win",
  "Instalação de app",
  "Letras miúdas",
];

const STEPS = [
  {
    n: "01",
    icon: "📊",
    title: "Veja a última partida",
    text: "Mostramos uma estatística real do jogo anterior da Copa: gols, escanteios, cartões ou posse de bola — direto do feed TxLINE.",
  },
  {
    n: "02",
    icon: "🎯",
    title: "Palpite: maior ou menor?",
    text: "A próxima partida terá um número MAIOR ⬆ ou MENOR ⬇? Uma pergunta, um toque, zero fricção.",
  },
  {
    n: "03",
    icon: "🔥",
    title: "Monte sua sequência",
    text: "Cada acerto aumenta a streak. Errou, acabou — compartilhe o placar em um toque e desafie os amigos.",
  },
];

const FEATURES = [
  {
    icon: "⛓️",
    title: "Dados verificáveis on-chain",
    text: "Estatísticas via TxLINE (TxODDS) com ancoragem criptográfica na Solana. Qualquer um pode auditar — nada de números inventados.",
  },
  {
    icon: "🏆",
    title: "104 jogos da Copa 2026",
    text: "Da fase de grupos à final: a campanha inteira vira tabuleiro. A cada rodada real, novo conteúdo — o jogo cresce com o torneio.",
  },
  {
    icon: "🔁",
    title: "Rejogável ao infinito",
    text: "Categorias sorteadas a cada run com seed determinística. Seu recorde fica salvo — sempre há uma sequência maior para buscar.",
  },
  {
    icon: "📱",
    title: "Feito para a arquibancada",
    text: "Zero cadastro, zero instalação, zero jargão. Abre no navegador do celular e roda em segundos — no intervalo do jogo.",
  },
  {
    icon: "⚡",
    title: "Tempo real de verdade",
    text: "O feed TxLINE atualiza as estatísticas conforme a bola rola. O tabuleiro de hoje não é o mesmo de ontem.",
  },
  {
    icon: "🤝",
    title: "Viral por natureza",
    text: "O placar compartilhável transforma cada derrota em convite: “fiz 7 seguidas, duvido você passar”.",
  },
];

const PIPELINE = [
  {
    n: "1",
    title: "TxLINE Feed",
    sub: "TxODDS · schema normalizado",
    text: "Estatísticas ao vivo dos 104 jogos: gols, escanteios, cartões e posse, num único JSON para todas as competições.",
  },
  {
    n: "2",
    title: "Solana Devnet",
    sub: "programa txoracle",
    text: "Assinatura do free tier via transação subscribe on-chain — o acesso aos dados é provado criptograficamente.",
  },
  {
    n: "3",
    title: "Backend Node",
    sub: "normalização + cache",
    text: "Decodifica o encoding (period·1000 + stat_key), monta as rodadas e serve o jogo com fallback resiliente.",
  },
  {
    n: "4",
    title: "Você joga",
    sub: "React · zero fricção",
    text: "Interface instantânea no navegador. Palpite, reveal animado, streak e share — tudo em menos de 5 segundos por rodada.",
  },
];

const ROADMAP = [
  {
    tag: "Agora",
    title: "Free to play",
    text: "Aquisição viral via placar compartilhável durante a Copa 2026 — o maior evento de audiência do planeta.",
    live: true,
  },
  {
    tag: "Fase 2",
    title: "Ligas privadas",
    text: "Bolões entre amigos com leaderboard ao vivo. Modelo freemium: liga básica grátis, personalização paga.",
    live: false,
  },
  {
    tag: "Fase 3",
    title: "Streaks on-chain",
    text: "Recordes mintados como colecionáveis na Solana e torneios patrocinados com premiação em stablecoin.",
    live: false,
  },
  {
    tag: "Sempre",
    title: "Além da Copa",
    text: "O schema único da TxLINE permite escalar o mesmo jogo para ligas nacionais, Champions e qualquer esporte do feed.",
    live: false,
  },
];

/* ---------- teaser jogável do hero ---------- */

interface TeaserRound {
  prev: { teams: string; value: number };
  next: { teams: string; value: number };
  cat: string;
}

const TEASER_ROUNDS: TeaserRound[] = [
  {
    prev: { teams: "Brasil vs Argentina", value: 11 },
    next: { teams: "França vs Japão", value: 8 },
    cat: "🚩 Escanteios",
  },
  {
    prev: { teams: "França vs Japão", value: 2 },
    next: { teams: "EUA vs México", value: 5 },
    cat: "⚽ Gols",
  },
  {
    prev: { teams: "EUA vs México", value: 4 },
    next: { teams: "Espanha vs Alemanha", value: 6 },
    cat: "🟨 Cartões amarelos",
  },
];

function HeroTeaser() {
  const [round, setRound] = useState(0);
  const [streak, setStreak] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<"ok" | "bad" | null>(null);
  const [done, setDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const r = TEASER_ROUNDS[round];

  function guess(dir: "higher" | "lower") {
    if (revealed || done) return;
    const correct =
      dir === "higher" ? r.next.value > r.prev.value : r.next.value < r.prev.value;
    setRevealed(true);
    setResult(correct ? "ok" : "bad");
    if (correct) setStreak((s) => s + 1);
    timer.current = window.setTimeout(() => {
      if (!correct || round === TEASER_ROUNDS.length - 1) {
        setDone(true);
      } else {
        setRound(round + 1);
        setRevealed(false);
        setResult(null);
      }
    }, 1400);
  }

  if (done) {
    return (
      <div className="hero-teaser teaser-done">
        <span className="teaser-done-emoji">{streak > 0 ? "🔥" : "😅"}</span>
        <strong>
          {streak > 0
            ? `Sequência de ${streak} no aquecimento!`
            : "O aquecimento acabou rápido…"}
        </strong>
        <p>Isso foi só uma amostra. No jogo de verdade são 104 partidas com dados reais.</p>
        <a className="btn primary" href="#/jogar">
          Jogar a versão completa →
        </a>
      </div>
    );
  }

  return (
    <div className="hero-teaser">
      <div className="teaser-head">
        <span className="teaser-title">
          <span className="live-dot" /> Aquecimento — jogue agora
        </span>
        <span className="teaser-streak mono">🔥 {streak}</span>
      </div>

      <div className="teaser-cat">{r.cat}</div>

      <div className="hero-preview">
        <div className="preview-card">
          <span className="preview-label">Última partida</span>
          <span className="preview-teams">{r.prev.teams}</span>
          <span className="preview-value mono">{r.prev.value}</span>
        </div>

        <div className="preview-vs">
          <button
            className="pill-btn hi"
            onClick={() => guess("higher")}
            disabled={revealed}
          >
            ⬆ MAIOR
          </button>
          <button
            className="pill-btn lo"
            onClick={() => guess("lower")}
            disabled={revealed}
          >
            ⬇ MENOR
          </button>
        </div>

        <div className={`preview-card ${revealed ? "" : "dashed"}`}>
          <span className="preview-label">Próxima partida</span>
          <span className="preview-teams">{r.next.teams}</span>
          <span
            className={`preview-value mono ${
              revealed ? (result === "ok" ? "flip-ok" : "flip-bad") : "accent"
            }`}
          >
            {revealed ? r.next.value : "?"}
          </span>
        </div>
      </div>

      <div className={`teaser-feedback ${result ?? ""}`}>
        {result === "ok" && "✓ Acertou! Próxima rodada…"}
        {result === "bad" && "✗ Errou! No jogo real, a run acabaria aqui."}
        {!result && "Toque em MAIOR ou MENOR para palpitar"}
      </div>
    </div>
  );
}

/* ---------- demo automática didática ---------- */

interface DemoRound {
  cat: string;
  unit: string;
  prevTeams: string;
  prev: number;
  nextTeams: string;
  next: number;
  pick: "higher" | "lower";
}

const DEMO_ROUNDS: DemoRound[] = [
  {
    cat: "🚩 Escanteios",
    unit: "escanteios",
    prevTeams: "Brasil vs Argentina",
    prev: 11,
    nextTeams: "França vs Japão",
    next: 8,
    pick: "lower",
  },
  {
    cat: "⚽ Gols",
    unit: "gols",
    prevTeams: "França vs Japão",
    prev: 2,
    nextTeams: "EUA vs México",
    next: 5,
    pick: "higher",
  },
  {
    cat: "🟨 Cartões amarelos",
    unit: "cartões",
    prevTeams: "EUA vs México",
    prev: 6,
    nextTeams: "Espanha vs Alemanha",
    next: 3,
    pick: "lower",
  },
];

type DemoStage = "look" | "press" | "reveal" | "done";

function AutoDemo() {
  const [i, setI] = useState(0);
  const [stage, setStage] = useState<DemoStage>("look");
  const [streak, setStreak] = useState(0);
  const [running, setRunning] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  // só anima quando o bloco está visível na tela
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setRunning(e.isIntersecting),
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!running) return;
    const durations: Record<DemoStage, number> = {
      look: 1400,
      press: 800,
      reveal: 1700,
      done: 2400,
    };
    const t = window.setTimeout(() => {
      if (stage === "look") {
        setStage("press");
      } else if (stage === "press") {
        setStreak((s) => s + 1);
        setStage("reveal");
      } else if (stage === "reveal") {
        if (i === DEMO_ROUNDS.length - 1) {
          setStage("done");
        } else {
          setI(i + 1);
          setStage("look");
        }
      } else {
        setI(0);
        setStreak(0);
        setStage("look");
      }
    }, durations[stage]);
    return () => window.clearTimeout(t);
  }, [stage, i, running]);

  const r = DEMO_ROUNDS[i];
  const revealed = stage === "reveal" || stage === "done";
  const pickLabel = r.pick === "higher" ? "MAIOR ⬆" : "MENOR ⬇";

  const caption =
    stage === "look" ? (
      <>
        <b>Passo 1</b> — veja a última partida: <b>{r.prev} {r.unit}</b>
      </>
    ) : stage === "press" ? (
      <>
        <b>Passo 2</b> — palpite: a próxima vem <b>{pickLabel}</b>
      </>
    ) : stage === "reveal" ? (
      <>
        <b>Passo 3</b> — foram <b>{r.next} {r.unit}</b>: acertou! 🔥 sobe para{" "}
        <b>{streak}</b>
      </>
    ) : (
      <>
        🔥 Sequência de <b>{streak}</b>! No jogo real, você segue até errar.
      </>
    );

  return (
    <div className="demo-board" ref={boardRef} aria-hidden="true">
      <div className="teaser-head">
        <span className="teaser-title">
          <span className="live-dot" /> Rodada de exemplo — assista
        </span>
        <span className="teaser-streak mono">🔥 {streak}</span>
      </div>

      <div className="teaser-cat">{r.cat}</div>

      <div className="hero-preview">
        <div className="preview-card">
          <span className="preview-label">Última partida</span>
          <span className="preview-teams">{r.prevTeams}</span>
          <span className="preview-value mono">{r.prev}</span>
        </div>

        <div className="preview-vs">
          <span
            className={`pill-btn static hi ${
              stage !== "look" && r.pick === "higher" ? "demo-press" : ""
            } ${stage !== "look" && r.pick !== "higher" ? "demo-dim" : ""}`}
          >
            ⬆ MAIOR
            {r.pick === "higher" && stage === "press" && (
              <span className="demo-cursor">👆</span>
            )}
          </span>
          <span
            className={`pill-btn static lo ${
              stage !== "look" && r.pick === "lower" ? "demo-press" : ""
            } ${stage !== "look" && r.pick !== "lower" ? "demo-dim" : ""}`}
          >
            ⬇ MENOR
            {r.pick === "lower" && stage === "press" && (
              <span className="demo-cursor">👆</span>
            )}
          </span>
        </div>

        <div className={`preview-card ${revealed ? "" : "dashed"}`}>
          <span className="preview-label">Próxima partida</span>
          <span className="preview-teams">{r.nextTeams}</span>
          <span
            className={`preview-value mono ${revealed ? "flip-ok" : "accent"}`}
          >
            {revealed ? r.next : "?"}
          </span>
        </div>
      </div>

      <div className="demo-caption" key={`${i}-${stage}`}>
        {caption}
      </div>
    </div>
  );
}

/* ---------- contador animado ---------- */

function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const dur = 1100;
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / dur);
          // ease-out cúbico para desacelerar no final
          setVal(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);

  return (
    <strong ref={ref}>
      {val}
      {suffix}
    </strong>
  );
}

/* ---------- reveal on scroll ---------- */

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ---------- página ---------- */

export default function Landing() {
  useReveal();

  return (
    <div className="landing">
      <nav className="topbar">
        <span className="logo">
          <img className="logo-mark" src={markIcon} alt="Hi-Lo Stats" />
          Hi-Lo <span className="accent">Stats</span>
        </span>
        <div className="topbar-links">
          <a href="#como-funciona">Como funciona</a>
          <a href="#tecnologia">Tecnologia</a>
          <a href="#roadmap">Visão</a>
        </div>
        <a className="btn primary small" href="#/jogar">
          Jogar agora
        </a>
      </nav>

      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <span className="badge">
          <span className="live-dot" /> Copa 2026 · dados ao vivo TxLINE · Solana
        </span>
        <h1>
          A próxima partida vem <span className="accent">MAIOR</span> ou{" "}
          <span className="muted-strike">menor</span>?
        </h1>
        <p className="lead">
          O jogo de palpites com estatísticas reais da Copa do Mundo 2026,
          verificáveis on-chain. Uma pergunta por rodada, 104 jogos, uma
          sequência para defender.
        </p>
        <div className="hero-actions">
          <a className="btn primary big" href="#/jogar">
            ⚽ Jogar agora — é grátis
          </a>
          <a className="btn ghost big" href="#como-funciona">
            Como funciona ↓
          </a>
        </div>

        <HeroTeaser />

        <div className="stats-strip mono">
          <div>
            <CountUp to={104} />
            <span>jogos da Copa</span>
          </div>
          <div>
            <CountUp to={4} />
            <span>categorias de stats</span>
          </div>
          <div>
            <strong>&lt;5s</strong>
            <span>por rodada</span>
          </div>
          <div>
            <strong>0</strong>
            <span>cadastros exigidos</span>
          </div>
        </div>
      </section>

      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span className="ticker-item" key={i}>
              <span className="ticker-match">{t.match}</span>
              <span className={`ticker-chip mono k-${t.kind}`}>{t.stat}</span>
            </span>
          ))}
        </div>
      </div>

      <section className="section reveal" id="como-funciona">
        <span className="section-kicker mono">// gameplay</span>
        <h2>
          Como funciona <span className="accent">em 3 passos</span>
        </h2>
        <p className="section-lead">
          Pensado para o torcedor comum: se você entende “maior ou menor”, você
          já sabe jogar.
        </p>
        <div className="grid-3">
          {STEPS.map((s) => (
            <article className="feature-card" key={s.n}>
              <span className="step-n mono">{s.n}</span>
              <span className="feature-icon">{s.icon}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
        <AutoDemo />
      </section>

      <section className="section reveal">
        <span className="section-kicker mono">// por quê</span>
        <h2>
          Por que o <span className="accent">Hi-Lo Stats</span>?
        </h2>
        <p className="section-lead">
          Dados que antes só os grandes operadores tinham, transformados num
          jogo que qualquer torcedor abre no intervalo.
        </p>
        <div className="grid-3">
          {FEATURES.map((f) => (
            <article className="feature-card" key={f.title}>
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section reveal" id="tecnologia">
        <span className="section-kicker mono">// arquitetura</span>
        <h2>
          Do gramado à sua tela, <span className="accent">com prova on-chain</span>
        </h2>
        <p className="section-lead">
          Cada estatística percorre um pipeline auditável: feed TxLINE,
          autenticação on-chain na Solana e entrega em tempo real.
        </p>
        <div className="pipeline">
          {PIPELINE.map((p, i) => (
            <article className="pipe-card" key={p.n}>
              <div className="pipe-head">
                <span className="pipe-n mono">{p.n}</span>
                <div>
                  <h3>{p.title}</h3>
                  <span className="pipe-sub mono">{p.sub}</span>
                </div>
              </div>
              <p>{p.text}</p>
              {i < PIPELINE.length - 1 && (
                <span className="pipe-arrow" aria-hidden="true">
                  →
                </span>
              )}
            </article>
          ))}
        </div>
        <div className="tech-badges mono">
          <span>TxLINE API</span>
          <span>Solana devnet</span>
          <span>programa txoracle</span>
          <span>Node.js</span>
          <span>React + Vite</span>
        </div>
      </section>

      <section className="section reveal" id="roadmap">
        <span className="section-kicker mono">// visão de produto</span>
        <h2>
          Começa na Copa. <span className="accent">Não termina nela.</span>
        </h2>
        <p className="section-lead">
          O Hi-Lo Stats é a porta de entrada de um modelo de jogos casuais
          sobre dados esportivos verificáveis.
        </p>
        <div className="roadmap">
          {ROADMAP.map((r) => (
            <article className={`road-card ${r.live ? "live" : ""}`} key={r.title}>
              <span className={`road-tag mono ${r.live ? "live" : ""}`}>
                {r.live && <span className="live-dot" />}
                {r.tag}
              </span>
              <h3>{r.title}</h3>
              <p>{r.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section reveal">
        <span className="section-kicker mono">// sem pegadinha</span>
        <h2>
          O que o Hi-Lo Stats <span className="accent">não</span> é
        </h2>
        <p className="section-lead">
          Jogo gratuito de entretenimento sobre dados reais. Nada além disso.
        </p>
        <div className="not-grid">
          {NOTS.map((n) => (
            <div className="not-card" key={n}>
              <span className="not-x mono">×</span>
              {n}
            </div>
          ))}
        </div>
      </section>

      <section className="cta-final reveal">
        <span className="badge">
          <span className="live-dot" /> A Copa está rolando
        </span>
        <h2>Pronto para testar seu faro de futebol?</h2>
        <p className="lead">
          Sem cadastro, sem instalação. Um clique e a bola rola.
        </p>
        <a className="btn primary big" href="#/jogar">
          Começar a jogar →
        </a>
      </section>

      <footer className="landing-footer">
        <div className="footer-grid">
          <div className="footer-col">
            <span className="logo">
              ⚽ Hi-Lo <span className="accent">Stats</span>
            </span>
            <p>
              Jogo de palpites com estatísticas reais da Copa 2026, dados
              TxLINE e verificação na Solana.
            </p>
          </div>
          <div className="footer-col">
            <strong>Produto</strong>
            <a href="#/jogar">Jogar</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#roadmap">Visão</a>
          </div>
          <div className="footer-col">
            <strong>Tecnologia</strong>
            <a href="https://txline.txodds.com" target="_blank" rel="noreferrer">
              TxLINE (TxODDS)
            </a>
            <a href="https://solana.com" target="_blank" rel="noreferrer">
              Solana
            </a>
            <a href="#tecnologia">Arquitetura</a>
          </div>
        </div>
        <div className="footer-note">
          Hackathon TxODDS × Solana · Copa 2026 — jogo gratuito de
          entretenimento; não envolve apostas com dinheiro real.
        </div>
      </footer>
    </div>
  );
}
