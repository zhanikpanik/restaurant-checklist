// Test script to manually hit Poster OAuth endpoint and see the response
import fetch from 'node-fetch';

const posterAppId = '4358';
const redirectUri = 'https://restaurant-checklist-production.up.railway.app/api/poster/oauth/callback';

// Test 1: GET request with query params (current approach)
console.log('\n=== Test 1: GET with query params ===');
const getUrl = `https://joinposter.com/api/v2/auth/manage?application_id=${posterAppId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
console.log('URL:', getUrl);

try {
  const response = await fetch(getUrl, {
    method: 'GET',
    redirect: 'manual' // Don't follow redirects
  });

  console.log('Status:', response.status);
  console.log('Headers:', Object.fromEntries(response.headers.entries()));
  const body = await response.text();
  console.log('Body:', body.substring(0, 500));
} catch (error) {
  console.error('Error:', error.message);
}

// Test 2: POST request with form data
console.log('\n\n=== Test 2: POST with form data ===');
const formData = new URLSearchParams({
  application_id: posterAppId,
  redirect_uri: redirectUri
});

try {
  const response = await fetch('https://joinposter.com/api/v2/auth/manage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString(),
    redirect: 'manual'
  });

  console.log('Status:', response.status);
  console.log('Headers:', Object.fromEntries(response.headers.entries()));
  const body = await response.text();
  console.log('Body:', body.substring(0, 500));
} catch (error) {
  console.error('Error:', error.message);
}

// Test 3: POST with JSON
console.log('\n\n=== Test 3: POST with JSON ===');
try {
  const response = await fetch('https://joinposter.com/api/v2/auth/manage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      application_id: posterAppId,
      redirect_uri: redirectUri
    }),
    redirect: 'manual'
  });

  console.log('Status:', response.status);
  console.log('Headers:', Object.fromEntries(response.headers.entries()));
  const body = await response.text();
  console.log('Body:', body.substring(0, 500));
} catch (error) {
  console.error('Error:', error.message);
}
