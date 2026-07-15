import { Router } from "express";
import { CHAIN_RPC_URL } from "../../chain/client.js";
import { HttpError, asyncHandler } from "../errors.js";

export const rpcRoutes = Router();

/**
 * Proxy JSON-RPC para o RPC da chain. O RPC público da devnet bloqueia/limita
 * requisições de browser (aparece como "CORS failure" intermitente no client);
 * passando pela mesma origem do app o browser não faz preflight e o server —
 * que não sofre CORS — repassa. Só POST JSON-RPC; as assinaturas continuam
 * 100% na wallet do jogador (aqui passa apenas a transação já assinada).
 */
rpcRoutes.post(
  "/",
  asyncHandler(async (req, res) => {
    let upstream: Response;
    try {
      upstream = await fetch(CHAIN_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body ?? {}),
      });
    } catch (err) {
      throw new HttpError(502, "RPC da chain indisponível — tente novamente");
    }
    res.status(upstream.status).type("application/json").send(await upstream.text());
  })
);
