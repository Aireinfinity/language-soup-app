// Quick test script to send notification to iOS (Node 22+ has native fetch)
const IOS_TOKEN = 'ExponentPushToken[okuJQ_GTucWiCbHAB5UMHG]'; // noah :)

async function sendTestNotification() {
    const message = {
        to: IOS_TOKEN,
        sound: 'default',
        title: '🧪 iOS Test',
        body: 'Testing direct Expo Push API',
        data: { type: 'test' },
        priority: 'high',
    };

    console.log('Sending notification to iOS...');

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
