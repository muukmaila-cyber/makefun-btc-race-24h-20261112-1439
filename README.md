# BTC dip-bounce bot — make.fun btc-race-24h-20261112-1439

Long-only cbBTC/USDC trading bot on 1-minute Orca Whirlpool bars, $1,000 paper start.

## Strategy

Two entry modes, one position at a time, all-in, deterministic:

- **Deep dip** — buy when the close is ≥1.5% below the highest close of the last 120 bars and the close is green (above the previous close). Take profit +0.5%, stop loss −1.0%.
- **Breakout insurance** — buy when the close breaks ≥0.3% above the highest close of the last 120 bars and the close is green. Take profit +1.2%, stop loss −0.8%. Never fired on either dev window; only fires if the race window actually rallies.

## Why this shape

Yesterday's bot (btc-race-24h-20261111-0801) bought every −0.8% dip vs the 240-bar high with TP +0.8% / SL −1.0%. It made +$10.30 on dev but lost −$15.72 in the race (rank #161/221): in a falling market the dips kept dipping, one position sat underwater 636 bars until the stop, and negative asymmetry plus ~26 bps round-trip costs turned 4 wins of 7 trades into a loss.

The fix: a small take-profit (+0.5%) on a deep dip (−1.5% vs a shorter 2-hour high) with a green-close confirmation, and a wide stop (−1.0%) so chop doesn't hunt it. Every kit baseline loses on this dev window; this rule stays positive on both dev windows.

## Verified results (grade-local, --driver process)

- New dev window (Nov 11 14:39 → Nov 12 14:39 UTC): **net PnL +$2.018**, 3 trades, win rate 0.50, max drawdown 0.39%.
- Previous race's dev window (Nov 10 12:16 → Nov 11 12:16 UTC): **net PnL +$2.993**, 2 trades, win rate 1.00, max drawdown 1.00%.

Both reproduced byte for byte. Dev gate needs net PnL above $0; this passes on both windows.

## License

MIT
