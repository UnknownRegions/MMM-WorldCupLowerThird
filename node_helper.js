const NodeHelper = require("node_helper")
const http = require("http")
const https = require("https")

module.exports = NodeHelper.create({
  start() {
    this.instances = new Map()
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "MMM_WCLT_CONFIG") {
      this.configure(payload.instanceId, payload.config)
    }

    if (notification === "MMM_WCLT_STOP" && payload && payload.instanceId) {
      this.stopInstance(payload.instanceId)
    }
  },

  configure(instanceId, config) {
    this.stopInstance(instanceId)
    const record = { config, timer: null }
    this.instances.set(instanceId, record)
    this.fetchFeed(instanceId)
    record.timer = setInterval(() => this.fetchFeed(instanceId), this.intervalMs(config))
  },

  stopInstance(instanceId) {
    const existing = this.instances.get(instanceId)
    if (existing && existing.timer) clearInterval(existing.timer)
    this.instances.delete(instanceId)
  },

  intervalMs(config) {
    return Math.max(Number(config.refreshSeconds) || 60, 15) * 1000
  },

  fetchFeed(instanceId) {
    const record = this.instances.get(instanceId)
    if (!record) return

    const config = record.config || {}
    if (!config.apiUrl) {
      this.sendSocketNotification("MMM_WCLT_ERROR", {
        instanceId,
        message: "No World Cup feed configured"
      })
      return
    }

    const url = new URL(config.apiUrl)
    const client = url.protocol === "http:" ? http : https
    const headers = Object.assign({}, config.apiHeaders || {})
    if (config.apiToken) {
      const authHeaderName = config.authHeaderName || (config.provider === "football-data" ? "X-Auth-Token" : "Authorization")
      const tokenPrefix = config.tokenPrefix !== undefined
        ? config.tokenPrefix
        : authHeaderName === "Authorization" ? "Bearer " : ""
      if (!headers[authHeaderName]) headers[authHeaderName] = `${tokenPrefix}${config.apiToken}`
    }

    const request = client.request(url, {
      method: config.method || "GET",
      headers
    }, (response) => {
      let body = ""
      response.setEncoding("utf8")
      response.on("data", (chunk) => {
        body += chunk
      })
      response.on("end", () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          this.sendSocketNotification("MMM_WCLT_ERROR", {
            instanceId,
            message: `Feed returned ${response.statusCode}`
          })
          return
        }

        try {
          this.sendSocketNotification("MMM_WCLT_DATA", {
            instanceId,
            feed: JSON.parse(body)
          })
        } catch (error) {
          this.sendSocketNotification("MMM_WCLT_ERROR", {
            instanceId,
            message: "Feed returned invalid JSON"
          })
        }
      })
    })

    request.on("error", (error) => {
      this.sendSocketNotification("MMM_WCLT_ERROR", {
        instanceId,
        message: error.message || "World Cup feed unavailable"
      })
    })
    request.setTimeout(12000, () => {
      request.destroy(new Error("Feed request timed out"))
    })
    request.end()
  }
})
