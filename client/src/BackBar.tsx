import { useLang } from "./i18n";
import chainplayLogo from "./assets/chainplay-logo.png";

export interface BackBarAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

/**
 * Barra mínima das telas internas de jogo: logo + "Voltar aos jogos".
 * Substitui o navbar completo (só a Landing e o Hub têm navbar cheio).
 * O slot `action` à direita fica reservado pro botão de conta/wallet, que
 * é chrome de conta — as ações do jogo (Play Again, Como jogar) vivem na tela.
 */
export default function BackBar({ action }: { action?: BackBarAction }) {
  const { t } = useLang();

  const actionEl = action ? (
    action.href ? (
      <a className="btn primary small" href={action.href}>
        {action.label}
      </a>
    ) : (
      <button className="btn primary small nav-cta-btn" onClick={action.onClick}>
        {action.label}
      </button>
    )
  ) : null;

  return (
    <nav className="backbar">
      <a className="logo" href="#/" aria-label="ChainPlay">
        <img src={chainplayLogo} alt="ChainPlay" className="logo-img" />
      </a>

      <a className="backbar-back" href="#/jogos">
        <span aria-hidden="true">‹</span> {t.nav.backToGames}
      </a>

      <div className="backbar-action">{actionEl}</div>
    </nav>
  );
}
