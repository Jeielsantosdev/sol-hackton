# oddies-bet — programa Solana (Anchor)

Program ID (devnet): `4Ns6amhKn6D3DXBNDuFPngFM6UpV3N54JNQD5wXAt84E`

## O que é

O `oddies-bet` é o **contrato inteligente (programa Solana)** da plataforma: ele é o
"caixa" on-chain que custodia as apostas dos jogadores e garante, por código, que o
dinheiro só se move segundo as regras do jogo — nem o time nem nenhum jogador consegue
desviar fundos, pagar quem perdeu ou sacar o que pertence aos apostadores.

## Para que serve

Ele implementa o fluxo do diagrama do produto, de ponta a ponta:

1. **Apostar**: o jogador escolhe suas "Oddies" (palpites) e envia SOL. O programa
   divide na hora: **10% vai para a wallet do time** (receita da plataforma) e **90%
   fica trancado num vault** on-chain.
2. **Ticket-NFT**: cada aposta minta um token único (supply 1) na wallet do jogador.
   Esse ticket **é** a aposta — pode ser transferido ou vendido, e quem o segurar no
   fim é quem tem direito ao prêmio.
3. **Validar o resultado**: quando a partida termina, o backend (oráculo) grava o
   outcome vencedor no mercado. Antes do fim da partida, ninguém consegue resolver.
4. **Pagar**: os donos dos tickets vencedores resgatam o prêmio direto do vault,
   queimando o ticket (impossível resgatar duas vezes). Partida cancelada ou sem
   vencedores → todos recuperam o valor líquido apostado.

Serve aos dois modos de jogo da plataforma: **multiplayer** (jogadores apostam uns
contra os outros, pote parimutuel, casa sem risco) e **singleplayer** (jogador contra
a casa, odds fixas, casa banca com liquidez própria e o programa rejeita apostas que
ela não conseguiria pagar).

## Dois modos de mercado

| | `Parimutuel` (multiplayer) | `HouseBacked` (singleplayer) |
|---|---|---|
| Contraparte | Os outros apostadores | A casa (vault do projeto) |
| Payout | `stake_net × pote_total / pool_vencedor` | `stake_net × odds_bps / 10000`, travado na entrada |
| Risco da casa | Zero (só cobra a taxa) | Limitado pela liquidez do vault (`fund_house`) |
| Sem vencedores | Mercado vira `Voided`, todos recuperam o stake líquido | n/a |

## Contas

- `Config` (PDA `["config"]`) — autoridade, wallet do time e taxa em bps (1000 = 10%).
- `Market` (PDA `["market", market_id]`) — fixture, outcomes (2–8), pools, odds, estado.
- `Vault` (PDA `["vault", market]`) — SystemAccount que guarda os SOL apostados; mantém
  um buffer de rent que nunca é distribuído.
- `Bet` (PDA `["bet", market, ticket_mint]`) — outcome, stake líquido, payout fixo.
- `ticket_mint` — SPL mint com supply 1 e decimals 0, mintado para o apostador e com a
  autoridade de mint revogada. **Quem segura o token resgata o prêmio** (aposta é
  transferível/vendável); o token é queimado no resgate.

## Instruções

1. `initialize(fee_bps)` — cria a config global (uma vez).
2. `create_market(market_id, fixture_id, kind, outcome_count, odds_bps, close_ts)` —
   abre o mercado; `close_ts` = início da partida.
3. `fund_house(amount)` — deposita liquidez da casa (obrigatório antes de apostas
   `HouseBacked`; o programa rejeita apostas que o vault não consiga pagar no pior caso).
4. `place_bet(outcome, amount)` — split taxa/líquido, registra a Bet, minta o ticket.
5. `resolve_market(winning_outcome)` — só a autoridade (oráculo v1 = backend lendo a
   TxLINE), só após `close_ts`. Parimutuel sem vencedores vira `Voided`.
6. `cancel_market()` — partida cancelada → todos recuperam o stake líquido.
7. `claim()` — holder do ticket queima o token e recebe o payout do vault.
8. `withdraw_house(amount)` — autoridade saca do vault apenas o que **não** está
   comprometido com apostadores (`outstanding` trava o saque).

## Build, testes e deploy

```bash
cd program
cargo build-sbf                                  # gera target/deploy/oddies_bet.so
RUSTUP_TOOLCHAIN=stable anchor idl build -o target/idl/oddies_bet.json
RUSTUP_TOOLCHAIN=stable anchor test --skip-build # sobe validador local e roda tests/
```

> **Não rode `cargo update` sem cuidado**: o `Cargo.lock` tem pins (blake3, zeroize,
> proc-macro-crate, indexmap, unicode-segmentation) porque o cargo 1.79 dos
> platform-tools da Solana não lê crates edition2024. Se o build-sbf falhar com
> "feature `edition2024` is required", faça downgrade do crate citado com
> `cargo update -p <crate> --precise <versão-antiga>`.

### Deploy devnet

```bash
solana program deploy target/deploy/oddies_bet.so \
  --program-id target/deploy/oddies_bet-keypair.json --url devnet
```

### Deploy mainnet

O custo é ~2.7 SOL de rent do programa (recuperável se fechar o programa) + taxas.

```bash
solana config set --url mainnet-beta
solana balance                                   # precisa de ~3 SOL
solana program deploy target/deploy/oddies_bet.so \
  --program-id target/deploy/oddies_bet-keypair.json --url mainnet-beta
# depois do deploy:
# 1. anchor idl init (opcional, publica o IDL on-chain)
# 2. chamar initialize(fee_bps) com a wallet do time como team_wallet
# 3. apontar o backend/frontend para o program ID e cluster mainnet
```

⚠️ Antes de mainnet com dinheiro real: auditoria/revisão de segurança, e considerar
tornar o programa imutável (`solana program set-upgrade-authority --final`) ou proteger
a upgrade authority com multisig (Squads).

O IDL já está copiado em `server/idl/oddies_bet.json` para o backend consumir com
`@coral-xyz/anchor`.

## Integração com o backend existente

O `server/src/gameService.ts` já sabe quando uma partida termina (`finished: true` via
TxLINE). O fluxo de integração:

1. Cron do backend cria mercados para os fixtures da Copa (`create_market`).
2. Frontend chama `place_bet` direto da wallet do usuário.
3. Quando `finished` chega, o backend (com a keypair de `wallet.ts` como autoridade)
   chama `resolve_market` com o outcome.
4. Frontend mostra "Resgatar prêmio" para quem tem ticket vencedor → `claim`.

## Limitações conhecidas (v1 de hackathon)

- **Oráculo centralizado**: `resolve_market` confia na autoridade. Evolução natural:
  ler a conta do txoracle on-chain (IDL já em `server/idl/`) em vez de confiar no backend.
- **Ticket sem metadata**: o NFT é um SPL mint puro (sem nome/imagem Metaplex). Dá para
  anexar metadata via Metaplex depois, pelo backend, sem mudar o programa.
- Divisão parimutuel trunca lamports (sobras ficam no vault e podem ser varridas com
  `withdraw_house` após todos os claims).
