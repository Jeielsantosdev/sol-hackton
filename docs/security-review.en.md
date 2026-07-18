# Security review — ChainPlay / oddies-bet

> Performed on 2026-07-11 against `program/programs/oddies-bet/src/lib.rs` (deployed
> on devnet as `F4xhKysY8SrNwfqLZxyuJrZCWW8KPVbTjZWb4HHtD4ZA`) and against the
> `server/` API. Methodology: a 6-pattern Solana vulnerability scan (Trail of Bits
> patterns), manual review of the economic/state model, the Anchor suite (26 tests,
> incl. fuzzing with fast-check) and the API E2E suite against real devnet
> (25 assertions — `npm run e2e:full`).
>
> **Update 2026-07-14 — see section 4** (contract changes for per-game NFT identity
> and new findings from the adversarial-testing round). The program ID did not
> change: every deploy was an *in-place upgrade*.

## 1. Contract — Solana pattern scan

| # | Pattern | Severity | Result |
|---|---|---|---|
| 1 | Arbitrary CPI (user-controlled program ID) | CRITICAL | ✅ **Not affected.** All CPIs use typed accounts `Program<'info, System>` / `Program<'info, Token>` — Anchor validates the program ID. No raw `invoke()`. |
| 2 | PDA without canonical bump | CRITICAL | ✅ **Not affected.** `config`, `market`, `vault` and `bet` use Anchor `seeds`+`bump`; canonical bumps are stored in state at creation (`ctx.bumps`) and reused (`bump = market.bump` etc.). PDA signatures (`transfer_from_vault`, ticket mint) use the stored bumps. |
| 3 | Missing ownership check | HIGH | ✅ **Not affected.** All data accounts are `Account<'info, T>` (owner + discriminator validated). The three `UncheckedAccount`s are only the `team_wallet`, always pinned: `address = config.team_wallet` (PlaceBet), `has_one = team_wallet` (WithdrawHouse), and in Initialize it is input from the authority itself. |
| 4 | Missing signer check | CRITICAL | ✅ **Not affected.** Every administrative operation requires `Signer` + `has_one = authority` against the config. `initialize` is gated on the **program's upgrade authority** via a `program_data` constraint (prevents initialization front-running — covered by a test). `bettor`/`claimer` are Signers. |
| 5 | Spoofed sysvar (pre-1.8.1) | HIGH | ✅ **N/A.** The only sysvar is a typed `Sysvar<'info, Rent>`; current toolchain. |
| 6 | Unsafe instruction introspection | MEDIUM | ✅ **N/A.** No introspection used. |

### Economic / state review (manual)

- **Double-claim**: impossible — `bet.claimed` + the NFT ticket burned on claim
  (tested on-chain: a second claim fails).
- **HouseBacked solvency**: `place_bet` recomputes the worst case (`max` of the
  liabilities) and requires vault coverage **including** the incoming stake; a
  26-case fuzz run confirms the house never accepts risk beyond the vault.
- **`withdraw_house` can't steal from bettors**: blocked while `outstanding` > 0;
  only withdraws the surplus and only to the config's `team_wallet`.
- **Arithmetic**: `checked_add/sub`, products widened to `u128` before division; fee
  has a floor and `net > 0` is required.
- **Resolution window**: `resolve_after_ts > close_ts` enforced on-chain prevents
  resolving before the real end of the match (tested).
- **NFT ticket**: mint authority frozen to `None` after supply 1 — nobody can mint
  extra tickets.

### Notes (acceptable for v1, revisit before mainnet)

1. **Centralized oracle (by design)** — `resolve_market` depends on one key.
   Mitigation already planned: migrate `config.authority` to a multisig (Squads) via
   `update_config` and transfer the upgrade authority.
2. **Unclaimed funds stay locked** — in `Voided` markets, whatever nobody claims
   stays in the vault forever (not stealable, but not recoverable). Consider an
   expiry/sweep instruction in a v2.
3. **No `close` instruction** — `Market`/`Bet` accounts never return rent.
   Operational cost, not a risk.
4. **Parimutuel rounding dust** — integer-division remainders stay in the vault and
   are withdrawable by the house via `withdraw_house`. Expected behavior;
   documented.

## 2. Server / API

### Fixed in this review

| Finding | Severity | Fix |
|---|---|---|
| **Authority drain via `POST /api/runs`**: every run creates a market + `fund_house` with the authority's SOL (~0.004 SOL of non-recoverable rent); anonymous spam would drain the wallet. | **HIGH** | 1 active run per wallet + a global cap of 10 runs/5 min + pubkey validation (`runs.ts`). Abandoned runs are resolved and their liquidity recycled by the cron (`withdraw_house`). Verified live. |
| **Key/seed files outside `.gitignore`** (`keys_contract.md` with seed phrases, `program/keys/`) — risk of accidentally committing secrets. | **HIGH** | Added to the root `.gitignore`. ⚠️ **Extra recommendation**: since the devnet seeds have already circulated in plain text, rotate them before any mainnet use (never reuse those seeds). |
| **TxLINE re-activation loop** (airdrop + on-chain tx on every cron cycle, `429` from the faucet) | LOW | 10-min cooldown between attempts (`markets.ts`). |

