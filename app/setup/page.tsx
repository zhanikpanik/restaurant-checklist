"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function SetupPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const success = searchParams.get("success");

  const getErrorMessage = (errorCode: string | null) => {
    if (!errorCode) return "";

    const errors: Record<string, string> = {
      no_code: "Authorization code not received",
      token_exchange_failed: "Failed to exchange token with Poster",
      no_token: "No access token received from Poster",
      database_error: "Failed to save restaurant data",
      unknown: "An unknown error occurred",
    };

    return errors[errorCode] || errorCode;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        {/* Logo */}
        <div className="text-6xl text-center mb-4">🍽️</div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Connect Your Restaurant
        </h1>
        <p className="text-gray-600 text-center mb-6">
          Connect your Poster POS account to sync suppliers, products, and inventory
        </p>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-1 text-sm text-red-700">
                  {getErrorMessage(error)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {success === "oauth" && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Success!</h3>
                <div className="mt-1 text-sm text-green-700">
                  Your restaurant has been connected successfully!
                </div>
              </div>
            </div>
          </div>
        )}

        {/* OAuth Button */}
        <div className="mb-6">
          <a
            href="/api/poster/oauth/authorize"
            className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Connect with Poster POS
          </a>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <span className="flex-shrink-0 w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">
              ✓
            </span>
            <span>Automatic supplier sync</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <span className="flex-shrink-0 w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">
              ✓
            </span>
            <span>Product inventory integration</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <span className="flex-shrink-0 w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">
              ✓
            </span>
            <span>Auto-create supplies on delivery</span>
          </div>
        </div>

        {/* Help Section */}
        <div className="text-center pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Don't have a Poster account?{" "}
            <a
              href="https://joinposter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign up here
            </a>
          </p>
        </div>

        {/* Back to Home */}
        {success && (
          <div className="text-center mt-4">
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
