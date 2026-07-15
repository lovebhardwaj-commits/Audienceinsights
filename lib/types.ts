export type SegmentKey = "prospecting" | "engaged" | "existing" | "unknown";

export interface DateRange {
  since: string;
  until: string;
}

export interface MetaAdAccount {
  id: string; // "act_XXXXXXXXX"
  name: string;
  account_status: number;
  currency: string;
  business_name?: string;
}

export interface InsightRow {
  [key: string]: string | number | ActionRow[] | undefined;
  reach?: string;
  spend?: string;
  impressions?: string;
  frequency?: string;
  date_start?: string;
  date_stop?: string;
  user_segment_key?: SegmentKey;
  publisher_platform?: string;
  age?: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  actions?: ActionRow[];
}

export interface ActionRow {
  action_type: string;
  value: string;
  "1d_click"?: string;
  "7d_click"?: string;
  "28d_click"?: string;
  "1d_view"?: string;
}

export interface MetaAd {
  id: string;
  name: string;
  created_time: string;
  status: string;
  campaign_id: string;
}

export interface ApiFiltering {
  field: string;
  operator: "IN" | "NOT_IN" | "EQUAL";
  value: string[];
}
