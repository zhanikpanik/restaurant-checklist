// Load dotenv only in development (Railway provides env vars directly)
if (process.env.NODE_ENV !== 'production') {
    const dotenv = await import('dotenv');
    dotenv.config();
}

export const env = {
    POSTER_APP_ID: process.env.POSTER_APP_ID,
    POSTER_APP_SECRET: process.env.POSTER_APP_SECRET,
    POSTER_REDIRECT_URI: process.env.POSTER_REDIRECT_URI,
    DATABASE_URL: process.env.DATABASE_URL
};

// Log in production to verify vars are loaded
if (process.env.NODE_ENV === 'production') {
    console.log('🔧 Environment check:', {
        POSTER_APP_ID: process.env.POSTER_APP_ID ? 'SET' : 'MISSING',
        POSTER_APP_SECRET: process.env.POSTER_APP_SECRET ? 'SET' : 'MISSING',
        POSTER_REDIRECT_URI: process.env.POSTER_REDIRECT_URI ? 'SET' : 'MISSING'
    });
}
