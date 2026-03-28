import React from "react";
import { useLatestDetection } from "../hooks/useDetections";
import { useProducts } from "../hooks/useProducts";
import { useOrders } from "../hooks/useOrders";
import { useWebSocket } from "../contexts/WebSocketContext";
import { ImageViewer } from "../components/detection/ImageViewer";
import { AlertCircle } from "lucide-react";
import { formatRelativeTime } from "../lib/utils";
import { statusConfig } from "../lib/statusConfig";

export function DashboardPage() {
  const { data: detection } = useLatestDetection();
  const { data: products } = useProducts({ status: "running_out" });
  const { data: allProducts } = useProducts();
  const { data: pendingOrders } = useOrders("pending_approval");
  const { lastMessage } = useWebSocket();

  const runningOutCount = products?.length || 0;
  const totalCount = allProducts?.length || 0;
  const unconfiguredCount = allProducts?.filter(p => p.current_status === "unconfigured").length || 0;
  const inStockCount = allProducts?.filter(p => p.current_status === "in_stock").length || 0;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {pendingOrders && pendingOrders.length > 0 && (
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <a
              href="/orders"
              className="flex items-center justify-center gap-2 bg-amber-100 text-amber-700 px-4 py-3 sm:py-2 rounded-lg hover:bg-amber-200 transition-colors w-full sm:w-auto"
            >
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">{pendingOrders.length} orders pending</span>
            </a>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:gap-6 md:grid-cols-5">
        <div className="bg-white p-4 sm:p-6 rounded-lg border">
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">{totalCount}</div>
          <div className="text-xs sm:text-sm text-gray-600 mt-1">Total Products</div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-lg border">
          <div className="text-2xl sm:text-3xl font-bold text-red-600">{runningOutCount}</div>
          <div className="text-xs sm:text-sm text-gray-600 mt-1">Running Out</div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-lg border">
          <div className="text-2xl sm:text-3xl font-bold text-amber-600">{unconfiguredCount}</div>
          <div className="text-xs sm:text-sm text-gray-600 mt-1">Unconfigured</div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-lg border">
          <div className="text-2xl sm:text-3xl font-bold text-green-600">
            {inStockCount}
          </div>
          <div className="text-xs sm:text-sm text-gray-600 mt-1">In Stock</div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-lg border">
          <div className="text-2xl sm:text-3xl font-bold text-blue-600">
            {pendingOrders?.length || 0}
          </div>
          <div className="text-xs sm:text-sm text-gray-600 mt-1">Pending Orders</div>
        </div>
      </div>

      <ImageViewer />

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Products Running Out</h2>
        </div>
        
        {runningOutCount > 0 ? (
          <div className="divide-y">
            {products?.slice(0, 5).map((product) => (
              <div
                key={product.item_code}
                className="px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 line-clamp-1">{product.name}</div>
                    <div className="text-xs sm:text-sm text-gray-600">{product.item_code}</div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                    <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                      {product.last_detected_at ? formatRelativeTime(product.last_detected_at) : "Never"}
                    </span>
                    <span
                      className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
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
