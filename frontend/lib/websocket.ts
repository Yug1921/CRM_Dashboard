type MessageHandler = (data: unknown) => void

type ConnectionState = "idle" | "connected" | "reconnecting"

class WSManager {
  private socket: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private retries = 0
  private readonly maxRetries = 5
  private readonly delayMs = 3000
  private url = ""
  private handler: MessageHandler | null = null
  state: ConnectionState = "idle"

  connect(url: string, onMessage: MessageHandler) {
    this.disconnect()
    this.url = url
    this.handler = onMessage
    this.retries = 0
    this.open()
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.socket) {
      this.socket.close()
      this.socket = null
    }

    this.state = "idle"
  }

  private open() {
    if (!this.url) {
      return
    }

    this.state = this.retries > 0 ? "reconnecting" : "idle"
    this.socket = new WebSocket(this.url)

    this.socket.onopen = () => {
      this.state = "connected"
      this.retries = 0
    }

    this.socket.onmessage = (event) => {
      if (!this.handler) {
        return
      }
      try {
        const parsed = JSON.parse(event.data)
        this.handler(parsed)
      } catch {
        this.handler(event.data)
      }
    }

    this.socket.onclose = () => {
      this.socket = null
      this.scheduleReconnect()
    }

    this.socket.onerror = () => {
      if (this.socket) {
        this.socket.close()
      }
    }
  }

  private scheduleReconnect() {
    if (this.retries >= this.maxRetries) {
      this.state = "idle"
      return
    }

    this.retries += 1
    this.state = "reconnecting"

    this.reconnectTimer = setTimeout(() => {
      this.open()
    }, this.delayMs)
  }
}

export const wsManager = new WSManager()
