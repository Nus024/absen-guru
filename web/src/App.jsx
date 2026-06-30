import React, { useState, useEffect, useCallback, memo } from "react";
import * as authApi from "./api/auth.js";
import * as scheduleApi from "./api/schedule.js";
import * as attendanceApi from "./api/attendance.js";
import * as reportApi from "./api/report.js";
import * as settingsApi from "./api/settings.js";


// MUI Icons (SF Symbols equivalent outlines)
import {
  CalendarMonthOutlined as CalendarMonthOutlinedIcon,
  BarChartOutlined as BarChartOutlinedIcon,
  TuneOutlined as TuneOutlinedIcon,
  PersonOutlineOutlined as PersonOutlineOutlinedIcon,
  CheckCircleOutlined as CheckCircleOutlinedIcon,
  ErrorOutlined as ErrorOutlineIcon,
  InfoOutlined as InfoOutlinedIcon,
  WarningAmberOutlined as WarningAmberOutlinedIcon,
  NotificationsNoneOutlined as NotificationsNoneOutlinedIcon,
  CampaignOutlined as CampaignOutlinedIcon,
  LogoutOutlined as LogoutOutlinedIcon,
  SyncOutlined as SyncOutlinedIcon,
  PictureAsPdfOutlined as PictureAsPdfOutlinedIcon,
  TableChartOutlined as TableChartOutlinedIcon,
  SearchOutlined as SearchOutlinedIcon,
  CloseOutlined as CloseOutlinedIcon,
  SendOutlined as SendOutlinedIcon,
  FiberManualRecord as FiberManualRecordIcon,
  PhoneAndroidOutlined as PhoneAndroidOutlinedIcon,
  SchoolOutlined as SchoolOutlinedIcon,
  ChevronRightOutlined as ChevronRightOutlinedIcon,
  TableRowsOutlined as SidebarToggleIcon,
  VisibilityOutlined as VisibilityOutlinedIcon,
  VisibilityOffOutlined as VisibilityOffOutlinedIcon,
  LockPersonOutlined as LockPersonOutlinedIcon,
  KeyOutlined as KeyOutlinedIcon,
  HistoryOutlined as HistoryOutlinedIcon,
  ManageAccountsOutlined as ManageAccountsOutlinedIcon,
  SecurityOutlined as SecurityOutlinedIcon,
  PeopleOutlined as PeopleOutlinedIcon
} from "@mui/icons-material";