### Validated by test (`e2e:full` suite, section B)

- The runs' secret sequence **never** leaves the API (`rounds` and future values are
  absent from every response) — the client has no way to predict the next number.
- On-chain gate: `guess` only works after `place_bet` is confirmed on the run's
  market.
- Finished runs accept no further guesses (no replay).
- Invalid inputs (bad target, fractional stake, stake above the house cap, unknown
  direction) → `400`.

### Open items (for the next phases)

1. ~~**Run authorization by UUID** — anyone holding a run id can guess on it. UUIDv4
   (122 bits) is impractical to guess and doesn't leak from any public endpoint~~ —
   **correction (2026-07-12): that assumption was wrong, see finding #5 below.**
   `GET /api/runs/wallet/:wallet` leaked the `id` (and the current card value)
   without authentication, making the UUID discoverable from the victim's public
   wallet address.
2. **Open CORS** (`app.use(cors())`) — fine for a hackathon; restrict the origin in
   production.
3. **No TLS/secrets management** — `.data/` stores credentials and the server wallet
   on plain disk; use a secret manager in production.
4. **Rate limiting is in-memory** — resets with the process; move to shared storage
   in production.

### Confirmed finding — 2026-07-12 review (backend↔contract integration layer)

| # | Finding | Severity | Status |
|---|---|---|---|
| 5 | **IDOR in `/api/runs/:id/guess`, `/api/runs/:id/cashout` and `GET /api/runs/wallet/:wallet`** — none of the three required `requireSession` (unlike `custodial.routes.ts`, which applies `requireChain, requireSession` to every route). `GET /api/runs/wallet/:wallet` returned the active run's `id` and the already-revealed current card value without authentication; `guessRun`/`cashoutRun` (`server/src/chain/runs.ts`) did not compare the caller against the run's owner. An attacker knowing only the victim's public wallet address (not a secret in a Solana dApp) could discover the `id` and decide the play — or force a premature cashout — on their behalf. The `finalOutcome` set by these routes is settled on-chain via `settleRuns()` → `resolveMarket()` — real financial damage, not just UI. | **HIGH** | ✅ **Fixed (2026-07-13)** |
| 6 | **IDOR in Penalty Predictor** (`server/src/http/routes/arcade.routes.ts:79-107`) — the same pattern as finding #5, replicated in the new "Penalty for SOL" mode. `GET /penalty/sessions/:wallet` leaked the session `id` from the public wallet without auth; `POST /penalty/session/:id/shot` and `/answer` let anyone decide another session's kicks — `nextShot`/`answerShot` (`server/src/games/penaltySession.ts`) did not compare the caller against `SessionRecord.wallet`. Confirmed that the session only exists after a real stake confirmed on-chain and that a forged `finalOutcome` is genuinely settled via `settlePenaltySessions()` → `settleHouseMarket()` → `resolveMarket()` — identical real financial damage to #5. | **HIGH** | ✅ **Fixed (2026-07-13)** |
| 7 | **IDOR in Survivor** (`server/src/http/routes/survivor.routes.ts:19-29`) — `POST /pick` accepted free-form `wallet`/`outcome` from the body without `requireSession`; `makePick` (`server/src/games/survivor.ts:67-105`) did not validate wallet ownership, allowing an attacker to forge — or block ("1 pick per round") — someone else's pick. Verified that **no real prize/payout** is tied to the `survived`/`eliminated` status (it is only leaderboard/season state in `survivor.json`) — cosmetic state corruption, no financial loss. | **LOW** | ✅ **Fixed (2026-07-13)** |

