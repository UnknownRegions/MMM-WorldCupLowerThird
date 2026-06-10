(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory()
  } else {
    root.MMMWorldCupLowerThird = factory()
  }
})(typeof self !== "undefined" ? self : this, function () {
  function pick() {
    for (let index = 0; index < arguments.length; index += 1) {
      const value = arguments[index]
      if (value !== undefined && value !== null && value !== "") return value
    }
    return undefined
  }

  function getPath(source, path) {
    return path.split(".").reduce((value, key) => {
      if (value === undefined || value === null) return undefined
      return value[key]
    }, source)
  }

  function teamName(value, fallback) {
    if (!value) return fallback
    if (typeof value === "string") return value
    return pick(value.name, value.shortName, value.tla, value.code, fallback)
  }

  function scoreValue() {
    for (let index = 0; index < arguments.length; index += 1) {
      const value = arguments[index]
      if (typeof value === "number") return value
      if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
        return Number(value)
      }
    }
    return null
  }

  function normalizeStatus(rawStatus, dateValue) {
    const status = String(rawStatus || "").toUpperCase()
    if (["IN_PLAY", "LIVE", "1H", "2H", "HT", "ET", "P", "PLAYING"].includes(status)) return "live"
    if (["FINISHED", "FT", "AET", "PEN", "COMPLETE", "COMPLETED"].includes(status)) return "final"
    if (["POSTPONED", "SUSPENDED", "CANCELLED", "CANCELED"].includes(status)) return "delayed"

    const startsAt = dateValue ? new Date(dateValue) : null
    if (startsAt && !Number.isNaN(startsAt.getTime()) && startsAt.getTime() < Date.now()) return "final"
    return "upcoming"
  }

  function extractMatches(feed) {
    if (Array.isArray(feed)) return feed
    if (!feed || typeof feed !== "object") return []
    return pick(
      feed.matches,
      feed.fixtures,
      feed.games,
      feed.events,
      feed.data,
      feed.response,
      getPath(feed, "competition.matches"),
      []
    )
  }

  function normalizeMatch(raw, index) {
    const home = pick(
      getPath(raw, "homeTeam"),
      getPath(raw, "home_team"),
      getPath(raw, "teams.home"),
      getPath(raw, "home"),
      getPath(raw, "team_home")
    )
    const away = pick(
      getPath(raw, "awayTeam"),
      getPath(raw, "away_team"),
      getPath(raw, "teams.away"),
      getPath(raw, "away"),
      getPath(raw, "team_away")
    )
    const startsAt = pick(raw.utcDate, raw.date, raw.kickoff, raw.startTime, raw.start_at, raw.timestamp)
    const homeScore = scoreValue(
      getPath(raw, "score.fullTime.home"),
      getPath(raw, "score.regularTime.home"),
      getPath(raw, "goals.home"),
      getPath(raw, "scores.home"),
      raw.homeScore
    )
    const awayScore = scoreValue(
      getPath(raw, "score.fullTime.away"),
      getPath(raw, "score.regularTime.away"),
      getPath(raw, "goals.away"),
      getPath(raw, "scores.away"),
      raw.awayScore
    )
    const status = normalizeStatus(pick(raw.status, raw.matchStatus, raw.state, raw.fixtureStatus), startsAt)

    return {
      id: String(pick(raw.id, raw.fixtureId, raw.matchId, index)),
      home: teamName(home, "Home"),
      away: teamName(away, "Away"),
      homeCode: pick(home && home.tla, home && home.code, home && home.shortName),
      awayCode: pick(away && away.tla, away && away.code, away && away.shortName),
      homeScore,
      awayScore,
      status,
      startsAt,
      minute: pick(raw.minute, raw.elapsed, getPath(raw, "fixture.status.elapsed")),
      stage: pick(raw.stage, raw.round, raw.group, getPath(raw, "league.round"), raw.matchday),
      venue: pick(raw.venue, getPath(raw, "fixture.venue.name"), getPath(raw, "stadium.name")),
      raw
    }
  }

  function rank(match) {
    if (match.status === "live") return 0
    if (match.status === "upcoming") return 1
    if (match.status === "delayed") return 2
    return 3
  }

  function normalizeFeed(feed, options) {
    const config = options || {}
    const now = config.now ? new Date(config.now).getTime() : Date.now()
    const focusWindowMs = Math.max(Number(config.focusWindowHours) || 36, 1) * 60 * 60 * 1000
    const maxMatches = Math.max(Number(config.maxMatches) || 4, 1)

    return extractMatches(feed)
      .map(normalizeMatch)
      .filter((match) => {
        if (match.status === "live") return true
        if (!match.startsAt) return true
        const startsAt = new Date(match.startsAt).getTime()
        if (Number.isNaN(startsAt)) return true
        if (match.status === "final") return now - startsAt <= focusWindowMs
        return Math.abs(startsAt - now) <= focusWindowMs
      })
      .sort((left, right) => {
        const leftTime = new Date(left.startsAt || 0).getTime() || 0
        const rightTime = new Date(right.startsAt || 0).getTime() || 0
        return rank(left) - rank(right) || leftTime - rightTime
      })
      .slice(0, maxMatches)
  }

  return {
    normalizeFeed,
    normalizeMatch,
    extractMatches
  }
})
