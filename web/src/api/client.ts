import { Product, DetectionResult, Order, AppSettings, AuthResponse, ScanJob } from "../types";

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem("auth_token");
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem("auth_token", token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem("auth_token");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        window.location.href = "/login";
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async login(password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  }

  async captureImage(file: File, cameraId: string = "camera-1"): Promise<{ detection_id: string; image_path: string }> {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("camera_id", cameraId);

    const response = await fetch("/api/camera/capture", {
      method: "POST",
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async triggerScan(cameraId: string = "camera-1"): Promise<{ message: string; camera_id: string }> {
    return this.request<{ message: string; camera_id: string }>(`/api/camera/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ camera_id: cameraId }),
    });
  }

  async getProducts(filters?: { status?: string; needs_review?: boolean }): Promise<Product[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.needs_review !== undefined) params.set("needs_review", String(filters.needs_review));
    
    return this.request<Product[]>(`/api/products?${params.toString()}`);
  }

  async getProduct(itemCode: string): Promise<Product> {
    return this.request<Product>(`/api/products/${itemCode}`);
  }

  async updateProduct(itemCode: string, data: Partial<Omit<Product, "item_code" | "created_at" | "updated_at">>): Promise<Product> {
    return this.request<Product>(`/api/products/${itemCode}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(itemCode: string): Promise<{ deleted: string }> {
    return this.request<{ deleted: string }>(`/api/products/${itemCode}`, {
      method: "DELETE",
    });
  }

  async getDetections(limit: number = 20, offset: number = 0): Promise<DetectionResult[]> {
    return this.request<DetectionResult[]>(`/api/detections?limit=${limit}&offset=${offset}`);
  }

  async getLatestDetection(): Promise<DetectionResult> {
    return this.request<DetectionResult>("/api/detections/latest");
  }

  async getDetection(id: string): Promise<DetectionResult> {
    return this.request<DetectionResult>(`/api/detections/${id}`);
  }

  async getScanJobs(limit: number = 5): Promise<ScanJob[]> {
    return this.request<ScanJob[]>(`/api/detections/jobs?limit=${limit}`);
  }

  async getOrders(status?: string): Promise<Order[]> {
    const params = status ? `?status=${status}` : "";
    return this.request<Order[]>(`/api/orders${params}`);
  }

  async getOrder(id: string): Promise<Order> {
    return this.request<Order>(`/api/orders/${id}`);
  }

  async approveOrder(id: string): Promise<Order> {
    return this.request<Order>(`/api/orders/${id}/approve`, {
      method: "POST",
    });
  }

  async declineOrder(id: string): Promise<Order> {
    return this.request<Order>(`/api/orders/${id}/decline`, {
      method: "POST",
    });
  }

  async getSettings(): Promise<AppSettings> {
    return this.request<AppSettings>("/api/settings");
  }

  async updateSettings(data: Partial<AppSettings>): Promise<AppSettings> {
    return this.request<AppSettings>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient();