import agenda from "../config/agenda";

/**
 * Generic scheduler
 * @param {string} jobName - Name of the job defined in Agenda
 * @param {Date|string} timestamp - When the job should run
 * @param {object} data - Parameters passed to the job function
 */
export async function scheduleJob(jobName: string, timestamp: string | number | Date, data = {}) {
  const runAt = new Date(timestamp + ':00.000Z');
  if (isNaN(runAt.getTime())) {
    throw new Error('Invalid timestamp provided');
  }

  await agenda.schedule(runAt, jobName, data);

  console.log(`Scheduled '${jobName}' to run at ${runAt.toISOString()} with data:`, data);
}
