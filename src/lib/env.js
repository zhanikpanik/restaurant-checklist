// Railway provides env vars directly in process.env
// Only load dotenv in development
try {
    if (process.env.NODE_ENV !== 'production') {
        const dotenv = await import('dotenv');
        dotenv.config();
    }
} catch (e) {
    console.warn('dotenv loading skipped:', e.message);
}

export const env = {
    POSTER_APP_ID: process.env.POSTER_APP_ID,
    POSTER_APP_SECRET: process.env.POSTER_APP_SECRET,
    POSTER_REDIRECT_URI: process.env.POSTER_REDIRECT_URI,
    DATABASE_URL: process.env.DATABASE_URL
};

// Always log to verify vars are loaded
console.log('🔧 Environment variables:', {
    POSTER_APP_ID: env.POSTER_APP_ID ? 'SET' : 'MISSING',
    POSTER_APP_SECRET: env.POSTER_APP_SECRET ? 'SET' : 'MISSING',
    POSTER_REDIRECT_URI: env.POSTER_REDIRECT_URI ? env.POSTER_REDIRECT_URI.substring(0, 30) + '...' : 'MISSING',
    NODE_ENV: process.env.NODE_ENV || 'development'
});
