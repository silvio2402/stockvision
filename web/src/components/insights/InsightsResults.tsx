import React from "react";
import { DetectionResult, DetectionProduct, UnknownItem, BoundingBox } from "../../types";

interface InsightsResultsProps {
  activeDetection: DetectionResult;
  selectedDetectionId: string | null;
}

export function InsightsResults({ activeDetection, selectedDetectionId }: InsightsResultsProps) {
  const formatBBox = (bbox: BoundingBox) => {
    return `(ymin: ${Math.round(bbox.ymin)}, xmin: ${Math.round(bbox.xmin)}, ymax: ${Math.round(bbox.ymax)}, xmax: ${Math.round(bbox.xmax)})`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Detected Products ({activeDetection.products.length})</h2>
        </div>
        <div className="divide-y">
          {activeDetection.products.map((product, idx) => (
            <ProductCard key={idx} product={product} formatBBox={formatBBox} />
          ))}
          {activeDetection.products.length === 0 && <div className="p-6 text-center text-gray-500">No products detected</div>}
        </div>
      </div>

      {activeDetection.unknown_items.length > 0 && (
        <div className="bg-white rounded-lg border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Unknown Items ({activeDetection.unknown_items.length})</h2>
          </div>
          <div className="divide-y">
            {activeDetection.unknown_items.map((item, idx) => (
              <UnknownItemCard key={idx} item={item} formatBBox={formatBBox} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ProductCardProps {
  product: DetectionProduct;
  formatBBox: (bbox: BoundingBox) => string;
}

function ProductCard({ product, formatBBox }: ProductCardProps) {
  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="font-semibold text-gray-900 text-lg">{product.name || product.item_code}</div>
          <div className="text-sm text-gray-500 mt-1">
            Code: {product.item_code} | Condition: {product.running_out_condition || "Not set"}
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            product.status === "in_stock"
              ? "bg-green-100 text-green-700"
              : product.status === "running_out"
              ? "bg-red-100 text-red-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {product.status === "in_stock" ? "In Stock" : product.status === "running_out" ? "Running Out" : "Unconfigured"}
        </span>
      </div>

      <div className="bg-gray-50 rounded p-4 mb-4 border border-gray-100">
        <div className="text-sm font-medium text-gray-700 mb-1">AI Reasoning:</div>
        <p className="text-sm text-gray-600 whitespace-pre-wrap">{product.ai_reasoning}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Product Area: </span>
          <span className="font-mono text-gray-700">{formatBBox(product.product_area_bounding_box)}</span>
        </div>
        <div>
          <span className="text-gray-500">Barcode Box: </span>
          <span className="font-mono text-gray-700">{formatBBox(product.barcode_bounding_box)}</span>
        </div>
      </div>
    </div>
  );
}

interface UnknownItemCardProps {
  item: UnknownItem;
  formatBBox: (bbox: BoundingBox) => string;
}

function UnknownItemCard({ item, formatBBox }: UnknownItemCardProps) {
  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-semibold text-gray-900 text-lg">{item.generated_name || "Unknown Item"}</div>
          <div className="text-sm text-gray-500 mt-1">ID: {item.assigned_id}</div>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Unknown</span>
      </div>
      <div className="text-gray-700 mb-2 mt-2">{item.description}</div>
      <div className="text-sm mt-2">
        <span className="text-gray-500">Bounding Box: </span>
        <span className="font-mono text-gray-700">{formatBBox(item.bounding_box)}</span>
      </div>
    </div>
  );
}