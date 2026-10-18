# SCOTUS Radio

Supreme Court oral arguments over lofi music. Live at [scotusfi.com](https://scotusfi.com).

## How the argument list stays current

- `cases.json` holds the arguments for the current term and the previous one.
- `.github/workflows/update-cases.yml` runs every morning. It runs `scripts/update_cases.py`, which reads
  `supremecourt.gov/oral_arguments/argument_audio/<term>`, finds each new case's MP3 and transcript, and commits
  `cases.json` if anything changed. GitHub Pages then redeploys on its own.
- A term starts in October, so from January to September the "current term" is the previous calendar year.
- To refresh right away, open the **Actions** tab, pick **Update argument list**, and click **Run workflow**.
- To run it on your own computer: `python3 scripts/update_cases.py` (Python 3.9+, no installs).

## Music

The playlist is at the top of `script.js`. Tracks in `playlist/` are hosted here; the CC0 tracks from
OpenGameArt stream from opengameart.org.
