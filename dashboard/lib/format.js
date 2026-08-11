export function shortAddress(addr) {
  if (!addr) return "—";
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function shortHash(hash) {
  return shortAddress(hash);
}

export function formatEth(value, digits = 5) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return Number(value).toFixed(digits);
}

export function timeAgo(iso) {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

export function explorerTxUrl(hash, chainId = "11155111") {
  const base = chainId === "1" ? "https://etherscan.io" : "https://sepolia.etherscan.io";
  return `${base}/tx/${hash}`;
}

export function explorerAddressUrl(address, chainId = "11155111") {
  const base = chainId === "1" ? "https://etherscan.io" : "https://sepolia.etherscan.io";
  return `${base}/address/${address}`;
}
