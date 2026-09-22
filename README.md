# The Estimation Corrector

Every dev lowballs their estimates. You type "2 hours," reality delivers 2 days. This tool applies the multiplier you already know is coming.

Describe the task and give your honest estimate. It scans the description for known red-flag phrases — "just," "simple," "CSS," "migration," "one small change," "refactor," "third-party API" — and applies a stacking (diminishing-returns) multiplier for each one it finds, then prints a receipt with your corrected, more honest estimate.

## Try it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server
```

Then visit `http://localhost:8000`.

## Why

"Just add a small settings toggle, should be quick" is not an estimate, it's a warning label. This tool reads the warning label for you.

## Stack

Vanilla HTML/CSS/JS. No build step, no dependencies, no framework. The rule set lives in `script.js`.

## License

MIT — see [LICENSE](LICENSE).
