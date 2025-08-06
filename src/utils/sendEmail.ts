import nodemailer from 'nodemailer';
import imaps from 'imap-simple';
const mailcomposer = require('mailcomposer');

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

const emailUser = process.env.EMAIL;
const emailPassword = process.env.EMAIL_PASSWORD;

if (!emailUser || !emailPassword) {
  throw new Error('EMAIL and EMAIL_PASSWORD environment variables must be defined');
}

const imapConfig = {
  imap: {
    user: emailUser,
    password: emailPassword,
    host: 'imap.hostinger.com',
    port: 993,
    tls: true,
    authTimeout: 5000,
  },
};

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
        // Step 2: Compose raw message
    const raw = await new Promise<Buffer>((resolve, reject) => {
      mailcomposer(mailOptions).build((err: any, message: Buffer<ArrayBufferLike> | PromiseLike<Buffer<ArrayBufferLike>>) => {
        if (err) reject(err);
        else resolve(message);
      });
    });

    // Step 3: Append to IMAP Sent folder
    // 3) Save to “Sent” via IMAP
const connection = await imaps.connect(imapConfig);
await connection.openBox('INBOX.Sent');

// ’append’ is callback-based, so wrap in a Promise
await new Promise<void>((resolve, reject) => {
  connection.imap.append(
    raw,
    { mailbox: 'INBOX.Sent', flags: ['\\Seen'] },
    (err: Error | null) => {
      if (err) reject(err);
      else resolve();
    }
  );
});

    console.log('Email copied to Sent folder.');
    connection.end();
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};