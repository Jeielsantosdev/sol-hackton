import fs from "node:fs";
import path from "node:path";
import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

// O programa oddies-bet vive na devnet independente da rede da TxLINE.
export const CHAIN_RPC_URL =
  process.env.CHAIN_RPC_URL || "https://api.devnet.solana.com";

const IDL_PATH = new URL("../../idl/oddies_bet.json", import.meta.url);
export const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf8"));

export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
export const PROGRAM_ID = new PublicKey(idl.address);

/**
 * Authority do programa (config.authority): cria mercados, resolve e funda a casa.
 * Ordem: env AUTHORITY_KEYPAIR (array JSON) → AUTHORITY_KEYPAIR_PATH →
 * program/keys/devnet-deploy-wallet.json (fonte da verdade em keys_contract.md).
 */
function loadAuthority(): Keypair | null {
  if (process.env.AUTHORITY_KEYPAIR) {
    return Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(process.env.AUTHORITY_KEYPAIR))
    );
  }
  const candidates = [
    process.env.AUTHORITY_KEYPAIR_PATH,
    new URL("../../../program/keys/devnet-deploy-wallet.json", import.meta.url)
      .pathname,
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf8")))
      );
    }
  }
  return null;
}

export interface Chain {
  connection: Connection;
  authority: Keypair;
  program: Program;
}

let chain: Chain | null | undefined;

/** null = sem keypair da authority: endpoints on-chain respondem 503. */
export function getChain(): Chain | null {
  if (chain !== undefined) return chain;
  const authority = loadAuthority();
  if (!authority) {
    console.warn(
      "[chain] authority keypair não encontrada — funcionalidades on-chain desativadas"
    );
    chain = null;
    return chain;
  }
  const connection = new Connection(CHAIN_RPC_URL, "confirmed");
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(authority),
    { commitment: "confirmed" }
  );
  const program = new Program(idl as anchor.Idl, provider);
  console.log(
    `[chain] programa ${PROGRAM_ID.toBase58()} · authority ${authority.publicKey.toBase58()} · ${CHAIN_RPC_URL}`
  );
  chain = { connection, authority, program };
  return chain;
}

export const configPda = () =>
  PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID)[0];

export const marketPda = (marketId: BN) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("market"), marketId.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  )[0];

export const vaultPda = (market: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), market.toBuffer()],
    PROGRAM_ID
  )[0];

export const betPda = (market: PublicKey, mint: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("bet"), market.toBuffer(), mint.toBuffer()],
    PROGRAM_ID
  )[0];

export const BPS = 10_000;

export function marketStateLabel(state: any): "open" | "resolved" | "voided" {
  if (state?.resolved) return "resolved";
  if (state?.voided) return "voided";
  return "open";
}
