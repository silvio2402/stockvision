import React from "react";
import { useOrders, useApproveOrder, useDeclineOrder } from "../hooks/useOrders";
import { Button } from "../components/layout/ui";
import { ClipboardCheck, CheckCircle, XCircle, Clock, Circle } from "lucide-react";
import { OrderStatus } from "../types";
import { cn, formatDate } from "../lib/utils";

const orderStatusConfig: any = {
  pending_approval: { icon: Clock, color: "bg-amber-100 text-amber-700", label: "Pending Approval" },
  approved: { icon: CheckCircle, color: "bg-green-100 text-green-700", label: "Approved" },
  declined: { icon: XCircle, color: "bg-red-100 text-red-700", label: "Declined" },
  ordered: { icon: ClipboardCheck, color: "bg-blue-100 text-blue-700", label: "Ordered" },
};

export function OrdersPage() {
  const { data: orders, isLoading } = useOrders();
  const approveOrder = useApproveOrder();
  const declineOrder = useDeclineOrder();

  const handleApprove = (id: string) => approveOrder.mutate(id);
  const handleDecline = (id: string) => declineOrder.mutate(id);

  const pendingOrders = orders?.filter((o: any) => o.status === "pending_approval") || [];
  const otherOrders = orders?.filter((o: any) => o.status !== "pending_approval") || [];

  if (isLoading) {
    return <div className="p-6">Loading orders...</div>;
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center text-center space-y-4 bg-white rounded-xl border">
        <div className="bg-gray-50 p-4 rounded-full">
          <ClipboardCheck className="h-8 w-8 text-gray-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">No orders found</h3>
          <p className="text-gray-500">There are no orders to display at this time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {pendingOrders.length > 0 && (
        <OrderSection
          title="Pending Approval"
          orders={pendingOrders}
          onApprove={handleApprove}
          onDecline={handleDecline}
          showActions={true}
        />
      )}
      <OrderSection title="Order History" orders={otherOrders} />
    </div>
  );
}

interface OrderSectionProps {
  title: string;
  orders: any[];
  onApprove?: (id: string) => void;
  onDecline?: (id: string) => void;
  showActions?: boolean;
}

function OrderSection({
  title,
  orders,
  onApprove,
  onDecline,
  showActions = false,
}: OrderSectionProps) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>

      <div className="divide-y">
        {orders.map((order) => (
          <OrderCard
            key={(order as any).id}
            order={order}
            onApprove={onApprove}
            onDecline={onDecline}
            showActions={showActions}
          />
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order, onApprove, onDecline, showActions = false }: any) {
  const o = order as any;
  const statusInfo = orderStatusConfig[o.status as OrderStatus];
  const StatusIcon = statusInfo.icon;

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="font-semibold text-gray-900 text-lg">Order #{o.id.slice(-6)}</div>
          <div className="text-sm text-gray-500 mt-1">
            Created: {formatDate(o.created_at)}
          </div>
        </div>
        <span className={cn("px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1", statusInfo.color)}>
          <StatusIcon className="h-3 w-3" />
          {statusInfo.label}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        {(o.items as any[]).map((item: any) => (
          <div key={item.item_code} className="flex justify-between text-sm text-gray-600">
            <span>{item.name}</span>
            <span>x{item.order_amount}</span>
          </div>
        ))}
      </div>

      {showActions && o.status === "pending_approval" && (
        <div className="flex items-center gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={() => onApprove?.(o.id)}>Approve</Button>
          <Button variant="secondary" size="sm" onClick={() => onDecline?.(o.id)}>Decline</Button>
        </div>
      )}
    </div>
  );
}