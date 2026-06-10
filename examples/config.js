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
