import dotenv from 'dotenv';

// Load environment variables once
dotenv.config();

export const env = {
    POSTER_APP_ID: process.env.POSTER_APP_ID,
    POSTER_APP_SECRET: process.env.POSTER_APP_SECRET,
    POSTER_REDIRECT_URI: process.env.POSTER_REDIRECT_URI,
    DATABASE_URL: process.env.DATABASE_URL
};
