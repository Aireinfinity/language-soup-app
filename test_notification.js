// Universal test notification script
// Usage: node test_notification.js "ExponentPushToken[...]" "Title" "Body"

const token = process.argv[2];
const title = process.argv[3] || '🧪 Test Notification';
const body = process.argv[4] || 'Testing notifications';

if (!token) {
    console.error('❌ Error: Token required!');
    console.log('\nUsage:');
    console.log('  node test_notification.js "ExponentPushToken[...]" "Title" "Body"');
    console.log('\nExample:');
    console.log('  node test_notification.js "ExponentPushToken[abc123]" "Hey!" "Test message"');
    process.exit(1);
}

async function sendTestNotification() {
    const message = {
        to: token,
        sound: 'default',
        title,
        body,
        data: { type: 'test' },
        priority: 'high',
        channelId: 'default', // Required for Android
    };

    console.log(`📤 Sending: "${title}" to ${token.substring(0, 30)}...`);

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
    });

    const result = await response.json();

    if (result.data?.status === 'ok') {
        console.log('✅ Success! Notification sent.');
        console.log(`   ID: ${result.data.id}`);
    } else {
        console.log('❌ Failed!');
        console.log(JSON.stringify(result, null, 2));
    }
}

sendTestNotification();
