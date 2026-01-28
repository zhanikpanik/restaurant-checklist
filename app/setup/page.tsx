"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function SetupContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const success = searchParams.get("success");
  const adminCreated = searchParams.get("admin_created") === "true";
  const adminEmail = searchParams.get("email");
  const tempPassword = searchParams.get("temp_password");
  
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const copyCredentials = () => {
    if (adminEmail && tempPassword) {
      navigator.clipboard.writeText(`Email: ${adminEmail}\nPassword: ${tempPassword}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        {/* Logo */}
        <div className="text-6xl text-center mb-4">🍽️</div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          {success === "oauth" ? "Setup Complete!" : "Connect Your Restaurant"}
        </h1>
        <p className="text-gray-600 text-center mb-6">
          {success === "oauth" 
            ? "Your restaurant is now connected to Poster POS"
            : "Connect your Poster POS account to sync suppliers, products, and inventory"
          }
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

        {/* Admin Credentials Box - Only shown when admin was created */}
        {adminCreated && adminEmail && tempPassword && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-sm font-medium text-blue-800">
                🔐 Your Admin Account
              </h3>
              <button
                onClick={copyCredentials}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {copied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-white rounded px-3 py-2">
                <span className="text-sm text-gray-600">Email:</span>
                <span className="text-sm font-mono font-medium text-gray-900">
                  {adminEmail}
                </span>
              </div>
              
              <div className="flex items-center justify-between bg-white rounded px-3 py-2">
                <span className="text-sm text-gray-600">Password:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-medium text-gray-900">
                    {showPassword ? tempPassword : "••••••••••••"}
                  </span>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            <p className="mt-3 text-xs text-blue-700">
              ⚠️ Save these credentials! This is the only time the password will be shown.
            </p>
          </div>
        )}

        {/* Login Button - Show after success */}
        {success === "oauth" && (
          <div className="mb-6">
            <Link
              href="/login"
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
              Go to Login
            </Link>
          </div>
        )}

        {/* OAuth Button - Show when not success */}
        {!success && (
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
        )}

        {/* Features - Only show when not success */}
        {!success && (
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
        )}

        {/* Help Section */}
        {!success && (
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
        )}

        {/* Connect Another Restaurant */}
        {success && (
          <div className="text-center pt-4 border-t border-gray-200">
            <a
              href="/api/poster/oauth/authorize"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              + Connect another restaurant
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function LoginLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-6xl text-center mb-4">🍽️</div>
        <div className="text-center text-gray-600">Loading...</div>
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <SetupContent />
    </Suspense>
  );
}