**Fix applied (#5, #6, #7):** all three surfaces now require `requireSession`. The
wallet owning the run/session/pick now comes **from the authenticated session**
(`userAddress(user)`), not from a body string — preventing resource creation "on
behalf of" third parties. `RunRecord`/`SessionRecord` gained a `userId` field written
at creation; `assertRunOwner`/`assertSessionOwner` validate ownership (with a
wallet-based fallback only for pre-migration records) before any read/write in
`guess`/`cashout`/`shot`/`answer`/`GET`. The client (`StakedHilo.tsx`, `Arcade.tsx`,
`Survivor.tsx`) sends the session Bearer via `account.token`. **Verified live**
against the local server: an authenticated third party gets `403` on
list/GET/guess/cashout/shot; no session gets `401`; the legitimate owner still gets
`200`. A regression test was added to the `e2e-full.ts` suite (section B).

## 3. Evidence

- `program/`: `bash scripts/test-local.sh` → **26 passing**
  (multiplayer/single-player/cancellation flows, access control with an impostor on
  every instruction, invariant fuzzing with fast-check). Requires an up-to-date
  `anchor build` — the `target/` artifacts had drifted from the source and were
  regenerated (the new IDL is identical to the `server/idl/oddies_bet.json` used in
  production).
- `server/`: `npm run e2e:full` → **25 ✅ / 0 ❌** against real devnet, including the
  full cycle bet → win → cron settlement → paid claim → blocked double-claim.

## 4. 2026-07-14 round — per-game NFT identity

Contract changes (in-place upgrade, same program ID) and server changes to give each
game its own Collection NFT. Only the security implications are listed here.

### Contract changes

| Change | Why | Security implication |
|---|---|---|
| `Market.allowed_games: u8` (bitmask) + `place_bet(.., game_id)` | one market can serve more than one game (a Survivor pick is a bet on the Guess the Team 1X2 market) — the ticket's collection could no longer be inherited from the market | **New surface, closed**: the bet's `game_id` is validated against `allowed_games` (`GameNotAllowed`), and the collection accounts against the declared game (`GameMismatch`/`MissingGameCollection`). There is no way to mint an NFT for a game the market doesn't enable. `create_market` requires the main game's bit in the mask, and `GAME_NONE` must come with mask 0. |
| `mint_game_badge(game_id)` | games with no on-chain bet (Live Challenge) had no way to have an identity | Requires `has_one = authority` on the config (only the server mints) and pays rent from the authority. **The dedupe (1 badge per wallet/game, in `.data/badges.json`) is a funds control**, not just product polish: without it, badge farming would drain the server wallet. A badge grants no payout — it touches neither the vault nor any `Bet`. |
| `update_game_collection(game_id, ..)` | collection metadata pointed at `localhost` — art invisible to third parties | Authority-only; the collections' update authority remains the `collection_authority` PDA (no external key verifies items). Does not alter already-verified members. |
| `Box<Account<..>>` in `PlaceBet` and `MintGameBadge` | — | **Memory-bug fix**: `PlaceBet`'s `try_accounts` frame exceeded 4096 bytes (`Stack offset of 4104 exceeded max offset of 4096`), which is undefined behavior. At runtime, devnet rejected every bet with a phantom `ConstraintMut` on the `bettor` account — the transaction itself was correct. Now compiles with zero stack warnings. |

### New findings (adversarial-testing round, 2026-07-14)

| # | Finding | Severity | Status |
|---|---|---|---|
| 8 | **Unknown `gameId` minted an identity-less ticket** — `POST /api/custodial/place-bet` with `gameId: 99` returned 200: the server degraded to `GAME_NONE` and the bet went through with no NFT at all. Not forgery (you can't mint into another game's collection), but it silently breaks the "every bet mints an NFT" promise and the player loses the collectible without knowing. | Low | ✅ **Fixed** — `gameId` outside the registry → `400`. Regression in `e2e:games`. |
| 9 | **A game not enabled on the market returned 500** — the contract blocked it correctly (`GameNotAllowed`), but the revert surfaced as a generic "internal error": it burned a transaction and hid the cause. | Low (UX/observability) | ✅ **Fixed** — `allowed_games` validated at the edge (server and client) → a clear `403` before signing. Regression in `e2e:games`. |
| 10 | **The winner's NFT is burned on `claim`** — the ticket's `token::burn` (a double-claim defense, redundant with `bet.claimed`) means **winners lose the collectible while losers keep theirs**. | — (product decision) | ⏳ **Open** — 3 options under evaluation. |

### Operational findings fixed in the same round

- **Per-bet cost rose with the NFT ticket** (≈ 0.0117 SOL, of which 0.0056 is
  Metaplex metadata rent). The 0.03 SOL welcome bonus only covered **2 bets** — the
  player got stuck mid-session with a balance failure masked as an internal error.
  Raised to 0.15 SOL (≈ 12 bets).
- **Market PDAs colliding across program versions**: `market_id = fixture_id` made
  `create_market` hit accounts from the previous layout ("account already exists") —
  the fixture was left without a market forever. Fixture `market_id`s now carry a
  version epoch (`FIXTURE_MARKET_EPOCH`), bumped on every `Market` layout change.
- **One old-layout `Bet` account broke the entire ticket listing** (`bet.all()`
  failed to decode). Accounts are now decoded one by one and obsolete ones skipped.

### Evidence for this round

- `npm run verify:collections` → **10 ✅ / 0 ❌** (devnet): collection exists, ticket
  is a **verified** member, `place_bet` without collection accounts blocked,
  `game_id` outside the mask → `GameNotAllowed`, badge verified.
- `npm run e2e:games` (new) → **40 ✅ / 0 ❌**: plays all **7 games** over HTTP (the
  same requests the browser makes) and checks **on-chain** that every NFT landing in
  the wallet is a verified member of the right collection — including the two
  forgery attempts above.
- `npm run e2e:full` → **30 ✅ / 0 ❌**.
