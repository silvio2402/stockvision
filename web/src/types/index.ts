export type BoundingBox = {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
};

export type ProductStatus = "in_stock" | "running_out" | "unconfigured" | "unknown" | "not_detected";

export type OrderStatus = "pending_approval" | "approved" | "declined" | "ordered";

export interface Product {
  item_code: string;
  name: string;
  description?: string | null;
  barcode_value?: string | null;
  data_source?: "erp" | "sample" | "manual" | "unknown" | null;
  main_supplier?: string | null;
  generated_name?: string | null;
  is_configured: boolean;
  running_out_condition?: string | null;
  order_amount?: number | null;
  current_status: ProductStatus;
  last_detected_at?: string | null;
  last_bounding_box?: BoundingBox | null;
  last_ai_reasoning?: string | null;
  needs_review: boolean;
  created_at: string;
  updated_at: string;
}

export interface DetectionProduct {
  item_code: string;
  name: string;
  barcode_bounding_box: BoundingBox;
  product_area_bounding_box: BoundingBox;
  status: "in_stock" | "running_out" | "unconfigured";
  ai_reasoning: string;
  running_out_condition: string;
}

export interface UnknownItem {
  assigned_id: string;
  generated_name: string;
  bounding_box: BoundingBox;
  description: string;
}

export interface DetectionResult {
  id: string;
  timestamp: string;
  camera_id: string;
  image_path: string;
  products: DetectionProduct[];
  unknown_items: UnknownItem[];
  processing_time_ms: number;
  created_at: string;
}

export interface ScanJob {
  id: string;
  camera_id: string;
  status: "running" | "completed" | "failed";
  started_at: string;
  completed_at?: string | null;
  error_message?: string | null;
  detection_id?: string | null;
}

export interface OrderItem {
  item_code: string;
  name: string;
  order_amount: number;
}

export interface Order {
  id: string;
  created_at: string;
  items: OrderItem[];
  status: OrderStatus;
  status_updated_at?: string | null;
  email_sent_to?: string | null;
  email_sent_at?: string | null;
  notes?: string | null;
}

export interface AppSettings {
  scan_interval_minutes: number;
  approval_required: boolean;
  developer_mode: boolean;
  order_email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  gemini_models: {
    barcode_detection: string;
    product_area_detection: string;
    stock_evaluation: string;
  };
}

export interface AuthResponse {
  token: string;
}

export interface WebSocketMessage<T = any> {
  type: string;
  data: T;
}
