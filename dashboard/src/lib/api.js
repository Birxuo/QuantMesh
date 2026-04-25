/**
 * QuantMesh API Client (lib/api.js)
 * Handles WebSocket communication and REST requests for stats.
 */

const PROVIDER_PORT = 8000;

export class QuantMeshSocket {
  constructor(onMessage, onStatusChange) {
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectTimer = null;
    this._disposed = false;
    this.url = typeof window !== 'undefined'
      ? `ws://${window.location.hostname}:${PROVIDER_PORT}/ws`
      : null;
  }

  connect() {
    if (!this.url || this.ws || this._disposed) return;

    const isFirstAttempt = this.reconnectAttempts === 0;
    if (isFirstAttempt) {
      console.log(`[QuantMesh] Connecting to provider at ${this.url}`);
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[QuantMesh] ✓ WebSocket connected');
        this.reconnectAttempts = 0;
        this.onStatusChange(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.onMessage(data);
        } catch (err) {
          console.warn('[QuantMesh] Failed to parse WS message:', err.message);
        }
      };

      this.ws.onclose = (event) => {
        this.ws = null;
        this.onStatusChange(false);

        if (!this._disposed) {
          // Only log once per reconnect cycle, not every attempt
          if (this.reconnectAttempts === 0) {
            console.warn(
              `[QuantMesh] WebSocket closed (code: ${event.code}). ` +
              'Ensure the provider is running: python -m provider.main'
            );
          }
          this.attemptReconnect();
        }
      };

      this.ws.onerror = () => {
        // Browser WS error events carry no useful info (SecurityError prevents it).
        // The subsequent `onclose` will handle reconnection logic.
        // Only log on the first failure to avoid console spam.
        if (this.reconnectAttempts === 0) {
          console.warn(
            `[QuantMesh] Cannot reach provider backend at localhost:${PROVIDER_PORT}. ` +
            'Is the provider running?'
          );
        }
      };
    } catch (e) {
      console.error('[QuantMesh] WebSocket construction failed:', e.message);
      this.ws = null;
      this.attemptReconnect();
    }
  }

  attemptReconnect() {
    if (this._disposed) return;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 15000);

      // Log sparingly: first attempt and then every 5th
      if (this.reconnectAttempts === 1 || this.reconnectAttempts % 5 === 0) {
        console.log(
          `[QuantMesh] Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${(delay / 1000).toFixed(1)}s`
        );
      }

      this.reconnectTimer = setTimeout(() => this.connect(), delay);
    } else {
      console.warn(
        '[QuantMesh] Max reconnect attempts reached. ' +
        'Start the provider backend and refresh the page to reconnect.'
      );
    }
  }

  disconnect() {
    this._disposed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      this.ws.close();
    }
    this.ws = null;
  }

  sendPing() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'ping' }));
    }
  }
}

function _baseUrl() {
  return '/provider';
}

export async function fetchStats() {
  const response = await fetch(`${_baseUrl()}/stats`);
  if (!response.ok) throw new Error('Failed to fetch stats');
  return response.json();
}

export async function fetchCatalog() {
  const response = await fetch(`${_baseUrl()}/catalog`);
  if (!response.ok) throw new Error('Failed to fetch catalog');
  return response.json();
}

export async function fetchTransactions() {
  const response = await fetch(`${_baseUrl()}/transactions`);
  if (!response.ok) throw new Error('Failed to fetch transactions');
  const data = await response.json();
  return data.transactions || [];
}

export async function fetchHealth() {
  const response = await fetch(`${_baseUrl()}/health`);
  if (!response.ok) throw new Error('Provider unhealthy');
  return response.json();
}

// ── Hardware / System Orchestration (via Next.js API) ──────────────────────

export async function fetchSystemStatus() {
  const response = await fetch(`/api/engine`);
  if (!response.ok) throw new Error('Failed to get system status');
  return response.json();
}

export async function toggleEngine(target, action) {
  const response = await fetch(`/api/engine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, action }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to ${action} ${target}`);
  }
  return response.json();
}
