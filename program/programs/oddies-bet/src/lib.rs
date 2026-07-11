use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, Burn, Mint, MintTo, SetAuthority, Token, TokenAccount};

declare_id!("4Ns6amhKn6D3DXBNDuFPngFM6UpV3N54JNQD5wXAt84E");

pub const MAX_OUTCOMES: usize = 8;
pub const BPS_DENOMINATOR: u64 = 10_000;

#[program]
pub mod oddies_bet {
    use super::*;

    /// Cria a config global: quem administra, para onde vai a taxa e qual a taxa (ex.: 1000 = 10%).
    pub fn initialize(ctx: Context<Initialize>, fee_bps: u16) -> Result<()> {
        require!(fee_bps as u64 <= BPS_DENOMINATOR, BetError::InvalidFee);
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.team_wallet = ctx.accounts.team_wallet.key();
        config.fee_bps = fee_bps;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    /// Abre um mercado de apostas para um fixture (partida).
    ///
    /// - `Parimutuel` (multiplayer): os apostadores dividem o pote entre si; odds emergem do pool.
    /// - `HouseBacked` (singleplayer): a casa paga `stake * odds_bps / 10000`; exige vault fundeado.
    pub fn create_market(
        ctx: Context<CreateMarket>,
        market_id: u64,
        fixture_id: u64,
        kind: MarketKind,
        outcome_count: u8,
        odds_bps: [u64; MAX_OUTCOMES],
        close_ts: i64,
    ) -> Result<()> {
        require!(
            outcome_count >= 2 && (outcome_count as usize) <= MAX_OUTCOMES,
            BetError::InvalidOutcomeCount
        );
        let now = Clock::get()?.unix_timestamp;
        require!(close_ts > now, BetError::CloseInPast);
        if kind == MarketKind::HouseBacked {
            for i in 0..outcome_count as usize {
                // Odds incluem o stake de volta, então precisam ser > 1x.
                require!(odds_bps[i] > BPS_DENOMINATOR, BetError::InvalidOdds);
            }
        }

        let market = &mut ctx.accounts.market;
        market.market_id = market_id;
        market.fixture_id = fixture_id;
        market.kind = kind;
        market.state = MarketState::Open;
        market.outcome_count = outcome_count;
        market.odds_bps = odds_bps;
        market.pools = [0; MAX_OUTCOMES];
        market.liabilities = [0; MAX_OUTCOMES];
        market.close_ts = close_ts;
        market.winning_outcome = 0;
        market.payout_pool = 0;
        market.outstanding = 0;
        market.bump = ctx.bumps.market;
        market.vault_bump = ctx.bumps.vault;

        // Buffer de rent do vault: nunca é distribuído, garante que a conta continue rent-exempt.
        let rent_min = Rent::get()?.minimum_balance(0);
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.authority.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            rent_min,
        )?;
        Ok(())
    }

