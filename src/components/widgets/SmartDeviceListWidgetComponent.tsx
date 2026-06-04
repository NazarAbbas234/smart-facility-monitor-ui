import * as React from "react";
import { IModelApp } from "@itwin/core-frontend";
import { IModelDataApi, SmartDevice } from "../apis/IModelDataApi";
import { DeviceStatusApi } from "../apis/DeviceStatusApi";
import "./smartdevicelistWidget.css";
import { useActiveIModelConnection } from "@itwin/appui-react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Register ChartJS modules
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface ActiveSmartDevice extends SmartDevice {
  status: string;
  reading: number;
}

export function SmartDeviceListWidgetComponent() {
  const iModelConnection = useActiveIModelConnection();
  const [smartDevices, setSmartDevices] = React.useState<ActiveSmartDevice[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  // UI Search/Filter Control States
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [typeFilter, setTypeFilter] = React.useState<string>("All");
  const [statusFilter, setStatusFilter] = React.useState<string>("All");

  // 1. NEW: Form Workflow Interaction States
  const [editingDevice, setEditingDevice] = React.useState<ActiveSmartDevice | null>(null);
  const [editStatus, setEditStatus] = React.useState<string>("");
  const [editReading, setEditReading] = React.useState<number>(0);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!iModelConnection) {
        console.log("📡 Waiting for iModelConnection to stabilize before initializing IoT streams...");
        return;
      }
    async function initializeDeviceTelemetryStream() {
      try {
        setLoading(true);
        const [spatialDevices, iotTelemetry] = await Promise.all([
          IModelDataApi.getSmartDevices(iModelConnection),
          DeviceStatusApi.getData()
        ]);

          const combinedDevices: ActiveSmartDevice[] = spatialDevices.map((device) => {
          const cleanId = (device.smartDeviceId || "").trim().toLowerCase();
          const liveMetrics = iotTelemetry[cleanId] || {};

          let currentStatus = "Off";
          if (liveMetrics["Is On"] !== undefined) currentStatus = liveMetrics["Is On"] ? "On" : "Off";
          if (liveMetrics["Is Locked"] !== undefined) currentStatus = liveMetrics["Is Locked"] ? "Locked" : "Unlocked";
          if (liveMetrics["Is Open"] !== undefined) currentStatus = liveMetrics["Is Open"] ? "Open" : "Closed";

          const coreReading = liveMetrics["Temperature"] ?? 
                             liveMetrics["Hours Slept"] ?? 
                             liveMetrics["Time Remaining"] ?? 
                             liveMetrics["Notifications"] ?? 0;

          return { ...device, status: currentStatus, reading: coreReading };
        });

        setSmartDevices(combinedDevices);
      } catch (error) {
        console.error("❌ Failed to aggregate digital twin IoT datasets:", error);
      } finally {
        setLoading(false);
      }
    }
    // Fire the data aggregate loop instantly
    initializeDeviceTelemetryStream();

    // The simulation engine loop
    const iotStreamInterval = setInterval(() => {
      setSmartDevices((prevDevices) => {
        // 🚀 CRITICAL FIX: We read the latest state values inside the setter loop execution framework
        return prevDevices.map((device) => {
          
          // Check if this device is currently open in the editor modal
          // We can check this by accessing a global window flag or checking the current state tree safely
          if ((device as any).isManuallyEdited) {
            return device; // Skip simulation entirely for user-controlled assets
          }

          if (Math.random() > 0.7) {
            const id = (device.smartDeviceId || "").trim().toLowerCase();
            if (id.startsWith("light") || id.startsWith("tv")) {
              return { ...device, status: device.status === "On" ? "Off" : "On" };
            }
            if (id.startsWith("thermostat") || id.startsWith("oven") || id.startsWith("jacuzzi")) {
              return { ...device, reading: device.reading + (Math.random() > 0.5 ? 1 : -1) };
            }
          }
          return device;
        });
      });
    }, 2500);

    return () => clearInterval(iotStreamInterval);
    }, [iModelConnection]);

  // Viewport Camera Tracking Trigger
  const handleDeviceFocus = React.useCallback(async (ecInstanceId: string) => {
    const activeViewport = IModelApp.viewManager.selectedView;
    if (!activeViewport) return;

    activeViewport.iModel.selectionSet.emptyAll();
    activeViewport.iModel.selectionSet.replace(ecInstanceId);

    await activeViewport.zoomToElements(ecInstanceId, {
      animateFrustumChange: true
    });
  }, []);

  // 2. NEW: Open Form Editor Handler
  const startEditing = (e: React.MouseEvent, device: ActiveSmartDevice) => {
    e.stopPropagation(); // Prevents row click zoom tracking from triggering simultaneously
    setEditingDevice(device);
    setEditStatus(device.status);
    setEditReading(device.reading);
  };

  // 3. NEW: The Data Write-Back Process Engine
  const handleSaveData = async () => {
    if (!editingDevice) return;

    const targetId = editingDevice.id;
    const finalSavedReading = Number(editReading);
    const finalSavedStatus = editStatus;

    // 1. Update Local Component State Layout instantly (Optimistic UI update)
    setSmartDevices((prev) =>
      prev.map((d) =>
        d.id === targetId 
          ? { ...d, status: finalSavedStatus, reading: finalSavedReading, isManuallyEdited: true } 
          : d
      )
    );

    // Close the popup view
    setEditingDevice(null);

    // 2. Push Real Changes to Your Backend Server Database
    try {
      // 🚀 DYNAMIC URL EXTRACTION: Uses localhost or production cloud automatically
      // Note: Make sure to import DeviceStatusApi at the top of this file!
      const baseUrl = (DeviceStatusApi as any).baseUrl || "http://localhost:5000"; 
      
      console.log(`📡 Sending write payload to live database for ${editingDevice.smartDeviceId}...`);

      const response = await fetch(`${baseUrl}/devices/${editingDevice.smartDeviceId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: finalSavedStatus,
          reading: finalSavedReading
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with HTTP status ${response.status}`);
      }

      setToastMessage(`🎉 Saved changes for ${editingDevice.smartDeviceId} directly to database!`);
      setTimeout(() => setToastMessage(null), 4000);
      
    } catch (err) {
      console.error("❌ Write-back sequence pipeline execution failed:", err);
      setToastMessage(`⚠️ App saved locally, but database sync failed.`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Computed Filters
  const filteredDevices = React.useMemo(() => {
    return smartDevices.filter((device) => {
      const matchesSearch = device.smartDeviceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            device.smartDeviceType.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "All" || device.smartDeviceType === typeFilter;
      const matchesStatus = statusFilter === "All" || device.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [smartDevices, searchQuery, typeFilter, statusFilter]);

  const uniqueTypes = React.useMemo(() => {
    return ["All", ...Array.from(new Set(smartDevices.map(d => d.smartDeviceType)))];
  }, [smartDevices]);

  const totalDevices = smartDevices.length;
    const devicesOn = smartDevices.filter(d => ["On", "Locked", "Open"].includes(d.status)).length;
    const devicesOff = smartDevices.filter(d => ["Off", "Unlocked", "Closed"].includes(d.status)).length;

    const chartData = {
      labels: ['Active / On', 'Inactive / Off'],
      datasets: [
        {
          label: '# of Devices',
          data: [devicesOn, devicesOff],
          backgroundColor: ['rgba(54, 162, 235, 0.6)', 'rgba(255, 99, 132, 0.6)'],
          borderColor: ['rgba(54, 162, 235, 1)', 'rgba(255, 99, 132, 1)'],
          borderWidth: 1,
        },
      ],
    };

  if (loading) {
    return <div style={{ padding: "16px", fontStyle: "italic", color: "#667788" }}>Connecting to live IoT feeds...</div>;
  }

return (
    // 🚀 FIXED: Added layout flex display layout to keep panels perfectly separated side-by-side
    <div className="widget-dashboard-container" style={{ display: "flex", width: "100%", height: "100%", overflow: "hidden" }}>
      
      {/* SIDEBAR VIEW CONTROLS */}
      {/* 🚀 FIXED: Added strict width constraint so it never overlaps your table */}
      <div className="widget-sidebar" style={{ width: "250px", minWidth: "250px", padding: "15px", borderRight: "1px solid #333", overflowY: "auto" }}>
        <div className="sidebar-section">
          <label>Search Devices</label>
          <input 
            type="text" 
            className="search-input"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="sidebar-section">
          <label>Device Type</label>
          <select className="filter-dropdown" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="sidebar-section">
          <label>Live Status</label>
          <select className="filter-dropdown" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="On">On</option>
            <option value="Off">Off</option>
            <option value="Locked">Locked</option>
            <option value="Unlocked">Unlocked</option>
          </select>
        </div>

        {/* 📊 CHART DISPLAY */}
        <div style={{ 
          marginTop: "20px", 
          padding: "12px", 
          background: "#2a2a2a", 
          borderRadius: "8px", 
          border: "1px solid #444"
        }}>
          <h3 style={{ margin: "0 0 5px 0", fontSize: "13px", color: "#fff", fontWeight: 600 }}>
            📊 Device Metrics
          </h3>
          <p style={{ fontSize: "11px", color: "#aaa", marginBottom: "10px" }}>
            Total Tracked Assets: {totalDevices}
          </p>
          <div style={{ width: "100%", height: "130px", display: "flex", justifyContent: "center" }}>
            <Pie data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

      </div> {/* This closes the widget-sidebar */}

      {/* MAIN DATA INTERACTIVE GRID TABLE */}
      {/* 🚀 FIXED: Added flex: 1 and overflow scroll so the table occupies the rest of the window perfectly */}
      <div className="widget-main-content" style={{ flex: 1, padding: "15px", overflowY: "auto" }}>
        <table className="smart-table">
          <thead>
            <tr>
              <th>SmartDeviceId</th>
              <th>SmartDeviceType</th>
              <th>Status</th>
              <th>Telemetry Reading</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDevices.map((smartDevice) => {
              const isActive = ["On", "Unlocked", "Open"].includes(smartDevice.status);
              const rowModifierClass = isActive ? "row-status-active" : "row-status-inactive";
              const id = (smartDevice.smartDeviceId || "").trim().toLowerCase();

              return (
                <tr 
                  key={smartDevice.id} 
                  className={`clickable device-row ${rowModifierClass}`}
                  onClick={() => handleDeviceFocus(smartDevice.id)}
                >
                  <td style={{ fontVariant: "all-small-caps", fontWeight: 600 }}>{smartDevice.smartDeviceId}</td>
                  <td>{smartDevice.smartDeviceType}</td>
                  <td>
                    <span className={`status-badge ${isActive ? "badge-on" : "badge-off"}`}>{smartDevice.status}</span>
                  </td>
                  <td className="telemetry-cell">
                    {(() => {
                      const id = (smartDevice.smartDeviceId || "").trim().toLowerCase();
                      
                      if (id.startsWith("thermostat") || id.startsWith("oven") || id.startsWith("jacuzzi")) {
                        return `${smartDevice.reading}°F`;
                      }
                      if (id.startsWith("bed")) {
                        return `${smartDevice.reading} hrs`;
                      }
                      if (id.startsWith("light")) {
                        return "—"; // Lights only have an On/Off status
                      }
                      if (id.startsWith("washer") || id.startsWith("dishwasher")) {
                        return `${smartDevice.reading} min`;
                      }
                      if (id.startsWith("garage")) {
                        return smartDevice.status === "Open" ? "🚗 Vehicle Bay Open" : "🔒 Secured";
                      }
                      if (id.startsWith("lock")) {
                        return smartDevice.status === "Locked" ? "Deadbolt Engaged" : "Passable";
                      }
                      if (id.startsWith("speaker")) {
                        return `🎵 Media Active (${smartDevice.reading} Alerts)`;
                      }
                      
                      return `${smartDevice.reading}`;
                    })()}
                  </td>
                  <td>
                    <button 
                      className="btn-primary" 
                      style={{ padding: "4px 8px", fontSize: "11px" }}
                      onClick={(e) => startEditing(e, smartDevice)}
                    >
                      ✏️ Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 4. THE POPUP MODAL CONTROL CARD VIEW COMPONENT */}
      {editingDevice && (
        <div className="modal-overlay" onClick={() => setEditingDevice(null)}>
          <div className="edit-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Configure {editingDevice.smartDeviceId}</h3>
            
            <div className="sidebar-section">
              <label>Set Status Override</label>
              <select className="filter-dropdown" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                <option value="On">On / Active</option>
                <option value="Off">Off / Standby</option>
                <option value="Locked">Locked</option>
                <option value="Unlocked">Unlocked</option>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="sidebar-section">
              <label>Set Core Telemetry Reading</label>
              <input 
                type="number" 
                className="search-input"
                value={editReading}
                onChange={(e) => setEditReading(Number(e.target.value))}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditingDevice(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveData}>💾 Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* 5. FLOATING CONFIRMATION TOAST NOTIFICATION NOTIFIER */}
      {toastMessage && (
        <div className="toast-container">
          {toastMessage}
        </div>
      )}
    </div>
  );
}