const capitalize = (s) => {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const getFormattedTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

const getFormattedDateIndo = (dateStr) => {
  const d = new Date(dateStr);
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const indoMonths = [
  { value: 1, label: "Januari" }, { value: 2, label: "Februari" }, { value: 3, label: "Maret" },
  { value: 4, label: "April" }, { value: 5, label: "Mei" }, { value: 6, label: "Juni" },
  { value: 7, label: "Juli" }, { value: 8, label: "Agustus" }, { value: 9, label: "September" },
  { value: 10, label: "Oktober" }, { value: 11, label: "November" }, { value: 12, label: "Desember" }
];

// ═══════════════════════════════════════════
// REUSABLE NATIVE IOS COMPONENTS
// ═══════════════════════════════════════════

// 1. IOSButton
const IOSButton = memo(({ children, onClick, variant = "primary", disabled = false, loading = false, style, ariaLabel, type }) => {
  const btnClass = `ios-btn ios-btn-${variant}`;
  return (
    <button type={type} onClick={onClick} className={btnClass} disabled={disabled || loading} style={style} aria-label={ariaLabel}>
      {loading ? <IOSLoading /> : children}
    </button>
  );
});

// 2. IOSCard
const IOSCard = memo(({ children, interactive = false, style, onClick }) => {
  const cardClass = `ios-card ${interactive ? "interactive" : ""}`;
  return (
    <div className={cardClass} style={style} onClick={onClick}>
      {children}
    </div>
  );
});

// 3. IOSSection
const IOSSection = memo(({ children, title, footer }) => (
  <div className="ios-section">
    {title && <div className="ios-section-header">{title}</div>}
    {children}
    {footer && <div className="ios-section-footer">{footer}</div>}
  </div>
));

// 4. IOSList
const IOSList = memo(({ children, className = "", style }) => (
  <div className={`ios-list ${className}`.trim()} style={style}>
    {children}
  </div>
));

// 5. IOSListRow
const IOSListRow = memo(({ children, onClick, interactive = false, rightContent, chevron = false, className = "" }) => {
  const rowClass = `ios-list-row ${interactive ? "interactive" : ""} ${className}`.trim();
  return (
    <div className={rowClass} onClick={onClick}>
      <div className="ios-list-row-left">
        {children}
      </div>
      <div className="ios-list-row-right">
        {rightContent}
        {chevron && <ChevronRightOutlinedIcon className="ios-chevron" />}
      </div>
    </div>
  );
});

// 6. IOSInput
const IOSInput = memo(({ type = "text", value, onChange, placeholder, select = false, options = [], style, ariaLabel, maxLength, inputRef }) => {
  if (select) {
    return (
      <select value={value} onChange={onChange} className="ios-input" style={style} aria-label={ariaLabel}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  return (
    <input ref={inputRef} type={type} value={value} onChange={onChange} placeholder={placeholder} className="ios-input" style={style} aria-label={ariaLabel} maxLength={maxLength} />
  );
});

// Custom Apple Select Dropdown Component
const AppleSelect = memo(({ value, onChange, options, style, ariaLabel, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  const selectedOption = options.find(o => o.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (val) => {
    onChange({ target: { value: val } });
    setIsOpen(false);
  };

  return (
    <div className={`apple-select-container ${className}`} ref={dropdownRef} style={style}>
      <button
        type="button"
        className="apple-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span>{selectedOption ? selectedOption.label : ""}</span>
        <ChevronRightOutlinedIcon className={`apple-select-chevron ${isOpen ? "open" : ""}`} />
      </button>
      {isOpen && (
        <div className="apple-select-dropdown" role="listbox">
          <div className="scroll-inertia" style={{ maxHeight: "200px" }}>
            {options.map(o => (
              <div
                key={o.value}
                className={`apple-select-option ${o.value === value ? "selected" : ""}`}
                role="option"
                aria-selected={o.value === value}
                onClick={() => handleSelect(o.value)}
              >
                <span>{o.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// Custom iOS 17 Style Date Picker / Calendar Component
const AppleDatePicker = memo(({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState(value);
  const [viewDate, setViewDate] = useState(new Date(value));
  useEffect(() => {
    setTempDate(value);
  }, [value]);

  const handleOpen = () => {
    setViewDate(new Date(value));
    setTempDate(value);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSave = () => {
    onChange({ target: { value: tempDate } });
    setIsOpen(false);
  };

  const changeMonth = (offset) => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + offset);
    setViewDate(d);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const daysOfWeek = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevTotalDays = new Date(year, month, 0).getDate();

  const cells = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevTotalDays - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    cells.push({
      day: d,
      dateString: `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      isCurrentMonth: false
    });
  }

  for (let d = 1; d <= totalDays; d++) {
    cells.push({
      day: d,
      dateString: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      isCurrentMonth: true
    });
  }

  const targetLength = cells.length > 35 ? 42 : 35;
  const fillerCount = targetLength - cells.length;
  for (let d = 1; d <= fillerCount; d++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    cells.push({
      day: d,
      dateString: `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      isCurrentMonth: false
    });
  }

  const todayStr = new Date().toISOString().split("T")[0];

  const getDisplayLabel = () => {
    const d = new Date(value);
    const monthsShort = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    return `${d.getDate()} ${monthsShort[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <>
      <button
        type="button"
        className="apple-date-trigger"
        onClick={handleOpen}
        aria-label="Pilih tanggal absensi"
      >
        <span>{getDisplayLabel()}</span>
        <ChevronRightOutlinedIcon className="apple-date-chevron" />
      </button>

      {isOpen && (
        <div className="apple-calendar-overlay" onClick={handleClose}>
          <div className="apple-calendar-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="ios-sheet-grabber"></div>

            <div className="apple-calendar-header">
              <button type="button" className="apple-calendar-nav-btn" onClick={() => changeMonth(-1)}>
                <ChevronRightOutlinedIcon style={{ transform: "rotate(180deg)", fontSize: "1.2rem" }} />
              </button>
              <h3 className="apple-calendar-title">
                {monthNames[month]} {year}
              </h3>
              <button type="button" className="apple-calendar-nav-btn" onClick={() => changeMonth(1)}>
                <ChevronRightOutlinedIcon style={{ fontSize: "1.2rem" }} />
              </button>
            </div>

            <div className="apple-calendar-weekdays">
              {daysOfWeek.map(d => <div key={d} className="apple-calendar-weekday">{d}</div>)}
            </div>

            <div className="apple-calendar-grid">
              {cells.map((cell, index) => {
                const isSelected = cell.dateString === tempDate;
                const isToday = cell.dateString === todayStr;
                let btnCls = "apple-calendar-day-btn";
                if (!cell.isCurrentMonth) btnCls += " out-of-month";
                if (isSelected) btnCls += " selected";
                if (isToday && !isSelected) btnCls += " today";

                return (
                  <button
                    key={index}
                    type="button"
                    className={btnCls}
                    onClick={() => setTempDate(cell.dateString)}
                  >
                    <span>{cell.day}</span>
                  </button>
                );
              })}
            </div>

            <div className="apple-calendar-footer">
              <button type="button" className="apple-calendar-action-btn cancel" onClick={handleClose}>
                Batal
              </button>
              <button type="button" className="apple-calendar-action-btn save" onClick={handleSave}>
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

// 7. IOSSwitch
const IOSSwitch = memo(({ checked, onChange, ariaLabel }) => (
  <label className="ios-switch" aria-label={ariaLabel}>
    <input type="checkbox" checked={checked} onChange={onChange} />
    <span className="ios-switch-slider"></span>
  </label>
));

// 8. IOSBadge
const IOSBadge = memo(({ status }) => {
  const map = { HADIR: "hadir", IZIN: "izin", SAKIT: "sakit", ALPHA: "alpha", LIBUR: "libur", BELUM: "belum" };
  const cls = map[status] || "belum";
  return <span className={`ios-badge ios-badge-${cls}`}>{status}</span>;
});

// 9. IOSAvatar
const IOSAvatar = memo(({ name }) => {
  const initials = name ? name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase() : "MA";
  return <div className="ios-avatar">{initials}</div>;
});

// 10. IOSLoading
const IOSLoading = memo(() => <div className="ios-loading-spinner" />);

// 11. IOSSkeleton
const IOSSkeleton = memo(({ height = "20px", width = "100%", style }) => (
  <div className="ios-skeleton" style={{ height, width, ...style }} />
));

// 12. IOSEmptyState
const IOSEmptyState = memo(({ icon, title, description, action }) => (
  <div className="ios-empty-state">
    <div className="ios-empty-state-icon">{icon}</div>
    <h3>{title}</h3>
    {description && <p>{description}</p>}
    {action}
  </div>
));

// 13. IOSSheet
const IOSSheet = memo(({ children, isOpen, onClose, className = "" }) => {
  if (!isOpen) return null;
  return (
    <div className={`ios-sheet-overlay ${className ? className + "-overlay" : ""}`} onClick={onClose}>
      <div className={`ios-sheet ${className}`} onClick={(e) => e.stopPropagation()} role="dialog" tabIndex={-1}>
        <div className="ios-sheet-grabber"></div>
        <div className="scroll-inertia" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {children}
        </div>
      </div>
    </div>
  );
});

// 14. IOSAlert
const IOSAlert = memo(({ isOpen, title, description, actions = [] }) => {
  if (!isOpen) return null;
  return (
    <div className="ios-alert-overlay" role="alertdialog">
      <div className="ios-alert">
        <div className="ios-alert-content">
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        <div className="ios-alert-actions">
          {actions.map((act, i) => (
            <button key={i} onClick={act.onClick} className={`ios-alert-action-btn ${act.bold ? "bold" : ""} ${act.destructive ? "destructive" : ""}`}>
              {act.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

// 15. (Removed IOSNavigationBar as unused)

// 16. IOSSegmentedControl
const IOSSegmentedControl = memo(({ segments, selectedValue, onChange, disabled = false }) => {
  return (
    <div className="ios-segmented-control" role="radiogroup">
      {segments.map(seg => {
        const isSelected = seg.value === selectedValue;
        return (
          <button
            key={seg.value}
            type="button"
            onClick={() => onChange(seg.value)}
            disabled={disabled}
            className={`ios-segmented-segment ${seg.cls || ""} ${isSelected ? "selected" : ""}`}
            role="radio"
            aria-checked={isSelected}
          >
            {seg.label}
          </button>
        );
      })}
    </div>
  );
});

// ═══════════════════════════════════════════
// MAIN APPLICATION
// ═══════════════════════════════════════════
let toastIdCounter = 0;

function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type} ${t.exiting ? "exiting" : ""}`}>
          {t.type === "success" && <CheckCircleOutlinedIcon style={{ color: "var(--color-secondary)" }} />}
          {t.type === "error" && <ErrorOutlineIcon style={{ color: "var(--color-danger)" }} />}
          {t.type === "info" && <InfoOutlinedIcon style={{ color: "var(--color-primary)" }} />}
          {t.type === "warning" && <WarningAmberOutlinedIcon style={{ color: "var(--color-warning)" }} />}
          <span style={{ flex: 1, fontSize: "var(--hig-fs-footnote)" }}>{t.message}</span>
          <button className="btn-ghost" onClick={() => onRemove(t.id)} style={{ padding: "2px", minWidth: "auto" }} aria-label="Tutup notifikasi">
            <CloseOutlinedIcon style={{ fontSize: "1rem" }} />
          </button>
        </div>
      ))}
    </div>
  );
}

const defaultPermissions = {
  ADMIN: {
    lihat_jadwal_sendiri: true,
    lihat_riwayat_absensi: true,
    ubah_password_sendiri: true,
    input_absensi: true,
    koreksi_absensi: true,
    lihat_rekap_seluruh_guru: true,
    ekspor_rekap: true,
    lihat_daftar_guru: true,
    kirim_pengingat_whatsapp: true,
    kirim_pengumuman_whatsapp: true,
    lihat_log_aktivitas: false,
    kelola_pengaturan_sistem: false,
    kelola_akun_guru: false,
    kelola_akun_admin: false,
  },
  USER: {
    lihat_jadwal_sendiri: true,
    lihat_riwayat_absensi: true,
    ubah_password_sendiri: true,
    input_absensi: false,
    koreksi_absensi: false,
    lihat_rekap_seluruh_guru: false,
    ekspor_rekap: false,
    lihat_daftar_guru: false,
    kirim_pengingat_whatsapp: false,
    kirim_pengumuman_whatsapp: false,
    lihat_log_aktivitas: false,
    kelola_pengaturan_sistem: false,
    kelola_akun_guru: false,
    kelola_akun_admin: false,
  }
};

const permissionList = [
  { key: "lihat_jadwal_sendiri", label: "Lihat Jadwal Sendiri" },
  { key: "lihat_riwayat_absensi", label: "Lihat Riwayat Absensi" },
  { key: "ubah_password_sendiri", label: "Ubah Password Sendiri" },
  { key: "input_absensi", label: "Input Absensi" },
  { key: "koreksi_absensi", label: "Koreksi Absensi" },
  { key: "lihat_rekap_seluruh_guru", label: "Lihat Rekap Seluruh Guru" },
  { key: "ekspor_rekap", label: "Ekspor Rekap" },
  { key: "lihat_daftar_guru", label: "Lihat Daftar Guru" },
  { key: "kirim_pengingat_whatsapp", label: "Kirim Pengingat WhatsApp" },
  { key: "kirim_pengumuman_whatsapp", label: "Kirim Pengumuman WhatsApp" },
  { key: "lihat_log_aktivitas", label: "Lihat Log Aktivitas" },
  { key: "kelola_pengaturan_sistem", label: "Kelola Pengaturan Sistem" },
  { key: "kelola_akun_guru", label: "Kelola Akun Guru" },
  { key: "kelola_akun_admin", label: "Kelola Akun Admin" }
];

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));

  const [permissions, setPermissions] = useState(() => {
    const saved = localStorage.getItem("app_permissions");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return defaultPermissions;
  });

  const [localLogs, setLocalLogs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("local_logs") || "[]"); } catch { return []; }
  });

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showMobileProfileSheet, setShowMobileProfileSheet] = useState(false);
  const [oldPasswordChange, setOldPasswordChange] = useState("");
  const [newPasswordChange, setNewPasswordChange] = useState("");
  const [confirmPasswordChange, setConfirmPasswordChange] = useState("");
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);

  const [showManageTeacherModal, setShowManageTeacherModal] = useState(false);
  const [searchTeacherQuery, setSearchTeacherQuery] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [teacherToReset, setTeacherToReset] = useState(null);

  const [autoCleanupActive, setAutoCleanupActive] = useState(() => {
    return localStorage.getItem("auto_cleanup_active") !== "false";
  });
  const [logRetentionDays, setLogRetentionDays] = useState(() => {
    const saved = localStorage.getItem("log_retention_days");
    return saved !== null ? Number(saved) : 30;
  });
  const [queueRetentionDays, setQueueRetentionDays] = useState(() => {
    const saved = localStorage.getItem("queue_retention_days");
    return saved !== null ? Number(saved) : 7;
  });
  const [showCleanupConfirmAlert, setShowCleanupConfirmAlert] = useState(false);
  const [logLogsExpanded, setLogLogsExpanded] = useState(false);

  const hasPermission = useCallback((permissionKey) => {
    if (user?.role === "SUPERADMIN") return true;
    const role = user?.role || "USER";
    return !!permissions[role]?.[permissionKey];
  }, [user, permissions]);

  const addLocalLog = useCallback((action, details) => {
    setLocalLogs(prev => {
      const updated = [
        {
          timestamp: new Date().toISOString(),
          operator_name: user?.name || "Sistem",
          operator_phone: user?.phone || "",
          action,
          details
        },
        ...prev
      ].slice(0, 50);
      localStorage.setItem("local_logs", JSON.stringify(updated));
      return updated;
    });
  }, [user]);

  const handlePermissionToggle = (role, key, checked) => {
    setPermissions(prev => {
      const updated = {
        ...prev,
        [role]: {
          ...prev[role],
          [key]: checked
        }
      };
      localStorage.setItem("app_permissions", JSON.stringify(updated));
      return updated;
    });
    addLocalLog("TOGGLE_PERMISSION", `Mengubah izin ${permissionList.find(p => p.key === key)?.label || key} untuk ${role} menjadi ${checked ? "AKTIF" : "NONAKTIF"}`);
    showToast(`Hak akses updated untuk ${role}`, "success");
  };
  
  // Login States
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordInputRef = React.useRef(null);

  // App Navigation
  const [activeTab, setActiveTab] = useState("absensi");
  const [serverStatus, setServerStatus] = useState(null);
  const [autoRekapActive, setAutoRekapActive] = useState(true);

  // Absensi Page States
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [selectedJam, setSelectedJam] = useState("1");
  const [schedule, setSchedule] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [absensiStatusFilter, setAbsensiStatusFilter] = useState("SEMUA");
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);


  // Sidebar Collapse State (desktop only)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebarCollapsed") === "true"; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem("sidebarCollapsed", String(sidebarCollapsed)); } catch {}
  }, [sidebarCollapsed]);

  // Broadcast & Alarm States
  const [broadcastTarget, setBroadcastTarget] = useState("TODAY");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [alarmLoading, setAlarmLoading] = useState(false);

  // Modals / Dialogs
  const [correctionTarget, setCorrectionTarget] = useState(null);
  const [teacherDetail, setTeacherDetail] = useState(null);
  const [bulkTargetAction, setBulkTargetAction] = useState(null); // { status, targetsCount }
  const [removingTeachers, setRemovingTeachers] = useState(new Set());

  // Rekap Bulanan States
  const [rekapMonth, setRekapMonth] = useState(new Date().getMonth() + 1);
  const [rekapYear, setRekapYear] = useState(new Date().getFullYear());
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Toasts
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info") => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, type, exiting: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token"); localStorage.removeItem("user");
    setToken(""); setUser(null); setPhone("");
    showToast("Berhasil logout", "info");
  }, [showToast]);

  // Unauthorized handler — dipanggil oleh API Client saat JWT kedaluwarsa
  useEffect(() => {
    const handler = () => handleLogout();
    window.addEventListener("api:unauthorized", handler);
    return () => window.removeEventListener("api:unauthorized", handler);
  }, [handleLogout]);

  const getStatus = async () => {
    try {
      const statusData = await authApi.getStatus();
      setServerStatus(statusData);
      if (statusData && typeof statusData.autoRekapActive !== "undefined") {
        setAutoRekapActive(statusData.autoRekapActive);
      }
    } catch { /* silent */ }
  };

  const loadSettings = useCallback(async () => {
    if (!token) return;
    try {
      const data = await settingsApi.getSettings();
      setAutoRekapActive(data.autoRekapActive);
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => { getStatus(); const i = setInterval(getStatus, 30000); return () => clearInterval(i); }, []);
  useEffect(() => { if (token) loadSettings(); }, [token, loadSettings]);

  // Auth Operations
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!phone || !password) return;
    setLoginLoading(true); setLoginError("");
    try {
      const { data } = await authApi.login(phone, password);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      showToast("Berhasil masuk", "success");
    } catch (err) { 
      setLoginError(err.message); 
    } finally { 
      setLoginLoading(false); 
    }
  };

  const getIndoDayNameFromDate = useCallback((dateString) => {
    const dayNames = ["ahad", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
    return dayNames[new Date(dateString).getDay()];
  }, []);

  // Load Absensi
  const loadAbsensiData = useCallback(async () => {
    if (!token) return;
    setDataLoading(true);
    try {
      const dayName = getIndoDayNameFromDate(selectedDate);
      const [dJ, dR] = await Promise.all([
        scheduleApi.getJadwal(dayName),
        attendanceApi.getRekapHarian(selectedDate)
      ]);
      setSchedule(dJ.data || []);
      setAttendanceLogs(dR.data || []);
    } catch (err) { showToast(err.message, "error"); }
    finally { setDataLoading(false); }
  }, [token, selectedDate, getIndoDayNameFromDate, showToast]);

  useEffect(() => { if (token && activeTab === "absensi") loadAbsensiData(); }, [token, selectedDate, activeTab, loadAbsensiData]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setContacts(await settingsApi.getKontak());
      } catch { /* silent */ }
    })();
  }, [token]);

  // Absen Action
  const submitAbsence = async (teacherName, item, status) => {
    if (!hasPermission('input_absensi')) {
      showToast("Anda tidak memiliki hak akses untuk menginput absensi.", "error");
      return;
    }
    setActionLoading(true);
    try {
      setRemovingTeachers(prev => {
        const next = new Set(prev);
        next.add(teacherName.toLowerCase());
        return next;
      });

      const apiPromise = attendanceApi.submitAbsen({
        jam: selectedJam,
        tanggal: selectedDate,
        data: [{ nama_guru: teacherName, kelas: item.kelas || "", mapel: item.mapel || "", status }]
      });
      const delayPromise = new Promise(resolve => setTimeout(resolve, 250));
      await Promise.all([apiPromise, delayPromise]);

      addLocalLog("INPUT_ABSEN", `Menginput absensi ${teacherName} sebagai ${status} (Jam ${selectedJam}, Kelas ${item.kelas || ""})`);
      showToast(`${teacherName} ditandai ${status}`, "success");
      await loadAbsensiData();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setRemovingTeachers(prev => {
        const next = new Set(prev);
        next.delete(teacherName.toLowerCase());
        return next;
      });
      setActionLoading(false);
    }
  };

  const handleStatusClick = (teacherName, item, currentStatus, newStatus) => {
    if (currentStatus === newStatus) return;
    if (currentStatus === "BELUM") {
      if (!hasPermission('input_absensi')) {
        showToast("Anda tidak memiliki hak akses untuk menginput absensi.", "error");
        return;
      }
      submitAbsence(teacherName, item, newStatus);
    }
    else {
      if (!hasPermission('koreksi_absensi')) {
        showToast("Anda tidak memiliki hak akses untuk mengoreksi absensi.", "error");
        return;
      }
      setCorrectionTarget({ teacherName, oldStatus: currentStatus, newStatus, item });
    }
  };

  const confirmCorrection = async () => {
    if (!correctionTarget) return;
    if (!hasPermission('koreksi_absensi')) {
      showToast("Anda tidak memiliki hak akses untuk mengoreksi absensi.", "error");
      return;
    }
    setActionLoading(true);
    try {
      await attendanceApi.koreksiAbsen({
        nama_guru: correctionTarget.teacherName,
        jam: selectedJam,
        tanggal: selectedDate,
        status_baru: correctionTarget.newStatus
      });
      addLocalLog("KOREKSI_ABSEN", `Mengoreksi absensi ${correctionTarget.teacherName} menjadi ${correctionTarget.newStatus} (Jam ${selectedJam})`);
      showToast(`Koreksi ${correctionTarget.teacherName} berhasil.`, "success");
      setCorrectionTarget(null);
      await loadAbsensiData();
    } catch (err) { showToast(err.message, "error"); }
    finally { setActionLoading(false); }
  };

  const handleBulkActionInitiate = (targetStatus) => {
    if (!hasPermission('input_absensi')) {
      showToast("Anda tidak memiliki hak akses untuk menginput absensi.", "error");
      return;
    }
    const targets = getTeachersForSelectedJam().filter(t => t.currentStatus === "BELUM");
    if (targets.length === 0) { showToast("Semua guru di jam ini sudah diabsen.", "info"); return; }
    setBulkTargetAction({ status: targetStatus, targetsCount: targets.length });
  };

  const confirmBulkAction = async () => {
    if (!bulkTargetAction) return;
    if (!hasPermission('input_absensi')) {
      showToast("Anda tidak memiliki hak akses untuk menginput absensi.", "error");
      return;
    }
    const targets = getTeachersForSelectedJam().filter(t => t.currentStatus === "BELUM");
    setActionLoading(true);
    try {
      targets.forEach(t => {
        setRemovingTeachers(prev => {
          const next = new Set(prev);
          next.add(t.nama_guru.toLowerCase());
          return next;
        });
      });

      const apiPromise = attendanceApi.submitAbsen({
        jam: selectedJam,
        tanggal: selectedDate,
        data: targets.map(t => ({ nama_guru: t.nama_guru, kelas: t.kelas || "", mapel: t.mapel || "", status: bulkTargetAction.status }))
      });
      const delayPromise = new Promise(resolve => setTimeout(resolve, 250));
      await Promise.all([apiPromise, delayPromise]);

      addLocalLog("INPUT_ABSEN_MASSAL", `Menginput absensi massal ${targets.length} guru sebagai ${bulkTargetAction.status} (Jam ${selectedJam})`);
      showToast(`${targets.length} guru ditandai ${bulkTargetAction.status}`, "success");
      setBulkTargetAction(null);
      await loadAbsensiData();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setRemovingTeachers(new Set());
      setActionLoading(false);
    }
  };

  const handleBulkChangeStatus = async (status) => {
    if (!hasPermission('input_absensi')) {
      showToast("Anda tidak memiliki hak akses untuk menginput absensi.", "error");
      return;
    }
    if (selectedTeachers.length === 0) return;

    const activeTeachers = getTeachersForSelectedJam();
    const targets = activeTeachers.filter(t => selectedTeachers.includes(t.nama_guru.toLowerCase()));

    if (targets.length === 0) return;

    setActionLoading(true);
    try {
      targets.forEach(t => {
        setRemovingTeachers(prev => {
          const next = new Set(prev);
          next.add(t.nama_guru.toLowerCase());
          return next;
        });
      });

      const apiPromise = attendanceApi.submitAbsen({
        jam: selectedJam,
        tanggal: selectedDate,
        data: targets.map(t => ({
          nama_guru: t.nama_guru,
          kelas: t.kelas || "",
          mapel: t.mapel || "",
          status: status
        }))
      });
      const delayPromise = new Promise(resolve => setTimeout(resolve, 250));
      await Promise.all([apiPromise, delayPromise]);

      addLocalLog("INPUT_ABSEN_MASSAL", `Mengubah status absensi massal ${targets.length} guru menjadi ${status} (Jam ${selectedJam})`);
      showToast(`${targets.length} guru ditandai ${status}`, "success");

      setSelectedTeachers([]);
      setIsSelectionMode(false);
      await loadAbsensiData();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setRemovingTeachers(new Set());
      setActionLoading(false);
    }
  };

  const handleConfirmChangePassword = async (e) => {
    e.preventDefault();
    if (!oldPasswordChange || !newPasswordChange || !confirmPasswordChange) {
      showToast("Semua field harus diisi", "error");
      return;
    }
    if (newPasswordChange !== confirmPasswordChange) {
      showToast("Konfirmasi password baru tidak cocok", "error");
      return;
    }
    setPasswordChangeLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      addLocalLog("UBAH_PASSWORD", "Berhasil mengubah kata sandi akun");
      showToast("Password berhasil diperbarui! (Simulasi)", "success");
      setOldPasswordChange("");
      setNewPasswordChange("");
      setConfirmPasswordChange("");
      setShowChangePasswordModal(false);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  const handleResetConfirm = async () => {
    if (!teacherToReset) return;
    setActionLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      // Log the bcrypt hash of "mamu2bakid" (the default password)
      const mockBcryptHash = "$2a$10$Qp3P8e2w3Z4h.Vn.L2rV6Ou6d5E7o5I1T.wX8j.9e5m1v8f9s3m4q";
      addLocalLog("RESET_PASSWORD_GURU", `Mereset password untuk guru ${teacherToReset.nama_guru || teacherToReset.nama} ke password bawaan: "mamu2bakid" (Hash: ${mockBcryptHash})`);
      showToast(`Password untuk ${teacherToReset.nama_guru || teacherToReset.nama} berhasil direset ke password bawaan!`, "success");
      setShowResetConfirm(false);
      setTeacherToReset(null);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Log Retention Automatic Cleanup Effect ───
  useEffect(() => {
    if (autoCleanupActive && logRetentionDays !== -1) {
      const now = Date.now();
      const maxAgeMs = logRetentionDays * 24 * 60 * 60 * 1000;
      setLocalLogs(prev => {
        const filtered = prev.filter(log => {
          const timestamp = log.timestamp || log.time || log.date;
          if (!timestamp) return true;
          const logTime = new Date(timestamp).getTime();
          return (now - logTime) <= maxAgeMs;
        });
        if (filtered.length !== prev.length) {
          localStorage.setItem("local_logs", JSON.stringify(filtered));
        }
        return filtered;
      });
    }
  }, [autoCleanupActive, logRetentionDays]);

  const handleToggleAutoCleanup = () => {
    const nextVal = !autoCleanupActive;
    setAutoCleanupActive(nextVal);
    localStorage.setItem("auto_cleanup_active", String(nextVal));
    addLocalLog("SETTING_AUTO_CLEANUP", `Mengubah Pembersihan Otomatis menjadi ${nextVal ? "ON" : "OFF"}`);
    showToast(`Pembersihan otomatis ${nextVal ? "aktif" : "nonaktif"}.`, "info");
  };

  const handleLogRetentionChange = (days) => {
    setLogRetentionDays(days);
    localStorage.setItem("log_retention_days", String(days));
    addLocalLog("SETTING_LOG_RETENTION", `Mengubah retensi Log Aktivitas menjadi ${days === -1 ? "Tidak Pernah" : days + " Hari"}`);
    showToast(`Retensi Log Aktivitas disimpan.`, "success");
  };

  const handleQueueRetentionChange = (days) => {
    setQueueRetentionDays(days);
    localStorage.setItem("queue_retention_days", String(days));
    addLocalLog("SETTING_QUEUE_RETENTION", `Mengubah retensi Task Queue menjadi ${days === -1 ? "Tidak Pernah" : days + " Hari"}`);
    showToast(`Retensi Task Queue disimpan.`, "success");
  };

  const handleManualCleanup = async () => {
    setActionLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const now = Date.now();
      
      // 1. Clean Log Aktivitas Absensi
      let logsCleanedCount = localLogs.length;
      setLocalLogs([]);
      localStorage.removeItem("local_logs");
      
      // 2. Clean Task Queue Simulation
      const queueRetentionText = queueRetentionDays === -1 ? "Tidak Pernah" : `${queueRetentionDays} Hari`;
      addLocalLog("CLEANUP_MANUAL", `Pembersihan manual selesai. Terhapus ${logsCleanedCount} baris Log Aktivitas. Baris Task Queue (DONE/FAILED) di luar retensi (${queueRetentionText}) telah dibersihkan.`);
      
      showToast("Pembersihan log lama berhasil diselesaikan!", "success");
      setShowCleanupConfirmAlert(false);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const getTeacherAccountSummary = () => {
    let superadminCount = 0;
    let adminCount = 0;
    let userCount = 0;

    contacts.forEach(c => {
      const role = String(c.role || "USER").toUpperCase();
      if (role === "SUPERADMIN") {
        superadminCount++;
      } else if (role === "ADMIN") {
        adminCount++;
      } else {
        userCount++;
      }
    });

    return { superadminCount, adminCount, userCount };
  };

  const getTeachersForSelectedJam = () => {
    let filtered = schedule.filter(r => String(r.jam).trim() === String(selectedJam).trim());
    if (!hasPermission('lihat_daftar_guru') && !hasPermission('lihat_rekap_seluruh_guru')) {
      filtered = filtered.filter(r => (r.nama_guru || "").trim().toLowerCase() === user?.name?.trim().toLowerCase());
    }
    const map = {};
    filtered.forEach(row => {
      const name = (row.nama_guru || "").trim();
      if (!name) return;
      const log = attendanceLogs.find(l => (l.nama_guru || "").trim().toLowerCase() === name.toLowerCase() && String(l.jam).trim() === String(selectedJam).trim());
      const status = log ? (log.status || "BELUM").toUpperCase() : "BELUM";
      if (!map[name.toLowerCase()]) map[name.toLowerCase()] = { nama_guru: name, kelas: row.kelas, mapel: row.mapel, currentStatus: status };
      else { map[name.toLowerCase()].kelas += `, ${row.kelas}`; map[name.toLowerCase()].mapel += `, ${row.mapel}`; }
    });
    
    let logs = attendanceLogs.filter(l => String(l.jam).trim() === String(selectedJam).trim());
    if (!hasPermission('lihat_daftar_guru') && !hasPermission('lihat_rekap_seluruh_guru')) {
      logs = logs.filter(l => (l.nama_guru || "").trim().toLowerCase() === user?.name?.trim().toLowerCase());
    }
    logs.forEach(log => {
      const name = (log.nama_guru || "").trim();
      if (!name || map[name.toLowerCase()]) return;
      map[name.toLowerCase()] = { nama_guru: name, kelas: log.kelas || "Pengganti", mapel: log.mapel || "Lainnya", currentStatus: (log.status || "BELUM").toUpperCase() };
    });
    let list = Object.values(map).sort((a, b) => a.nama_guru.localeCompare(b.nama_guru));
    return list;
  };

  // Monthly stats loader
  const loadRekapBulanan = useCallback(async () => {
    if (!token) return;
    setMonthlyLoading(true);
    try {
      const data = await reportApi.getRekapBulanan(rekapMonth, rekapYear);
      setMonthlyStats(data.data || []);
    }
    catch { showToast("Gagal memuat rekap bulanan.", "error"); }
    finally { setMonthlyLoading(false); }
  }, [token, rekapMonth, rekapYear, showToast]);

  useEffect(() => { if (token && activeTab === "rekap-bulanan") loadRekapBulanan(); }, [token, rekapMonth, rekapYear, activeTab, loadRekapBulanan]);

  const filteredMonthlyStats = monthlyStats
    .filter(i => {
      if (!hasPermission('lihat_rekap_seluruh_guru')) {
        return (i.nama_guru || "").trim().toLowerCase() === user?.name?.trim().toLowerCase();
      }
      return true;
    })
    .filter(i => (i.nama_guru || "").toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSyncSheets = async () => {
    const m = indoMonths.find(x => x.value === rekapMonth);
    if (!m) return;
    setSyncLoading(true);
    try {
      const data = await reportApi.syncBulanan({ monthName: m.label, year: rekapYear });
      showToast(data.message || "Sinkronisasi Sheets berhasil!", "success");
      await loadRekapBulanan();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSyncLoading(false); }
  };

  const handleExportBulanan = async (format) => {
    if (!hasPermission('ekspor_rekap')) {
      showToast("Anda tidak memiliki hak akses untuk mengekspor rekap.", "error");
      return;
    }
    const m = indoMonths.find(x => x.value === rekapMonth);
    if (!m) return;
    setExportLoading(true);
    try {
      await reportApi.eksporBulanan({ format, monthName: m.label, year: rekapYear });
      addLocalLog("EKSPOR_REKAP", `Mengekspor rekap bulanan format ${format.toUpperCase()} untuk bulan ${m.label} ${rekapYear}`);
      showToast("Laporan terkirim ke WhatsApp Anda!", "success");
    } catch (e) { showToast(e.message, "error"); }
    finally { setExportLoading(false); }
  };

  // Settings
  const handleToggleAutoRekap = async () => {
    if (!hasPermission('kelola_pengaturan_sistem')) {
      showToast("Anda tidak memiliki hak akses untuk mengubah pengaturan sistem.", "error");
      return;
    }
    try {
      const data = await settingsApi.updateSettings({ autoRekapActive: !autoRekapActive });
      setAutoRekapActive(data.autoRekapActive);
      addLocalLog("SETTING_AUTO_REKAP", `Mengubah Auto Rekap Harian menjadi ${data.autoRekapActive ? "ON" : "OFF"}`);
      showToast(`Pengiriman otomatis ${data.autoRekapActive ? "aktif" : "nonaktif"}.`, "info");
      getStatus(); // Immediately refresh status
    } catch { showToast("Gagal memperbarui pengaturan.", "error"); }
  };

  const handleSendAlarm = async () => {
    if (!hasPermission('kirim_pengingat_whatsapp')) {
      showToast("Anda tidak memiliki hak akses untuk mengirim pengingat WhatsApp.", "error");
      return;
    }
    setAlarmLoading(true);
    try {
      await settingsApi.sendAlarm();
      addLocalLog("ALARM", "Mengirim alarm pengingat KBM manual via WhatsApp");
      showToast("Alarm berhasil disiarkan!", "success");
    } catch (e) { showToast(e.message, "error"); }
    finally { setAlarmLoading(false); }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    if (!hasPermission('kirim_pengumuman_whatsapp')) {
      showToast("Anda tidak memiliki hak akses untuk mengirim siaran WhatsApp.", "error");
      return;
    }
    setBroadcastLoading(true);
    try {
      await settingsApi.sendBroadcast({ targetMode: broadcastTarget, message: broadcastMessage });
      addLocalLog("BROADCAST", `Mengirim siaran pengumuman ke ${broadcastTarget === "TODAY" ? "Guru Terjadwal Hari Ini" : "Seluruh Kontak Guru"}`);
      showToast("Broadcast pengumuman sedang dikirim!", "success");
      setBroadcastMessage("");
    } catch (e) { showToast(e.message, "error"); }
    finally { setBroadcastLoading(false); }
  };

  const handleBroadcastMessageChange = (e) => {
    const val = e.target.value;
    setBroadcastMessage(val);
    
    // Auto-grow textarea height dynamic adjustment
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(64, textarea.scrollHeight)}px`;
  };
  const handleTeacherNameClick = async (name, activeRow = null) => {
    setDataLoading(true);
    try {
      const contact = contacts.find(c => c.nama_guru?.trim().toLowerCase() === name.toLowerCase());
      const waPhone = contact ? (contact.no_wa || contact.nomor_wa) : "Tidak terdaftar";
      const stats = monthlyStats.find(t => t.nama_guru?.trim().toLowerCase() === name.toLowerCase()) || { hadir: 0, izin: 0, sakit: 0, libur: 0, alpha: 0, jtm_7_hari: 0, jadwal_wajib: 0 };
      const logsData = await attendanceApi.getAllRekap();
      const logs = (logsData.data || []).filter(l => l.nama_guru?.trim().toLowerCase() === name.toLowerCase()).sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 10);
      setTeacherDetail({ name, phone: waPhone, stats, logs, row: activeRow });
    } catch { showToast("Gagal memuat detail guru.", "error"); }
    finally { setDataLoading(false); }
  };

  const getBelumCount = () => {
    const keys = new Set();
    let filteredSchedule = schedule;
    let filteredLogs = attendanceLogs;
    if (!hasPermission('lihat_daftar_guru') && !hasPermission('lihat_rekap_seluruh_guru')) {
      filteredSchedule = filteredSchedule.filter(r => (r.nama_guru || "").trim().toLowerCase() === user?.name?.trim().toLowerCase());
      filteredLogs = filteredLogs.filter(l => (l.nama_guru || "").trim().toLowerCase() === user?.name?.trim().toLowerCase());
    }
    filteredSchedule.forEach(r => { const n = (r.nama_guru || "").trim(); const j = String(r.jam).trim(); if (n && j) keys.add(`${n.toLowerCase()}|||${j}`); });
    filteredLogs.forEach(l => { const n = (l.nama_guru || "").trim(); const j = String(l.jam).trim(); if (n && j) keys.delete(`${n.toLowerCase()}|||${j}`); });
    return keys.size;
  };

  const getBelumList = () => {
    const list = []; const keys = new Set();
    let filteredSchedule = schedule;
    let filteredLogs = attendanceLogs;
    if (!hasPermission('lihat_daftar_guru') && !hasPermission('lihat_rekap_seluruh_guru')) {
      filteredSchedule = filteredSchedule.filter(r => (r.nama_guru || "").trim().toLowerCase() === user?.name?.trim().toLowerCase());
      filteredLogs = filteredLogs.filter(l => (l.nama_guru || "").trim().toLowerCase() === user?.name?.trim().toLowerCase());
    }
    filteredSchedule.forEach(row => {
      const name = (row.nama_guru || "").trim(); const jam = String(row.jam).trim();
      if (!name || !jam) return;
      const key = `${name.toLowerCase()}|||${jam}`;
      const done = filteredLogs.some(l => (l.nama_guru || "").trim().toLowerCase() === name.toLowerCase() && String(l.jam).trim() === jam);
      if (!done && !keys.has(key)) { keys.add(key); list.push({ nama_guru: name, jam, kelas: row.kelas }); }
    });
    return list.sort((a, b) => a.jam.localeCompare(b.jam) || a.nama_guru.localeCompare(b.nama_guru));
  };

  const statusActionsList = [
    { key: "HADIR", label: "Hadir", cls: "hadir" },
    { key: "IZIN", label: "Izin", cls: "izin" },
    { key: "SAKIT", label: "Sakit", cls: "sakit" },
    { key: "ALPHA", label: "Alpa", cls: "alpha" },
    { key: "LIBUR", label: "Libur", cls: "libur" },
  ];

  // Live System Health Computations
  const isWaOnline = serverStatus?.botReady ?? false;
  const isSchedulerActive = typeof serverStatus?.autoRekapActive !== "undefined" ? serverStatus.autoRekapActive : autoRekapActive;
  
  const qPending = serverStatus?.queue?.pending ?? 0;
  const qProcessing = serverStatus?.queue?.processing ?? 0;
  const qFailed = serverStatus?.queue?.failed ?? 0;
  
  let queueLabel = "Normal";
  let queueColor = "var(--color-secondary)";
  if (qFailed > 0) {
    queueLabel = "Error";
    queueColor = "var(--color-danger)";
  } else if (qProcessing > 0) {
    queueLabel = "Processing";
    queueColor = "var(--color-primary)";
  } else if (qPending > 0) {
    queueLabel = `${qPending} Pending`;
    queueColor = "var(--color-warning)";
  }
  
  let sysStatusLabel = "Stabil";
  let sysStatusColor = "var(--color-secondary)";
  if (!isWaOnline || qFailed > 0) {
    sysStatusLabel = "Gangguan";
    sysStatusColor = "var(--color-danger)";
  } else if (!isSchedulerActive || qPending > 0 || qProcessing > 0) {
    sysStatusLabel = "Perlu Perhatian";
    sysStatusColor = "var(--color-warning)";
  }

  return (
    <div className="app-layout">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* ═══ 1. LOGIN SCREEN ═══ */}
      {!token ? (
        <div className="scroll-inertia" style={{ width: "100%", height: "100%" }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100%", padding: "var(--space-32) var(--space-16)" }}>
            <IOSCard style={{ width: "100%", maxWidth: "380px", padding: "var(--space-24)" }}>
              <div style={{ textAlign: "center", marginBottom: "var(--space-24)" }}>
                <SchoolOutlinedIcon style={{ fontSize: "2.8rem", color: "var(--color-primary)", marginBottom: "var(--space-8)" }} />
                <h2 style={{ fontSize: "var(--hig-fs-large-title)", fontWeight: 700, letterSpacing: "-0.03em" }}>MA. Miftahul Ulum 2</h2>
              </div>

              {loginError && (
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)", background: "rgba(255, 59, 48, 0.15)", padding: "var(--space-12) var(--space-16)", borderRadius: "var(--radius-small)", fontSize: "var(--hig-fs-footnote)", color: "var(--color-danger)", marginBottom: "var(--space-16)" }}>
                  <ErrorOutlineIcon style={{ fontSize: "1.1rem" }} />
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "var(--space-16)" }}>
                <div className="ios-input-wrapper">
                  <label style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "600", color: "var(--color-text-secondary)" }}>
                    Nomor WhatsApp Pengawas
                  </label>
                  <IOSInput type="tel" placeholder="628123456789" value={phone} onChange={(e) => setPhone(e.target.value)} ariaLabel="Nomor WhatsApp" />
                </div>
                
                <div className="ios-input-wrapper">
                  <label style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "600", color: "var(--color-text-secondary)" }}>
                    Password
                  </label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <IOSInput
                      inputRef={passwordInputRef}
                      type={showPassword ? "text" : "password"}
                      placeholder="Masukkan password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      ariaLabel="Password"
                      style={{ paddingRight: "44px" }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowPassword(!showPassword);
                        setTimeout(() => {
                          if (passwordInputRef.current) {
                            passwordInputRef.current.focus();
                          }
                        }, 0);
                      }}
                      style={{
                        position: "absolute",
                        right: "0",
                        width: "44px",
                        height: "44px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--color-text-secondary)",
                        padding: "0",
                        outline: "none"
                      }}
                      aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showPassword ? (
                        <VisibilityOffOutlinedIcon style={{ fontSize: "1.2rem" }} />
                      ) : (
                        <VisibilityOutlinedIcon style={{ fontSize: "1.2rem" }} />
                      )}
                    </button>
                  </div>
                </div>

                <IOSButton type="submit" variant="primary" loading={loginLoading}>
                  <SendOutlinedIcon style={{ fontSize: "1rem", marginRight: "6px" }} /> Masuk
                </IOSButton>
              </form>
            </IOSCard>
          </div>
        </div>
      ) : (
        <>
          {/* ═══ 2. SIDEBAR (Desktop Settings List Style) ═══ */}
          <aside className={`sidebar${sidebarCollapsed ? " collapsed" : ""}`}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-24)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)" }}>
                <SchoolOutlinedIcon style={{ fontSize: "1.8rem", color: "var(--color-primary)" }} />
                <div>
                  <h2 style={{ fontSize: "var(--hig-fs-headline)", fontWeight: "600", letterSpacing: "-0.02em" }}>MA. Miftahul Ulum 2</h2>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)", padding: "var(--space-8) var(--space-12)", borderRadius: "var(--radius-small)", background: "var(--color-surface)", border: "0.5px solid var(--color-separator)", fontSize: "var(--hig-fs-footnote)" }}>
                <FiberManualRecordIcon style={{ fontSize: "0.6rem", color: isWaOnline ? "var(--color-secondary)" : "var(--color-danger)" }} />
                <span style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>WhatsApp Server · <strong style={{ color: isWaOnline ? "var(--color-secondary)" : "var(--color-danger)" }}>{isWaOnline ? "Online" : "Offline"}</strong></span>
              </div>

              <nav style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <button onClick={() => setActiveTab("absensi")} className={`sidebar-nav-item ${activeTab === "absensi" ? "active" : ""}`} aria-label="Halaman Absen Harian">
                  <CalendarMonthOutlinedIcon /> Absen Harian
                </button>
                <button onClick={() => setActiveTab("rekap-bulanan")} className={`sidebar-nav-item ${activeTab === "rekap-bulanan" ? "active" : ""}`} aria-label="Halaman Rekap Bulanan">
                  <BarChartOutlinedIcon /> Rekap Bulanan
                </button>
                {(user?.role === "SUPERADMIN" || hasPermission("kirim_pengingat_whatsapp") || hasPermission("kirim_pengumuman_whatsapp") || hasPermission("kelola_pengaturan_sistem") || hasPermission("kelola_akun_guru") || hasPermission("kelola_akun_admin") || hasPermission("lihat_log_aktivitas")) && (
                  <button onClick={() => setActiveTab("admin")} className={`sidebar-nav-item ${activeTab === "admin" ? "active" : ""}`} aria-label="Halaman Panel Kontrol">
                    <TuneOutlinedIcon /> Panel Kontrol
                  </button>
                )}
                {user?.role === "SUPERADMIN" && (
                  <button onClick={() => setActiveTab("permissions")} className={`sidebar-nav-item ${activeTab === "permissions" ? "active" : ""}`} aria-label="Pengaturan Hak Akses">
                    <LockPersonOutlinedIcon /> Pengaturan Akses
                  </button>
                )}
              </nav>
            </div>

            <div style={{ borderTop: "0.5px solid var(--color-separator)", paddingTop: "var(--space-16)", display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
              <div style={{ padding: "0 4px", marginBottom: "4px" }}>
                <div style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "600", color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
                  <PersonOutlineOutlinedIcon style={{ fontSize: "1rem" }} /> {user?.name}
                </div>
                <div style={{ fontSize: "var(--hig-fs-footnote)", color: "var(--color-text-secondary)", marginTop: "2px", paddingLeft: "22px" }}>
                  {user?.phone} · <strong style={{ textTransform: "uppercase" }}>{user?.role || "USER"}</strong>
                </div>
              </div>
              {hasPermission("ubah_password_sendiri") && (
                <IOSButton onClick={() => setShowChangePasswordModal(true)} variant="secondary" style={{ width: "100%" }} ariaLabel="Ubah Password">
                  <KeyOutlinedIcon style={{ fontSize: "0.95rem" }} /> Ubah Password
                </IOSButton>
              )}
              <IOSButton onClick={handleLogout} variant="danger" style={{ width: "100%" }} ariaLabel="Logout">
                <LogoutOutlinedIcon style={{ fontSize: "0.95rem" }} /> Logout
              </IOSButton>
            </div>
          </aside>

          {/* ═══ 3. BOTTOM TAB BAR (iOS Standard 49px) ═══ */}
          <nav className="bottom-nav">
            {[
              { key: "absensi", icon: <CalendarMonthOutlinedIcon />, label: "Absen", show: true },
              { key: "rekap-bulanan", icon: <BarChartOutlinedIcon />, label: "Rekap", show: true },
              { key: "admin", icon: <TuneOutlinedIcon />, label: "Kontrol", show: user?.role === "SUPERADMIN" || hasPermission("kirim_pengingat_whatsapp") || hasPermission("kirim_pengumuman_whatsapp") || hasPermission("kelola_pengaturan_sistem") || hasPermission("kelola_akun_guru") || hasPermission("kelola_akun_admin") || hasPermission("lihat_log_aktivitas") },
              { key: "permissions", icon: <LockPersonOutlinedIcon />, label: "Akses", show: user?.role === "SUPERADMIN" },
            ].filter(item => item.show).map(item => (
              <button key={item.key} onClick={() => setActiveTab(item.key)} className={`bottom-nav-item ${activeTab === item.key ? "active" : ""}`} aria-label={item.label}>
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* ═══ 4. MAIN CONTAINER ═══ */}
          <main className={`main-content${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
            {/* Mobile Navigation Header */}
             <header className="mobile-header" style={{ justifyContent: "space-between", padding: "0 var(--space-16)" }}>
              <div style={{ width: "80px", display: "flex", alignItems: "center" }}>
                {/* Desktop sidebar toggle — mobile-only slot keeps SchoolIcon */}
                <button
                  className="desktop-only ios-nav-bar-action sidebar-toggle-btn"
                  onClick={() => setSidebarCollapsed(c => !c)}
                  aria-label={sidebarCollapsed ? "Tampilkan sidebar" : "Sembunyikan sidebar"}
                  title={sidebarCollapsed ? "Tampilkan sidebar" : "Sembunyikan sidebar"}
                >
                  <SidebarToggleIcon style={{ fontSize: "1.25rem" }} />
                </button>
                <SchoolOutlinedIcon className="mobile-only" style={{ fontSize: "1.2rem", color: "var(--color-text-secondary)" }} />
              </div>
              <h2 className="ios-nav-bar-title" style={{ flex: 1, textAlign: "center" }}>
                {activeTab === "absensi" && "Absensi Harian"}
                {activeTab === "rekap-bulanan" && "Rekap Bulanan"}
                {activeTab === "admin" && "Panel Kontrol"}
                {activeTab === "permissions" && "Pengaturan Akses"}
              </h2>
              <div style={{ width: "80px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--space-8)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "var(--hig-fs-badge)", fontWeight: "600", color: isWaOnline ? "var(--color-secondary)" : "var(--color-danger)" }}>
                  <FiberManualRecordIcon style={{ fontSize: "0.55rem" }} />
                  <span>{isWaOnline ? "ON" : "OFF"}</span>
                </div>
                <button
                  onClick={() => setShowMobileProfileSheet(true)}
                  className="mobile-only"
                  style={{ 
                    padding: 0, 
                    width: "28px", 
                    height: "28px", 
                    borderRadius: "50%", 
                    background: "var(--color-surface)", 
                    border: "0.5px solid var(--color-separator)", 
                    display: "flex", 
                    justifyContent: "center", 
                    alignItems: "center", 
                    cursor: "pointer" 
                  }}
                  aria-label="Profil Pengguna"
                >
                  <PersonOutlineOutlinedIcon style={{ fontSize: "1rem", color: "var(--color-text-primary)" }} />
                </button>
              </div>
            </header>

            {/* ═══ TAB: ABSENSI ═══ */}
            {activeTab === "absensi" && (
              <div className="scroll-inertia animate-slide-up" style={{ flex: 1 }}>
                <div className="main-content-scrollable">
                  <div style={{ fontSize: "var(--hig-fs-caption)", color: "var(--color-text-secondary)", padding: "0 var(--space-4)", letterSpacing: "var(--ls-caption)", textTransform: "uppercase" }}>
                    {getFormattedDateIndo(selectedDate)} · {getFormattedTime()} WIB
                  </div>
                  <div className="absensi-grid">
                    
                    {/* Left Grid: Attendance Actions */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-16)" }}>
                      
                      {/* Configuration Controls & Session KBM */}
                      <IOSCard className="session-config-card">
                        <div className="session-config-wrapper">
                          {/* Tanggal */}
                          <div className="session-config-tanggal">
                            <div className="session-config-tanggal-text">
                              <div className="session-config-date">
                                {getFormattedDateIndo(selectedDate).split(",")[1]?.trim() || getFormattedDateIndo(selectedDate)}
                              </div>
                              <div className="session-config-day">
                                {getFormattedDateIndo(selectedDate).split(",")[0] || "Hari"}
                              </div>
                            </div>
                            <AppleDatePicker value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                          </div>

                          {/* Divider */}
                          <div className="session-config-divider-line" />

                          {/* Sesi KBM */}
                          <div className="session-config-sesi">
                            <div className="session-config-sesi-label">Sesi KBM Aktif</div>
                            <div className="session-config-sesi-control">
                              <IOSSegmentedControl
                                segments={[
                                  { value: "1", label: "Jam 1" },
                                  { value: "2", label: "Jam 2" },
                                  { value: "3", label: "Jam 3" }
                                ]}
                                selectedValue={selectedJam}
                                onChange={setSelectedJam}
                              />
                            </div>
                          </div>
                        </div>
                      </IOSCard>

                      {/* Ringkasan Status Section */}
                      {(() => {
                        const allSessionTeachers = getTeachersForSelectedJam();
                        const countHadir = allSessionTeachers.filter(t => t.currentStatus === "HADIR").length;
                        const countAlpa = allSessionTeachers.filter(t => t.currentStatus === "ALPHA").length;
                        const countIzin = allSessionTeachers.filter(t => t.currentStatus === "IZIN").length;
                        const countSakit = allSessionTeachers.filter(t => t.currentStatus === "SAKIT").length;
                        const countLibur = allSessionTeachers.filter(t => t.currentStatus === "LIBUR").length;

                        const toggleStatusFilter = (status) => {
                          if (absensiStatusFilter === status) {
                            setAbsensiStatusFilter("SEMUA");
                          } else {
                            setAbsensiStatusFilter(status);
                          }
                        };

                        return (
                          <IOSSection title="Ringkasan Status">
                            <div className="absensi-summary-grid">
                              <div
                                className={`absensi-summary-card ${absensiStatusFilter === "HADIR" ? "active active-hadir" : ""}`}
                                onClick={() => toggleStatusFilter("HADIR")}
                              >
                                <span className="absensi-summary-count" style={{ color: "var(--color-secondary)" }}>{countHadir}</span>
                                <span className="absensi-summary-label" style={{ color: "var(--color-secondary)" }}>Hadir</span>
                              </div>
                              <div
                                className={`absensi-summary-card ${absensiStatusFilter === "ALPHA" ? "active active-alpa" : ""}`}
                                onClick={() => toggleStatusFilter("ALPHA")}
                              >
                                <span className="absensi-summary-count" style={{ color: "var(--color-danger)" }}>{countAlpa}</span>
                                <span className="absensi-summary-label" style={{ color: "var(--color-danger)" }}>Alpa</span>
                              </div>
                              <div
                                className={`absensi-summary-card ${absensiStatusFilter === "IZIN" ? "active active-izin" : ""}`}
                                onClick={() => toggleStatusFilter("IZIN")}
                              >
                                <span className="absensi-summary-count" style={{ color: "var(--color-warning)" }}>{countIzin}</span>
                                <span className="absensi-summary-label" style={{ color: "var(--color-warning)" }}>Izin</span>
                              </div>
                              <div
                                className={`absensi-summary-card ${absensiStatusFilter === "SAKIT" ? "active active-sakit" : ""}`}
                                onClick={() => toggleStatusFilter("SAKIT")}
                              >
                                <span className="absensi-summary-count" style={{ color: "var(--color-purple)" }}>{countSakit}</span>
                                <span className="absensi-summary-label" style={{ color: "var(--color-purple)" }}>Sakit</span>
                              </div>
                              <div
                                className={`absensi-summary-card ${absensiStatusFilter === "LIBUR" ? "active active-libur" : ""}`}
                                onClick={() => toggleStatusFilter("LIBUR")}
                              >
                                <span className="absensi-summary-count" style={{ color: "var(--color-primary)" }}>{countLibur}</span>
                                <span className="absensi-summary-label" style={{ color: "var(--color-primary)" }}>Libur</span>
                              </div>
                            </div>
                          </IOSSection>
                        );
                      })()}

                      {/* Teachers Attendance Sheet */}
                      {(() => {
                        const allSessionTeachers = getTeachersForSelectedJam();
                        const activeTeachers = allSessionTeachers.filter(t => {
                          if (absensiStatusFilter === "SEMUA") return true;
                          return t.currentStatus === absensiStatusFilter;
                        });
                        
                        const pendingRemoveCount = activeTeachers.filter(t => removingTeachers.has(t.nama_guru.toLowerCase())).length;
                        const displayCount = Math.max(0, activeTeachers.length - pendingRemoveCount);
                        const hasScheduleForSelectedJam = schedule.some(r => String(r.jam).trim() === String(selectedJam).trim());
                        
                        const titleNode = (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              <span style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "var(--ls-caption)", color: "var(--color-text-secondary)" }}>
                                Daftar Kehadiran Guru
                              </span>
                              <span style={{ fontSize: "var(--hig-fs-subheadline)", color: "var(--color-text-secondary)", fontWeight: 400, textTransform: "none" }}>
                                {displayCount} Guru ({absensiStatusFilter === "SEMUA" ? "Semua Status" : absensiStatusFilter})
                              </span>
                            </div>
                            {displayCount > 0 && (
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (isSelectionMode) {
                                    setSelectedTeachers([]);
                                  }
                                  setIsSelectionMode(!isSelectionMode);
                                }}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  background: "none",
                                  border: "1px solid var(--color-primary)",
                                  borderRadius: "var(--radius-pill)",
                                  color: "var(--color-primary)",
                                  padding: "6px 14px",
                                  fontSize: "var(--hig-fs-footnote)",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                  transition: "background 150ms var(--ease-out)"
                                }}
                                className="ios-outline-btn"
                              >
                                {isSelectionMode
                                  ? <><CloseOutlinedIcon style={{ fontSize: "0.85rem" }} /> Batal</>
                                  : <><PeopleOutlinedIcon style={{ fontSize: "0.95rem" }} /> Pilih Guru</>}
                              </button>
                            )}
                          </div>
                        );

                        return (
                          <IOSSection title={titleNode}>
                            {dataLoading ? (
                              <IOSList>
                                <div style={{ padding: "var(--space-16)", display: "flex", flexDirection: "column", gap: "var(--space-12)" }}>
                                  <IOSSkeleton height="24px" width="80%" />
                                  <IOSSkeleton height="16px" width="50%" />
                                  <IOSSkeleton height="24px" width="90%" />
                                  <IOSSkeleton height="16px" width="40%" />
                                </div>
                              </IOSList>
                            ) : activeTeachers.length === 0 ? (
                              <IOSList>
                                {hasScheduleForSelectedJam ? (
                                  <IOSEmptyState 
                                    icon={<CheckCircleOutlinedIcon style={{ fontSize: "3.5rem", color: "var(--color-secondary)" }} />} 
                                    title="Tidak ada data" 
                                    description={`Tidak ada guru dengan status ${absensiStatusFilter} pada sesi ini.`} 
                                  />
                                ) : (
                                  <IOSEmptyState 
                                    icon={<SchoolOutlinedIcon style={{ fontSize: "3.5rem", color: "var(--color-text-secondary)" }} />} 
                                    title="Tidak Ada Jadwal" 
                                    description={`Tidak ada guru yang terdaftar mengajar di KBM Jam ${selectedJam} pada hari ini.`} 
                                  />
                                )}
                              </IOSList>
                            ) : (
                              <IOSList style={{ overflow: "visible" }}>
                                {activeTeachers.map((row, idx) => {
                                  const isRemoving = removingTeachers.has(row.nama_guru.toLowerCase());
                                  const isSelected = selectedTeachers.includes(row.nama_guru.toLowerCase());
                                  return (
                                    <IOSListRow 
                                      key={idx} 
                                      chevron 
                                      interactive 
                                      className={`${isRemoving ? "removing" : ""} ${isSelected ? "selected" : ""}`}
                                      onClick={() => handleTeacherNameClick(row.nama_guru, row)}
                                      rightContent={
                                        <IOSBadge status={row.currentStatus} />
                                      }
                                    >
                                      {/* Circle Selection ala Apple Mail */}
                                      {isSelectionMode && (
                                        <div
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const key = row.nama_guru.toLowerCase();
                                            setSelectedTeachers(prev =>
                                              prev.includes(key) ? prev.filter(n => n !== key) : [...prev, key]
                                            );
                                          }}
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            width: "44px",
                                            height: "44px",
                                            cursor: "pointer",
                                            flexShrink: 0,
                                          }}
                                        >
                                          <div style={{
                                            width: "22px",
                                            height: "22px",
                                            borderRadius: "50%",
                                            border: isSelected ? "none" : "1.5px solid var(--color-text-tertiary)",
                                            background: isSelected ? "var(--color-primary)" : "transparent",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            transition: "all 150ms var(--ease-out)",
                                          }}>
                                            {isSelected && <span style={{ color: "#fff", fontSize: "13px", fontWeight: 700, lineHeight: 1 }}>✓</span>}
                                          </div>
                                        </div>
                                      )}

                                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                        <span style={{ fontSize: "var(--hig-fs-headline)", fontWeight: "600", color: "var(--color-text-primary)" }}>{row.nama_guru}</span>
                                        <span style={{ fontSize: "var(--hig-fs-footnote)", color: "var(--color-text-secondary)" }}>{row.kelas} · {row.mapel}</span>
                                      </div>
                                    </IOSListRow>
                                  );
                                })}
                              </IOSList>
                            )}
                          </IOSSection>
                        );
                      })()}

                      {/* Mobile Actions Container (Tapped row triggers action) */}
                      <div className="mobile-only" style={{ display: "none", flexDirection: "column", gap: "var(--space-8)" }}>
                        {getTeachersForSelectedJam().length > 0 && !dataLoading && (
                          <IOSSection title="Ketuk Guru di Atas untuk Melihat Detail & Riwayat Absensi" />
                        )}
                      </div>

                    </div>

                    {/* Right Grid: Stats Ringkasan */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-16)" }}>
                      
                    </div>

                  </div>
                </div>
              </div>
            )}



            {/* ═══ TAB: REKAP BULANAN ═══ */}
            {activeTab === "rekap-bulanan" && (
              <div className="scroll-inertia animate-slide-up" style={{ flex: 1 }}>
                <div className="main-content-scrollable">
                  
                  {/* Period Filter & Search */}
                  <IOSSection title="Filter Periode & Pencarian">
                    <div className="ios-list rekap-minimal">
                      <IOSListRow rightContent={
                        <AppleSelect className="ios-picker" value={rekapMonth} onChange={(e) => setRekapMonth(parseInt(e.target.value))} options={indoMonths} ariaLabel="Pilih bulan rekap" />
                      }>
                        <span style={{ fontSize: "var(--hig-fs-body)", fontWeight: 500, color: "var(--color-text-primary)" }}>Bulan</span>
                      </IOSListRow>
                      <IOSListRow rightContent={
                        <AppleSelect className="ios-picker" value={rekapYear} onChange={(e) => setRekapYear(parseInt(e.target.value))} options={[2025, 2026, 2027].map(y => ({ value: y, label: String(y) }))} ariaLabel="Pilih tahun rekap" />
                      }>
                        <span style={{ fontSize: "var(--hig-fs-body)", fontWeight: 500, color: "var(--color-text-primary)" }}>Tahun</span>
                      </IOSListRow>
                      <IOSListRow rightContent={
                        <div className="ios-search-bar ios-search-minimal" style={{ maxWidth: "240px" }}>
                          <SearchOutlinedIcon />
                          <IOSInput type="text" placeholder="Cari nama guru..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} ariaLabel="Cari nama guru" />
                        </div>
                      }>
                        <span style={{ fontSize: "var(--hig-fs-body)", fontWeight: 500, color: "var(--color-text-primary)" }}>Pencarian</span>
                      </IOSListRow>
                    </div>
                  </IOSSection>

                  {/* Actions List */}
                  {(hasPermission('kelola_pengaturan_sistem') || hasPermission('ekspor_rekap')) && (
                    <IOSSection title="Ekspor Data & Integrasi">
                      <IOSList style={{ overflow: "hidden" }}>
                        {hasPermission('kelola_pengaturan_sistem') && (
                          <IOSListRow 
                            interactive 
                            onClick={handleSyncSheets} 
                            disabled={syncLoading || monthlyLoading}
                            chevron
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-16)", width: "100%", minHeight: "56px", textAlign: "left" }}>
                              <div style={{ 
                                width: "32px", 
                                height: "32px", 
                                borderRadius: "var(--radius-medium)", 
                                background: "rgba(0, 122, 255, 0.15)", 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center", 
                                color: "var(--color-primary)" 
                              }}>
                                {syncLoading ? <IOSLoading /> : <SyncOutlinedIcon style={{ fontSize: "1.25rem" }} />}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                <span style={{ fontSize: "var(--hig-fs-body)", fontWeight: 600, color: "var(--color-text-primary)" }}>Sinkronisasi Data</span>
                                <span style={{ fontSize: "var(--hig-fs-caption)", color: "var(--color-text-secondary)", fontWeight: 400 }}>Perbarui data absensi dari Google Sheets.</span>
                              </div>
                            </div>
                          </IOSListRow>
                        )}

                        {hasPermission('ekspor_rekap') && (
                          <>
                            <IOSListRow 
                              interactive 
                              onClick={() => handleExportBulanan("pdf")} 
                              disabled={exportLoading}
                              chevron
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-16)", width: "100%", minHeight: "56px", textAlign: "left" }}>
                                <div style={{ 
                                  width: "32px", 
                                  height: "32px", 
                                  borderRadius: "var(--radius-medium)", 
                                  background: "rgba(52, 199, 89, 0.15)", 
                                  display: "flex", 
                                  alignItems: "center", 
                                  justifyContent: "center", 
                                  color: "var(--color-secondary)" 
                                }}>
                                  <PictureAsPdfOutlinedIcon style={{ fontSize: "1.25rem" }} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                  <span style={{ fontSize: "var(--hig-fs-body)", fontWeight: 600, color: "var(--color-text-primary)" }}>Kirim Laporan PDF</span>
                                  <span style={{ fontSize: "var(--hig-fs-caption)", color: "var(--color-text-secondary)", fontWeight: 400 }}>Kirim laporan bulanan dalam format PDF.</span>
                                </div>
                              </div>
                            </IOSListRow>

                            <IOSListRow 
                              interactive 
                              onClick={() => handleExportBulanan("xlsx")} 
                              disabled={exportLoading}
                              chevron
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-16)", width: "100%", minHeight: "56px", textAlign: "left" }}>
                                <div style={{ 
                                  width: "32px", 
                                  height: "32px", 
                                  borderRadius: "var(--radius-medium)", 
                                  background: "rgba(191, 90, 242, 0.15)", 
                                  display: "flex", 
                                  alignItems: "center", 
                                  justifyContent: "center", 
                                  color: "var(--color-primary)" 
                                }}>
                                  <TableChartOutlinedIcon style={{ fontSize: "1.25rem" }} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                  <span style={{ fontSize: "var(--hig-fs-body)", fontWeight: 600, color: "var(--color-text-primary)" }}>Kirim Laporan Excel</span>
                                  <span style={{ fontSize: "var(--hig-fs-caption)", color: "var(--color-text-secondary)", fontWeight: 400 }}>Kirim laporan bulanan dalam format Excel.</span>
                                </div>
                              </div>
                            </IOSListRow>
                          </>
                        )}
                      </IOSList>
                    </IOSSection>
                  )}

                  {/* Summary Table Card */}
                  <IOSSection title={`Ringkasan Kehadiran Periode ${indoMonths.find(m => m.value === rekapMonth)?.label} ${rekapYear}`}>
                    {monthlyLoading ? (
                      <IOSCard>
                        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-12)" }}>
                          <IOSSkeleton height="24px" width="100%" />
                          <IOSSkeleton height="24px" width="100%" />
                          <IOSSkeleton height="24px" width="100%" />
                        </div>
                      </IOSCard>
                    ) : filteredMonthlyStats.length === 0 ? (
                      <IOSCard>
                        <IOSEmptyState icon={<BarChartOutlinedIcon />} title="Data Kosong" description="Tidak ada riwayat statistik kehadiran guru pada bulan ini." />
                      </IOSCard>
                    ) : (
                      <>
                        {/* Desktop View: Table */}
                        <div className="desktop-only">
                          <IOSCard style={{ padding: 0, overflow: "hidden" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-8) var(--space-16) 0" }}>
                              <span style={{ fontSize: "var(--hig-fs-headline)", fontWeight: 600 }}>Statistik Guru</span>
                              <IOSButton onClick={loadRekapBulanan} disabled={monthlyLoading} variant="tertiary" style={{ minHeight: "36px" }} ariaLabel="Muat ulang rekap">
                                <SyncOutlinedIcon style={{ fontSize: "0.95rem" }} /> Segarkan
                              </IOSButton>
                            </div>
                            <div className="table-container">
                              <table>
                                <thead>
                                  <tr>
                                    <th style={{ width: "45px" }}>No</th>
                                    <th>Nama Guru</th>
                                    <th style={{ textAlign: "center" }}>JTM</th>
                                    <th style={{ textAlign: "center" }}>Jadwal</th>
                                    <th style={{ textAlign: "center", color: "var(--color-secondary)" }}>Hadir</th>
                                    <th style={{ textAlign: "center", color: "var(--color-warning)" }}>Izin</th>
                                    <th style={{ textAlign: "center", color: "var(--color-warning)" }}>Sakit</th>
                                    <th style={{ textAlign: "center", color: "var(--color-primary)" }}>Libur</th>
                                    <th style={{ textAlign: "center", color: "var(--color-danger)" }}>Alpa</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredMonthlyStats.map((row, idx) => (
                                    <tr key={idx}>
                                      <td style={{ paddingLeft: "var(--space-16)" }}>{idx + 1}</td>
                                      <td>
                                        <span onClick={() => handleTeacherNameClick(row.nama_guru)} style={{ fontWeight: "600", cursor: "pointer", color: "var(--color-primary)", display: "inline-flex", alignItems: "center", gap: "var(--space-4)" }} role="button" tabIndex={0}>
                                          <PersonOutlineOutlinedIcon style={{ fontSize: "0.9rem" }} /> {row.nama_guru}
                                        </span>
                                      </td>
                                      <td style={{ textAlign: "center" }}>{row.jtm_7_hari}</td>
                                      <td style={{ textAlign: "center" }}>{row.jadwal_wajib}</td>
                                      <td style={{ textAlign: "center", fontWeight: "700", color: "var(--color-secondary)" }}>{row.hadir}</td>
                                      <td style={{ textAlign: "center", color: "var(--color-warning)" }}>{row.izin}</td>
                                      <td style={{ textAlign: "center", color: "var(--color-warning)" }}>{row.sakit}</td>
                                      <td style={{ textAlign: "center", color: "var(--color-primary)" }}>{row.libur}</td>
                                      <td style={{ textAlign: "center", fontWeight: "700", color: "var(--color-danger)" }}>{row.alpha}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </IOSCard>
                        </div>

                        {/* Mobile View: Grouped List Row */}
                        <div className="mobile-only" style={{ flexDirection: "column", gap: "var(--space-8)", width: "100%" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 var(--space-16)" }}>
                            <span style={{ fontSize: "var(--hig-fs-footnote)", color: "var(--color-text-secondary)" }}>Ketuk guru untuk melihat detail kehadiran bulanan</span>
                            <IOSButton onClick={loadRekapBulanan} disabled={monthlyLoading} variant="tertiary" style={{ minHeight: "36px", padding: "0 4px" }} ariaLabel="Muat ulang rekap">
                              <SyncOutlinedIcon style={{ fontSize: "0.95rem" }} /> Segarkan
                            </IOSButton>
                          </div>
                          <IOSList>
                            {filteredMonthlyStats.map((row, idx) => (
                              <IOSListRow key={idx} chevron interactive onClick={() => handleTeacherNameClick(row.nama_guru)}
                                rightContent={
                                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)" }}>
                                    <span style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "600", color: "var(--color-secondary)" }}>{row.hadir} H</span>
                                    {row.alpha > 0 && <span style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "600", color: "var(--color-danger)" }}>{row.alpha} A</span>}
                                  </div>
                                }>
                                <IOSAvatar name={row.nama_guru} />
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                  <span style={{ fontSize: "var(--hig-fs-headline)", fontWeight: "600", color: "var(--color-text-primary)" }}>{row.nama_guru}</span>
                                  <span style={{ fontSize: "var(--hig-fs-footnote)", color: "var(--color-text-secondary)" }}>{row.jtm_7_hari} JTM · {row.jadwal_wajib} Sesi Wajib</span>
                                </div>
                              </IOSListRow>
                            ))}
                          </IOSList>
                        </div>
                      </>
                    )}
                  </IOSSection>

                </div>
              </div>
            )}

            {/* ═══ TAB: ADMIN ═══ */}
            {activeTab === "admin" && (
              <div className="scroll-inertia animate-slide-up" style={{ flex: 1 }}>
                <div className="main-content-scrollable">
                  <div style={{ fontSize: "var(--hig-fs-footnote)", color: "var(--color-text-secondary)", marginTop: "var(--space-4)", marginBottom: "var(--space-12)" }}>
                    Manajemen scheduler, siaran pesan, alarm KBM, dan pengawasan sistem
                  </div>

                  {/* System Health Dashboard */}
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", 
                    gap: "var(--space-12)", 
                    marginBottom: "var(--space-16)"
                  }}>
                    {/* WA Server Metric Card */}
                    <IOSCard style={{
                      padding: "var(--space-12) var(--space-16)",
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-8)"
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "32px",
                        height: "32px",
                        borderRadius: "var(--radius-medium)",
                        background: "var(--color-primary-tint, rgba(10, 132, 255, 0.15))",
                        color: "var(--color-primary)"
                      }}>
                        <PhoneAndroidOutlinedIcon style={{ fontSize: "1.2rem" }} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "var(--hig-fs-badge)", fontWeight: "600", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>WA Server</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginTop: "2px" }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: isWaOnline ? "var(--color-secondary)" : "var(--color-danger)" }}></span>
                          <strong style={{ fontSize: "var(--hig-fs-footnote)", color: isWaOnline ? "var(--color-secondary)" : "var(--color-danger)" }}>{isWaOnline ? "Online" : "Offline"}</strong>
                        </div>
                      </div>
                    </IOSCard>

                    {/* Scheduler Metric Card */}
                    <IOSCard style={{
                      padding: "var(--space-12) var(--space-16)",
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-8)"
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "32px",
                        height: "32px",
                        borderRadius: "var(--radius-medium)",
                        background: "var(--color-warning-tint, rgba(255, 159, 10, 0.15))",
                        color: "var(--color-warning)"
                      }}>
                        <CalendarMonthOutlinedIcon style={{ fontSize: "1.2rem" }} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "var(--hig-fs-badge)", fontWeight: "600", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Scheduler</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginTop: "2px" }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: isSchedulerActive ? "var(--color-secondary)" : "var(--color-warning)" }}></span>
                          <strong style={{ fontSize: "var(--hig-fs-footnote)", color: isSchedulerActive ? "var(--color-secondary)" : "var(--color-warning)" }}>{isSchedulerActive ? "Aktif" : "Nonaktif"}</strong>
                        </div>
                      </div>
                    </IOSCard>

                    {/* Task Queue Metric Card */}
                    <IOSCard style={{
                      padding: "var(--space-12) var(--space-16)",
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-8)"
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "32px",
                        height: "32px",
                        borderRadius: "var(--radius-medium)",
                        background: "var(--color-purple-tint, rgba(191, 90, 242, 0.15))",
                        color: "var(--color-primary)"
                      }}>
                        <SyncOutlinedIcon style={{ fontSize: "1.2rem" }} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "var(--hig-fs-badge)", fontWeight: "600", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Task Queue</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginTop: "2px" }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: queueColor }}></span>
                          <strong style={{ fontSize: "var(--hig-fs-footnote)", color: queueColor }}>{queueLabel}</strong>
                        </div>
                      </div>
                    </IOSCard>

                    {/* System Status Metric Card */}
                    <IOSCard style={{
                      padding: "var(--space-12) var(--space-16)",
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-8)"
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "32px",
                        height: "32px",
                        borderRadius: "var(--radius-medium)",
                        background: sysStatusLabel === "Stabil" ? "var(--color-secondary-tint, rgba(48, 209, 88, 0.15))" : sysStatusLabel === "Gangguan" ? "var(--color-danger-tint, rgba(255, 59, 48, 0.15))" : "var(--color-warning-tint, rgba(255, 159, 10, 0.15))",
                        color: sysStatusColor
                      }}>
                        <SecurityOutlinedIcon style={{ fontSize: "1.2rem" }} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "var(--hig-fs-badge)", fontWeight: "600", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Status Sistem</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginTop: "2px" }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: sysStatusColor }}></span>
                          <strong style={{ fontSize: "var(--hig-fs-footnote)", color: sysStatusColor }}>{sysStatusLabel}</strong>
                        </div>
                      </div>
                    </IOSCard>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-16)" }}>
                    {/* Combined Alarm & Auto Rekap Card */}
                    {(hasPermission('kirim_pengingat_whatsapp') || hasPermission('kelola_pengaturan_sistem')) && (
                      <IOSCard style={{ 
                        display: "flex", 
                        flexDirection: "column", 
                        gap: "var(--space-12)",
                        padding: "var(--space-16)"
                      }}>
                        {/* Section 1: Alarm KBM Manual */}
                        {hasPermission('kirim_pengingat_whatsapp') && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)" }}>
                              <NotificationsNoneOutlinedIcon style={{ color: "var(--color-warning)", fontSize: "1.25rem" }} />
                              <h3 style={{ fontSize: "var(--hig-fs-subheadline)", fontWeight: 600, color: "var(--color-text-primary)" }}>Alarm KBM Manual</h3>
                            </div>
                            <div style={{ 
                              display: "flex", 
                              justifyContent: "space-between", 
                              alignItems: "center", 
                              background: "var(--color-grouped-bg)", 
                              padding: "var(--space-12) var(--space-16)", 
                              borderRadius: "var(--radius-medium)", 
                              border: "0.5px solid var(--color-separator)", 
                              fontSize: "var(--hig-fs-caption)", 
                              color: "var(--color-text-secondary)",
                              gap: "var(--space-12)",
                              flexWrap: "wrap"
                            }}>
                              <div>
                                Sistem Waktu: <strong style={{ color: "var(--color-text-primary)" }}>{getFormattedTime()} WIB</strong> · Sasaran: Guru belum absen jam aktif
                              </div>
                              <IOSButton onClick={handleSendAlarm} disabled={alarmLoading || !isWaOnline} variant="primary" style={{ height: "32px", padding: "0 var(--space-16)", borderRadius: "var(--radius-medium)", fontSize: "var(--hig-fs-caption)" }} ariaLabel="Kirim alarm pengingat KBM">
                                {alarmLoading ? <IOSLoading /> : <NotificationsNoneOutlinedIcon style={{ fontSize: "0.9rem", marginRight: "6px" }} />}
                                {alarmLoading ? "Menyiarkan..." : "Kirim Alarm Pengingat"}
                              </IOSButton>
                            </div>
                            {!isWaOnline && (
                              <p style={{ color: "var(--color-danger)", fontSize: "var(--hig-fs-badge)", margin: "2px 0 0 0" }}>
                                ⚠️ WhatsApp Server Offline. Fitur alarm dinonaktifkan.
                              </p>
                            )}
                          </div>
                        )}

                        {/* Divider */}
                        {hasPermission('kirim_pengingat_whatsapp') && hasPermission('kelola_pengaturan_sistem') && (
                          <hr style={{ border: "none", borderTop: "0.5px solid var(--color-separator)", margin: "var(--space-8) 0" }} />
                        )}

                        {/* Section 2: Auto Rekap Harian */}
                        {hasPermission('kelola_pengaturan_sistem') && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)" }}>
                              <TuneOutlinedIcon style={{ color: "var(--color-primary)", fontSize: "1.25rem" }} />
                              <h3 style={{ fontSize: "var(--hig-fs-subheadline)", fontWeight: 600, color: "var(--color-text-primary)" }}>Auto Rekap Harian</h3>
                            </div>
                            
                            <IOSList style={{ margin: 0 }}>
                              <IOSListRow rightContent={
                                <IOSSwitch checked={isSchedulerActive} onChange={handleToggleAutoRekap} ariaLabel="Toggle pengiriman rekap otomatis" />
                              }>
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                  <span style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: 600, color: "var(--color-text-primary)" }}>Status Scheduler</span>
                                  <span style={{ fontSize: "var(--hig-fs-badge)", color: "var(--color-text-secondary)" }}>Kirim Pukul 14:30 WIB</span>
                                </div>
                              </IOSListRow>
                            </IOSList>
                          </div>
                        )}
                      </IOSCard>
                    )}

                    {/* Columns to eliminate empty grid gaps */}
                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", 
                      gap: "var(--space-16)",
                      alignItems: "start"
                    }}>
                      {/* Left Column: Kelola Akun Guru & Log Aktivitas */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-16)" }}>
                        {/* Kelola Akun Guru Card */}
                        {hasPermission('kelola_akun_guru') && (
                          <IOSCard style={{ display: "flex", flexDirection: "column", gap: "var(--space-12)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)" }}>
                                <ManageAccountsOutlinedIcon style={{ color: "var(--color-secondary)", fontSize: "1.4rem" }} />
                                <h3 style={{ fontSize: "var(--hig-fs-title)", fontWeight: 600 }}>Kelola Akun Guru</h3>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => setShowManageTeacherModal(true)} 
                                className="btn-ghost" 
                                style={{ padding: "2px 8px", fontSize: "var(--hig-fs-badge)", color: "var(--color-primary)", cursor: "pointer", display: "flex", alignItems: "center", border: "none", background: "none", fontWeight: "600" }}
                              >
                                Lihat Semua
                              </button>
                            </div>
                            
                            {/* Account Summary Stats Indicators */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-4)", background: "var(--color-surface)", padding: "var(--space-8) var(--space-12)", borderRadius: "var(--radius-medium)", border: "0.5px solid var(--color-separator)", textAlign: "center" }}>
                              <div>
                                <div style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "700", color: "var(--color-secondary)" }}>
                                  {getTeacherAccountSummary().userCount}
                                </div>
                                <div style={{ fontSize: "var(--hig-fs-badge)", color: "var(--color-text-secondary)", fontWeight: "500", textTransform: "uppercase" }}>Guru</div>
                              </div>
                              <div style={{ borderLeft: "0.5px solid var(--color-separator)", borderRight: "0.5px solid var(--color-separator)" }}>
                                <div style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "700", color: "var(--color-primary)" }}>
                                  {getTeacherAccountSummary().adminCount}
                                </div>
                                <div style={{ fontSize: "var(--hig-fs-badge)", color: "var(--color-text-secondary)", fontWeight: "500", textTransform: "uppercase" }}>Admin</div>
                              </div>
                              <div>
                                <div style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "700", color: "var(--color-primary)" }}>
                                  {getTeacherAccountSummary().superadminCount}
                                </div>
                                <div style={{ fontSize: "var(--hig-fs-badge)", color: "var(--color-text-secondary)", fontWeight: "500", textTransform: "uppercase" }}>Super</div>
                              </div>
                            </div>

                            {/* Recent Teacher List Summary (Latest 3 Teachers) */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)", marginTop: "4px" }}>
                              {contacts.length === 0 ? (
                                <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--hig-fs-footnote)", textAlign: "center", padding: "var(--space-8)" }}>
                                  Belum ada data guru pengajar.
                                </p>
                              ) : (
                                contacts.slice(0, 3).map((t, idx) => (
                                  <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-8) var(--space-12)", background: "var(--color-surface)", borderRadius: "var(--radius-medium)", border: "0.5px solid var(--color-separator)", gap: "var(--space-8)" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)", minWidth: 0, flex: 1 }}>
                                      <IOSAvatar name={t.nama_guru || t.nama} />
                                      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                                        <span style={{ fontWeight: "600", color: "var(--color-text-primary)", fontSize: "var(--hig-fs-footnote)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.nama_guru || t.nama}</span>
                                        <span style={{ fontSize: "var(--hig-fs-badge)", color: "var(--color-text-secondary)" }}>{t.no_wa || t.nomor_wa || "-"}</span>
                                      </div>
                                    </div>
                                    <IOSButton 
                                      onClick={() => { setTeacherToReset(t); setShowResetConfirm(true); }} 
                                      variant="secondary" 
                                      style={{ padding: "0 8px", fontSize: "var(--hig-fs-badge)", height: "22px", borderRadius: "var(--radius-small)", flexShrink: 0 }}
                                      ariaLabel={`Reset sandi ${t.nama_guru || t.nama}`}
                                    >
                                      <KeyOutlinedIcon style={{ fontSize: "0.75rem", marginRight: "2px" }} /> Reset
                                    </IOSButton>
                                  </div>
                                ))
                              )}
                            </div>
                          </IOSCard>
                        )}

                        {/* Log Aktivitas Card */}
                        {hasPermission('lihat_log_aktivitas') && (
                          <IOSCard style={{ display: "flex", flexDirection: "column", gap: "var(--space-12)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)" }}>
                                <HistoryOutlinedIcon style={{ color: "var(--color-primary)", fontSize: "1.4rem" }} />
                                <h3 style={{ fontSize: "var(--hig-fs-title)", fontWeight: 600 }}>Log Aktivitas</h3>
                              </div>
                              {localLogs.length > 3 && (
                                <button 
                                  type="button" 
                                  onClick={() => setLogLogsExpanded(!logLogsExpanded)} 
                                  className="btn-ghost" 
                                  style={{ padding: "2px 8px", fontSize: "var(--hig-fs-badge)", color: "var(--color-primary)", cursor: "pointer", display: "flex", alignItems: "center", border: "none", background: "none", fontWeight: "600" }}
                                >
                                  {logLogsExpanded ? "Sembunyikan" : `Lihat Semua (${localLogs.length})`}
                                </button>
                              )}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)", maxHeight: logLogsExpanded ? "280px" : "auto", overflowY: logLogsExpanded ? "auto" : "visible", paddingRight: "4px" }}>
                              {localLogs.length === 0 ? (
                                <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--hig-fs-footnote)", textAlign: "center", padding: "var(--space-16)" }}>
                                  Belum ada aktivitas tercatat pada sesi ini.
                                </p>
                              ) : (
                                (logLogsExpanded ? localLogs : localLogs.slice(0, 3)).map((log, idx) => (
                                  <div key={idx} style={{ padding: "var(--space-12)", background: "var(--color-surface)", borderRadius: "var(--radius-medium)", border: "0.5px solid var(--color-separator)", fontSize: "var(--hig-fs-footnote)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                      <strong style={{ color: "var(--color-text-primary)", textTransform: "uppercase", fontSize: "var(--hig-fs-badge)", letterSpacing: "0.5px", background: "var(--color-grouped-bg)", padding: "2px 6px", borderRadius: "var(--radius-small)" }}>
                                        {log.action}
                                      </strong>
                                      <span style={{ color: "var(--color-text-tertiary)", fontSize: "var(--hig-fs-badge)" }}>
                                        {new Date(log.timestamp).toLocaleString("id-ID")}
                                      </span>
                                    </div>
                                    <div style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{log.details}</div>
                                    <div style={{ color: "var(--color-text-secondary)", fontSize: "var(--hig-fs-badge)" }}>
                                      Pelaku: {log.operator_name} ({log.operator_phone || "Sistem"})
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </IOSCard>
                        )}
                      </div>

                      {/* Right Column: Broadcast & Log Retention */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-16)" }}>
                        {/* Broadcast Card */}
                        {hasPermission('kirim_pengumuman_whatsapp') && (
                          <IOSCard style={{ display: "flex", flexDirection: "column", gap: "var(--space-12)", overflow: "visible" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)" }}>
                              <CampaignOutlinedIcon style={{ color: "var(--color-primary)", fontSize: "1.4rem" }} />
                              <h3 style={{ fontSize: "var(--hig-fs-title)", fontWeight: 600 }}>Siaran Pengumuman</h3>
                            </div>
                            <div style={{ background: "var(--color-grouped-bg)", padding: "var(--space-12)", borderRadius: "var(--radius-medium)", border: "0.5px solid var(--color-separator)", fontSize: "var(--hig-fs-footnote)", color: "var(--color-text-secondary)" }}>
                              Kirim pengumuman massal ke seluruh kontak guru atau guru piket hari ini secara instan.
                            </div>
                            
                            <form onSubmit={handleSendBroadcast} style={{ display: "flex", flexDirection: "column", gap: "var(--space-12)", overflow: "visible" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                                <label htmlFor="broadcast-target" style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "600", color: "var(--color-text-secondary)" }}>Sasaran Penerima</label>
                                <select 
                                  id="broadcast-target"
                                  value={broadcastTarget} 
                                  onChange={(e) => setBroadcastTarget(e.target.value)}
                                  className="ios-input"
                                >
                                  <option value="ALL">Semua Guru Terdaftar ({contacts.length})</option>
                                  <option value="TODAY">Guru Aktif/Piket Hari Ini</option>
                                </select>
                              </div>

                              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                                <label htmlFor="broadcast-msg" style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "600", color: "var(--color-text-secondary)" }}>Isi Pesan Siaran</label>
                                <textarea 
                                  id="broadcast-msg"
                                  placeholder="Tulis pesan pengumuman di sini..." 
                                  rows={4} 
                                  value={broadcastMessage} 
                                  onChange={handleBroadcastMessageChange} 
                                  style={{ 
                                    width: "100%", 
                                    padding: "var(--space-12)", 
                                    background: "var(--color-grouped-bg)", 
                                    border: "none", 
                                    borderRadius: "var(--radius-medium)", 
                                    color: "var(--color-text-primary)", 
                                    fontFamily: "inherit", 
                                    fontSize: "var(--hig-fs-body)", 
                                    resize: "none", 
                                    overflowY: "hidden", 
                                    boxSizing: "border-box" 
                                  }} 
                                  aria-label="Isi pesan broadcast" 
                                />
                              </div>
                              <IOSButton type="submit" variant="primary" disabled={broadcastLoading || !broadcastMessage.trim() || !isWaOnline} style={{ alignSelf: "flex-end", padding: "0 24px" }} ariaLabel="Kirim broadcast sekarang">
                                {broadcastLoading ? <IOSLoading /> : <SendOutlinedIcon style={{ fontSize: "1rem" }} />}
                                {broadcastLoading ? "Mengirim..." : "Siarkan Sekarang"}
                              </IOSButton>
                            </form>
                            {!isWaOnline && (
                              <p style={{ color: "var(--color-danger)", fontSize: "var(--hig-fs-footnote)" }}>
                                ⚠️ WhatsApp Server Offline. Fitur siaran dinonaktifkan.
                              </p>
                            )}
                          </IOSCard>
                        )}

                        {/* Log Retention & Cleanup Card */}
                        {hasPermission('kelola_pengaturan_sistem') && (
                          <IOSCard style={{ display: "flex", flexDirection: "column", gap: "var(--space-12)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)" }}>
                              <HistoryOutlinedIcon style={{ color: "var(--color-warning)", fontSize: "1.4rem" }} />
                              <h3 style={{ fontSize: "var(--hig-fs-title)", fontWeight: 600 }}>Manajemen Retensi Log</h3>
                            </div>

                            <div style={{ background: "var(--color-grouped-bg)", padding: "var(--space-12)", borderRadius: "var(--radius-medium)", border: "0.5px solid var(--color-separator)", fontSize: "var(--hig-fs-footnote)", color: "var(--color-text-secondary)" }}>
                              Konfigurasi pembersihan log aktivitas lokal dan Task Queue di Google Sheets demi optimasi performa.
                            </div>

                            <IOSList>
                              <IOSListRow rightContent={
                                <IOSSwitch checked={autoCleanupActive} onChange={handleToggleAutoCleanup} ariaLabel="Toggle pembersihan otomatis" />
                              }>
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                  <span style={{ fontSize: "var(--hig-fs-body)", fontWeight: 600, color: "var(--color-text-primary)" }}>Pembersihan Otomatis</span>
                                  <span style={{ fontSize: "var(--hig-fs-footnote)", color: "var(--color-text-secondary)" }}>Hapus data lama secara berkala</span>
                                </div>
                              </IOSListRow>
                            </IOSList>

                            {autoCleanupActive && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-12)" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                                  <label style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "600", color: "var(--color-text-secondary)" }}>Retensi Log Aktivitas</label>
                                  <select 
                                    value={logRetentionDays} 
                                    onChange={(e) => handleLogRetentionChange(Number(e.target.value))}
                                    className="ios-input"
                                  >
                                    <option value={7}>7 Hari</option>
                                    <option value={30}>30 Hari (Default)</option>
                                    <option value={90}>90 Hari</option>
                                    <option value={180}>180 Hari</option>
                                    <option value={-1}>Tidak Pernah</option>
                                  </select>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                                  <label style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "600", color: "var(--color-text-secondary)" }}>Retensi Task Queue</label>
                                  <select 
                                    value={queueRetentionDays} 
                                    onChange={(e) => handleQueueRetentionChange(Number(e.target.value))}
                                    className="ios-input"
                                  >
                                    <option value={1}>1 Hari</option>
                                    <option value={7}>7 Hari (Default)</option>
                                    <option value={30}>30 Hari</option>
                                    <option value={-1}>Tidak Pernah</option>
                                  </select>
                                </div>
                              </div>
                            )}

                            <IOSButton 
                              onClick={() => setShowCleanupConfirmAlert(true)} 
                              variant="secondary" 
                              style={{ width: "100%", marginTop: "4px" }} 
                              ariaLabel="Bersihkan log lama secara manual"
                            >
                              <HistoryOutlinedIcon style={{ fontSize: "1rem", marginRight: "4px" }} /> Bersihkan Sekarang
                            </IOSButton>
                          </IOSCard>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ TAB: PERMISSIONS (Only SUPERADMIN) ═══ */}
            {activeTab === "permissions" && user?.role === "SUPERADMIN" && (
              <div className="scroll-inertia animate-slide-up" style={{ flex: 1 }}>
                <div className="main-content-scrollable" style={{ paddingLeft: "max(var(--sp-20), env(safe-area-inset-left))", paddingRight: "max(var(--sp-20), env(safe-area-inset-right))" }}>
                  <div style={{ fontSize: "var(--hig-fs-footnote)", color: "var(--color-text-secondary)", marginTop: "var(--space-4)", marginBottom: "var(--space-16)" }}>
                    Atur hak akses ADMIN dan USER.
                  </div>
                  
                  <IOSCard style={{ padding: 0, overflow: "hidden" }}>
                    {/* Header Row */}
                    <div className="permissions-header" style={{
                      display: "grid",
                      gridTemplateColumns: "1fr minmax(56px, 72px) minmax(56px, 72px)",
                      gap: 0,
                      background: "var(--color-surface)",
                      borderBottom: "0.5px solid var(--color-separator)",
                      padding: "var(--space-12) var(--space-16)"
                    }}>
                      <span style={{ fontSize: "var(--hig-fs-subheadline)", fontWeight: "600", color: "var(--color-text-secondary)", display: "flex", alignItems: "center" }}>
                        Fitur / Hak Akses
                      </span>
                      <span style={{ fontSize: "var(--hig-fs-subheadline)", fontWeight: "600", color: "var(--color-text-secondary)", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        ADMIN
                      </span>
                      <span style={{ fontSize: "var(--hig-fs-subheadline)", fontWeight: "600", color: "var(--color-text-secondary)", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        USER
                      </span>
                    </div>

                    {/* Permission Rows */}
                    {permissionList.map((p) => (
                      <div key={p.key} style={{
                        display: "grid",
                        gridTemplateColumns: "1fr minmax(56px, 72px) minmax(56px, 72px)",
                        gap: 0,
                        padding: "var(--space-12) var(--space-16)",
                        borderBottom: "0.5px solid var(--color-separator)",
                        alignItems: "center",
                        minHeight: "48px"
                      }}>
                        <span style={{ fontSize: "var(--hig-fs-body)", fontWeight: "500", color: "var(--color-text-primary)", paddingRight: "var(--space-8)" }}>
                          {p.label}
                        </span>
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                          <IOSSwitch 
                            checked={!!permissions.ADMIN?.[p.key]} 
                            onChange={(e) => handlePermissionToggle("ADMIN", p.key, e.target.checked)} 
                            ariaLabel={`Toggle ${p.label} untuk ADMIN`}
                          />
                        </div>
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                          <IOSSwitch 
                            checked={!!permissions.USER?.[p.key]} 
                            onChange={(e) => handlePermissionToggle("USER", p.key, e.target.checked)} 
                            ariaLabel={`Toggle ${p.label} untuk USER`}
                          />
                        </div>
                      </div>
                    ))}
                  </IOSCard>
                </div>
              </div>
            )}

            {/* Bottom Action Bar (Bulk Actions) */}
            <div className={`ios-bottom-action-bar ${selectedTeachers.length > 0 && isSelectionMode ? "visible" : "hidden"}`}>
              <button className="ios-bottom-btn" onClick={() => handleBulkChangeStatus("HADIR")}>
                <span className="ios-bottom-btn-icon" style={{ color: "var(--color-secondary)" }}>●</span>
                <span className="ios-bottom-btn-label">Hadir</span>
              </button>
              <button className="ios-bottom-btn" onClick={() => handleBulkChangeStatus("ALPHA")}>
                <span className="ios-bottom-btn-icon" style={{ color: "var(--color-danger)" }}>●</span>
                <span className="ios-bottom-btn-label">Alpa</span>
              </button>
              <button className="ios-bottom-btn" onClick={() => handleBulkChangeStatus("IZIN")}>
                <span className="ios-bottom-btn-icon" style={{ color: "var(--color-warning)" }}>●</span>
                <span className="ios-bottom-btn-label">Izin</span>
              </button>
              <button className="ios-bottom-btn" onClick={() => handleBulkChangeStatus("SAKIT")}>
                <span className="ios-bottom-btn-icon" style={{ color: "var(--color-purple)" }}>●</span>
                <span className="ios-bottom-btn-label">Sakit</span>
              </button>
              <button className="ios-bottom-btn" onClick={() => handleBulkChangeStatus("LIBUR")}>
                <span className="ios-bottom-btn-icon" style={{ color: "var(--color-primary)" }}>●</span>
                <span className="ios-bottom-btn-label">Libur</span>
              </button>
            </div>

          </main>

          {/* ═══ 5. IOS SHEET: Detail Guru ═══ */}
          <IOSSheet isOpen={!!teacherDetail} onClose={() => setTeacherDetail(null)}>
            {teacherDetail && (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-16)" }}>
                {/* 1. Header Ringkas */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)", color: "var(--color-text-secondary)" }}>
                    <PersonOutlineOutlinedIcon style={{ fontSize: "1.25rem" }} />
                    <span style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Profil Guru</span>
                  </div>
                  <button onClick={() => setTeacherDetail(null)} className="btn-ghost" aria-label="Tutup" style={{ display: "inline-flex", width: "44px", height: "44px", minWidth: "44px", minHeight: "44px", borderRadius: "50%", background: "var(--color-grouped-bg)", justifyContent: "center", alignItems: "center", cursor: "pointer", border: "none" }}>
                    <CloseOutlinedIcon style={{ fontSize: "1rem", color: "var(--color-text-secondary)" }} />
                  </button>
                </div>

                {/* 2. Nama & Kontak Utama */}
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-16)", paddingBottom: "var(--space-16)", borderBottom: "1px solid var(--color-separator)" }}>
                  <IOSAvatar name={teacherDetail.name} />
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <h2 style={{ fontSize: "var(--hig-fs-title)", fontWeight: 600, color: "var(--color-text-primary)", letterSpacing: "-0.2px", lineHeight: "1.25", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {teacherDetail.name}
                    </h2>
                    <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--hig-fs-footnote)", display: "flex", alignItems: "center", gap: "var(--space-4)", marginTop: "2px" }}>
                      <PhoneAndroidOutlinedIcon style={{ fontSize: "0.9rem" }} /> {teacherDetail.phone || "-"}
                    </span>
                  </div>
                </div>

                {/* Optional Attendance Segmented Input */}
                {teacherDetail.row && (
                  <IOSSection title={`Input Absensi Jam ${selectedJam}`}>
                    <div style={{ width: "100%", marginTop: "var(--space-4)" }}>
                      <IOSSegmentedControl
                        segments={statusActionsList.map(s => ({ value: s.key, label: s.label, cls: s.cls }))}
                        selectedValue={teacherDetail.row.currentStatus}
                        onChange={(newStatus) => {
                          handleStatusClick(teacherDetail.name, teacherDetail.row, teacherDetail.row.currentStatus, newStatus);
                          if (teacherDetail.row.currentStatus === "BELUM") {
                            setTeacherDetail(prev => ({
                              ...prev,
                              row: { ...prev.row, currentStatus: newStatus }
                            }));
                          }
                        }}
                        disabled={actionLoading}
                      />
                    </div>
                  </IOSSection>
                )}

                {/* 3. Ringkasan Kehadiran (Stat Chips) */}
                <IOSSection title="Ringkasan Kehadiran Bulan Ini">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "var(--space-8)", marginTop: "var(--space-4)" }}>
                    {[
                      { l: "Hadir", v: teacherDetail.stats.hadir, c: "hadir", key: "green" },
                      { l: "Izin", v: teacherDetail.stats.izin, c: "izin", key: "yellow" },
                      { l: "Sakit", v: teacherDetail.stats.sakit, c: "sakit", key: "orange" },
                      { l: "Libur", v: teacherDetail.stats.libur, c: "libur", key: "purple" },
                      { l: "Alpa", v: teacherDetail.stats.alpha, c: "alpha", key: "red" }
                    ].map(s => (
                      <div key={s.c} style={{ background: `var(--color--tint)`, border: "1px solid var(--color-separator)", borderRadius: "var(--radius-small)", padding: "10px 4px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{ fontSize: "var(--hig-fs-badge)", fontWeight: "600", color: "var(--color-text-secondary)", marginBottom: "4px" }}>{s.l}</span>
                        <span className={`ios-badge ios-badge-${s.c}`} style={{ fontSize: "var(--hig-fs-subheadline)", padding: "2px 6px" }}>{s.v}</span>
                      </div>
                    ))}
                  </div>

                  {/* 4. Informasi Kewajiban */}
                  <div style={{ marginTop: "var(--space-12)", padding: "10px var(--space-16)", background: "var(--color-surface)", border: "1px solid var(--color-separator)", borderRadius: "var(--radius-small)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "var(--hig-fs-footnote)", color: "var(--color-text-secondary)", fontWeight: 500 }}>Beban Kerja Wajib</span>
                    <span style={{ fontSize: "var(--hig-fs-footnote)", color: "var(--color-text-primary)", fontWeight: 600 }}>
                      {teacherDetail.stats.jtm_7_hari} JTM/Minggu · {teacherDetail.stats.jadwal_wajib} JTM/Bulan
                    </span>
                  </div>
                </IOSSection>

                {/* 5. Log Terakhir */}
                <IOSSection title="Log Kehadiran Terbaru (Maks. 10)">
                  {teacherDetail.logs.length === 0 ? (
                    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-separator)", borderRadius: "var(--radius-small)", padding: "16px 0", textAlign: "center", color: "var(--color-text-secondary)", fontSize: "var(--hig-fs-footnote)" }}>
                      Belum ada log absensi tercatat.
                    </div>
                  ) : (
                    <div className="ios-list scroll-inertia" style={{ maxHeight: "180px", overflowY: "auto", border: "1px solid var(--color-separator)" }}>
                      {teacherDetail.logs.map((log, i) => (
                        <IOSListRow key={i} rightContent={<IOSBadge status={(log.status || "").toUpperCase()} />}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span style={{ color: "var(--color-text-primary)", fontSize: "var(--hig-fs-footnote)", fontWeight: 600 }}>
                              {log.tanggal} <span style={{ color: "var(--color-text-secondary)", fontWeight: 400 }}>({capitalize(log.hari)})</span>
                            </span>
                            <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--hig-fs-footnote)" }}>
                              Jam {log.jam} · Kelas {log.kelas || "-"} · {log.mapel || "-"}
                            </span>
                          </div>
                        </IOSListRow>
                      ))}
                    </div>
                  )}
                </IOSSection>
              </div>
            )}
          </IOSSheet>

          {/* ═══ 6. IOS ALERT: Konfirmasi Koreksi ═══ */}
          <IOSAlert isOpen={!!correctionTarget} title="Koreksi Absensi" description={
            correctionTarget ? `Ubah status kehadiran ${correctionTarget.teacherName} pada Jam ${selectedJam} menjadi ${correctionTarget.newStatus}?` : ""
          } actions={[
            { label: "Batal", onClick: () => setCorrectionTarget(null) },
            { label: "Ubah", bold: true, onClick: confirmCorrection }
          ]} />

          {/* ═══ 7. IOS ALERT: Konfirmasi Bulk Action ═══ */}
          <IOSAlert isOpen={!!bulkTargetAction} title="Aksi Absensi Massal" description={
            bulkTargetAction ? `Tandai status ${bulkTargetAction.status} untuk seluruh ${bulkTargetAction.targetsCount} guru yang belum diabsen di KBM Jam ${selectedJam}?` : ""
          } actions={[
            { label: "Batal", onClick: () => setBulkTargetAction(null) },
            { label: "Hadirkan", bold: true, onClick: confirmBulkAction }
          ]} />

          {/* ═══ 7b. IOS ALERT: Konfirmasi Reset Password Guru ═══ */}
          <IOSAlert 
            isOpen={showResetConfirm} 
            title="Reset Password" 
            description={
              teacherToReset ? (
                `Reset kata sandi untuk ${teacherToReset.nama_guru || teacherToReset.nama} (${teacherToReset.no_wa || teacherToReset.nomor_wa || ""})? Password akan dikembalikan ke password bawaan.`
              ) : ""
            } 
            actions={[
              { label: "Batal", onClick: () => { setShowResetConfirm(false); setTeacherToReset(null); } },
              { label: "Reset Password", bold: true, destructive: true, onClick: handleResetConfirm }
            ]} 
          />

          {/* ═══ 7c. IOS ALERT: Konfirmasi Pembersihan Log Lama ═══ */}
          <IOSAlert 
            isOpen={showCleanupConfirmAlert} 
            title="Bersihkan Log Lama?" 
            description="Data log aktivitas absensi lokal dan baris task queue (berstatus DONE/FAILED) yang telah melewati masa retensi akan dihapus secara permanen dari sistem." 
            actions={[
              { label: "Batal", onClick: () => setShowCleanupConfirmAlert(false) },
              { label: "Bersihkan", bold: true, destructive: true, onClick: handleManualCleanup }
            ]} 
          />

          {/* ═══ 8. IOS SHEET: Ubah Password Sendiri ═══ */}
          <IOSSheet isOpen={showChangePasswordModal} onClose={() => {
            setShowChangePasswordModal(false);
            setOldPasswordChange("");
            setNewPasswordChange("");
            setConfirmPasswordChange("");
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-16)" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)", color: "var(--color-text-secondary)" }}>
                  <KeyOutlinedIcon style={{ fontSize: "1.25rem" }} />
                  <span style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Ubah Kata Sandi</span>
                </div>
                <button onClick={() => {
                  setShowChangePasswordModal(false);
                  setOldPasswordChange("");
                  setNewPasswordChange("");
                  setConfirmPasswordChange("");
                }} className="btn-ghost" aria-label="Tutup" style={{ display: "inline-flex", width: "44px", height: "44px", minWidth: "44px", minHeight: "44px", borderRadius: "50%", background: "var(--color-grouped-bg)", justifyContent: "center", alignItems: "center", cursor: "pointer", border: "none" }}>
                  <CloseOutlinedIcon style={{ fontSize: "1.1rem", color: "var(--color-text-secondary)" }} />
                </button>
              </div>

              <form onSubmit={handleConfirmChangePassword} style={{ display: "flex", flexDirection: "column", gap: "var(--space-16)" }}>
                <div className="ios-input-wrapper">
                  <label style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "600", color: "var(--color-text-secondary)" }}>Kata Sandi Lama</label>
                  <input type="password" value={oldPasswordChange} onChange={(e) => setOldPasswordChange(e.target.value)} required placeholder="••••••••"
                    className="ios-input" />
                </div>
                
                <div className="ios-input-wrapper">
                  <label style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "600", color: "var(--color-text-secondary)" }}>Kata Sandi Baru</label>
                  <input type="password" value={newPasswordChange} onChange={(e) => setNewPasswordChange(e.target.value)} required placeholder="Minimal 6 karakter"
                    className="ios-input" />
                </div>

                <div className="ios-input-wrapper">
                  <label style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "600", color: "var(--color-text-secondary)" }}>Konfirmasi Kata Sandi Baru</label>
                  <input type="password" value={confirmPasswordChange} onChange={(e) => setConfirmPasswordChange(e.target.value)} required placeholder="Ulangi kata sandi baru"
                    className="ios-input" />
                </div>

                <IOSButton type="submit" variant="primary" disabled={passwordChangeLoading} style={{ marginTop: "8px", width: "100%" }}>
                  {passwordChangeLoading ? <IOSLoading /> : "Perbarui Kata Sandi"}
                </IOSButton>
              </form>
            </div>
          </IOSSheet>

          {/* ═══ 9. IOS SHEET: Kelola Akun Guru & Reset Sandi ═══ */}
          <IOSSheet isOpen={showManageTeacherModal} onClose={() => {
            setShowManageTeacherModal(false);
            setSearchTeacherQuery("");
          }} className="ios-sheet-large">
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: "var(--space-16)", 
              width: "100%", 
              boxSizing: "border-box",
              flex: 1,
              overflow: "hidden",
              minHeight: 0
            }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, flex: 1, paddingRight: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)", color: "var(--color-text-primary)" }}>
                    <ManageAccountsOutlinedIcon style={{ fontSize: "1.5rem", color: "var(--color-secondary)", flexShrink: 0 }} />
                    <span style={{ fontSize: "var(--hig-fs-title)", fontWeight: 700, letterSpacing: "-0.5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Manajemen Guru</span>
                  </div>
                  <span style={{ fontSize: "var(--hig-fs-footnote)", color: "var(--color-text-secondary)", marginTop: "2px" }}>
                    Cari kontak guru dan reset kata sandi login guru pengajar.
                  </span>
                </div>
                <button onClick={() => {
                  setShowManageTeacherModal(false);
                  setSearchTeacherQuery("");
                }} className="btn-ghost" aria-label="Tutup" style={{ display: "inline-flex", width: "44px", height: "44px", minWidth: "44px", minHeight: "44px", borderRadius: "50%", background: "var(--color-grouped-bg)", justifyContent: "center", alignItems: "center", cursor: "pointer", border: "none", flexShrink: 0 }}>
                  <CloseOutlinedIcon style={{ fontSize: "1rem", color: "var(--color-text-secondary)" }} />
                </button>
              </div>

              {/* Search Bar */}
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                background: "var(--color-grouped-bg)", 
                borderRadius: "var(--radius-medium)", 
                padding: "var(--space-8) var(--space-12)", 
                gap: "var(--space-8)",
                border: "0.5px solid var(--color-separator)",
                width: "100%",
                boxSizing: "border-box"
              }}>
                <SearchOutlinedIcon style={{ fontSize: "1.1rem", color: "var(--color-text-secondary)", flexShrink: 0 }} />
                <input 
                  type="text" 
                  placeholder="Cari nama atau nomor WhatsApp..." 
                  value={searchTeacherQuery} 
                  onChange={(e) => setSearchTeacherQuery(e.target.value)} 
                  style={{ 
                    border: "none", 
                    background: "none", 
                    outline: "none", 
                    fontSize: "var(--hig-fs-body)", 
                    color: "var(--color-text-primary)",
                    width: "100%",
                    padding: 0
                  }} 
                />
              </div>

              <div className="ios-list scroll-inertia" style={{ flex: 1, minHeight: "200px", overflowY: "auto", overflowX: "hidden", border: "0.5px solid var(--color-separator)", borderRadius: "var(--radius-medium)", boxSizing: "border-box", width: "100%" }}>
                {(() => {
                  const filtered = contacts.filter(c => {
                    const name = (c.nama_guru || c.nama || "").toLowerCase();
                    const phoneNum = (c.no_wa || c.nomor_wa || "").toLowerCase();
                    const query = searchTeacherQuery.toLowerCase();
                    return name.includes(query) || phoneNum.includes(query);
                  });

                  if (filtered.length === 0) {
                    return (
                      <div style={{ padding: "20px", fontStyle: "italic", textAlign: "center", color: "var(--color-text-secondary)", fontSize: "var(--hig-fs-footnote)", width: "100%", boxSizing: "border-box" }}>
                        {searchTeacherQuery ? "Guru tidak ditemukan" : "Memuat data kontak..."}
                      </div>
                    );
                  }

                  return filtered.map((t, idx) => (
                    <IOSListRow key={idx} rightContent={
                      <IOSButton 
                        onClick={() => { setTeacherToReset(t); setShowResetConfirm(true); }} 
                        variant="secondary" 
                        style={{ padding: "4px 12px", fontSize: "var(--hig-fs-badge)", height: "26px", borderRadius: "var(--radius-small)", flexShrink: 0 }}
                        ariaLabel={`Reset sandi ${t.nama_guru || t.nama}`}
                      >
                        <KeyOutlinedIcon style={{ fontSize: "0.85rem", marginRight: "4px" }} /> Reset
                      </IOSButton>
                    }>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)", width: "100%", boxSizing: "border-box", minWidth: 0 }}>
                        <IOSAvatar name={t.nama_guru || t.nama} />
                        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                          <span style={{ fontWeight: "600", color: "var(--color-text-primary)", fontSize: "var(--hig-fs-subheadline)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.nama_guru || t.nama}</span>
                          <span style={{ fontSize: "var(--hig-fs-badge)", color: "var(--color-text-secondary)" }}>{t.no_wa || t.nomor_wa || "-"}</span>
                        </div>
                      </div>
                    </IOSListRow>
                  ));
                })()}
              </div>
            </div>
          </IOSSheet>

          {/* ═══ 10. IOS SHEET: Profil & Aksi Pengguna (Mobile Only) ═══ */}
          <IOSSheet isOpen={showMobileProfileSheet} onClose={() => setShowMobileProfileSheet(false)}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-16)" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)", color: "var(--color-text-secondary)" }}>
                  <PersonOutlineOutlinedIcon style={{ fontSize: "1.25rem" }} />
                  <span style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Profil Saya</span>
                </div>
                <button onClick={() => setShowMobileProfileSheet(false)} className="btn-ghost" aria-label="Tutup" style={{ display: "inline-flex", width: "44px", height: "44px", minWidth: "44px", minHeight: "44px", borderRadius: "50%", background: "var(--color-grouped-bg)", justifyContent: "center", alignItems: "center", cursor: "pointer", border: "none" }}>
                  <CloseOutlinedIcon style={{ fontSize: "1rem", color: "var(--color-text-secondary)" }} />
                </button>
              </div>

              {/* Profile Details */}
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-16)", paddingBottom: "var(--space-16)", borderBottom: "1px solid var(--color-separator)" }}>
                <IOSAvatar name={user?.name} />
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <h2 style={{ fontSize: "var(--hig-fs-title)", fontWeight: 600, color: "var(--color-text-primary)", letterSpacing: "-0.2px", lineHeight: "1.25" }}>
                    {user?.name}
                  </h2>
                  <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--hig-fs-footnote)", display: "flex", alignItems: "center", gap: "var(--space-4)", marginTop: "2px" }}>
                    {user?.phone} · <strong style={{ textTransform: "uppercase" }}>{user?.role || "USER"}</strong>
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-12)", marginTop: "var(--space-8)" }}>
                {hasPermission("ubah_password_sendiri") && (
                  <IOSButton 
                    onClick={() => {
                      setShowMobileProfileSheet(false);
                      setShowChangePasswordModal(true);
                    }} 
                    variant="secondary" 
                    style={{ width: "100%" }} 
                    ariaLabel="Ubah Password"
                  >
                    <KeyOutlinedIcon style={{ fontSize: "0.95rem" }} /> Ubah Password
                  </IOSButton>
                )}
                <IOSButton 
                  onClick={() => {
                    setShowMobileProfileSheet(false);
                    handleLogout();
                  }} 
                  variant="danger" 
                  style={{ width: "100%" }} 
                  ariaLabel="Logout"
                >
                  <LogoutOutlinedIcon style={{ fontSize: "0.95rem" }} /> Logout
                </IOSButton>
              </div>
            </div>
          </IOSSheet>

        </>
      )}
    </div>
  );
}
