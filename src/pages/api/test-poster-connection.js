import { posterAPI } from '../../config/poster.js';

export async function GET() {
    try {
        console.log('Testing Poster connection...');
        console.log('Access token available:', !!process.env.POSTER_ACCESS_TOKEN);
        
        // Test basic connection by getting account info (using working getAllSettings)
        const account = await posterAPI.getAllSettings();
        
        console.log('Account response:', account);
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Poster API connection successful!',
            account: account.response || {}
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Error testing Poster connection:', error);
        
        // Provide more detailed error information
        let errorDetails = 'Unknown error';
        
        if (error.message) {
            errorDetails = error.message;
        } else if (typeof error === 'string') {
            errorDetails = error;
        } else if (error && typeof error === 'object') {
            errorDetails = JSON.stringify(error);
        }
        
        return new Response(JSON.stringify({
            success: false,
            error: errorDetails,
            details: {
                hasToken: !!process.env.POSTER_ACCESS_TOKEN,
                tokenLength: process.env.POSTER_ACCESS_TOKEN ? process.env.POSTER_ACCESS_TOKEN.length : 0
            }
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
} 