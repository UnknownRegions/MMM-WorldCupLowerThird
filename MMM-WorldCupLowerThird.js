Module.register("MMM-WorldCupLowerThird", {
  defaults: {
    title: "World Cup",
    provider: "generic",
    apiUrl: "",
    apiToken: "",
    apiTokenEnv: "",
    apiTokenFile: "",
    authHeaderName: "",
    tokenPrefix: "",
    apiHeaders: {},
    method: "GET",
    refreshSeconds: 60,
    liveRefreshSeconds: 30,
    maxMatches: 4,
    maxRows: 3,
    focusWindowHours: 36,
    staleAfterMinutes: 5,
    useNodeHelper: true,
    showRefresh: true,
    showVenue: true,
    sampleMode: false,
    sampleData: null,
    timeZone: "",
    locale: undefined
  },

  start() {
    this.matches = []
    this.error = null
    this.lastUpdated = null
    this.instanceId = this.identifier || `world-cup-${Date.now()}`
    this.fetchTimer = null

    if (this.config.sampleMode && this.config.sampleData) {
      this.applyFeed(this.config.sampleData)
      return
    }

    if (this.config.useNodeHelper) {
      this.sendSocketNotification("MMM_WCLT_CONFIG", {
        instanceId: this.instanceId,
        config: this.config
      })
    } else {
      this.fetchBrowserFeed()
      this.fetchTimer = setInterval(() => this.fetchBrowserFeed(), this.intervalMs())
    }
  },

  suspend() {
    if (this.fetchTimer) clearInterval(this.fetchTimer)
    this.sendSocketNotification("MMM_WCLT_STOP", { instanceId: this.instanceId })
  },

  resume() {
    this.start()
  },

  getStyles() {
    return ["MMM-WorldCupLowerThird.css"]
  },

  getScripts() {
    return ["normalizer.js"]
  },

  intervalMs() {
    const hasLiveMatch = this.matches.some((match) => match.status === "live")
    const seconds = hasLiveMatch ? this.config.liveRefreshSeconds : this.config.refreshSeconds
    return Math.max(Number(seconds) || 60, 15) * 1000
  },

  socketNotificationReceived(notification, payload) {
    if (!payload || payload.instanceId !== this.instanceId) return

    if (notification === "MMM_WCLT_DATA") {
      this.applyFeed(payload.feed)
    }

    if (notification === "MMM_WCLT_ERROR") {
      this.error = payload.message || "World Cup feed unavailable"
      this.updateDom(300)
    }
  },

  async fetchBrowserFeed() {
    if (!this.config.apiUrl) {
      this.error = "No World Cup feed configured"
      this.updateDom(0)
      return
    }

    try {
      const response = await fetch(this.config.apiUrl, {
        cache: "no-store",
        method: this.config.method || "GET",
        headers: this.config.apiHeaders || {}
      })
      if (!response.ok) throw new Error(`Feed returned ${response.status}`)
      this.applyFeed(await response.json())
    } catch (error) {
      this.error = error instanceof Error ? error.message : "World Cup feed unavailable"
      this.updateDom(300)
    }
  },

  applyFeed(feed) {
    const normalizer = window.MMMWorldCupLowerThird
    this.matches = normalizer.normalizeFeed(feed, {
      maxMatches: this.config.maxMatches,
      focusWindowHours: this.config.focusWindowHours
    })
    this.error = null
    this.lastUpdated = new Date()
    this.updateDom(300)
  },

  isStale() {
    if (!this.lastUpdated) return false
    const minutes = Math.max(Number(this.config.staleAfterMinutes) || 5, 1)
    return Date.now() - this.lastUpdated.getTime() > minutes * 60 * 1000
  },

  formatKickoff(value) {
    if (!value) return "TBD"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "TBD"
    const options = {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit"
    }
    if (this.config.timeZone) options.timeZone = this.config.timeZone
    return date.toLocaleString(this.config.locale, options)
  },

  formatRefresh() {
    if (!this.lastUpdated) return ""
    return this.lastUpdated.toLocaleTimeString(this.config.locale, {
      hour: "numeric",
      minute: "2-digit"
    })
  },

  matchLabel(match) {
    if (match.status === "live") return match.minute ? `${match.minute}'` : "Live"
    if (match.status === "final") return "Final"
    if (match.status === "delayed") return "Delayed"
    return this.formatKickoff(match.startsAt)
  },

  scoreText(match) {
    if (match.homeScore === null || match.awayScore === null) return "vs"
    return `${match.homeScore} - ${match.awayScore}`
  },

  teamNode(name, code) {
    const node = document.createElement("div")
    node.className = "wclt-team"
    const codeNode = document.createElement("span")
    codeNode.className = "wclt-team-code"
    codeNode.textContent = code || name.slice(0, 3).toUpperCase()
    const nameNode = document.createElement("strong")
    nameNode.textContent = name
    node.appendChild(codeNode)
    node.appendChild(nameNode)
    return node
  },

  getDom() {
    const wrapper = document.createElement("div")
    wrapper.className = "mmm-worldcup-lowerthird"

    const header = document.createElement("div")
    header.className = "wclt-header"
    const title = document.createElement("div")
    title.className = "wclt-title"
    title.textContent = this.config.title
    header.appendChild(title)

    const meta = document.createElement("div")
    meta.className = "wclt-meta"
    meta.textContent = this.config.showRefresh && this.lastUpdated ? `${this.isStale() ? "Stale" : "Updated"} ${this.formatRefresh()}` : ""
    header.appendChild(meta)
    wrapper.appendChild(header)

    if (this.error) {
      const error = document.createElement("div")
      error.className = "wclt-empty wclt-empty--error"
      error.textContent = this.error
      wrapper.appendChild(error)
      return wrapper
    }

    if (!this.matches.length) {
      const empty = document.createElement("div")
      empty.className = "wclt-empty"
      empty.textContent = "Awaiting World Cup feed"
      wrapper.appendChild(empty)
      return wrapper
    }

    const track = document.createElement("div")
    track.className = "wclt-track"

    this.matches.slice(0, Math.max(Number(this.config.maxRows) || 3, 1) + 1).forEach((match, index) => {
      const card = document.createElement("div")
      card.className = `wclt-match wclt-match--${match.status}${index === 0 ? " wclt-match--primary" : ""}`

      const status = document.createElement("div")
      status.className = "wclt-status"
      status.textContent = this.matchLabel(match)
      card.appendChild(status)

      const teams = document.createElement("div")
      teams.className = "wclt-teams"
      teams.appendChild(this.teamNode(match.home, match.homeCode))

      const score = document.createElement("div")
      score.className = "wclt-score"
      score.textContent = this.scoreText(match)
      teams.appendChild(score)
      teams.appendChild(this.teamNode(match.away, match.awayCode))
      card.appendChild(teams)

      const detailParts = [match.stage]
      if (this.config.showVenue) detailParts.push(match.venue)
      const detail = document.createElement("div")
      detail.className = "wclt-detail"
      detail.textContent = detailParts.filter(Boolean).join(" / ")
      card.appendChild(detail)

      track.appendChild(card)
    })

    wrapper.appendChild(track)
    return wrapper
  }
})
