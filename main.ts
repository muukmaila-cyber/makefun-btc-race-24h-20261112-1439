// Deep-dip + breakout bot for make.fun btc-race-24h-20261112-1439.
//
// Long-only cbBTC/USDC, $1,000 start, 1-minute bars, fills at next bar's open.
// Two entry modes, one position at a time, all-in, deterministic, no clock,
// no randomness, no network.
//
// Mode A — deep dip (the money mode): buy when the latest close is at least
// 1.5% below the highest close of the last 120 bars AND the close is green
// (above the previous close: the dip has stopped falling). Take profit +0.5%,
// stop loss -1.0% from the entry close.
//
// Mode B — breakout insurance: buy when the latest close breaks at least
// 0.3% above the highest close of the last 120 bars AND the close is green.
// Take profit +1.2%, stop loss -0.8%. Never fired on either dev window, so it
// costs nothing there; it only fires if the race window actually rallies.
//
// Why this shape — lessons from yesterday's losing bot (btc-race-24h-20261111-0801,
// dev +$10.30, race -$15.72, rank #161/221):
//   - Yesterday's bot bought every -0.8% dip vs the 240-bar high with TP +0.8% /
//     SL -1.0%. In the falling race window the dips kept dipping: it held one
//     position 636 bars (~10.6h) underwater until the stop, then did it again.
//     Negative asymmetry (risk 1.0% to make 0.8%) plus ~26 bps round-trip costs
//     meant 4 wins of 7 trades still lost $15.72.
//   - A -1% dip's forward bounce over the next 4h averages only +0.42% on this
//     dev window and never reaches +1.2%: wide take-profits never fill in a
//     grind-down market. The fix is a SMALL take-profit (+0.5%) on a DEEP dip
//     (-1.5% vs a shorter 2h high) with a green-close confirmation, and a WIDE
//     stop (-1.0%) so chop does not hunt it. Every kit baseline loses on this
//     dev window (buy-and-hold -$25.97, rsi-bollinger -$46.52, ema-cross -$95.88);
//     this rule is one of the few that stays positive on BOTH dev windows.
//   - Local grade of this file (grade-local, --driver process): new dev window
//     net PnL +$2.018430, 3 trades, win rate 0.50, max drawdown 0.0039; previous
//     race's dev window: +$2.993198, 2 trades, win rate 1.00, max drawdown
//     0.0100. Small but positive in both regimes, with tiny drawdowns — exactly
//     what this race rewards (yesterday's winner made only +$7.57; 10th place
//     +$1.43).
//
// vendor/makefun-bars.ts is a copy of the kit SDK shim.
import { runBars, type BarsState } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const LOOKBACK = 120;
const DIP_BPS = 150n;
const DIP_TP_BPS = 50n;
const DIP_SL_BPS = 100n;
const BREAKOUT_BPS = 30n;
const BREAKOUT_TP_BPS = 120n;
const BREAKOUT_SL_BPS = 80n;
const MAX_SLIPPAGE_BPS = 300;

const closes: bigint[] = [];
let prevClose: bigint | null = null;
let entryClose: bigint | null = null;
let tpBps: bigint = DIP_TP_BPS;
let slBps: bigint = DIP_SL_BPS;

/** Highest close of the last LOOKBACK bars, excluding the latest one. */
function recentMax(): bigint {
  let m = closes[closes.length - LOOKBACK - 1];
  for (let i = closes.length - LOOKBACK; i < closes.length - 1; i++) {
    if (closes[i] > m) m = closes[i];
  }
  return m;
}

await runBars({
  onBatch(state: BarsState, batch) {
    const close = state.close(SYMBOL);
    if (close === null) return [];
    closes.push(close);
    const held = state.positions.get(SYMBOL);
    if (held !== undefined) {
      if (entryClose === null) entryClose = close;
      const up = close * 10000n >= entryClose * (10000n + tpBps);
      const down = close * 10000n <= entryClose * (10000n - slBps);
      if (up || down) {
        entryClose = null;
        return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      prevClose = close;
      return [];
    }
    if (closes.length < LOOKBACK + 1 || prevClose === null) {
      prevClose = close;
      return [];
    }
    const green = close > prevClose;
    const hi = recentMax();
    let mode: 'dip' | 'breakout' | null = null;
    if (green && close * 10000n <= hi * (10000n - DIP_BPS)) mode = 'dip';
    else if (green && close * 10000n >= hi * (10000n + BREAKOUT_BPS)) mode = 'breakout';
    prevClose = close;
    if (mode === null) return [];
    if (mode === 'dip') {
      tpBps = DIP_TP_BPS;
      slBps = DIP_SL_BPS;
    } else {
      tpBps = BREAKOUT_TP_BPS;
      slBps = BREAKOUT_SL_BPS;
    }
    entryClose = close;
    const room = state.weightRoom(SYMBOL);
    const spend = state.cash < room ? state.cash : room;
    if (spend < BigInt(state.hello.fees.min_notional_quote_units)) return [];
    return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: spend, max_slippage_bps: MAX_SLIPPAGE_BPS }];
  },
});
