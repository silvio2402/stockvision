import React, { useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useSettings, useUpdateSettings } from "../hooks/useSettings";
import { Button, Input, Textarea } from "../components/layout/ui";
import { Settings as SettingsIcon, Save, RotateCcw, Bug, Camera } from "lucide-react";
import { cn } from "../lib/utils";
import { type AppSettings } from "../types";
import { UnsavedChanges } from "../components/settings/UnsavedChanges";

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [formData, setFormData] = useState<Partial<AppSettings>>({});
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  const hasChanges = Object.keys(formData).length > 0;

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(formData);
      setFormData({});
    } catch (error) {
      console.error("Failed to update settings:", error);
      alert("Failed to update settings");
    }
  };

  const handleReset = () => {
    setFormData({});
  };

  const handleChange = (key: string, value: any) => {
    setFormData({ ...formData, [key]: value });
  };

  if (isLoading || !settings) {
    return <div className="p-6">Loading settings...</div>;
  }

  const currentSettings = { ...settings, ...formData };

  return (
    <div className="p-4 sm:p-6 space-y-6 pb-28 md:pb-24 relative">
      {hasChanges && <UnsavedChanges onReset={handleReset} onSave={handleSave} isPending={updateSettings.isPending} />}

      <SettingsCard
        title="Camera Access"
        icon={<Camera className="h-5 w-5" />}
      >
        <div className="flex flex-col items-center space-y-6 py-4">
          <div className="text-center space-y-2">
            <p className="text-gray-900 font-medium">Scan to open on your phone</p>
            <p className="text-sm text-gray-500 max-w-sm">
              Use your phone's camera to scan this QR code and access the scanner directly.
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <QRCodeSVG 
              value={`${window.location.origin}/camera`} 
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>

          <div className="flex items-center gap-4 w-full max-w-sm pt-4 border-t border-gray-100">
            <Link to="/camera" className="w-full">
              <Button className="w-full flex items-center justify-center gap-2">
                <Camera className="h-4 w-4" />
                Open Camera on this device
              </Button>
            </Link>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Scan Configuration"
        icon={<RotateCcw className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <Input
            type="number"
            label="Scan Interval (minutes)"
            value={currentSettings.scan_interval_minutes}
            onChange={(e) => handleChange("scan_interval_minutes", parseInt(e.target.value) || 1)}
            min={1}
          />
          <p className="text-sm text-gray-600">
            How often the system automatically scans for product detection
          </p>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Order Approval"
        icon={<SettingsIcon className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={currentSettings.approval_required}
              onChange={(e) => handleChange("approval_required", e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium text-gray-900">Require approval before sending orders</div>
              <div className="text-sm text-gray-600">
                When enabled, orders need manual approval before email is sent
              </div>
            </div>
          </label>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Email Configuration"
        icon={<Save className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <Input
            type="email"
            label="Order Email Recipient"
            value={currentSettings.order_email}
            onChange={(e) => handleChange("order_email", e.target.value)}
            placeholder="orders@company.com"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              type="text"
              label="SMTP Host"
              value={currentSettings.smtp_host}
              onChange={(e) => handleChange("smtp_host", e.target.value)}
              placeholder="smtp.example.com"
            />
            <Input
              type="number"
              label="SMTP Port"
              value={currentSettings.smtp_port}
              onChange={(e) => handleChange("smtp_port", parseInt(e.target.value) || 587)}
            />
          </div>

          <Input
            type="text"
            label="SMTP Username"
            value={currentSettings.smtp_user}
            onChange={(e) => handleChange("smtp_user", e.target.value)}
            placeholder="user@example.com"
          />

          <Input
            type="password"
            label="SMTP Password"
            value={formData.smtp_password ?? ""}
            onChange={(e) => handleChange("smtp_password", e.target.value)}
            placeholder="••••••••"
          />
        </div>
      </SettingsCard>

      <SettingsCard
        title="Gemini Models"
        icon={<SettingsIcon className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <Input
            type="text"
            label="Barcode Detection Model"
            value={currentSettings.gemini_models?.barcode_detection || ""}
            onChange={(e) =>
              handleChange("gemini_models", {
                ...currentSettings.gemini_models,
                barcode_detection: e.target.value,
              })
            }
          />

          <Input
            type="text"
            label="Product Area Detection Model"
            value={currentSettings.gemini_models?.product_area_detection || ""}
            onChange={(e) =>
              handleChange("gemini_models", {
                ...currentSettings.gemini_models,
                product_area_detection: e.target.value,
              })
            }
          />

          <Input
            type="text"
            label="Stock Evaluation Model"
            value={currentSettings.gemini_models?.stock_evaluation || ""}
            onChange={(e) =>
              handleChange("gemini_models", {
                ...currentSettings.gemini_models,
                stock_evaluation: e.target.value,
              })
            }
          />

          <p className="text-sm text-gray-600">
            Google Gemini AI models used for detection and evaluation
          </p>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Developer Settings"
        icon={<Bug className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={currentSettings.developer_mode}
              onChange={(e) => handleChange("developer_mode", e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium text-gray-900">Developer Mode</div>
              <div className="text-sm text-gray-600">
                Show insights tools and experimental features
              </div>
            </div>
          </label>
        </div>
      </SettingsCard>
    </div>
  );
}

interface SettingsCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function SettingsCard({ title, icon, children }: SettingsCardProps) {
  return (
    <div className="bg-white rounded-lg border">
      <div className="px-4 sm:px-6 py-4 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="text-gray-500">{icon}</div>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}
