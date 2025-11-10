import eventUser from "../models/eventUser";
import User from '../models/user.model';
import sendPushNotificationNow from "../utils/sendPushNotificationNow";

export default (agenda:any) => {
  agenda.define('send push notification', async (job:any) => {
    const { eventId } = job.attrs.data;
    try {
      const users = await eventUser.find({ event_id: eventId, status: "approved" });
      for (const user of users) {
        const realUser = await User.findById(user.user_id);
        if (realUser?.expoPushToken) {
          await sendPushNotificationNow(realUser.expoPushToken, "EVENT IS LIVE", "LIVEE EVENT!!!!");
        } else {
          console.warn("No push token for user:", user.user_id);
        }
      }
    } catch (error) {
      console.error("Agenda job error:", error);
    }
  });
};
