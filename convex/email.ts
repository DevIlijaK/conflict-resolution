"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const sendInvitationEmail = action({
  args: {
    conflictId: v.id("conflicts"),
    email: v.string(),
    senderUserId: v.id("users"),
    senderEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const conflict = await ctx.runQuery(
      internal.conflicts.getConflictInternal,
      {
        conflictId: args.conflictId,
        requestingUserId: args.senderUserId,
      },
    );

    console.log("args", args);

    if (!conflict) {
      throw new Error("Conflict not found");
    }

    // Verify that the sender is the conflict creator
    if (conflict.createdBy !== args.senderUserId) {
      throw new Error(
        "Access denied: Only the conflict creator can send invitations",
      );
    }

    if (!args.senderEmail) {
      throw new Error("Sender email not found");
    }

    // Get the Resend API key from environment variables
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

    // Create invitation URL (you might want to adjust this based on your app's URL structure)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const invitationUrl = `${baseUrl}/conflict/${args.conflictId}/join`;

    // Prepare email content
    const emailSubject = `Invitation to resolve conflict: ${conflict.title}`;
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Conflict Resolution Invitation</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
            <h1 style="color: #333; margin-bottom: 20px;">You've been invited to participate in conflict resolution</h1>
            
            <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
              Hello,
            </p>
            
            <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
              <strong>${args.senderEmail}</strong> has invited you to participate in resolving the following conflict:
            </p>
            
            <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #007bff;">
              <h2 style="color: #333; margin: 0 0 10px 0; font-size: 18px;">${conflict.title}</h2>
              <p style="color: #666; margin: 0; line-height: 1.5;">${conflict.description}</p>
            </div>
            
            <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
              This platform helps facilitate constructive dialogue and find mutually beneficial solutions. 
              Your participation is important for achieving a successful resolution.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationUrl}" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Join Conflict Resolution
              </a>
            </div>
            
            <p style="color: #888; font-size: 14px; line-height: 1.5; margin-top: 30px;">
              If the button above doesn't work, you can copy and paste this link into your browser:
              <br>
              <a href="${invitationUrl}" style="color: #007bff;">${invitationUrl}</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #888; font-size: 12px; margin: 0;">
              This invitation was sent through our conflict resolution platform. 
              If you believe you received this email in error, you can safely ignore it.
            </p>
          </div>
        </body>
      </html>
    `;

    const emailText = `
You've been invited to participate in conflict resolution

Hello,

${args.senderEmail} has invited you to participate in resolving the following conflict:

Title: ${conflict.title}
Description: ${conflict.description}

This platform helps facilitate constructive dialogue and find mutually beneficial solutions. Your participation is important for achieving a successful resolution.

To join the conflict resolution process, please visit:
${invitationUrl}

If you believe you received this email in error, you can safely ignore it.
    `;

    try {
      // Send email using Resend API
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Conflict Resolution <noreply@yourapp.com>", // Replace with your verified domain
          to: [args.email],
          subject: emailSubject,
          html: emailHtml,
          text: emailText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Failed to send email: ${response.status} ${errorData}`,
        );
      }

      const result = await response.json();
      console.log("Email sent successfully:", result);

      return null;
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error(
        `Failed to send invitation email: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});
