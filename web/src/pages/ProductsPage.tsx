import React, { useState } from "react";
import { useProducts } from "../hooks/useProducts";
import { Button, Input, Textarea } from "../components/layout/ui";
import { Search, Package, Edit2, Check, X, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";

const defaultStatus = { color: "bg-gray-100 text-gray-700", label: "Unknown" };

export function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showNeedsReview, setShowNeedsReview] = useState(false);
  const [filterTab, setFilterTab] = useState<"all" | "configured" | "unconfigured" | "unknown">("all");
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { data: products, isLoading, refetch } = useProducts(
    showNeedsReview ? { needs_review: true } : undefined
  );

  const filteredProducts = products?.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.generated_name && p.generated_name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterTab === "configured") return p.is_configured;
    if (filterTab === "unconfigured") return p.current_status === "unconfigured";
    if (filterTab === "unknown") return p.data_source === "unknown";
    
    return true;
  });

  const handleSave = async (itemCode: string, data: any) => {
    setIsSaving(true);
    try {
      const { apiClient } = await import("../api/client");
      await apiClient.updateProduct(itemCode, data);
      refetch();
      setEditingProduct(null);
    } catch (error) {
      console.error("Failed to update product:", error);
      alert("Failed to update product");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingProduct(null);
  };

  const statusConfig: Record<string, { color: string; label: string }> = {
    in_stock: { color: "bg-green-100 text-green-700", label: "In Stock" },
    running_out: { color: "bg-red-100 text-red-700", label: "Running Out" },
    unconfigured: { color: "bg-amber-100 text-amber-700", label: "Unconfigured" },
    unknown: { color: "bg-gray-100 text-gray-700", label: "Unknown" },
    not_detected: { color: "bg-gray-100 text-gray-700", label: "Not Detected" },
  };



  if (isLoading) {
    return <div className="p-6">Loading products...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {(["all", "configured", "unconfigured", "unknown"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                filterTab === tab
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showNeedsReview}
            onChange={(e) => setShowNeedsReview(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">Needs Review Only</span>
        </label>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 outline-none"
            />
          </div>
        </div>

        <div className="divide-y max-h-[calc(100vh-300px)] overflow-y-auto">
          {filteredProducts && filteredProducts.length > 0 ? (
            filteredProducts.map((product) =>
              editingProduct === product.item_code ? (
                <ProductEditForm
                  key={product.item_code}
                  product={product}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  isSaving={isSaving}
                />
              ) : (
                <ProductRow
                  key={product.item_code}
                  product={product}
                  onEdit={() => setEditingProduct(product.item_code)}
                  statusConfig={statusConfig}
                />
              )
            )
          ) : (
            <div className="px-6 py-12 text-center text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No products found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ProductRowProps {
  product: any;
  onEdit: () => void;
  statusConfig: Record<string, { color: string; label: string }>;
}

function ProductRow({ product, onEdit, statusConfig }: ProductRowProps) {
  const isUnknown = product.data_source === "unknown";
  const subtitle = isUnknown ? product.generated_name : product.item_code;

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-4">
        {product.needs_review && (
          <div className="mt-1" title="Needs Review">
            <AlertCircle className="h-5 w-5 text-amber-500" />
          </div>
        )}
        
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="font-semibold text-gray-900">{product.name}</div>
                {product.data_source && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 uppercase tracking-wider">
                    {product.data_source}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600">{subtitle}</div>
              {!isUnknown && product.barcode_value && (
                <div className="text-xs text-gray-400 mt-0.5">Barcode: {product.barcode_value}</div>
              )}
            </div>
            <span
              className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                (statusConfig[product.current_status] ?? defaultStatus).color
              )}
            >
              {(statusConfig[product.current_status] ?? defaultStatus).label}
            </span>
          </div>

          {product.running_out_condition && (
            <div className="mt-2 text-sm text-gray-600">
              <span className="font-medium">Running out condition:</span>{" "}
              {product.running_out_condition}
            </div>
          )}

          {product.order_amount && (
            <div className="mt-1 text-sm text-gray-600">
              <span className="font-medium">Order amount:</span> {product.order_amount}
            </div>
          )}
        </div>

        <button
          onClick={onEdit}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Edit2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface ProductEditFormProps {
  product: any;
  onSave: (itemCode: string, data: any) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function ProductEditForm({ product, onSave, onCancel, isSaving }: ProductEditFormProps) {
  const [formData, setFormData] = useState({
    running_out_condition: product.running_out_condition || "",
    order_amount: product.order_amount || "",
    needs_review: product.needs_review || false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(product.item_code, formData);
  };

  const isUnconfigured = product.current_status === "unconfigured";

  return (
    <form onSubmit={handleSubmit} className="px-6 py-4 bg-gray-50 border-l-4 border-blue-500">
      <div className="space-y-4">
        {isUnconfigured && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md text-sm flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Configure this product to enable stock monitoring</p>
              <p className="mt-1 text-amber-700">Please set both a running out condition and an order amount to start tracking this item.</p>
            </div>
          </div>
        )}

        <Textarea
          label="Running Out Condition"
          placeholder="e.g., 'ran out when container floor is visible (red color)'"
          value={formData.running_out_condition}
          onChange={(e) => setFormData({ ...formData, running_out_condition: e.target.value })}
          rows={3}
          required={isUnconfigured}
        />

        <Input
          type="number"
          label="Order Amount"
          placeholder="1"
          value={formData.order_amount}
          onChange={(e) => setFormData({ ...formData, order_amount: parseInt(e.target.value) || 0 })}
          required={isUnconfigured}
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.needs_review}
            onChange={(e) => setFormData({ ...formData, needs_review: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label className="text-sm text-gray-700">Needs manual review</label>
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={isSaving}>
            <Check className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={isSaving}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}