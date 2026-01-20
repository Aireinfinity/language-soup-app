// Test Android notification
const ANDROID_TOKEN = 'ExponentPushToken[b6F4mJA9HXEQwHx1KHCSQJ]'; // noah's android

async function sendTestNotification() {
    const message = {
        to: ANDROID_TOKEN,
        sound: 'default',
        title: '🧪 Android Test',
        body: 'Testing direct Expo Push API',
        data: { type: 'test' },
        priority: 'high',
        channelId: 'default', // Android requires this!
    };

    console.log('Sending notification to Android...');

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
}

sendTestNotification();
