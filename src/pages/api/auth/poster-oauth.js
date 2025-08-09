export const prerender = false;

export async function GET({ url }) {
    const CLIENT_ID = '4243';
    const CLIENT_SECRET = '2a14cd7b4819e767c99eaf124404a72d';
    const REDIRECT_URI = 'http://localhost:3000/api/auth/poster-callback';
    
    // OAuth Authorization URL
    const authUrl = new URL('https://joinposter.com/api/auth');
    authUrl.searchParams.set('application_id', CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    
    console.log('🔐 Redirecting to Poster OAuth:', authUrl.toString());
    
    return Response.redirect(authUrl.toString(), 302);
}