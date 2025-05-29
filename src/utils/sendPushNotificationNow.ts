const { Expo } = require('expo-server-sdk');
const expo = new Expo();

export default async function sendPushNotificationNow(expoPushToken: any, title: any, body: any) {
  if (!Expo.isExpoPushToken(expoPushToken)) {
    return;
  }

  const messages = [{
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data: { extra: 'info' },
  }];

  const chunks = expo.chunkPushNotifications(messages);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (error) {
      // Optionally handle error silently or rethrow
    }
  }
}
