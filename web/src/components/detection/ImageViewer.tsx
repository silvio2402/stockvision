import React, { useRef, useState, useEffect } from "react";
import { useLatestDetection } from "../../hooks/useDetections";
import { formatRelativeTime } from "../../lib/utils";
import { BoundingBox } from "../../types";
import { BoundingBoxOverlay } from "./BoundingBoxOverlay";

export function ImageViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
  const { data: detection, isLoading, error } = useLatestDetection();

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

  if (isLoading) {
    return (
      <div className="bg-gray-100 rounded-lg aspect-video flex items-center justify-center">
        <div className="text-gray-500">Loading detection data...</div>
      </div>
    );
  }

  if (error || !detection) {
    return (
      <div className="bg-gray-100 rounded-lg aspect-video flex items-center justify-center">
        <div className="text-gray-500">No Detection Data Available</div>
      </div>
    );
  }

  const boxes = detection.products.map((p) => ({
    bbox: p.product_area_bounding_box,
    label: `${p.item_code} - ${p.status}`,
    status: p.status as "in_stock" | "running_out",
  }));

  const imageUrl = `/api/images/${detection.image_path}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Latest Shelf Image</h3>
        <span className="text-sm text-gray-500">
          Last scan: {formatRelativeTime(detection.timestamp)}
        </span>
      </div>
      
      <div
        ref={containerRef}
        className="relative bg-gray-900 rounded-lg overflow-hidden"
        style={{ height: "500px" }}
      >
        <img
          src={imageUrl}
          alt="Shelf detection"
          className="w-full h-full object-contain"
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
        
        {detection.products.length > 0 && imageNaturalSize.width > 0 && (
          <BoundingBoxOverlay
            boundingBoxes={boxes}
            imageNaturalWidth={imageNaturalSize.width}
            imageNaturalHeight={imageNaturalSize.height}
            containerWidth={containerSize.width}
            containerHeight={containerSize.height}
          />
        )}
      </div>
      
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-600">In Stock</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-gray-600">Running Out</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-gray-600">Unknown</span>
        </div>
      </div>
    </div>
  );
}