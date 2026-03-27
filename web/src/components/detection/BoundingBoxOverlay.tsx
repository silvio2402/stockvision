import React from "react";
import { BoundingBox } from "../../types";

const GEMINI_COORD_SPACE = 1000;

export interface BoxItem {
  bbox: BoundingBox;
  label: string;
  status?: "in_stock" | "running_out" | "unknown";
  color?: string;
  strokeStyle?: "solid" | "dashed" | "dotted";
}

interface BoundingBoxOverlayProps {
  boundingBoxes: BoxItem[];
  imageNaturalWidth: number;
  imageNaturalHeight: number;
  containerWidth: number;
  containerHeight: number;
}

export function BoundingBoxOverlay({
  boundingBoxes,
  imageNaturalWidth,
  imageNaturalHeight,
  containerWidth,
  containerHeight,
}: BoundingBoxOverlayProps) {
  const imageAspect = imageNaturalWidth / imageNaturalHeight;
  const containerAspect = containerWidth / containerHeight;

  let renderedW: number;
  let renderedH: number;
  let offsetX: number;
  let offsetY: number;

  if (imageAspect > containerAspect) {
    renderedW = containerWidth;
    renderedH = containerWidth / imageAspect;
    offsetX = 0;
    offsetY = (containerHeight - renderedH) / 2;
  } else {
    renderedH = containerHeight;
    renderedW = containerHeight * imageAspect;
    offsetX = (containerWidth - renderedW) / 2;
    offsetY = 0;
  }

  const scaleX = renderedW / GEMINI_COORD_SPACE;
  const scaleY = renderedH / GEMINI_COORD_SPACE;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={containerWidth}
      height={containerHeight}
    >
      {boundingBoxes.map((item, index) => {
        const { bbox, label, status, color, strokeStyle = "solid" } = item;
        const x = offsetX + bbox.x * scaleX;
        const y = offsetY + bbox.y * scaleY;
        const w = bbox.width * scaleX;
        const h = bbox.height * scaleY;

        const statusColors: Record<string, string> = {
          in_stock: "#10b981",
          running_out: "#ef4444",
          unknown: "#f59e0b",
        };
        const strokeColor = color ?? statusColors[status || "in_stock"];

        const dashArrayMap: Record<string, string | undefined> = {
          solid: undefined,
          dashed: "8 4",
          dotted: "3 3",
        };
        const strokeDasharray = dashArrayMap[strokeStyle];

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
              strokeDasharray={strokeDasharray}
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