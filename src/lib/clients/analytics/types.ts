// src/lib/clients/analytics/types.ts

export interface DailyProductStats {
  date: string; // ISO date string YYYY-MM-DD
  downloads: number;
  bytes: number;
}

export interface DailyAccountProductStats {
  product_id: string;
  date: string;
  downloads: number;
  bytes: number;
}

export type Period = 7 | 30 | 90;

export interface PopularFileDailyStats {
  file_path: string;
  date: string;
  downloads: number;
}

export interface PopularFile {
  file_path: string;
  total_downloads: number;
  daily: { date: string; downloads: number }[];
}
