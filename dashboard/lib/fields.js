// Single source of truth for every value that lives in agent/.env.
// `step` groups fields into the setup wizard's screens.

export const FIELD_GROUPS = [
  {
    step: 1,
    title: "Connect KeeperHub",
    description:
      "KeeperHub is the execution layer — it simulates and signs from its own Turnkey-managed treasury wallet.",
    fields: [
      {
        key: "KEEPERHUB_MCP_URL",
        label: "KeeperHub MCP URL",
        placeholder: "https://mcp.keeperhub.xyz/your-org",
        secret: false,
        help: "The MCP server endpoint for your KeeperHub org.",
      },
      {
        key: "KEEPERHUB_API_KEY",
        label: "KeeperHub API key",
        placeholder: "kh_live_••••••••••••",
        secret: true,
        help: "Used to authenticate every execute_transfer and status call.",
      },
      {
        key: "GROQ_API_KEY",
        label: "Groq API key",
        placeholder: "gsk_••••••••••••",
        secret: true,
        help: "Powers the pay-or-hold reasoning step each cycle.",
      },
    ],
  },
  {
    step: 2,
    title: "Wallets",
    description:
      "The treasury wallet pays out; recipient wallets receive the fixed disbursement each cycle.",
    fields: [
      {
        key: "CHAIN_ID",
        label: "Chain ID",
        placeholder: "11155111",
        secret: false,
        help: "Defaults to Sepolia testnet (11155111).",
      },
      {
        key: "TREASURY_WALLET_ADDRESS",
        label: "Treasury wallet address",
        placeholder: "0x...",
        secret: false,
        mono: true,
        help: "KeeperHub's Turnkey-managed org wallet. Funds flow out of this address.",
      },
      {
        key: "PAYOUT_WALLET_1",
        label: "Payout wallet 1",
        placeholder: "0x...",
        secret: false,
        mono: true,
      },
      {
        key: "PAYOUT_WALLET_2",
        label: "Payout wallet 2",
        placeholder: "0x...",
        secret: false,
        mono: true,
      },
      {
        key: "PAYOUT_WALLET_3",
        label: "Payout wallet 3",
        placeholder: "0x...",
        secret: false,
        mono: true,
      },
    ],
  },
  {
    step: 3,
    title: "Disbursement policy",
    description:
      "The numbers the reasoning step weighs every cycle: what to pay, what counts as \"worth it,\" and how often to check.",
    fields: [
      {
        key: "DISBURSEMENT_AMOUNT_ETH",
        label: "Disbursement amount (ETH)",
        placeholder: "0.002",
        secret: false,
        help: "Fixed amount sent to each payout wallet when the agent decides to pay.",
      },
      {
        key: "SWEEP_THRESHOLD_ETH",
        label: "Net-benefit threshold (ETH)",
        placeholder: "0.0005",
        secret: false,
        help: "Minimum (disbursement − gas) the agent requires before it will pay.",
      },
      {
        key: "POLL_INTERVAL_SECONDS",
        label: "Cycle interval (seconds)",
        placeholder: "600",
        secret: false,
        help: "How often the agent re-checks balance, gas, and every wallet.",
      },
    ],
  },
];

export const ALL_FIELDS = FIELD_GROUPS.flatMap((g) => g.fields);
export const REQUIRED_KEYS = ALL_FIELDS.map((f) => f.key);