    /// Deposita liquidez da casa no vault (necessário antes de aceitar apostas HouseBacked).
    pub fn fund_house(ctx: Context<FundHouse>, amount: u64) -> Result<()> {
        require!(amount > 0, BetError::ZeroAmount);
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.funder.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            amount,
        )?;
        Ok(())
    }

    /// Aposta: cobra a taxa para a wallet do time, deposita o líquido no vault,
    /// registra a Bet e minta o ticket-NFT (supply 1, decimals 0) para o apostador.
    /// Quem segurar o ticket é quem resgata o prêmio — a aposta é transferível.
    pub fn place_bet(ctx: Context<PlaceBet>, outcome: u8, amount: u64) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(market.state == MarketState::Open, BetError::MarketNotOpen);
        let now = Clock::get()?.unix_timestamp;
        require!(now < market.close_ts, BetError::BettingClosed);
        require!(outcome < market.outcome_count, BetError::InvalidOutcome);
        require!(amount > 0, BetError::ZeroAmount);

        let fee = (amount as u128 * ctx.accounts.config.fee_bps as u128
            / BPS_DENOMINATOR as u128) as u64;
        let net = amount.checked_sub(fee).ok_or(BetError::MathOverflow)?;
        require!(net > 0, BetError::ZeroAmount);

        // Para HouseBacked, o payout é travado na entrada e o vault precisa cobrir
        // todas as obrigações do pior cenário (o outcome mais alavancado vencer).
        let payout = match market.kind {
            MarketKind::Parimutuel => 0,
            MarketKind::HouseBacked => {
                let p = (net as u128 * market.odds_bps[outcome as usize] as u128
                    / BPS_DENOMINATOR as u128) as u64;
                let new_liability = market.liabilities[outcome as usize]
                    .checked_add(p)
                    .ok_or(BetError::MathOverflow)?;
                let worst_case = market
                    .liabilities
                    .iter()
                    .enumerate()
                    .map(|(i, &l)| if i == outcome as usize { new_liability } else { l })
                    .max()
                    .unwrap_or(0);
                let usable = vault_usable_balance(&ctx.accounts.vault)?
                    .checked_add(net) // o stake desta aposta também entra no vault
                    .ok_or(BetError::MathOverflow)?;
                require!(worst_case <= usable, BetError::InsufficientHouseLiquidity);
                market.liabilities[outcome as usize] = new_liability;
                p
            }
        };

        market.pools[outcome as usize] = market.pools[outcome as usize]
            .checked_add(net)
            .ok_or(BetError::MathOverflow)?;

        // Split 10/90 (ou o fee configurado): taxa → wallet do time, líquido → vault.
        if fee > 0 {
            system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.bettor.to_account_info(),
                        to: ctx.accounts.team_wallet.to_account_info(),
                    },
                ),
                fee,
            )?;
        }
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.bettor.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            net,
        )?;

        let bet = &mut ctx.accounts.bet;
        bet.market = market.key();
        bet.ticket_mint = ctx.accounts.ticket_mint.key();
        bet.outcome = outcome;
        bet.stake_net = net;
        bet.fixed_payout = payout;
        bet.claimed = false;
        bet.bump = ctx.bumps.bet;

        // Minta o ticket para o apostador e congela o supply em 1.
        let market_signer: &[&[&[u8]]] = &[&[
            b"market",
            &market.market_id.to_le_bytes(),
            &[market.bump],
        ]];
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.ticket_mint.to_account_info(),
                    to: ctx.accounts.ticket_account.to_account_info(),
                    authority: market.to_account_info(),
                },
                market_signer,
            ),
            1,
        )?;
        token::set_authority(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                SetAuthority {
                    current_authority: market.to_account_info(),
                    account_or_mint: ctx.accounts.ticket_mint.to_account_info(),
                },
                market_signer,
            ),
            token::spl_token::instruction::AuthorityType::MintTokens,
            None,
        )?;

        emit!(BetPlaced {
            market: market.key(),
            ticket_mint: ctx.accounts.ticket_mint.key(),
            bettor: ctx.accounts.bettor.key(),
            outcome,
            amount,
            net,
        });
        Ok(())
    }

    /// Resolve o mercado com o outcome vencedor (autoridade = oráculo v1).
    /// Num parimutuel sem vencedores, o mercado vira Voided e todos recuperam o stake líquido.
    pub fn resolve_market(ctx: Context<ResolveMarket>, winning_outcome: u8) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(market.state == MarketState::Open, BetError::MarketNotOpen);
        let now = Clock::get()?.unix_timestamp;
        require!(now >= market.close_ts, BetError::MatchNotFinished);
        require!(winning_outcome < market.outcome_count, BetError::InvalidOutcome);

        let total_net: u64 = market
            .pools
            .iter()
            .try_fold(0u64, |acc, &p| acc.checked_add(p))
            .ok_or(BetError::MathOverflow)?;

        match market.kind {
            MarketKind::Parimutuel => {
                let winning_pool = market.pools[winning_outcome as usize];
                if winning_pool == 0 {
                    // Ninguém acertou: devolve o stake líquido a todos.
                    market.state = MarketState::Voided;
                    market.outstanding = total_net;
                } else {
                    market.state = MarketState::Resolved;
                    market.winning_outcome = winning_outcome;
                    market.payout_pool = total_net;
                    market.outstanding = total_net;
                }
            }
            MarketKind::HouseBacked => {
                market.state = MarketState::Resolved;
                market.winning_outcome = winning_outcome;
                market.outstanding = market.liabilities[winning_outcome as usize];
            }
        }

        emit!(MarketResolved {
            market: market.key(),
            state: market.state,
            winning_outcome,
        });
        Ok(())
    }

    /// Cancela um mercado (partida adiada/cancelada). Todos recuperam o stake líquido.
    pub fn cancel_market(ctx: Context<ResolveMarket>) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(market.state == MarketState::Open, BetError::MarketNotOpen);
        let total_net: u64 = market
            .pools
            .iter()
            .try_fold(0u64, |acc, &p| acc.checked_add(p))
            .ok_or(BetError::MathOverflow)?;
        market.state = MarketState::Voided;
        market.outstanding = total_net;
        Ok(())
    }

    /// Resgate: quem segura o ticket-NFT queima o token e recebe o prêmio do vault.
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let bet = &mut ctx.accounts.bet;
        require!(!bet.claimed, BetError::AlreadyClaimed);
        require!(
            ctx.accounts.ticket_account.amount == 1,
            BetError::TicketNotHeld
        );

        let payout: u64 = match market.state {
            MarketState::Voided => bet.stake_net,
            MarketState::Resolved => {
                require!(
                    bet.outcome == market.winning_outcome,
                    BetError::LosingBet
                );
                match market.kind {
                    MarketKind::Parimutuel => {
                        let winning_pool = market.pools[market.winning_outcome as usize];
                        ((bet.stake_net as u128 * market.payout_pool as u128)
                            / winning_pool as u128) as u64
                    }
                    MarketKind::HouseBacked => bet.fixed_payout,
                }
            }
            _ => return err!(BetError::MarketNotSettled),
        };

        bet.claimed = true;
        market.outstanding = market.outstanding.saturating_sub(payout.min(market.outstanding));

        // Queima o ticket: a aposta não pode ser resgatada duas vezes nem revendida depois.
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.ticket_mint.to_account_info(),
                    from: ctx.accounts.ticket_account.to_account_info(),
                    authority: ctx.accounts.claimer.to_account_info(),
                },
            ),
            1,
        )?;

        transfer_from_vault(
            &ctx.accounts.vault,
            &ctx.accounts.claimer.to_account_info(),
            &ctx.accounts.system_program,
            market.key(),
            market.vault_bump,
            payout,
        )?;

        emit!(Claimed {
            market: market.key(),
            ticket_mint: bet.ticket_mint,
            claimer: ctx.accounts.claimer.key(),
            payout,
        });
        Ok(())
    }

    /// Retira do vault o que não está comprometido com apostadores
    /// (lucro da casa em HouseBacked, ou sobras após um mercado liquidado).
    pub fn withdraw_house(ctx: Context<WithdrawHouse>, amount: u64) -> Result<()> {
        let market = &ctx.accounts.market;
        require!(
            market.state == MarketState::Resolved || market.state == MarketState::Voided,
            BetError::MarketNotSettled
        );
        let usable = vault_usable_balance(&ctx.accounts.vault)?;
        let free = usable
            .checked_sub(market.outstanding)
            .ok_or(BetError::InsufficientHouseLiquidity)?;
        require!(amount <= free, BetError::InsufficientHouseLiquidity);

        transfer_from_vault(
            &ctx.accounts.vault,
            &ctx.accounts.team_wallet.to_account_info(),
            &ctx.accounts.system_program,
            market.key(),
            market.vault_bump,
            amount,
        )?;
        Ok(())
    }
}

