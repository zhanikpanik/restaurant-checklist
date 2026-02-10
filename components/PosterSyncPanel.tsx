"use client";

import { useState } from "react";

interface SyncStatus {
  lastSyncAt: string | null;
  needsSync: boolean;
  age: number | null;
}

interface SyncStatusResponse {
  restaurantId: string;
  status: Record<string, SyncStatus>;
}

interface SyncResult {
  categories?: number;
  products?: number;
  suppliers?: number;
  ingredients?: number;
  storages?: number;
}

export default function PosterSyncPanel() {
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch current sync status
  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/poster/sync");
      if (!response.ok) throw new Error("Failed to fetch sync status");
      
      const data = await response.json();
      setSyncStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch status");
    }
  };

  // Trigger manual sync
  const triggerSync = async (entities?: string[]) => {
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch("/api/poster/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: entities ? JSON.stringify({ entities }) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Sync failed");
      }

      const data = await response.json();
      setLastSyncResult(data.results);
      
      // Refresh status after sync
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // Format time ago
  const formatTimeAgo = (age: number | null) => {
    if (age === null) return "Never";
    if (age < 1) return "Just now";
    if (age < 60) return `${age} min ago`;
    const hours = Math.floor(age / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="poster-sync-panel">
      <div className="panel-header">
        <h2>🔄 Poster Data Sync</h2>
        <button 
          onClick={fetchStatus}
          disabled={syncing}
          className="btn-secondary"
        >
          Refresh Status
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          ❌ {error}
        </div>
      )}

      {syncStatus && (
        <div className="sync-status-grid">
          {Object.entries(syncStatus.status).map(([entity, status]) => (
            <div 
              key={entity} 
              className={`status-card ${status.needsSync ? 'needs-sync' : 'synced'}`}
            >
              <h3>{entity}</h3>
              <div className="status-info">
                <span className="last-sync">
                  {formatTimeAgo(status.age)}
                </span>
                {status.needsSync && (
                  <span className="badge-warning">Needs Sync</span>
                )}
              </div>
              <button
                onClick={() => triggerSync([entity])}
                disabled={syncing}
                className="btn-sm"
              >
                {syncing ? "Syncing..." : "Sync Now"}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="sync-actions">
        <button
          onClick={() => triggerSync()}
          disabled={syncing}
          className="btn-primary btn-large"
        >
          {syncing ? "⏳ Syncing All..." : "🚀 Sync All Data"}
        </button>
      </div>

      {lastSyncResult && (
        <div className="sync-results">
          <h3>✅ Last Sync Results</h3>
          <ul>
            {Object.entries(lastSyncResult).map(([entity, count]) => (
              <li key={entity}>
                <strong>{entity}:</strong> {count} items synced
              </li>
            ))}
          </ul>
        </div>
      )}

      <style jsx>{`
        .poster-sync-panel {
          max-width: 1000px;
          margin: 2rem auto;
          padding: 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .panel-header h2 {
          margin: 0;
          font-size: 1.5rem;
          color: #1f2937;
        }

        .sync-status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .status-card {
          padding: 1.5rem;
          border-radius: 8px;
          border: 2px solid #e5e7eb;
          transition: all 0.2s;
        }

        .status-card.needs-sync {
          border-color: #f59e0b;
          background: #fffbeb;
        }

        .status-card.synced {
          border-color: #10b981;
          background: #f0fdf4;
        }

        .status-card h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
          text-transform: capitalize;
          color: #374151;
        }

        .status-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .last-sync {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .badge-warning {
          background: #f59e0b;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .sync-actions {
          display: flex;
          justify-content: center;
          margin: 2rem 0;
        }

        .btn-primary, .btn-secondary, .btn-sm {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-secondary {
          background: #e5e7eb;
          color: #374151;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #d1d5db;
        }

        .btn-sm {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          width: 100%;
          background: #3b82f6;
          color: white;
        }

        .btn-sm:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-large {
          font-size: 1.125rem;
          padding: 1rem 2rem;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .alert {
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
        }

        .alert-error {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }

        .sync-results {
          margin-top: 2rem;
          padding: 1.5rem;
          background: #f0fdf4;
          border-radius: 8px;
          border: 2px solid #10b981;
        }

        .sync-results h3 {
          margin: 0 0 1rem 0;
          color: #065f46;
        }

        .sync-results ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .sync-results li {
          padding: 0.5rem 0;
          color: #047857;
        }

        .sync-results strong {
          text-transform: capitalize;
          margin-right: 0.5rem;
        }
      `}</style>
    </div>
  );
}
