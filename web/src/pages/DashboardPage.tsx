import React from "react";
import { useLatestDetection } from "../hooks/useDetections";
import { useProducts } from "../hooks/useProducts";
import { useOrders } from "../hooks/useOrders";
import { useTriggerScan } from "../hooks/useDetections";
import { useWebSocket } from "../contexts/WebSocketContext";
import { ImageViewer } from "../components/detection/ImageViewer";
import { Button } from "../components/layout/ui";
import { RefreshCw, AlertCircle } from "lucide-react";
import { formatRelativeTime } from "../lib/utils";
import { ProductStatus, OrderStatus } from "../types";

export function DashboardPage() {
  const { data: detection } = useLatestDetection();
  const { data: products } = useProducts({ status: "running_out" });
  const { data: allProducts } = useProducts();
  const { data: pendingOrders } = useOrders("pending_approval");
  const triggerScan = useTriggerScan();
  const { lastMessage } = useWebSocket();

  const handleScan = () => {
    triggerScan.mutate("camera-1");
  };

  const runningOutCount = products?.length || 0;
  const totalCount = allProducts?.length || 0;

  const statusConfig: Record<ProductStatus, { color: string; label: string }> = {
    in_stock: { color: "bg-green-100 text-green-700", label: "In Stock" },
    running_out: { color: "bg-red-100 text-red-700", label: "Running Out" },
    unknown: { color: "bg-amber-100 text-amber-700", label: "Unknown" },
    not_detected: { color: "bg-gray-100 text-gray-700", label: "Not Detected" },
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-3">
          {pendingOrders && pendingOrders.length > 0 && (
            <a
              href="/orders"
              className="flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-lg hover:bg-amber-200 transition-colors"
            >
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">{pendingOrders.length} orders pending</span>
            </a>
          )}
          <Button onClick={handleScan} disabled={triggerScan.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${triggerScan.isPending ? "animate-spin" : ""}`} />
            {triggerScan.isPending ? "Scanning..." : "Scan Now"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="bg-white p-6 rounded-lg border">
          <div className="text-3xl font-bold text-gray-900">{totalCount}</div>
          <div className="text-sm text-gray-600 mt-1">Total Products</div>
        </div>
        <div className="bg-white p-6 rounded-lg border">
          <div className="text-3xl font-bold text-red-600">{runningOutCount}</div>
          <div className="text-sm text-gray-600 mt-1">Running Out</div>
        </div>
        <div className="bg-white p-6 rounded-lg border">
          <div className="text-3xl font-bold text-green-600">
            {totalCount - runningOutCount}
          </div>
          <div className="text-sm text-gray-600 mt-1">In Stock</div>
        </div>
        <div className="bg-white p-6 rounded-lg border">
          <div className="text-3xl font-bold text-blue-600">
            {pendingOrders?.length || 0}
          </div>
          <div className="text-sm text-gray-600 mt-1">Pending Orders</div>
        </div>
      </div>

      <ImageViewer />

      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Products Running Out</h2>
        </div>
        
        {runningOutCount > 0 ? (
          <div className="divide-y">
            {products?.slice(0, 5).map((product) => (
              <div
                key={product.item_code}
                className="px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-600">{product.item_code}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                      Last detected: {product.last_detected_at ? formatRelativeTime(product.last_detected_at) : "Never"}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        statusConfig[product.current_status].color
                      }`}
                    >
                      {statusConfig[product.current_status].label}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No products running out</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Link({ to, children, className = "" }: { to: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={to} className={className}>
      {children}
    </a>
  );
}