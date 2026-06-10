# MMM-WorldCupLowerThird

MagicMirror module for a compact World Cup lower-third: live matches first, then near-term fixtures, then recent finals. It is designed for a 24" portrait display with the module placed in `bottom_bar`.

## Install

```bash
cd ~/MagicMirror/modules
git clone https://github.com/UnknownRegions/MMM-WorldCupLowerThird.git
cd MMM-WorldCupLowerThird
npm test
```

## MagicMirror config

Environment variable token:

```js
{
  module: "MMM-WorldCupLowerThird",
  position: "bottom_bar",
  config: {
    title: "FIFA World Cup",
    provider: "football-data",
    apiUrl: "https://api.football-data.org/v4/competitions/WC/matches",
    apiTokenEnv: "FOOTBALL_DATA_API_TOKEN",
    authHeaderName: "X-Auth-Token",
    refreshSeconds: 60,
    liveRefreshSeconds: 30,
    maxMatches: 4,
    maxRows: 3,
    focusWindowHours: 36,
    staleAfterMinutes: 5,
    showVenue: true,
    timeZone: "America/Los_Angeles"
  }
}
```

Local token file:

```js
{
  module: "MMM-WorldCupLowerThird",
  position: "bottom_bar",
  config: {
    title: "FIFA World Cup",
    provider: "football-data",
    apiUrl: "https://api.football-data.org/v4/competitions/WC/matches",
    apiTokenFile: "/home/pi/.config/MMM-WorldCupLowerThird/football-data.token",
    authHeaderName: "X-Auth-Token",
    refreshSeconds: 60,
    liveRefreshSeconds: 30,
    maxRows: 3,
    focusWindowHours: 36,
    timeZone: "America/Los_Angeles"
  }
}
```

## Data source

The module is provider-driven. It can normalize common football match payloads shaped like:

- `matches`, `fixtures`, `games`, `events`, `data`, or `response` arrays
- `homeTeam` / `awayTeam`
- `teams.home` / `teams.away`
- string `home` / `away`
- score fields such as `score.fullTime.home`, `goals.home`, or `scores.home`

For production, use a provider with a stable World Cup 2026 endpoint and token support. Good candidates to evaluate are SportMonks, API-Football, or football-data.org. Prefer `apiTokenEnv` or `apiTokenFile` so `node_helper.js` reads the secret server-side.

If no provider is ready yet, serve a local JSON file matching `samples/world-cup-feed.json` and set `apiUrl` to that local URL.

## Lower-third display behavior

- Place it in `bottom_bar` for MagicMirror's lower third.
- It caps itself to one-third of the display height.
- It shows up to four matches in a two-column strip on portrait screens.
- Live matches are highlighted first.
- Long country names ellipsize instead of pushing the layout wider.

## Options

- `title`: header label, default `World Cup`
- `provider`: provider hint, for example `football-data` or `generic`
- `apiUrl`: JSON endpoint for matches
- `apiToken`: optional API token. Prefer `apiTokenEnv` or `apiTokenFile`
- `apiTokenEnv`: environment variable name that contains the token
- `apiTokenFile`: local server-side file path that contains the token
- `authHeaderName`: token header. Use `X-Auth-Token` for football-data.org
- `tokenPrefix`: optional token prefix. Defaults to `Bearer ` only for `Authorization`
- `apiHeaders`: optional extra headers
- `refreshSeconds`: polling interval, minimum 20 seconds
- `liveRefreshSeconds`: polling interval while a match is live, minimum 15 seconds
- `maxMatches`: maximum cards to show, default 4
- `maxRows`: compact rows after the primary card, default 3
- `focusWindowHours`: upcoming/recent match window, default 36
- `staleAfterMinutes`: mark the feed stale after this many minutes without a successful refresh
- `showVenue`: show venue when available
- `timeZone`: kickoff timezone, for example `America/Los_Angeles`
- `useNodeHelper`: use MagicMirror server-side polling, default `true`

## Development

```bash
npm test
```