/// Saldo do vault descontando o buffer de rent, que nunca é distribuído.
fn vault_usable_balance(vault: &SystemAccount) -> Result<u64> {
    let rent_min = Rent::get()?.minimum_balance(0);
    Ok(vault.lamports().saturating_sub(rent_min))
}

fn transfer_from_vault<'info>(
    vault: &SystemAccount<'info>,
    to: &AccountInfo<'info>,
    system_program: &Program<'info, System>,
    market: Pubkey,
    vault_bump: u8,
    amount: u64,
) -> Result<()> {
    let usable = vault_usable_balance(vault)?;
    require!(amount <= usable, BetError::InsufficientHouseLiquidity);
    let seeds: &[&[&[u8]]] = &[&[b"vault", market.as_ref(), &[vault_bump]]];
    system_program::transfer(
        CpiContext::new_with_signer(
            system_program.to_account_info(),
            system_program::Transfer {
                from: vault.to_account_info(),
                to: to.clone(),
            },
            seeds,
        ),
        amount,
    )
}

// ---------------------------------------------------------------------------
// Contas
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: destino das taxas; apenas armazenado.
    pub team_wallet: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(market_id: u64)]
pub struct CreateMarket<'info> {
    #[account(seeds = [b"config"], bump = config.bump, has_one = authority)]
    pub config: Account<'info, Config>,
    #[account(
        init,
        payer = authority,
        space = 8 + Market::INIT_SPACE,
        seeds = [b"market", market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,
    #[account(mut, seeds = [b"vault", market.key().as_ref()], bump)]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundHouse<'info> {
    pub market: Account<'info, Market>,
    #[account(mut, seeds = [b"vault", market.key().as_ref()], bump = market.vault_bump)]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub funder: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [b"market", market.market_id.to_le_bytes().as_ref()], bump = market.bump)]
    pub market: Account<'info, Market>,
    #[account(mut, seeds = [b"vault", market.key().as_ref()], bump = market.vault_bump)]
    pub vault: SystemAccount<'info>,
    /// CHECK: validado contra a config.
    #[account(mut, address = config.team_wallet)]
    pub team_wallet: UncheckedAccount<'info>,
    #[account(
        init,
        payer = bettor,
        space = 8 + Bet::INIT_SPACE,
        seeds = [b"bet", market.key().as_ref(), ticket_mint.key().as_ref()],
        bump
    )]
    pub bet: Account<'info, Bet>,
    /// Ticket-NFT da aposta: mint novo (keypair do cliente), decimals 0, autoridade = market.
    #[account(
        init,
        payer = bettor,
        mint::decimals = 0,
        mint::authority = market,
    )]
    pub ticket_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = bettor,
        token::mint = ticket_mint,
        token::authority = bettor,
    )]
    pub ticket_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub bettor: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(seeds = [b"config"], bump = config.bump, has_one = authority)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [b"market", market.market_id.to_le_bytes().as_ref()], bump = market.bump)]
    pub market: Account<'info, Market>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut, seeds = [b"market", market.market_id.to_le_bytes().as_ref()], bump = market.bump)]
    pub market: Account<'info, Market>,
    #[account(mut, seeds = [b"vault", market.key().as_ref()], bump = market.vault_bump)]
    pub vault: SystemAccount<'info>,
    #[account(
        mut,
        seeds = [b"bet", market.key().as_ref(), ticket_mint.key().as_ref()],
        bump = bet.bump,
        has_one = market,
        has_one = ticket_mint,
    )]
    pub bet: Account<'info, Bet>,
    #[account(mut)]
    pub ticket_mint: Account<'info, Mint>,
    #[account(
        mut,
        token::mint = ticket_mint,
        token::authority = claimer,
    )]
    pub ticket_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub claimer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawHouse<'info> {
    #[account(seeds = [b"config"], bump = config.bump, has_one = authority, has_one = team_wallet)]
    pub config: Account<'info, Config>,
    #[account(seeds = [b"market", market.market_id.to_le_bytes().as_ref()], bump = market.bump)]
    pub market: Account<'info, Market>,
    #[account(mut, seeds = [b"vault", market.key().as_ref()], bump = market.vault_bump)]
    pub vault: SystemAccount<'info>,
    /// CHECK: validado contra a config via has_one.
    #[account(mut)]
    pub team_wallet: UncheckedAccount<'info>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub authority: Pubkey,
    pub team_wallet: Pubkey,
    pub fee_bps: u16,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum MarketKind {
    /// Multiplayer: pote dividido entre vencedores, proporcional ao stake.
    Parimutuel,
    /// Singleplayer: casa paga odds fixas, vault precisa de liquidez.
    HouseBacked,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum MarketState {
    Open,
    Resolved,
    /// Cancelado ou sem vencedores: todos recuperam o stake líquido.
    Voided,
}

#[account]
#[derive(InitSpace)]
pub struct Market {
    pub market_id: u64,
    pub fixture_id: u64,
    pub kind: MarketKind,
    pub state: MarketState,
    pub outcome_count: u8,
    /// Odds em bps (25000 = 2.5x, inclui o stake). Só usado em HouseBacked.
    pub odds_bps: [u64; MAX_OUTCOMES],
    /// Total líquido apostado por outcome.
    pub pools: [u64; MAX_OUTCOMES],
    /// Obrigações da casa por outcome (só HouseBacked).
    pub liabilities: [u64; MAX_OUTCOMES],
    pub close_ts: i64,
    pub winning_outcome: u8,
    /// Pote total a distribuir (snapshot na resolução, só Parimutuel).
    pub payout_pool: u64,
    /// Quanto ainda pode ser reivindicado por apostadores; trava o withdraw_house.
    pub outstanding: u64,
    pub bump: u8,
    pub vault_bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Bet {
    pub market: Pubkey,
    pub ticket_mint: Pubkey,
    pub outcome: u8,
    /// Stake líquido (após taxa) que entrou no vault.
    pub stake_net: u64,
    /// Payout travado na entrada (só HouseBacked).
    pub fixed_payout: u64,
    pub claimed: bool,
    pub bump: u8,
}

// ---------------------------------------------------------------------------
// Eventos e erros
// ---------------------------------------------------------------------------

#[event]
pub struct BetPlaced {
    pub market: Pubkey,
    pub ticket_mint: Pubkey,
    pub bettor: Pubkey,
    pub outcome: u8,
    pub amount: u64,
    pub net: u64,
}

#[event]
pub struct MarketResolved {
    pub market: Pubkey,
    pub state: MarketState,
    pub winning_outcome: u8,
}

#[event]
pub struct Claimed {
    pub market: Pubkey,
    pub ticket_mint: Pubkey,
    pub claimer: Pubkey,
    pub payout: u64,
}

#[error_code]
pub enum BetError {
    #[msg("Taxa inválida (máximo 10000 bps)")]
    InvalidFee,
    #[msg("Número de outcomes inválido (2 a 8)")]
    InvalidOutcomeCount,
    #[msg("Odds precisam ser maiores que 1x (10000 bps)")]
    InvalidOdds,
    #[msg("Deadline de apostas no passado")]
    CloseInPast,
    #[msg("Mercado não está aberto")]
    MarketNotOpen,
    #[msg("Apostas encerradas para este mercado")]
    BettingClosed,
    #[msg("Outcome inválido")]
    InvalidOutcome,
    #[msg("Valor precisa ser maior que zero")]
    ZeroAmount,
    #[msg("Vault da casa sem liquidez suficiente")]
    InsufficientHouseLiquidity,
    #[msg("Partida ainda não terminou")]
    MatchNotFinished,
    #[msg("Mercado ainda não foi liquidado")]
    MarketNotSettled,
    #[msg("Aposta já resgatada")]
    AlreadyClaimed,
    #[msg("Você não segura o ticket desta aposta")]
    TicketNotHeld,
    #[msg("Aposta perdedora")]
    LosingBet,
    #[msg("Overflow aritmético")]
    MathOverflow,
}
