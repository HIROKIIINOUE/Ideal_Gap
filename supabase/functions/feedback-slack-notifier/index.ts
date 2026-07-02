// slackへお問い合わせ通知メッセージを送信するEdge Functionの本体

/// <reference path="../deno-stubs.d.ts" />
/* eslint-env deno */
/* eslint-disable import/no-unresolved */
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { z } from "zod";
import {
  buildFeedbackSlackPayload,
  type FeedbackRecord,
} from "./feedbackSlack.ts";

const slackWebhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");

if (!slackWebhookUrl) {
  throw new Error("Missing SLACK_WEBHOOK_URL");
}

const feedbackRecordSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().nullable(),
  user_name: z.string().nullable(),
  user_email: z.string().nullable(),
  message: z.string().min(1),
  category: z.enum(["bug", "request", "feedback", "other"]).nullable(),
  user_plan: z.enum(["paid", "free"]).nullable(),
  is_login_user: z.boolean(),
  app_version: z.string().nullable(),
  platform: z.string().nullable(),
  created_at: z.string().nullable(),
});

const webhookPayloadSchema = z
  .object({
    type: z.string().optional(),
    table: z.string().optional(),
    record: feedbackRecordSchema,
  })
  .loose(); // loose() で指定外のプロパティを許容する

// feedbacksテーブルにお問合せがinsertされた時の処理
serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  let payload: z.infer<typeof webhookPayloadSchema>;
  try {
    const parsed = webhookPayloadSchema.safeParse(await req.json());
    if (!parsed.success) {
      console.error("invalid payload", parsed.error.flatten());
      return new Response("invalid payload", { status: 400 });
    }
    payload = parsed.data;
  } catch (_error) {
    return new Response("invalid payload", { status: 400 });
  }

  if (payload.type && payload.type !== "INSERT") {
    return new Response("ignored", { status: 200 });
  }
  if (payload.table && payload.table !== "feedbacks") {
    return new Response("ignored", { status: 200 });
  }

  const feedback = payload.record as FeedbackRecord;
  const slackPayload = buildFeedbackSlackPayload(feedback);

  // slackへメッセー送信
  const slackResponse = await fetch(slackWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(slackPayload),
  });

  if (!slackResponse.ok) {
    const errorText = await slackResponse.text();
    console.error("Slack webhook error", slackResponse.status, errorText);
    return new Response("failed to notify slack", { status: 502 });
  }

  return new Response("ok", { status: 200 });
});
