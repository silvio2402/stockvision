import React from "react";
import { BoundingBox } from "../../types";

interface BoundingBoxOverlayProps {
  boundingBoxes: Array<{
    bbox: BoundingBox;
    label: string;
    status?: "in_stock" | "running_out" | "unknown";
  }>;
  imageWidth: number;
  imageHeight: number;
  containerWidth: number;
  containerHeight: number;
}

export function BoundingBoxOverlay({
  boundingBoxes,
  imageWidth,
  imageHeight,
  containerWidth,
  containerHeight,
}: BoundingBoxOverlayProps) {
  const scaleX = containerWidth / imageWidth;
  const scaleY = containerHeight / imageHeight;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={containerWidth}
      height={containerHeight}
    >
      {boundingBoxes.map((item, index) => {
        const { bbox, label, status } = item;
        const x = bbox.x * scaleX;
        const y = bbox.y * scaleY;
        const w = bbox.width * scaleX;
        const h = bbox.height * scaleY;

        const colors = {
          in_stock: "#10b981",
          running_out: "#ef4444",
          unknown: "#f59e0b",
        };
        const strokeColor = colors[status || "in_stock"];

        return (
          <g key={index}>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill="none"
              stroke={strokeColor}
              strokeWidth={2}
              rx={4}
            />
            <rect
              x={x}
              y={y - 24}
              width={Math.max(w, 100)}
              height={24}
              fill={strokeColor}
              rx={4}
            />
            <text
              x={x + 8}
              y={y - 8}
              fill="white"
              fontSize="12"
              fontWeight="600"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}