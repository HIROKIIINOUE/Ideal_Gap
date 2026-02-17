// タスク集中音楽の情報(DB上のカタログデータ & ローカルの音楽保存情報)の型をZodで検証

import { z } from "zod";

export const FocusMusicCategorySchema = z.enum([
  "study",
  "chill",
  "nature",
  "music",
  "workout",
]);

export type FocusMusicCategory = z.infer<typeof FocusMusicCategorySchema>;

export const FocusMusicTrackSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  bucket: z.string().min(1),
  storagePath: z.string().min(1),
  durationSeconds: z.number().int().nonnegative().nullable().optional(),
  musicCategories: z.array(FocusMusicCategorySchema).default([]),
});

export type FocusMusicTrack = z.infer<typeof FocusMusicTrackSchema>;

export const InstalledTrackSchema = z.object({
  trackId: z.string().min(1),
  localPath: z.string().min(1),
  downloadedAt: z.string().min(1),
});

export type InstalledTrack = z.infer<typeof InstalledTrackSchema>;

export type InstalledFocusTrack = FocusMusicTrack & InstalledTrack;

export type InstallProgress = {
  progress: number | null;
  writtenBytes: number;
  totalBytes: number | null;
  remainingBytes: number | null;
  isIndeterminate: boolean;
};

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
