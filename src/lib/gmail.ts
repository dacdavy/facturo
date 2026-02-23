import { google } from "googleapis";

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/gmail/callback`
  );
}

export function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });
}

export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function getUserEmail(accessToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  return data.email;
}

export function getGmailClient(accessToken: string, refreshToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

export async function searchEmails(
  gmail: ReturnType<typeof google.gmail>,
  query: string,
  maxResults = 20
) {
  const res = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults,
  });
  return res.data.messages || [];
}

export async function getEmailWithAttachments(
  gmail: ReturnType<typeof google.gmail>,
  messageId: string
) {
  const msg = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const headers = msg.data.payload?.headers || [];
  const subject =
    headers.find((h) => h.name?.toLowerCase() === "subject")?.value || "";
  const date =
    headers.find((h) => h.name?.toLowerCase() === "date")?.value || "";

  const attachments: {
    filename: string;
    mimeType: string;
    attachmentId: string;
  }[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function findAttachments(parts: any[] | undefined) {
    if (!parts) return;
    for (const part of parts) {
      if (
        part.filename &&
        part.body?.attachmentId &&
        part.mimeType === "application/pdf"
      ) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          attachmentId: part.body.attachmentId,
        });
      }
      if (part.parts) findAttachments(part.parts);
    }
  }

  findAttachments(msg.data.payload?.parts);

  return { messageId, subject, date, attachments };
}

export async function downloadAttachment(
  gmail: ReturnType<typeof google.gmail>,
  messageId: string,
  attachmentId: string
): Promise<Buffer> {
  const res = await gmail.users.messages.attachments.get({
    userId: "me",
    messageId,
    id: attachmentId,
  });

  const data = res.data.data || "";
  return Buffer.from(data, "base64url");
}
