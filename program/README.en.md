# oddies-bet — Solana program (Anchor)

Program ID (devnet): `F4xhKysY8SrNwfqLZxyuJrZCWW8KPVbTjZWb4HHtD4ZA` — **already
deployed and initialized on devnet** (10% fee, authority/team_wallet =
`keys/devnet-deploy-wallet.json`, see `keys/README.md`).

## What it is

`oddies-bet` is the platform's **smart contract (Solana program)**: the on-chain
cashier that custodies players' bets and guarantees, in code, that money only moves
according to the rules of the game — neither the team nor any player can divert
funds, pay a loser, or withdraw what belongs to the bettors.

## What it does

It implements the product flow end to end:

1. **Bet**: the player picks their "Oddies" (predictions) and sends SOL. The program
   splits it on the spot: **10% goes to the team wallet** (platform revenue) and
   **90% is locked in an on-chain vault**.
2. **NFT ticket**: every bet mints a unique token (supply 1) into the player's
   wallet. The ticket **is** the bet — it can be transferred or sold, and whoever
   holds it at the end is entitled to the prize.
3. **Validate the result**: when the match ends, the backend (oracle) records the
   winning outcome on the market. Before the match is over, nobody can resolve it.
4. **Pay**: holders of winning tickets redeem the prize straight from the vault,
   burning the ticket (redeeming twice is impossible). Cancelled match or no
   winners → everyone recovers their net stake.

