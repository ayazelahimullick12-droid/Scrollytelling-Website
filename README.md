# Project Showcase

A scrollytelling presentation of five internship projects: Accessible Agami, the cloud (Gemini) voice
assistant, the fully local voice assistant, and a glance at the AI project manager and the Field Visit Tracker.

## Start it

Double-click **Start Showcase.bat**. It serves this folder at <http://localhost:8080> and opens it.
Keep the black window open while presenting. It needs Python, which is already installed on this laptop.

Opening `index.html` directly also works, but the live apps behave best through the launcher.

## Ten minutes before you present

1. **Open the page.** The dots at the top right turn green as each live app wakes. Render's free servers
   take about a minute after a quiet spell. The page keeps them awake for as long as it stays open.
2. **Start the project manager** (its backend, the frontend on port 5500, and LM Studio). If it isn't running,
   chapter 4 shows a screenshot instead and says so. Press **Reload** on that slide once it's up.
3. **Sign in to the Field Visit Tracker** on the last slide of chapter 5: press **Expand**, sign in with a
   management account (the map is in the management view), then press **Esc**. The sign-in is remembered.
4. **Optional:** save a recording of the local assistant as `assets/local-demo.mp4`. It then appears on the
   last slide of chapter 3. Without it, that slide shows the status board alone.

## Keys

| Key | Does |
|---|---|
| ↓ → Page Down Space | Next step (most clickers send Page Down) |
| ↑ ← Page Up | Previous step |
| 1–5, 0 | Jump to a chapter, or back to the start |
| Home / End | First / last slide |
| B or . | Blank the screen |
| F | Full screen |
| H | Show or hide the key hint |
| ? | All shortcuts |
| Esc | Close an expanded live app |

After clicking inside a live app, click anywhere outside it to get the keys back.

The voice assistant opens in its own window ("Open the live assistant"), because browsers block its sign-in
cookie inside an embedded frame.

## Files

- `index.html`: the page and all of its text
- `assets/showcase.css`, `assets/showcase.js`: styles and behaviour
- `assets/agami/`: Agami screens cropped from the app's screenshots
- `assets/icons/`: Agami's village-life icons
- `assets/bd-map.js`: Bangladesh division and district shapes, taken from the tracker's own map data
- `assets/shots/`: fallback screenshot for the project manager

## Credits

Map boundaries: [geoBoundaries](https://www.geoboundaries.org/) (CC BY 4.0), via the Field Visit Tracker.
