import React, { useState } from "react";
import { useSettings, useUpdateSettings } from "../hooks/useSettings";
import { Button, Input, Textarea } from "../components/layout/ui";
import { Settings as SettingsIcon, Save, RotateCcw } from "lucide-react";
import { cn } from "../lib/utils";

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [formData, setFormData] = useState<Partial<any>>({});
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Configure system preferences and integrations
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {hasChanges && (
            <>
              <Button variant="secondary" onClick={handleReset} disabled={updateSettings.isPending}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button onClick={handleSave} disabled={updateSettings.isPending}>
                <Save className="h-4 w-4 mr-1" />
                {updateSettings.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}
        </div>
      </div>

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
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={currentSettings.approval_required}
              onChange={(e) => handleChange("approval_required", e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
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
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="text-gray-500">{icon}</div>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}