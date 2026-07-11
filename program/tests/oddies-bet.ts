import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { assert } from "chai";
import { readFileSync } from "fs";
import { join } from "path";

// anchor test roda a partir de program/, então o cwd resolve o caminho do IDL.
const idl = JSON.parse(
  readFileSync(join(process.cwd(), "target/idl/oddies_bet.json"), "utf8")
);

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

const SOL = LAMPORTS_PER_SOL;
const FEE_BPS = 1000; // 10%

describe("oddies-bet", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = new Program(idl as anchor.Idl, provider);
  const authority = provider.wallet as anchor.Wallet;

  const teamWallet = Keypair.generate();
  const bettor1 = Keypair.generate();
  const bettor2 = Keypair.generate();

  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  const marketPda = (marketId: BN) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("market"), marketId.toArrayLike(Buffer, "le", 8)],
      program.programId
    )[0];

  const vaultPda = (market: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), market.toBuffer()],
      program.programId
    )[0];

  const betPda = (market: PublicKey, mint: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("bet"), market.toBuffer(), mint.toBuffer()],
      program.programId
    )[0];

  const zeroOdds = () => Array(8).fill(new BN(0));

  async function placeBet(
    marketId: BN,
    bettor: Keypair,
    outcome: number,
    amount: number
  ): Promise<{ ticketMint: Keypair; ticketAccount: Keypair }> {
    const market = marketPda(marketId);
    const ticketMint = Keypair.generate();
    const ticketAccount = Keypair.generate();
    await program.methods
      .placeBet(outcome, new BN(amount))
      .accounts({
        config: configPda,
        market,
        vault: vaultPda(market),
        teamWallet: teamWallet.publicKey,
        bet: betPda(market, ticketMint.publicKey),
        ticketMint: ticketMint.publicKey,
        ticketAccount: ticketAccount.publicKey,
        bettor: bettor.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([bettor, ticketMint, ticketAccount])
      .rpc();
    return { ticketMint, ticketAccount };
  }

  async function claim(
    marketId: BN,
    claimer: Keypair,
    ticketMint: PublicKey,
    ticketAccount: PublicKey
  ) {
    const market = marketPda(marketId);
    await program.methods
      .claim()
      .accounts({
        market,
        vault: vaultPda(market),
        bet: betPda(market, ticketMint),
        ticketMint,
        ticketAccount,
        claimer: claimer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([claimer])
      .rpc();
  }

  async function createMarket(
    marketId: BN,
    kind: object,
    outcomeCount: number,
    oddsBps: BN[],
    closeTs: number
  ) {
    await program.methods
      .createMarket(
        marketId,
        new BN(1001),
        kind,
        outcomeCount,
        oddsBps,
        new BN(closeTs)
      )
      .accounts({
        config: configPda,
        market: marketPda(marketId),
        vault: vaultPda(marketPda(marketId)),
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async function balance(pk: PublicKey): Promise<number> {
    return provider.connection.getBalance(pk);
  }

  before(async () => {
    for (const kp of [bettor1, bettor2]) {
      const sig = await provider.connection.requestAirdrop(
        kp.publicKey,
        10 * SOL
      );
      await provider.connection.confirmTransaction(sig);
    }
  });

  it("inicializa a config com taxa de 10%", async () => {
    await program.methods
      .initialize(FEE_BPS)
      .accounts({
        config: configPda,
        authority: authority.publicKey,
        teamWallet: teamWallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    const config = await (program.account as any).config.fetch(configPda);
    assert.equal(config.feeBps, FEE_BPS);
    assert.ok(config.teamWallet.equals(teamWallet.publicKey));
  });

  describe("parimutuel (multiplayer)", () => {
    const marketId = new BN(1);
    let ticket1: { ticketMint: Keypair; ticketAccount: Keypair };
    let ticket2: { ticketMint: Keypair; ticketAccount: Keypair };
    let closeTs: number;

    it("cria o mercado e aceita apostas com split 10/90", async () => {
      closeTs = Math.floor(Date.now() / 1000) + 8;
      await createMarket(marketId, { parimutuel: {} }, 3, zeroOdds(), closeTs);

      const teamBefore = await balance(teamWallet.publicKey);
      ticket1 = await placeBet(marketId, bettor1, 0, 1 * SOL);
      ticket2 = await placeBet(marketId, bettor2, 1, 1 * SOL);
      const teamAfter = await balance(teamWallet.publicKey);

      // 10% de cada aposta de 1 SOL foi para a wallet do time.
      assert.equal(teamAfter - teamBefore, 0.2 * SOL);

      const market = await (program.account as any).market.fetch(
        marketPda(marketId)
      );
      assert.equal(market.pools[0].toNumber(), 0.9 * SOL);
      assert.equal(market.pools[1].toNumber(), 0.9 * SOL);
    });

    it("rejeita resolver antes do fim da partida", async () => {
      try {
        await program.methods
          .resolveMarket(0)
          .accounts({
            config: configPda,
            market: marketPda(marketId),
            authority: authority.publicKey,
          })
          .rpc();
        assert.fail("deveria ter falhado");
      } catch (e: any) {
        assert.include(e.toString(), "MatchNotFinished");
      }
    });

    it("resolve e o vencedor leva o pote inteiro (90% de 2 SOL)", async () => {
      // Espera o close_ts passar no clock on-chain.
      await new Promise((r) => setTimeout(r, 9000));
      await program.methods
        .resolveMarket(0)
        .accounts({
          config: configPda,
          market: marketPda(marketId),
          authority: authority.publicKey,
        })
        .rpc();

      const before = await balance(bettor1.publicKey);
      await claim(
        marketId,
        bettor1,
        ticket1.ticketMint.publicKey,
        ticket1.ticketAccount.publicKey
      );
      const after = await balance(bettor1.publicKey);
      // Pote = 1.8 SOL (menos taxa da tx de claim).
      assert.approximately(after - before, 1.8 * SOL, 0.01 * SOL);
    });

    it("perdedor não consegue resgatar", async () => {
      try {
        await claim(
          marketId,
          bettor2,
          ticket2.ticketMint.publicKey,
          ticket2.ticketAccount.publicKey
        );
        assert.fail("deveria ter falhado");
      } catch (e: any) {
        assert.include(e.toString(), "LosingBet");
      }
    });

    it("vencedor não resgata duas vezes (ticket queimado)", async () => {
      try {
        await claim(
          marketId,
          bettor1,
          ticket1.ticketMint.publicKey,
          ticket1.ticketAccount.publicKey
        );
        assert.fail("deveria ter falhado");
      } catch (e: any) {
        assert.include(e.toString(), "Error");
      }
    });
  });

  describe("house-backed (singleplayer)", () => {
    const marketId = new BN(2);
    let ticket: { ticketMint: Keypair; ticketAccount: Keypair };

    it("cria mercado com odds 2x, funda a casa e aceita aposta", async () => {
      const closeTs = Math.floor(Date.now() / 1000) + 8;
      const odds = zeroOdds();
      odds[0] = new BN(20000); // 2.0x
      odds[1] = new BN(15000); // 1.5x
      await createMarket(marketId, { houseBacked: {} }, 2, odds, closeTs);

      await program.methods
        .fundHouse(new BN(5 * SOL))
        .accounts({
          market: marketPda(marketId),
          vault: vaultPda(marketPda(marketId)),
          funder: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      ticket = await placeBet(marketId, bettor1, 0, 1 * SOL);
      const bet = await (program.account as any).bet.fetch(
        betPda(marketPda(marketId), ticket.ticketMint.publicKey)
      );
      // Payout travado na entrada: 0.9 SOL líquido × 2.0 = 1.8 SOL.
      assert.equal(bet.fixedPayout.toNumber(), 1.8 * SOL);
    });

    it("rejeita aposta que a casa não consegue pagar", async () => {
      try {
        // Vault tem ~5.9 SOL usáveis; payout seria 20×0.9×2 = 36 SOL.
        await placeBet(marketId, bettor2, 0, 20 * SOL);
        assert.fail("deveria ter falhado");
      } catch (e: any) {
        assert.include(e.toString(), "InsufficientHouseLiquidity");
      }
    });

    it("resolve e paga o payout fixo; casa saca o lucro livre", async () => {
      await new Promise((r) => setTimeout(r, 9000));
      await program.methods
        .resolveMarket(0)
        .accounts({
          config: configPda,
          market: marketPda(marketId),
          authority: authority.publicKey,
        })
        .rpc();

      const before = await balance(bettor1.publicKey);
      await claim(
        marketId,
        bettor1,
        ticket.ticketMint.publicKey,
        ticket.ticketAccount.publicKey
      );
      const after = await balance(bettor1.publicKey);
      assert.approximately(after - before, 1.8 * SOL, 0.01 * SOL);

      // Sobrou 5 + 0.9 - 1.8 = 4.1 SOL livres; sacar mais que isso falha.
      const freeLamports = 4_100_000_000;
      try {
        await program.methods
          .withdrawHouse(new BN(freeLamports + 1))
          .accounts({
            config: configPda,
            market: marketPda(marketId),
            vault: vaultPda(marketPda(marketId)),
            teamWallet: teamWallet.publicKey,
            authority: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        assert.fail("deveria ter falhado");
      } catch (e: any) {
        assert.include(e.toString(), "InsufficientHouseLiquidity");
      }

      const teamBefore = await balance(teamWallet.publicKey);
      await program.methods
        .withdrawHouse(new BN(freeLamports))
        .accounts({
          config: configPda,
          market: marketPda(marketId),
          vault: vaultPda(marketPda(marketId)),
          teamWallet: teamWallet.publicKey,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      const teamAfter = await balance(teamWallet.publicKey);
      assert.equal(teamAfter - teamBefore, freeLamports);
    });
  });

  describe("mercado cancelado (Voided)", () => {
    const marketId = new BN(3);

    it("cancela e devolve o stake líquido ao apostador", async () => {
      const closeTs = Math.floor(Date.now() / 1000) + 3600;
      await createMarket(marketId, { parimutuel: {} }, 3, zeroOdds(), closeTs);
      const ticket = await placeBet(marketId, bettor2, 2, 1 * SOL);

      await program.methods
        .cancelMarket()
        .accounts({
          config: configPda,
          market: marketPda(marketId),
          authority: authority.publicKey,
        })
        .rpc();

      const before = await balance(bettor2.publicKey);
      await claim(
        marketId,
        bettor2,
        ticket.ticketMint.publicKey,
        ticket.ticketAccount.publicKey
      );
      const after = await balance(bettor2.publicKey);
      // Recupera os 90% líquidos (a taxa de 10% não volta).
      assert.approximately(after - before, 0.9 * SOL, 0.01 * SOL);
    });
  });
});
