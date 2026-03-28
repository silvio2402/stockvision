import React, { useRef, useState, useEffect } from "react";
import { DetectionResult } from "../../types";
import { BoundingBoxOverlay, BoxItem } from "../detection/BoundingBoxOverlay";

interface InsightsImageAndViewerProps {
  activeDetection: DetectionResult;
  isLoading: boolean;
}

export function InsightsImageAndViewer({ activeDetection, isLoading }: InsightsImageAndViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
  const [showProductAreas, setShowProductAreas] = useState(true);
  const [showBarcodeBoxes, setShowBarcodeBoxes] = useState(true);
  const [showUnknownItems, setShowUnknownItems] = useState(true);

  const boxes: BoxItem[] = [];
  if (activeDetection) {
    if (showProductAreas) {
      activeDetection.products.forEach((p) => {
        boxes.push({
          bbox: p.product_area_bounding_box,
          label: p.item_code,
          status: p.status,
          strokeStyle: "solid",
        });
      });
    }
    if (showBarcodeBoxes) {
      activeDetection.products.forEach((p) => {
        boxes.push({
          bbox: p.barcode_bounding_box,
          label: p.item_code,
          color: "#3b82f6",
          strokeStyle: "dashed",
        });
      });
    }
    if (showUnknownItems) {
      activeDetection.unknown_items.forEach((u) => {
        boxes.push({
          bbox: u.bounding_box,
          label: u.generated_name || (u.description.length > 30 ? u.description.substring(0, 30) + "..." : u.description),
          color: "#6b7280",
          strokeStyle: "dashed",
        });
      });
    }
  }

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3 space-y-4">
        <div
          ref={containerRef}
          className="relative bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center"
          style={{ minHeight: "500px" }}
        >
          {isLoading ? (
            <div className="text-gray-400">Loading detection data...</div>
          ) : activeDetection ? (
            <>
              <img
                src={`/api/images/${activeDetection.image_path}`}
                alt="Detection"
                className="w-full h-full object-contain absolute inset-0"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
                  if (containerRef.current) {
                    setContainerSize({
                      width: containerRef.current.clientWidth,
                      height: containerRef.current.clientHeight,
                    });
                  }
                }}
              />
              {activeDetection.products.length > 0 && imageNaturalSize.width > 0 && (
                <BoundingBoxOverlay
                  boundingBoxes={boxes}
                  imageNaturalWidth={imageNaturalSize.width}
                  imageNaturalHeight={imageNaturalSize.height}
                  containerWidth={containerSize.width}
                  containerHeight={containerSize.height}
                />
              )}
            </>
          ) : (
            <div className="text-gray-400">No detection data available</div>
          )}
        </div>
      </div>

      <OverlaySettings
        showProductAreas={showProductAreas}
        setShowProductAreas={setShowProductAreas}
        showBarcodeBoxes={showBarcodeBoxes}
        setShowBarcodeBoxes={setShowBarcodeBoxes}
        showUnknownItems={showUnknownItems}
        setShowUnknownItems={setShowUnknownItems}
      />
    </div>
  );
}

function OverlaySettings({
  showProductAreas,
  setShowProductAreas,
  showBarcodeBoxes,
  setShowBarcodeBoxes,
  showUnknownItems,
  setShowUnknownItems,
}: {
  showProductAreas: boolean;
  setShowProductAreas: (value: boolean) => void;
  showBarcodeBoxes: boolean;
  setShowBarcodeBoxes: (value: boolean) => void;
  showUnknownItems: boolean;
  setShowUnknownItems: (value: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Overlay Layers</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              checked={showProductAreas}
              onChange={(e) => setShowProductAreas(e.target.checked)}
            />
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div className="w-3 h-3 rounded-full bg-red-500 -ml-1" />
              <div className="w-3 h-3 rounded-full bg-amber-500 -ml-1" />
              <span className="text-sm text-gray-700">Product Areas</span>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              checked={showBarcodeBoxes}
              onChange={(e) => setShowBarcodeBoxes(e.target.checked)}
            />
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm text-gray-700">Barcode Boxes</span>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              checked={showUnknownItems}
              onChange={(e) => setShowUnknownItems(e.target.checked)}
            />
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-500" />
              <span className="text-sm text-gray-700">Unknown Items</span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}