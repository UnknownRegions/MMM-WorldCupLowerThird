const test = require("node:test")
const assert = require("node:assert/strict")
const { normalizeFeed } = require("../normalizer")

test("normalizes common football-data style match payloads", () => {
  const matches = normalizeFeed({
    matches: [
      {
        id: 10,
        utcDate: "2026-06-10T20:00:00Z",
        status: "IN_PLAY",
        minute: 33,
        group: "Group A",
        homeTeam: { name: "Mexico", tla: "MEX" },
        awayTeam: { name: "Canada", tla: "CAN" },
        score: { fullTime: { home: 1, away: 0 } }
      }
    ]
  }, { now: "2026-06-10T20:10:00Z" })

  assert.equal(matches.length, 1)
  assert.equal(matches[0].home, "Mexico")
  assert.equal(matches[0].awayCode, "CAN")
  assert.equal(matches[0].homeScore, 1)
  assert.equal(matches[0].status, "live")
})

test("orders live, upcoming, then final matches", () => {
  const matches = normalizeFeed({
    response: [
      { id: "final", date: "2026-06-10T12:00:00Z", status: "FINISHED", home: "A", away: "B" },
      { id: "next", date: "2026-06-10T22:00:00Z", status: "SCHEDULED", home: "C", away: "D" },
      { id: "live", date: "2026-06-10T20:00:00Z", status: "LIVE", home: "E", away: "F" }
    ]
  }, { now: "2026-06-10T20:10:00Z", maxMatches: 3 })

  assert.deepEqual(matches.map((match) => match.id), ["live", "next", "final"])
})

test("filters matches outside the focus window", () => {
  const matches = normalizeFeed({
    matches: [
      { id: "old", utcDate: "2026-06-01T12:00:00Z", status: "FINISHED", home: "A", away: "B" },
      { id: "near", utcDate: "2026-06-11T12:00:00Z", status: "SCHEDULED", home: "C", away: "D" }
    ]
  }, { now: "2026-06-10T12:00:00Z", focusWindowHours: 36 })

  assert.deepEqual(matches.map((match) => match.id), ["near"])
})
