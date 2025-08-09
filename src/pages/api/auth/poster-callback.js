export const prerender = false;

export async function GET({ url }) {
    const CLIENT_ID = '4243';
    const CLIENT_SECRET = '2a14cd7b4819e767c99eaf124404a72d';
    const REDIRECT_URI = 'http://localhost:3000/api/auth/poster-callback';
    
    try {
        const code = url.searchParams.get('code');
        const account = url.searchParams.get('account');
        const error = url.searchParams.get('error');
        
        if (error) {
            console.error('❌ OAuth Error:', error);
            return new Response(JSON.stringify({
                success: false,
                error: error,
                message: 'OAuth authorization failed'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        if (!code) {
            console.error('❌ No authorization code received');
            return new Response(JSON.stringify({
                success: false,
                error: 'no_code',
                message: 'No authorization code received'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        if (!account) {
            console.error('❌ No account parameter received');
            return new Response(JSON.stringify({
                success: false,
                error: 'no_account',
                message: 'No account parameter received'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        console.log('🔑 Received authorization code:', code.substring(0, 10) + '...');
        console.log('🏢 Account:', account);
        
        // Exchange code for access token using account-specific endpoint
        const tokenUrl = `https://${account}.joinposter.com/api/v2/auth/access_token`;
        const tokenParams = new URLSearchParams({
            application_id: CLIENT_ID,
            application_secret: CLIENT_SECRET,
            grant_type: 'authorization_code',
            redirect_uri: REDIRECT_URI,
            code: code
        });
        
        console.log('🔄 Exchanging code for access token...');
        console.log('📤 Token request URL:', tokenUrl);
        console.log('📤 Token request params:', {
            application_id: CLIENT_ID,
            application_secret: CLIENT_SECRET.substring(0, 10) + '...',
            grant_type: 'authorization_code',
            redirect_uri: REDIRECT_URI,
            code: code.substring(0, 10) + '...'
        });
        
        console.log('📤 Full request body:', tokenParams.toString());
        
        const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
            },
            body: tokenParams.toString()
        });
        
        console.log('📥 Response headers:', Object.fromEntries(tokenResponse.headers.entries()));
        
        const rawResponse = await tokenResponse.text();
        console.log('🔍 Raw token response:', rawResponse);
        console.log('📊 Response status:', tokenResponse.status, tokenResponse.statusText);
        
        let tokenData;
        try {
            tokenData = JSON.parse(rawResponse);
        } catch (parseError) {
            console.error('❌ Failed to parse token response as JSON:', parseError);
            console.error('📄 Raw response was:', rawResponse);
            return new Response(JSON.stringify({
                success: false,
                error: 'parse_error',
                message: 'Failed to parse token response',
                rawResponse: rawResponse
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        console.log('📄 Parsed token data:', tokenData);
        
        if (!tokenResponse.ok || tokenData.error) {
            console.error('❌ Token exchange failed:', tokenData);
            return new Response(JSON.stringify({
                success: false,
                error: tokenData.error || 'token_exchange_failed',
                message: tokenData.error_description || 'Failed to exchange code for token',
                details: tokenData
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        console.log('✅ Successfully obtained access token!');
        console.log('📄 Token details:', {
            account_number: tokenData.account_number,
            access_token: tokenData.access_token?.substring(0, 10) + '...',
            user_id: tokenData.user?.id,
            user_name: tokenData.user?.name,
            user_email: tokenData.user?.email,
            all_keys: Object.keys(tokenData)
        });
        
        // Store the token (for now, just return it - you'll want to save it properly)
        return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Poster OAuth Success</title>
                <style>
                    body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
                    .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; }
                    .token { background: #f8f9fa; border: 1px solid #dee2e6; padding: 10px; margin: 10px 0; border-radius: 3px; font-family: monospace; word-break: break-all; }
                    .copy-btn { background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-left: 10px; }
                </style>
            </head>
            <body>
                <div class="success">
                    <h2>✅ OAuth Authorization Successful!</h2>
                    <p>Your Poster API access token has been obtained.</p>
                    
                    <h3>Account Details:</h3>
                    <p><strong>Account Number:</strong> ${tokenData.account_number}</p>
                    <p><strong>User ID:</strong> ${tokenData.user?.id}</p>
                    <p><strong>User Name:</strong> ${tokenData.user?.name}</p>
                    <p><strong>User Email:</strong> ${tokenData.user?.email}</p>
                    
                    <h3>Access Token:</h3>
                    <div class="token" id="token">${tokenData.access_token || 'NOT_FOUND'}</div>
                    <button class="copy-btn" onclick="copyToken()">Copy Token</button>
                    
                    <h3>Full Token Format for API:</h3>
                    <div class="token" id="fullToken">${tokenData.account_number || 'NO_ACCOUNT'}:${tokenData.access_token || 'NO_TOKEN'}</div>
                    <button class="copy-btn" onclick="copyFullToken()">Copy Full Token</button>
                    
                    <h3>Debug - Raw Response:</h3>
                    <div class="token">${rawResponse}</div>
                    
                    <h3>Debug - Parsed Data:</h3>
                    <div class="token">${JSON.stringify(tokenData, null, 2)}</div>
                    
                    <p><strong>Next Steps:</strong></p>
                    <ol>
                        <li>Copy the Full Token above</li>
                        <li>Update your application with this token</li>
                        <li>Test the POST permissions for storage.createSupply</li>
                    </ol>
                </div>
                
                <script>
                    function copyToken() {
                        navigator.clipboard.writeText(document.getElementById('token').textContent);
                        alert('Token copied to clipboard!');
                    }
                    
                    function copyFullToken() {
                        navigator.clipboard.writeText(document.getElementById('fullToken').textContent);
                        alert('Full token copied to clipboard!');
                    }
                </script>
            </body>
            </html>
        `, {
            status: 200,
            headers: { 'Content-Type': 'text/html' }
        });
        
    } catch (error) {
        console.error('❌ OAuth callback error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'internal_error',
            message: error.message,
            stack: error.stack
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}