// タスク集中音楽の情報(DB上のカタログデータ & ローカルの音楽保存情報)の型をZodで検証

import { z } from "zod";

export const FocusMusicTrackSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  bucket: z.string().min(1),
  storagePath: z.string().min(1),
  durationSeconds: z.number().int().nonnegative().nullable().optional(),
});

export type FocusMusicTrack = z.infer<typeof FocusMusicTrackSchema>;

export const InstalledTrackSchema = z.object({
  trackId: z.string().min(1),
  localPath: z.string().min(1),
  downloadedAt: z.string().min(1),
});

export type InstalledTrack = z.infer<typeof InstalledTrackSchema>;

export type InstalledFocusTrack = FocusMusicTrack & InstalledTrack;

export type InstallResult =
  | { ok: true; track: InstalledFocusTrack }
  | {
      ok: false;
      reason:
        | "limit"
        | "cellular"
        | "offline"
        | "not_found"
        | "download_failed"
        | "already_installed"
        | "busy"
        | "monthly_limit";
    };

export type RemoveResult =
  | { ok: true }
  | { ok: false; reason: "not_installed" | "remove_failed" };
