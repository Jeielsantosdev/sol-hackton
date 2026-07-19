import BackBar from "./BackBar";
import chainplayLogo from "./assets/chainplay-logo.png";
import mascot from "./assets/chameleon1.png";

export type LegalPageId =
  | "terms"
  | "privacy"
  | "responsible"
  | "disclosures"
  | "brand";

/** Páginas institucionais do footer, no formato da referência (welikesports.com):
 *  título grande, eyebrow "LAST UPDATED", card de Table of Contents com âncoras e
 *  seções numeradas. Conteúdo em inglês (idioma da submissão), estático. */

interface LegalSection {
  id: string;
  heading: string;
  body: JSX.Element;
}

interface LegalDoc {
  title: string;
  updated: string;
  intro?: JSX.Element;
  sections: LegalSection[];
}

const TERMS: LegalDoc = {
  title: "Terms of Service",
  updated: "July 19, 2026",
  sections: [
    {
      id: "acceptance",
      heading: "Acceptance of Terms",
      body: (
        <>
          <p>
            These Terms of Service ("Terms") govern your access to and use of the
            ChainPlay website interface ("Interface") operated by the ChainPlay
            team (the "Team" or "we," "us," or "our") and associated
            applications, smart contracts, and related services (the "Protocol")
            that may be made accessible through the Interface (collectively, the
            "Platform"). The Interface is not the exclusive means of access to
            the Protocol.
          </p>
          <p>
            By using the Interface to access the Protocol, connecting a
            cryptocurrency wallet, placing a prediction, or otherwise
            interacting with the Platform, you acknowledge that you have read,
            understood, and agree to be bound by these Terms. If you do not agree
            to these Terms, you must not use the Interface to access the Protocol
            or in any way use the Platform.
          </p>
          <p>
            These Terms constitute a binding agreement between you and the Team.
            You represent and warrant that you have the legal capacity and
            authority to enter into this agreement.
          </p>
        </>
      ),
    },
    {
      id: "overview",
      heading: "Platform Overview",
      body: (
        <>
          <p>
            ChainPlay provides a website interface that enables users to access a
            smart contract protocol of football prediction minigames connected to
            real World Cup matches and statistics. Predictions are escrowed and
            settled by autonomous smart contracts deployed on the Solana
            blockchain, based on predefined rules and external sports data.
          </p>
          <p>
            <strong>Important:</strong> the Platform currently runs exclusively
            on <strong>Solana devnet</strong>. Devnet SOL has no monetary value:
            it cannot be bought, sold, or exchanged for real currency. Nothing on
            the Platform today involves real-money gambling. The Platform is a
            hackathon demonstration, not a licensed gambling, gaming, or betting
            service.
          </p>
          <p>
            Every prediction placed through the Protocol mints an NFT ticket to
            the participating wallet. Whoever holds the ticket redeems the
            associated prize, and the ticket is burned on redemption.
          </p>
        </>
      ),
    },
    {
      id: "eligibility",
      heading: "Eligibility and Jurisdiction",
      body: (
        <>
          <p>
            To use the betting modes of the Platform, you must be at least
            eighteen (18) years of age, or the age of majority in your
            jurisdiction, whichever is greater. By using the Platform, you
            represent and warrant that you meet these age requirements.
          </p>
          <p>
            <strong>Jurisdictional Restrictions:</strong> you are solely
            responsible for determining whether your use of the Platform complies
            with all applicable laws, regulations, and rules in your
            jurisdiction. We reserve the right to restrict access to the
            Interface from certain jurisdictions at our sole discretion.
          </p>
          <p>You acknowledge and agree that:</p>
          <ul>
            <li>
              It is your responsibility to ensure compliance with local laws
              before using the Interface to access the Protocol
            </li>
            <li>
              The Team does not provide legal advice regarding the legality of
              using the Interface in your jurisdiction
            </li>
            <li>
              The Team may cooperate with law enforcement or regulatory
              authorities as required by applicable law
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "accounts",
      heading: "Accounts and Wallets",
      body: (
        <>
          <p>
            To access the betting features of the Protocol, you must connect a
            compatible Solana wallet (such as Phantom, Solflare, or Backpack).
            The Platform has no account registration: there are no e-mail and
            password credentials and no social login — your wallet is your
            identity on the Platform.
          </p>
          <p>
            <strong>Account Security:</strong> you are solely responsible for:
          </p>
          <ul>
            <li>
              Maintaining the confidentiality and security of your wallet
              credentials, private keys, seed phrases, and any authentication
              methods
            </li>
            <li>
              All activities that occur through your wallet, whether or not
              authorized by you
            </li>
            <li>Ensuring the security of any devices used to access the Platform</li>
          </ul>
          <p>
            <strong>Lost Access:</strong> the Team does not have access to your
            private keys, seed phrases, or wallet credentials. If you lose access
            to your wallet, we cannot recover your funds or restore your access.
            You acknowledge that lost wallet access may result in permanent loss
            of any associated digital assets.
          </p>
          <p>
            <strong>Account Termination:</strong> we reserve the right to suspend
            or terminate your access to the Interface at any time, particularly
            if we reasonably believe you have violated these Terms or applicable
            law.
          </p>
        </>
      ),
    },
    {
      id: "custody",
      heading: "Non-Custodial Nature; No Custody of Funds",
      body: (
        <>
          <p>
            The Team is a software provider and operates on a strictly
            non-custodial basis. This is a fundamental aspect of the Interface
            that you must understand and accept before using our services:
          </p>
          <ul>
            <li>
              <strong>No Custody:</strong> the Team does not hold, control,
              manage, or have access to your cryptocurrency or digital assets at
              any time
            </li>
            <li>
              <strong>No Wallet Control:</strong> we do not control your wallet,
              private keys, or seed phrases, and we cannot execute transactions
              on your behalf
            </li>
            <li>
              <strong>Smart Contract Escrow:</strong> when you place a
              prediction, your staked SOL is deployed by you into an autonomous
              smart contract vault on the blockchain; payouts, refunds, and voids
              are executed by the program according to its published rules, and
              the Team has no custody of your digital assets at any point in the
              process
            </li>
            <li>
              <strong>Direct Transactions:</strong> all transactions occur
              directly between your wallet and the relevant smart contracts on
              the blockchain
            </li>
            <li>
              <strong>No Recovery:</strong> we cannot reverse, cancel, or modify
              blockchain transactions, nor can we recover funds sent to incorrect
              addresses or lost due to user error
            </li>
          </ul>
          <p>
            You acknowledge that you are interacting directly with
            blockchain-based smart contracts and that the Team serves only as a
            software interface to facilitate such interactions. The non-custodial
            nature of the Interface means you retain full control — and full
            responsibility — for your digital assets at all times.
          </p>
        </>
      ),
    },
    {
      id: "markets",
      heading: "Markets and Rules",
      body: (
        <>
          <p>
            Markets on the Protocol are created by the Platform's backend and
            enforced by smart contracts. Two market patterns exist:
          </p>
          <ul>
            <li>
              <strong>Parimutuel markets:</strong> participants bet against each
              other; the pot is split among winners proportionally to their
              stakes.
            </li>
            <li>
              <strong>House-backed markets:</strong> fixed odds locked at bet
              time; the house funds the prize with its own liquidity, and the
              program rejects any bet the house vault could not pay.
            </li>
          </ul>
          <p>By participating in a market, you acknowledge that:</p>
          <ul>
            <li>Rules are enforced by smart contracts, not adjustable per player</li>
            <li>
              Outcomes are determined by smart contract logic fed with external
              sports data (TxLINE), read by the Platform's backend acting as
              oracle
            </li>
            <li>
              Markets whose result cannot be determined are cancelled, refunding
              all net stakes
            </li>
            <li>You should review each game's rules carefully before participating</li>
          </ul>
        </>
      ),
    },
    {
      id: "fees",
      heading: "Fees",
      body: (
        <>
          <p>Your use of the Interface may be subject to fees, including:</p>
          <ul>
            <li>
              <strong>Platform Fee:</strong> parimutuel markets deduct a 10% fee
              from each bet before the pot is split among winners
            </li>
            <li>
              <strong>House Margin:</strong> house-backed modes pay fixed odds
              below fair statistical value — that margin is the house edge
            </li>
            <li>
              <strong>Network Fees:</strong> blockchain transaction fees paid to
              network validators, which are separate from and not controlled by
              the Team
            </li>
          </ul>
          <p>
            Applicable fees are disclosed in each game before you confirm a
            transaction. By confirming a transaction, you agree to pay all
            associated fees. We reserve the right to modify the fee structure at
            any time; changes will be communicated through updates to these
            Terms.
          </p>
        </>
      ),
    },
    {
      id: "third-party",
      heading: "Third-Party Services",
      body: (
        <>
          <p>
            The Interface may integrate with or provide access to third-party
            services, networks, or applications, including but not limited to:
          </p>
          <ul>
            <li>
              <strong>Data Providers:</strong> match fixtures and statistics come
              from the TxLINE API and are used to determine market outcomes
            </li>
            <li>
              <strong>Wallet Providers:</strong> Phantom, Solflare, Backpack, and
              other compatible wallet services
            </li>
            <li>
              <strong>Blockchain Networks:</strong> the Solana network and its
              RPC infrastructure
            </li>
          </ul>
          <p>
            Your use of third-party services is subject to those providers' own
            terms and privacy policies. The Team does not endorse, guarantee, or
            assume responsibility for the accuracy, reliability, availability, or
            security of any third-party service. Sports data may be delayed or
            occasionally degraded; when the feed is unavailable, the Platform
            falls back to clearly simulated data so games remain playable.
          </p>
        </>
      ),
    },
    {
      id: "risks",
      heading: "Smart Contract and Blockchain Risks",
      body: (
        <>
          <p>
            By using the Platform, you acknowledge and accept the inherent risks
            associated with blockchain technology and smart contracts:
          </p>
          <ul>
            <li>
              <strong>Smart Contract Risk:</strong> smart contracts are
              autonomous software programs with inherent risks, including bugs,
              vulnerabilities, or exploits. Smart contract failures could result
              in complete loss of staked funds, and by using the Interface you
              explicitly accept this risk. The Platform's contract passed an
              internal security review but has <strong>not</strong> been audited
              by an external firm.
            </li>
            <li>
              <strong>Blockchain Risk:</strong> networks may experience
              congestion, forks, or other disruptions that could affect
              transactions or smart contract execution
            </li>
            <li>
              <strong>Irreversibility:</strong> blockchain transactions are
              generally irreversible; errors in execution cannot be undone
            </li>
            <li>
              <strong>Oracle Risk:</strong> market resolution (v1) is performed
              by the Platform's backend reading third-party sports data; wrong or
              missing data can delay settlement or void markets
            </li>
            <li>
              <strong>Regulatory Risk:</strong> the regulatory status of
              blockchain technology is evolving and future regulations could
              affect the Platform
            </li>
          </ul>
          <p>
            You acknowledge that you have sufficient knowledge and experience to
            evaluate the risks of using blockchain-based services and accept full
            responsibility for such risks.
          </p>
        </>
      ),
    },
    {
      id: "prohibited",
      heading: "Prohibited Uses",
      body: (
        <>
          <p>You agree not to use the Platform to:</p>
          <ul>
            <li>Violate any applicable law, regulation, or rule</li>
            <li>
              Engage in money laundering, terrorist financing, or other financial
              crimes
            </li>
            <li>
              Circumvent geographic restrictions or access the Platform from
              prohibited jurisdictions
            </li>
            <li>
              Manipulate market outcomes, collude with other users, or engage in
              any form of fraud
            </li>
            <li>
              Exploit bugs, vulnerabilities, or errors in the Platform or smart
              contracts
            </li>
            <li>
              Use automated systems, bots, or scripts without explicit
              authorization
            </li>
            <li>
              Attempt to gain unauthorized access to the Platform, other users'
              accounts, or related systems
            </li>
            <li>
              Interfere with or disrupt the Platform or the servers and networks
              connected to it
            </li>
            <li>
              Infringe upon the intellectual property rights of the Team or third
              parties
            </li>
            <li>Harass, abuse, or harm other users</li>
            <li>
              Create multiple accounts to circumvent restrictions or manipulate
              the Platform
            </li>
            <li>Provide false, inaccurate, or misleading information</li>
          </ul>
          <p>
            Violation of these prohibitions may result in immediate termination
            of your access to the Platform and may be reported to appropriate
            authorities.
          </p>
        </>
      ),
    },
    {
      id: "ip",
      heading: "Intellectual Property",
      body: (
        <>
          <p>
            The Interface, including its design, text, graphics, logos, icons,
            images, mascot, software, and other content, is owned by the Team or
            its licensors and is protected by copyright, trademark, and other
            intellectual property laws.
          </p>
          <p>
            <strong>Limited License:</strong> subject to your compliance with
            these Terms, we grant you a limited, non-exclusive, non-transferable,
            revocable license to use the Interface for your personal,
            non-commercial use.
          </p>
          <p><strong>Restrictions:</strong> you may not:</p>
          <ul>
            <li>Copy, modify, distribute, sell, or lease any part of the Platform</li>
            <li>
              Reverse engineer or attempt to extract the source code of the
              Platform (except as permitted by law or by its open-source license)
            </li>
            <li>Remove, alter, or obscure any proprietary notices</li>
            <li>
              Use the ChainPlay name, logo, or trademarks without prior written
              consent (see the Brand page)
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "warranties",
      heading: "Disclaimer of Warranties",
      body: (
        <>
          <p>
            THE PLATFORM IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS
            WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR
            STATUTORY.
          </p>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE TEAM EXPRESSLY
            DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO:
          </p>
          <ul>
            <li>
              IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
              PURPOSE, AND NON-INFRINGEMENT
            </li>
            <li>
              WARRANTIES THAT THE PLATFORM WILL BE UNINTERRUPTED, TIMELY, SECURE,
              OR ERROR-FREE
            </li>
            <li>
              WARRANTIES REGARDING THE ACCURACY, RELIABILITY, OR COMPLETENESS OF
              ANY INFORMATION ON THE PLATFORM, INCLUDING THIRD-PARTY SPORTS DATA
            </li>
            <li>
              WARRANTIES REGARDING THE PERFORMANCE OR SECURITY OF SMART CONTRACTS
            </li>
            <li>
              WARRANTIES REGARDING THE ACTIONS OF THIRD-PARTY SERVICE PROVIDERS
            </li>
          </ul>
          <p>
            YOU ACKNOWLEDGE THAT YOUR USE OF THE INTERFACE TO ACCESS THE PROTOCOL
            IS AT YOUR SOLE RISK. SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION
            OF IMPLIED WARRANTIES, SO SOME OF THE ABOVE EXCLUSIONS MAY NOT APPLY
            TO YOU.
          </p>
        </>
      ),
    },
    {
      id: "liability",
      heading: "Limitation of Liability",
      body: (
        <>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL
            THE TEAM, ITS MEMBERS, CONTRIBUTORS, OR LICENSORS BE LIABLE FOR:
          </p>
          <ul>
            <li>
              ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR
              EXEMPLARY DAMAGES
            </li>
            <li>
              LOSS OF DIGITAL ASSETS, PROFITS, REVENUE, DATA, USE, GOODWILL, OR
              OTHER INTANGIBLE LOSSES
            </li>
            <li>
              DAMAGES RESULTING FROM YOUR USE OF OR INABILITY TO USE THE
              INTERFACE TO ACCESS THE PROTOCOL
            </li>
            <li>
              DAMAGES RESULTING FROM SMART CONTRACT FAILURES, BUGS, OR EXPLOITS
            </li>
            <li>
              DAMAGES RESULTING FROM UNAUTHORIZED ACCESS TO YOUR WALLET OR
              ACCOUNT
            </li>
            <li>
              DAMAGES RESULTING FROM BLOCKCHAIN NETWORK DISRUPTIONS OR FAILURES
            </li>
            <li>
              DAMAGES RESULTING FROM ACTIONS OF THIRD-PARTY SERVICE PROVIDERS
            </li>
          </ul>
          <p>
            IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING
            FROM OR RELATED TO THESE TERMS OR THE PLATFORM EXCEED ONE HUNDRED
            U.S. DOLLARS ($100). SOME JURISDICTIONS DO NOT ALLOW THE LIMITATION
            OR EXCLUSION OF LIABILITY FOR CERTAIN DAMAGES, SO SOME OF THE ABOVE
            LIMITATIONS MAY NOT APPLY TO YOU.
          </p>
        </>
      ),
    },
    {
      id: "indemnification",
      heading: "Indemnification",
      body: (
        <>
          <p>
            You agree to indemnify, defend, and hold harmless the Team, its
            members, contributors, and licensors from and against any and all
            claims, damages, losses, liabilities, costs, and expenses (including
            reasonable attorneys' fees) arising from or related to:
          </p>
          <ul>
            <li>Your use of the Interface to access the Protocol</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any applicable law or regulation</li>
            <li>Your violation of any rights of a third party</li>
            <li>Any negligent or wrongful conduct by you</li>
          </ul>
          <p>
            We reserve the right to assume the exclusive defense and control of
            any matter subject to indemnification by you, in which event you will
            cooperate with us in asserting any available defenses.
          </p>
        </>
      ),
    },
    {
      id: "disputes",
      heading: "Dispute Resolution and Governing Law",
      body: (
        <>
          <p>
            <strong>Governing Law:</strong> these Terms shall be governed by and
            construed in accordance with the laws of the Federative Republic of
            Brazil, without regard to its conflict of law provisions.
          </p>
          <p>
            <strong>Informal Resolution:</strong> before initiating any formal
            dispute resolution process, you agree to first contact us (see
            Contact Information) to attempt to resolve any dispute informally. We
            will attempt to resolve disputes within thirty (30) days of receiving
            notice.
          </p>
        </>
      ),
    },
    {
      id: "changes",
      heading: "Changes to Terms",
      body: (
        <>
          <p>
            We reserve the right to modify these Terms at any time. When we make
            material changes, we will notify you by posting the updated Terms on
            the Interface with a new "Last Updated" date.
          </p>
          <p>
            Your continued use of the Interface after the effective date of any
            changes constitutes your acceptance of the modified Terms. If you do
            not agree to the modified Terms, you must stop using the Interface.
            We encourage you to review these Terms periodically for any updates.
          </p>
        </>
      ),
    },
    {
      id: "contact",
      heading: "Contact Information",
      body: (
        <>
          <p>
            If you have any questions, concerns, or feedback regarding these
            Terms of Service or the Platform, please contact the ChainPlay team
            through our GitHub organization:{" "}
            <a
              href="https://github.com/ParaDevs-Brasil"
              target="_blank"
              rel="noreferrer"
            >
              github.com/ParaDevs-Brasil
            </a>
            .
          </p>
          <p>
            By using the ChainPlay Interface and accessing the Protocol, you
            acknowledge that you have read, understood, and agree to be bound by
            these Terms of Service.
          </p>
        </>
      ),
    },
  ],
};

const PRIVACY: LegalDoc = {
  title: "Privacy Policy",
  updated: "July 19, 2026",
  sections: [
    {
      id: "collect",
      heading: "Information We Collect",
      body: (
        <>
          <p>
            The Platform has no account registration — there is no e-mail,
            password, or social login. Authentication happens by signing a
            message with your own Solana wallet ("Sign-In with Solana"), so the
            information we handle is limited to:
          </p>
          <ul>
            <li>
              <strong>Wallet address</strong> — your public address identifies
              your bets, tickets, sessions and leaderboard entries, and is the
              only identity shown on the Platform. We never see or store your
              private keys.
            </li>
            <li>
              <strong>Gameplay data</strong> — sessions, predictions and
              results, needed to run the games and settle markets
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "onchain",
      heading: "What Lives On-Chain",
      body: (
        <p>
          Bets, tickets and settlements are public Solana transactions. Anything
          recorded on-chain is permanent and visible to anyone — that
          transparency is a feature of the product, not an accident.
        </p>
      ),
    },
    {
      id: "dont",
      heading: "What We Don't Do",
      body: (
        <p>
          We don't sell your data, we don't run third-party ad trackers, and we
          don't ask for payment information — there is none to ask for on devnet.
        </p>
      ),
    },
    {
      id: "third-parties",
      heading: "Third Parties",
      body: (
        <p>
          Match data comes from the TxLINE API (we send it no personal data).
          Solana RPC providers process the public transactions you sign, under
          their own policies.
        </p>
      ),
    },
    {
      id: "storage",
      heading: "Storage and Retention",
      body: (
        <>
          <p>
            <strong>In your browser:</strong> we use local storage only — no
            tracking cookies. It holds your session token, your language
            preference, and local records such as your personal best scores. All
            of it stays on your device and can be cleared at any time from your
            browser settings.
          </p>
          <p>
            <strong>On our servers:</strong> session and game records (wallet
            address, sessions, predictions, results) are stored only as long as
            needed to operate the platform.
          </p>
        </>
      ),
    },
    {
      id: "contact",
      heading: "Contact",
      body: (
        <p>
          Questions about this policy? Reach the team through{" "}
          <a
            href="https://github.com/ParaDevs-Brasil"
            target="_blank"
            rel="noreferrer"
          >
            github.com/ParaDevs-Brasil
          </a>
          .
        </p>
      ),
    },
  ],
};

const RESPONSIBLE: LegalDoc = {
  title: "Responsible Gaming",
  updated: "July 19, 2026",
  intro: (
    <p className="legal-intro">
      ChainPlay runs on devnet SOL, which has no real-world value — but we take
      prediction gaming habits seriously, and the same principles will govern any
      future real-money version.
    </p>
  ),
  sections: [
    {
      id: "commitments",
      heading: "Our Commitments",
      body: (
        <ul>
          <li>
            Small stakes by design (from 0.002 SOL) and free demo modes for every
            game
          </li>
          <li>
            Cash-out always available in ladder modes — you are never forced to
            risk everything
          </li>
          <li>House edge and fees disclosed openly (see Disclosures)</li>
          <li>18+ only for betting modes</li>
        </ul>
      ),
    },
    {
      id: "play-smart",
      heading: "Play Smart",
      body: (
        <ul>
          <li>Set a budget before playing and stop when you reach it</li>
          <li>Never chase losses — variance doesn't owe you anything</li>
          <li>Gaming should be entertainment, not income or an escape</li>
        </ul>
      ),
    },
    {
      id: "help",
      heading: "If It Stops Being Fun",
      body: (
        <p>
          If playing ever stops feeling like entertainment — for you or for
          someone close to you — take a break and talk to someone you trust.
          Most countries offer free, confidential support services for problem
          gambling; we encourage you to seek the resources available in your
          region.
        </p>
      ),
    },
  ],
};

const DISCLOSURES: LegalDoc = {
  title: "Disclosures",
  updated: "July 19, 2026",
  sections: [
    {
      id: "network",
      heading: "Network",
      body: (
        <p>
          All markets run on <strong>Solana devnet</strong>. Devnet SOL has no
          monetary value. This is a hackathon demonstration, not a licensed
          gambling product.
        </p>
      ),
    },
    {
      id: "fees",
      heading: "Fees and House Edge",
      body: (
        <ul>
          <li>
            <strong>Parimutuel markets (1X2):</strong> a 10% platform fee is
            deducted from each bet before the pot is split among winners
          </li>
          <li>
            <strong>House-backed modes (Hi-Lo ladder, staked Penalty):</strong>{" "}
            fixed odds pay below fair statistical value — that margin is the
            house edge, and it is how the house funds the prizes
          </li>
        </ul>
      ),
    },
    {
      id: "data",
      heading: "Data Source",
      body: (
        <p>
          Match statistics come from the TxLINE API. On the current free tier,
          live data arrives with roughly a 60-second delay and may occasionally
          be degraded; when the feed is unavailable the platform falls back to
          clearly simulated data so games remain playable.
        </p>
      ),
    },
    {
      id: "oracle",
      heading: "Oracle and Settlement",
      body: (
        <p>
          Market resolution (v1) is performed by our backend acting as the
          oracle, reading final scores from TxLINE and settling on-chain. The
          smart contract prevents resolution before a match could have ended and
          refunds all net stakes if a market is cancelled or has no winners.
        </p>
      ),
    },
    {
      id: "audit",
      heading: "Audit Status",
      body: (
        <p>
          The smart contract passed an internal security review (pattern scan,
          economic review, fuzzing and end-to-end tests on devnet) but has{" "}
          <strong>not been audited by an external firm</strong>. Do not use this
          code with real funds without a professional audit.
        </p>
      ),
    },
  ],
};

const BRAND: LegalDoc = {
  title: "Brand",
  updated: "July 19, 2026",
  intro: (
    <>
      <p className="legal-intro">
        ChainPlay is the chameleon that turns every match into a game. The mark
        combines a chameleon — adapt, observe, strike at the right moment — with
        a football in motion.
      </p>
      <p className="legal-brand-logo">
        <img src={chainplayLogo} alt="ChainPlay logo" width={280} />
      </p>
    </>
  ),
  sections: [
    {
      id: "mascot",
      heading: "The Mascot - Jorge The Chameleon",
      body: (
        <>
          <p>
            Jorge, the ChainPlay chameleon, wears the team hoodie and never
            takes his eye off the ball. He fronts the landing page, the live
            panel, and the game art — always rendered in the brand lime, always
            on dark backgrounds.
          </p>
          <p className="legal-brand-logo">
            <img src={mascot} alt="ChainPlay mascot" width={220} />
          </p>
        </>
      ),
    },
    {
      id: "colors",
      heading: "Colors",
      body: (
        <>
          <p>
            One loud lime over a near-black field — everything else stays
            quiet. Amber and red are reserved for alerts and losses.
          </p>
          <ul className="legal-swatches">
            <li>
              <span className="legal-swatch" style={{ background: "#c6f04e" }} />
              <code>#C6F04E</code> — brand lime (actions, links, highlights)
            </li>
            <li>
              <span className="legal-swatch" style={{ background: "#0b0b0d" }} />
              <code>#0B0B0D</code> — background
            </li>
            <li>
              <span className="legal-swatch" style={{ background: "#101013" }} />
              <code>#101013</code> — surface (cards)
            </li>
            <li>
              <span className="legal-swatch" style={{ background: "#ffcc00" }} />
              <code>#FFCC00</code> — amber (warnings, pending states)
            </li>
            <li>
              <span className="legal-swatch" style={{ background: "#ef4444" }} />
              <code>#EF4444</code> — red (errors, losses)
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "typography",
      heading: "Typography",
      body: (
        <ul>
          <li>
            <strong>Inter</strong> — interface and body text
          </li>
          <li>
            <strong>Instrument Sans</strong> — display headings
          </li>
          <li>
            <strong>JetBrains Mono</strong> — numbers, stats, odds and anything
            that smells like data
          </li>
        </ul>
      ),
    },
    {
      id: "usage",
      heading: "Usage",
      body: (
        <ul>
          <li>Keep the logo on dark backgrounds; don't recolor or distort it</li>
          <li>
            Name is always written <strong>ChainPlay</strong> — one word, capital
            C and P
          </li>
          <li>
            Don't restyle the mascot, give it new outfits, or separate it from
            the brand colors
          </li>
          <li>
            Don't use the ChainPlay name or logo to imply endorsement of other
            products
          </li>
        </ul>
      ),
    },
  ],
};

const DOCS: Record<LegalPageId, LegalDoc> = {
  terms: TERMS,
  privacy: PRIVACY,
  responsible: RESPONSIBLE,
  disclosures: DISCLOSURES,
  brand: BRAND,
};

export default function LegalPage({ page }: { page: LegalPageId }) {
  const doc = DOCS[page];
  return (
    <div className="game-page legal-page">
      <BackBar action={{ label: "← ChainPlay", href: "/" }} />
      <main className="legal-content">
        <header className="legal-header">
          <h1>{doc.title}</h1>
          <p className="legal-updated mono">
            LAST UPDATED · {doc.updated.toUpperCase()}
          </p>
        </header>

        {doc.intro}

        <nav className="legal-toc" aria-label="Table of contents">
          <strong className="legal-toc-title mono">TABLE OF CONTENTS</strong>
          <ol>
            {doc.sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>
                  {i + 1}. {s.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {doc.sections.map((s, i) => (
          <section key={s.id} id={s.id} className="legal-section">
            <h2>
              {i + 1}. {s.heading}
            </h2>
            {s.body}
          </section>
        ))}
      </main>
    </div>
  );
}
