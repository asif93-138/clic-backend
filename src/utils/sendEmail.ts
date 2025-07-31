import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  // service: 'gmail',
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html?: string,
) => {
  const mailOptions = {
    from: "Clic Club " + "<" + process.env.EMAIL + ">",
    to,
    subject,
    text,
    html,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};