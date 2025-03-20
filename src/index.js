import axios from "axios";
import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

const PostalMime = require("postal-mime");

async function streamToArrayBuffer(stream, streamSize) {
  let result = new Uint8Array(streamSize);
  let bytesRead = 0;
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    result.set(value, bytesRead);
    bytesRead += value.length;
  }
  return result;
}

export default {
  async email(event, env, ctx) {
    try {
      const rawEmail = await streamToArrayBuffer(event.raw, event.rawSize);
      const parser = new PostalMime.default();
      const parsedEmail = await parser.parse(rawEmail);
      console.log("Mail subject: ", parsedEmail.subject);
      console.log("Mail message ID", parsedEmail.messageId);
      console.log("HTML version of Email: ", parsedEmail.html);
      const payload = {
        from: event.from,
        to: event.to,
        html: parsedEmail.html,
        subject: parsedEmail.subject,
      };
      try {
        await axios({
          url: `${env.API_URL}/emails/worker-forward`,
          method: "post",
          data: payload,
          headers: {
            "x-api-key": env.API_KEY,
          },
        });
      } catch (e) {
        console.log("FORWARD_FAILED", e);
      }

      //     const msg = createMimeMessage();
      //     msg.setSender({ name: "Auto-replier", addr: event.to });
      //     msg.setRecipient(event.from);
      //     msg.setSubject(`Re: ${parsedEmail.subject}`);
      //     msg.setHeader("In-Reply-To", parsedEmail.messageId);
      //     msg.addMessage({
      //       contentType: "text/plain",
      //       data: `This is an automated reply to your email with the subject ${parsedEmail.subject}.
      // Number of attachments: ${parsedEmail.attachments.length}.

      // good bye.`,
      //     });

      //     var message = new EmailMessage(event.to, event.from, msg.asRaw());
      //     await event.reply(message);
    } catch (e) {
      console.log(e);
    }
  },
};
