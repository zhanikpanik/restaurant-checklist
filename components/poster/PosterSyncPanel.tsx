"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui";

interface SyncStatus {
  lastSyncAt: string | null;
  needsSync: boolean;
  age: number | null; // minutes since last sync
}

interface SyncStatusData {
  categories: SyncStatus;
  products: SyncStatus;
  suppliers: SyncStatus;
  ingredients: SyncStatus;
  storages: SyncStatus;
}

export function PosterSyncPanel() {
  const [status, setStatus] = useState<SyncStatusData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSyncResult, setLastSyncResult] = useState<any>(null);

  useEffect(() => {
    loadSyncStatus();
  }, []);

  async function loadSyncStatus() {
    try {
      const res = await fetch("/api/poster/sync", {
        credentials: 'include'
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to load sync status');
      }
      
      const data = await res.json();
      setStatus(data.status);
    } catch (error) {
      console.error("Failed to load sync status:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync(entityType?: string, force: boolean = false) {
    setSyncing(true);
    setLastSyncResult(null);

    try {
      const body = entityType 
        ? { entities: [entityType], force }
        : { force };

      const res = await fetch("/api/poster/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || error.message || 'Sync failed');
      }

      const result = await res.json();

      if (result.success) {
        setLastSyncResult({
          type: "success",
          message: force 
            ? `✅ Force synced ${entityType || 'all'}: ${JSON.stringify(result.results)}`
            : `✅ Synced ${entityType || 'all'}: ${JSON.stringify(result.results)}`,
        });
        await loadSyncStatus(); // Reload status
      } else {
        setLastSyncResult({
          type: "error",
          message: `❌ Sync failed: ${result.error || result.message || 'Unknown error'}`,
        });
      }
    } catch (error) {
      setLastSyncResult({
        type: "error",
        message: `❌ Sync failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setSyncing(false);
    }
  }

  function formatAge(minutes: number | null): string {
    if (minutes === null) return "Never";
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${Math.floor(minutes)}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show error if auth failed
  if (!status && lastSyncResult?.type === 'error' && lastSyncResult?.message?.includes('Authentication required')) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Restaurant Not Selected
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Please select a restaurant to use the sync feature.</p>
                {process.env.NODE_ENV === 'development' && (
                  <a
                    href="/dev/switch-restaurant"
                    className="mt-2 inline-block underline hover:text-yellow-900"
                  >
                    → Select Restaurant (Dev Mode)
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Poster Sync Status
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Real-time sync via webhooks • Daily backup at 3 AM
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => handleSync(undefined, false)}
              disabled={syncing}
              variant="secondary"
            >
              {syncing ? "⏳ Syncing..." : "🔄 Smart Sync"}
            </Button>
            <Button
              onClick={() => handleSync(undefined, true)}
              disabled={syncing}
              variant="primary"
            >
              {syncing ? "⏳ Syncing..." : "⚡ Force Sync All"}
            </Button>
          </div>
        </div>
      </div>

      {lastSyncResult && (
        <div
          className={`px-6 py-3 ${
            lastSyncResult.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {lastSyncResult.message}
        </div>
      )}

      <div className="p-6">
        <div className="space-y-4">
          {status &&
            Object.entries(status).map(([entity, info]) => (
              <div
                key={entity}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">{entity}</span>
                    {info.needsSync && (
                      <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                        Needs sync
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Last synced: {formatAge(info.age)}
                    {info.lastSyncAt && (
                      <span className="ml-2">
                        ({new Date(info.lastSyncAt).toLocaleString()})
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSync(entity, false)}
                    disabled={syncing}
                  >
                    Sync
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSync(entity, true)}
                    disabled={syncing}
                  >
                    Force
                  </Button>
                </div>
              </div>
            ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">ℹ️ How Sync Works</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              <strong>Webhooks:</strong> Poster sends real-time updates when data
              changes (instant)
            </li>
            <li>
              <strong>Smart Sync:</strong> Only syncs if data is older than 24
              hours
            </li>
            <li>
              <strong>Force Sync:</strong> Always downloads fresh data from Poster
              (ignores last sync time)
            </li>
            <li>
              <strong>Daily Backup:</strong> Automatic sync at 3 AM as safety net
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
