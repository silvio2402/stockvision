import React from "react";
import { useOrders, useApproveOrder, useDeclineOrder } from "../hooks/useOrders";
import { Button } from "../components/layout/ui";
import { ClipboardCheck, CheckCircle, XCircle, Clock, Circle } from "lucide-react";
import { OrderStatus } from "../types";
import { cn, formatDate } from "../lib/utils";

export function OrdersPage() {
  const { data: orders, isLoading } = useOrders();
  const approveOrder = useApproveOrder();
  const declineOrder = useDeclineOrder();

  const handleApprove = async (orderId: string) => {
    try {
      await approveOrder.mutateAsync(orderId);
    } catch (error) {
      console.error("Failed to approve order:", error);
      alert("Failed to approve order");
    }
  };

  const handleDecline = async (orderId: string) => {
    try {
      await declineOrder.mutateAsync(orderId);
    } catch (error) {
      console.error("Failed to decline order:", error);
      alert("Failed to decline order");
    }
  };

  const statusConfig: Record<OrderStatus, { icon: React.ElementType; color: string; label: string }> = {
    pending_approval: { icon: Clock, color: "bg-amber-100 text-amber-700", label: "Pending Approval" },
    approved: { icon: CheckCircle, color: "bg-blue-100 text-blue-700", label: "Approved" },
    declined: { icon: XCircle, color: "bg-gray-100 text-gray-700", label: "Declined" },
    ordered: { icon: Circle, color: "bg-green-100 text-green-700", label: "Ordered" },
  };

  if (isLoading) {
    return <div className="p-6">Loading orders...</div>;
  }

  const pendingOrders = orders?.filter((o) => o.status === "pending_approval") || [];
  const otherOrders = orders?.filter((o) => o.status !== "pending_approval") || [];

  if (!orders || orders.length === 0) {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center text-center space-y-4 bg-white rounded-xl border">
        <div className="bg-gray-50 p-4 rounded-full">
          <ClipboardCheck className="h-8 w-8 text-gray-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">No orders found</h3>
          <p className="text-gray-600 max-w-sm">
            Everything is up to date! New orders will appear here when stock levels run low.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-end">
        {pendingOrders.length > 0 && (
          <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-lg">
            <ClipboardCheck className="h-4 w-4" />
            <span className="font-medium">{pendingOrders.length} pending approval</span>
          </div>
        )}
      </div>

      {pendingOrders.length > 0 && (
        <OrderSection
          title="Pending Orders"
          orders={pendingOrders}
          statusConfig={statusConfig}
          onApprove={handleApprove}
          onDecline={handleDecline}
          showActions
        />
      )}

      <OrderSection
        title="Order History"
        orders={otherOrders}
        statusConfig={statusConfig}
      />
    </div>
  );
}

interface OrderSectionProps {
  title: string;
  orders: any[];
  statusConfig: Record<OrderStatus, { icon: React.ElementType; color: string; label: string }>;
  onApprove?: (id: string) => void;
  onDecline?: (id: string) => void;
  showActions?: boolean;
}

function OrderSection({
  title,
  orders,
  statusConfig,
  onApprove,
  onDecline,
  showActions = false,
}: OrderSectionProps) {
  if (orders.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>

      <div className="divide-y">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            statusConfig={statusConfig}
            onApprove={onApprove}
            onDecline={onDecline}
            showActions={showActions}
          />
        ))}
      </div>
    </div>
  );
}

interface OrderCardProps {
  order: any;
  onApprove?: (id: string) => void;
  onDecline?: (id: string) => void;
  showActions?: boolean;
  statusConfig: Record<OrderStatus, { icon: React.ElementType; color: string; label: string }>;
}

function OrderCard({ order, statusConfig, onApprove, onDecline, showActions }: OrderCardProps) {
  const statusInfo = statusConfig[order.status as OrderStatus];
  const StatusIcon = statusInfo.icon;

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-4">
        <div className={cn("p-3 rounded-lg", statusInfo.color)}>
          <StatusIcon className="h-5 w-5" />
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold text-gray-900">Order #{order.id.slice(-6)}</div>
              <div className="text-sm text-gray-600">
                {formatDate(order.created_at)}
              </div>
            </div>
            <span className={cn("px-3 py-1 rounded-full text-xs font-medium", statusInfo.color)}>
              {statusInfo.label}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {order.items.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">{item.name}</span>
                  <span className="text-gray-600 ml-2">({item.item_code})</span>
                </div>
                <span className="bg-gray-100 px-2 py-1 rounded text-gray-700">
                  x{item.order_amount}
                </span>
              </div>
            ))}
          </div>

          {showActions && onApprove && onDecline && (
            <div className="mt-4 flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => onApprove(order.id)}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve & Send
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onDecline(order.id)}>
                <XCircle className="h-4 w-4 mr-1" />
                Decline
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}