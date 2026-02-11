"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface WebhookLog {
  id: number;
  restaurant_id: string;
  webhook_type: string;
  object_type: string;
  object_id: string;
  action: string;
  payload: any;
  created_at: string;
}

export default function WebhookLogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      loadLogs();
      // Auto-refresh every 10 seconds
      const interval = setInterval(loadLogs, 10000);
      return () => clearInterval(interval);
    }
  }, [status]);

  const loadLogs = async () => {
    try {
      const res = await fetch("/api/webhook-logs");
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (error) {
      console.error("Failed to load webhook logs:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Webhook Logs</h1>
              <p className="text-sm text-gray-500">Real-time updates from Poster</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={loadLogs}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {logs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No webhooks received yet</h3>
            <p className="text-gray-500 mb-6">
              Create, update, or delete an ingredient in Poster to test webhooks
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto text-left">
              <h4 className="font-semibold text-blue-900 mb-2">How to test webhooks:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Go to your Poster account</li>
                <li>Navigate to Storage → Ingredients</li>
                <li>Add, edit, or delete an ingredient</li>
                <li>Return here and click Refresh</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">
                ✅ <strong>{logs.length}</strong> webhook(s) received
                <span className="text-sm ml-2">(auto-refreshing every 10s)</span>
              </p>
            </div>

            {logs.map((log) => (
              <div key={log.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">
                        {log.object_type === "product" && "📦"}
                        {log.object_type === "supplier" && "🏢"}
                        {log.object_type === "storage" && "🏪"}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {log.object_type} {log.action}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        log.action === "added" ? "bg-green-100 text-green-800" :
                        log.action === "changed" ? "bg-blue-100 text-blue-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {log.action}
                      </span>
                      {log.restaurant_id === 'system-logs' && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                          ⚠️ Unmatched
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Object ID</p>
                    <p className="font-mono text-sm font-semibold">{log.object_id}</p>
                  </div>
                </div>

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                    View raw payload
                  </summary>
                  <pre className="mt-2 p-4 bg-gray-50 rounded text-xs overflow-x-auto">
                    {JSON.stringify(log.payload, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
