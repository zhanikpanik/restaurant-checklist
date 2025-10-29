/**
 * Sentry Error Tracking Setup
 *
 * To enable Sentry, set the following environment variable:
 * NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
 *
 * Optional configuration:
 * SENTRY_ENVIRONMENT=production|staging|development
 * SENTRY_RELEASE=v1.0.0
 */

interface SentryConfig {
  dsn?: string;
  environment?: string;
  release?: string;
  sampleRate?: number;
  tracesSampleRate?: number;
}

class ErrorTracker {
  private enabled: boolean = false;
  private config: SentryConfig = {};

  constructor() {
    this.config = {
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      release: process.env.SENTRY_RELEASE || '1.0.0',
      sampleRate: 1.0,
      tracesSampleRate: 0.1,
    };

    this.enabled = !!this.config.dsn;

    if (this.enabled) {
      console.log('📊 Sentry error tracking enabled');
      this.initSentry();
    } else {
      console.log('📊 Sentry not configured - using console logging');
    }
  }

  private initSentry() {
    // If you install Sentry SDK, uncomment and configure:
    /*
    import * as Sentry from "@sentry/nextjs";

    Sentry.init({
      dsn: this.config.dsn,
      environment: this.config.environment,
      release: this.config.release,
      sampleRate: this.config.sampleRate,
      tracesSampleRate: this.config.tracesSampleRate,
      integrations: [
        new Sentry.BrowserTracing(),
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
    });
    */
  }

  /**
   * Capture an exception
   */
  captureException(error: Error, context?: Record<string, any>) {
    if (this.enabled) {
      // Sentry.captureException(error, { extra: context });
      console.error('🔴 Error captured:', error, context);
    } else {
      console.error('🔴 Error:', error, context);
    }
  }

  /**
   * Capture a message (non-error logging)
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
    if (this.enabled) {
      // Sentry.captureMessage(message, { level, extra: context });
      console.log(`📝 [${level.toUpperCase()}] ${message}`, context);
    } else {
      console.log(`📝 [${level.toUpperCase()}] ${message}`, context);
    }
  }

  /**
   * Set user context for error tracking
   */
  setUser(user: { id: string; restaurantId?: string; email?: string }) {
    if (this.enabled) {
      // Sentry.setUser(user);
      console.log('👤 User context set:', user);
    }
  }

  /**
   * Add breadcrumb (trail of events leading to error)
   */
  addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
    if (this.enabled) {
      /*
      Sentry.addBreadcrumb({
        message,
        category,
        data,
        level: 'info',
      });
      */
      console.log(`🍞 [${category}] ${message}`, data);
    }
  }

  /**
   * Set custom context
   */
  setContext(key: string, context: Record<string, any>) {
    if (this.enabled) {
      // Sentry.setContext(key, context);
      console.log(`🔖 Context [${key}]:`, context);
    }
  }

  /**
   * Wrap async functions with error tracking
   */
  wrapAsync<T>(fn: () => Promise<T>, operationName: string): Promise<T> {
    return fn().catch((error) => {
      this.captureException(error, { operation: operationName });
      throw error;
    });
  }
}

// Export singleton instance
export const errorTracker = new ErrorTracker();

/**
 * HOC to wrap API routes with error tracking
 */
export function withErrorTracking<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  handlerName: string
): T {
  return (async (...args: any[]) => {
    try {
      errorTracker.addBreadcrumb(`API call started`, 'http', { handler: handlerName });
      const response = await handler(...args);
      return response;
    } catch (error) {
      errorTracker.captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          handler: handlerName,
          args: args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg)),
        }
      );
      throw error;
    }
  }) as T;
}

/**
 * Utility to log API errors in a consistent format
 */
export function logApiError(
  endpoint: string,
  error: unknown,
  context?: Record<string, any>
) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  errorTracker.captureException(
    error instanceof Error ? error : new Error(errorMessage),
    {
      endpoint,
      ...context,
    }
  );

  console.error(`❌ API Error [${endpoint}]:`, {
    message: errorMessage,
    stack: errorStack,
    context,
  });
}

/**
 * Setup instructions for Sentry
 *
 * 1. Install Sentry SDK:
 *    npm install @sentry/nextjs
 *
 * 2. Run Sentry wizard:
 *    npx @sentry/wizard@latest -i nextjs
 *
 * 3. Set environment variable:
 *    NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
 *
 * 4. Uncomment Sentry initialization code in this file
 *
 * 5. Use in your code:
 *    import { errorTracker } from '@/lib/sentry';
 *    errorTracker.captureException(error);
 */

export default errorTracker;
