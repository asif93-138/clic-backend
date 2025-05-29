import eventUser from "../models/eventUser";
import User from '../models/user.model';
import sendPushNotificationNow from "../utils/sendPushNotificationNow";

export default (agenda:any) => {
  agenda.define('send push notification', async (job:any) => {
    console.log("Time trigger started")
    const { eventId } = job.attrs.data;
    console.log("eventID" ,eventId);
    try {
      const users = await eventUser.find({ event_id: eventId, status: "approved" });
      console.log("Users", users)
      for (const user of users) {
        console.log("user: ", user)
        const realUser = await User.findById(user.user_id);
        console.log("realUser", realUser)
        if (realUser?.expoPushToken) {
          console.log("Sending to token:", realUser.expoPushToken);
          await sendPushNotificationNow(realUser.expoPushToken, "EVENT IS LIVE", "LIVEE EVENT!!!!");
        } else {
          console.warn("No push token for user:", user.user_id);
        }
      }

      console.log(`Job triggered for eventId: ${eventId}`);
    } catch (error) {
      console.error("Agenda job error:", error);
    }
  });
};