It serves both of the platform's game modes: **multiplayer** (players bet against
each other, parimutuel pot, zero house risk) and **single-player** (player vs. the
house, fixed odds, house backs the prize with its own liquidity and the program
rejects any bet it couldn't pay).

## Two market kinds

| | `Parimutuel` (multiplayer) | `HouseBacked` (single-player) |
|---|---|---|
| Counterparty | The other bettors | The house (project vault) |
| Payout | `stake_net × total_pot / winning_pool` | `stake_net × odds_bps / 10000`, locked at entry |
| House risk | Zero (fee only) | Bounded by vault liquidity (`fund_house`) |
| No winners | Market becomes `Voided`, everyone recovers net stake | n/a |

## Accounts

- `Config` (PDA `["config"]`) — authority, team wallet and fee in bps (1000 = 10%).
- `Market` (PDA `["market", market_id]`) — fixture, outcomes (2–8), pools, odds, state.
- `Vault` (PDA `["vault", market]`) — SystemAccount holding the staked SOL; keeps a
  rent buffer that is never distributed.
- `Bet` (PDA `["bet", market, ticket_mint]`) — outcome, net stake, fixed payout.
- `ticket_mint` — SPL mint with supply 1 and 0 decimals, minted to the bettor with
  the mint authority revoked. **Whoever holds the token redeems the prize** (the bet
  is transferable/sellable); the token is burned on redemption.

## Instructions

1. `initialize(fee_bps)` — creates the global config (once). Only the program's
   **upgrade authority** can call it (prevents someone initializing first and
   becoming the permanent authority — requires passing the `program` and
   `program_data` accounts).
2. `create_market(market_id, fixture_id, kind, outcome_count, odds_bps, close_ts, resolve_after_ts)` —
   opens the market; `close_ts` = match kickoff (closes betting), `resolve_after_ts`
   is an extra floor for `resolve_market` — it must be after the expected real end
   of the match, not just kickoff.
3. `fund_house(amount)` — deposits house liquidity (mandatory before `HouseBacked`
   bets; the program rejects bets the vault couldn't pay in the worst case).
   Authority-only.
4. `place_bet(outcome, amount)` — fee/net split, records the Bet, mints the ticket.
5. `resolve_market(winning_outcome)` — authority-only (oracle v1 = the backend
   reading TxLINE), and only after `resolve_after_ts`. A parimutuel market with no
   winners becomes `Voided`.
6. `cancel_market()` — match cancelled → everyone recovers their net stake.
7. `claim()` — the ticket holder burns the token and receives the payout from the
   vault.
8. `withdraw_house(amount)` — the authority can only withdraw what is **not**
   committed to bettors (the `outstanding` counter locks the rest).
9. `update_config(new_authority?, new_team_wallet?, new_fee_bps?)` — the current
   authority rotates authority/team_wallet/fee without a redeploy. The natural path
   to migrating the authority to a multisig (Squads) before mainnet.

## Build, tests and deploy

```bash
cd program
cargo build-sbf                                  # produces target/deploy/oddies_bet.so
RUSTUP_TOOLCHAIN=stable anchor idl build -o target/idl/oddies_bet.json
cp keys/devnet-program-keypair.json target/deploy/oddies_bet-keypair.json  # see keys/README.md
RUSTUP_TOOLCHAIN=stable anchor test --skip-build --skip-local-validator --skip-deploy
```

> **Why `--skip-local-validator --skip-deploy`**: the default `anchor test` starts
> the local validator and loads the program into genesis with an **immutable**
> upgrade authority ("none"), which would break the `initialize()` test that is
> gated on the upgrade authority. The `[scripts].test` entry in `Anchor.toml` calls
> `scripts/test-local.sh`, which starts the validator and deploys manually with
> `keys/devnet-deploy-wallet.json` as the real upgrade authority — hence the two
> flags to stop Anchor from redoing it the default way.

Node 22.6+/23+/24 break `ts-mocha` when importing `@coral-xyz/anchor` (Node's
native "type stripping" ignores the `tsconfig` and treats the file as pure ESM).
`test-local.sh` already sets `NODE_OPTIONS=--no-experimental-strip-types`; if you
run `ts-mocha` directly, add that flag manually.

The tests include a fuzzing scenario (`tests/z-fuzz.ts`, using `fast-check`): random
bet amounts/odds/outcomes and multi-bettor bet sequences, checking at every step
that house liquidity is never left uncovered and that parimutuel never pays out more
than the collected pot (no vault leakage) — plus boundary cases (out-of-range
outcome, zero amount, odds at the limit, etc.).

> **Don't run `cargo update` carelessly**: `Cargo.lock` pins several crates
> (blake3, zeroize, proc-macro-crate, indexmap, unicode-segmentation) because the
> cargo 1.79 shipped with Solana's platform-tools can't read edition2024 crates. If
> `build-sbf` fails with "feature `edition2024` is required", downgrade the named
> crate with `cargo update -p <crate> --precise <old-version>`.

### Devnet deploy

```bash
solana program deploy target/deploy/oddies_bet.so \
  --program-id target/deploy/oddies_bet-keypair.json \
  --keypair keys/devnet-deploy-wallet.json --url devnet
# first time: initialize the config (authority + team wallet + fee)
NODE_OPTIONS=--no-experimental-strip-types npx ts-node \
  --compiler-options '{"module":"commonjs"}' scripts/initialize-devnet.ts
```

This has already been done once (see the Program ID at the top). Re-running
`initialize-devnet.ts` is safe — it detects the config already exists and just
prints the current state.

### Mainnet deploy

Cost is ~2.7 SOL of program rent (recoverable if the program is closed) + fees.

```bash
solana config set --url mainnet-beta
solana balance                                   # needs ~3 SOL
solana program deploy target/deploy/oddies_bet.so \
  --program-id target/deploy/oddies_bet-keypair.json --url mainnet-beta
# after the deploy:
# 1. anchor idl init (optional, publishes the IDL on-chain)
# 2. call initialize(fee_bps) with the team wallet as team_wallet
# 3. point the backend/frontend at the program ID and the mainnet cluster
```

⚠️ Before mainnet with real money: security audit/review, and consider making the
program immutable (`solana program set-upgrade-authority --final`) or protecting the
upgrade authority with a multisig (Squads).

The IDL is already copied to `server/idl/oddies_bet.json` for the backend to consume
with `@coral-xyz/anchor`.

## Integration with the existing backend

The backend already knows when a match ends (`finished: true` via TxLINE). The
integration flow:

1. A backend cron creates markets for World Cup fixtures (`create_market`, passing a
   `resolve_after_ts` with a safe margin after the expected end of the match).
2. The frontend calls `place_bet` straight from the user's wallet.
3. When `finished` arrives, the backend (with the `wallet.ts` keypair as authority)
   calls `resolve_market` with the outcome.
4. The frontend shows "Claim prize" to whoever holds a winning ticket → `claim`.

## Known limitations (hackathon v1)

- **Centralized oracle**: `resolve_market` trusts the authority. Natural evolution:
  read the txoracle account on-chain (IDL already in `server/idl/`) instead of
  trusting the backend. The authority today is a single keypair
  (`keys/devnet-deploy-wallet.json`); before mainnet, migrate it to a multisig
  (Squads) via `update_config` — the program is already agnostic to that.
- **Ticket without metadata**: the NFT is a bare SPL mint (no Metaplex name/image).
  Metadata can be attached later via Metaplex, from the backend, without changing
  the program.
- Parimutuel division truncates lamports (remainders stay in the vault and can be
  swept with `withdraw_house` after all claims).
- `resolve_after_ts` is only a minimum floor configured by the backend at market
  creation — the contract doesn't truly know when the match ended, it only blocks
  resolving before that floor. The real guarantee still depends on the backend cron
  calling `resolve_market` with the correct outcome.
