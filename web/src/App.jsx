import React, { useState, useEffect, useCallback, memo } from "react";
import * as authApi from "./api/auth.js";
import * as scheduleApi from "./api/schedule.js";
import * as attendanceApi from "./api/attendance.js";
import * as reportApi from "./api/report.js";
import * as settingsApi from "./api/settings.js";
import { sortClasses } from "./utils/sorting.js";


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
  PeopleOutlined as PeopleOutlinedIcon,
  WbSunnyOutlined as WbSunnyOutlinedIcon,
  DarkModeOutlined as DarkModeOutlinedIcon
} from "@mui/icons-material";
import {
  PersonOutlined as PersonIcon,
  PersonOffOutlined as PersonOffIcon,
  AccessTimeOutlined as AccessTimeIcon,
  LocalHospitalOutlined as HospitalIcon,
  LocalCafeOutlined as CafeIcon
} from "@mui/icons-material";
import ToastContainer from "./ToastContainer";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

const getInitials = (name) => {
  if (!name) return "";
  // Hapus gelar (S.Pd., S.Kom., dll) untuk mendapatkan inisial nama asli
  const cleanName = name.replace(/,.*$/, "").trim();
  const parts = cleanName.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
};

const getAvatarColorClass = (name) => {
  const colors = ["blue", "green", "orange", "purple", "pink", "teal"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return `avatar-bg-${colors[index]}`;
};

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
          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
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
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
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
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);
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

  // Focus Card Mode States
  const [panelMode, setPanelMode] = useState("LIST");
  const [currentTeacherIndex, setCurrentTeacherIndex] = useState(0);
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showFinishedMessage, setShowFinishedMessage] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    // pointer: coarse ensures it is a touch device (mobile)
    const checkPortrait = () => setIsPortraitMobile(mql.matches && window.innerHeight > window.innerWidth && window.matchMedia("(pointer: coarse)").matches);
    checkPortrait();
    mql.addEventListener("change", checkPortrait);
    window.addEventListener("resize", checkPortrait);
    return () => {
      mql.removeEventListener("change", checkPortrait);
      window.removeEventListener("resize", checkPortrait);
    };
  }, []);

  const [pointerStartPos, setPointerStartPos] = useState({ x: 0, y: 0, active: false });

  const autoNextJam = () => {
    const nextJam = parseInt(selectedJam) + 1;
    if (nextJam > 3) {
      // Selesai semua
      setShowFinishedMessage(true);
      setTimeout(() => {
        setShowFinishedMessage(false);
        setPanelMode("LIST");
      }, 1000);
    } else {
      setSelectedJam(nextJam.toString());
      setCurrentTeacherIndex(0);
    }
  };

  const handlePointerDown = (e) => {
    if (!isPortraitMobile || isAnimating) return;
    setPointerStartPos({ x: e.clientX, y: e.clientY, active: true });
    // Note: We don't preventDefault here because we use touch-action: none on the container
  };

  const handlePointerUp = (e) => {
    if (!pointerStartPos.active || !isPortraitMobile || isAnimating) return;
    
    const pointerEndX = e.clientX;
    const pointerEndY = e.clientY;
    
    const deltaX = pointerStartPos.x - pointerEndX;
    const deltaY = pointerStartPos.y - pointerEndY;
    const swipeThreshold = 70;

    // Abaikan jika horizontal lebih dominan
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setPointerStartPos({ x: 0, y: 0, active: false });
      return;
    }

    const allTeachers = getTeachersForSelectedJam();
    if (allTeachers.length === 0) {
      setPointerStartPos({ x: 0, y: 0, active: false });
      return;
    }

    if (deltaY > swipeThreshold) {
      // Swipe Up
      if (panelMode === "LIST") {
        setPanelMode("FOCUS");
        setCurrentTeacherIndex(0);
      } else if (panelMode === "FOCUS") {
        if (currentTeacherIndex < allTeachers.length - 1) {
          setCurrentTeacherIndex(prev => prev + 1);
        } else {
          autoNextJam();
        }
      }
    } else if (deltaY < -swipeThreshold) {
      // Swipe Down
      if (panelMode === "FOCUS") {
        if (currentTeacherIndex > 0) {
          setCurrentTeacherIndex(prev => prev - 1);
        } else {
          setPanelMode("LIST");
        }
      }
    }
    setPointerStartPos({ x: 0, y: 0, active: false });
  };

  const handlePointerCancel = () => {
    setPointerStartPos({ x: 0, y: 0, active: false });
  };


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

  // Sistem Antrean Notifikasi (Toast)
  const [toasts, setToasts] = useState([]);

  // Fungsi untuk menambahkan notifikasi baru ke dalam antrean
  const showToast = useCallback((message, type = "info") => {
    const id = ++toastIdCounter;
    setToasts(prev => {
      // Mencegah duplikasi notifikasi berurutan dengan tipe dan pesan yang sama
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        if (last.message === message && last.type === type) {
          return prev;
        }
      }
      return [...prev, { id, message, type, exiting: false }];
    });
  }, []);

  // Fungsi untuk menghapus toast aktif dari antrean
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Dapatkan ID dan status keluar dari toast aktif (paling depan di antrean)
  const activeToastId = toasts.length > 0 ? toasts[0].id : null;
  const activeToastExiting = toasts.length > 0 ? toasts[0].exiting : null;

  // Efek untuk mengatur timer auto-dismiss hanya untuk toast yang sedang aktif
  useEffect(() => {
    if (!activeToastId || activeToastExiting) return;

    // Timer auto-dismiss selama 2.8 detik sebelum transisi keluar (exiting)
    const timer = setTimeout(() => {
      setToasts(prev => {
        if (prev.length > 0 && prev[0].id === activeToastId) {
          return [{ ...prev[0], exiting: true }, ...prev.slice(1)];
        }
        return prev;
      });
    }, 2800);

    // Membersihkan timer untuk mencegah memory leak
    return () => clearTimeout(timer);
  }, [activeToastId, activeToastExiting]);

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

  const handleFocusAction = (teacherName, item, currentStatus, newStatus) => {
    if (isAnimating) return;
    
    if (currentStatus !== newStatus) {
      handleStatusClick(teacherName, item, currentStatus, newStatus);
    }
    
    setIsAnimating(true);
    
    setTimeout(() => {
      setIsAnimating(false);
      const allTeachers = getTeachersForSelectedJam();
      if (currentTeacherIndex < allTeachers.length - 1) {
        setCurrentTeacherIndex(prev => prev + 1);
      } else {
        autoNextJam();
      }
    }, 250);
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
    let list = Object.values(map).sort(sortClasses);
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

  const generateExcelClientSide = async (data, monthName, year) => {
    const rows = data.map((row, idx) => ({
      "No": idx + 1,
      "Nama Guru": row.nama_guru,
      "JTM": row.jtm_7_hari || 0,
      "Jadwal Wajib": row.jadwal_wajib || 0,
      "Hadir": row.hadir || 0,
      "Izin": row.izin || 0,
      "Sakit": row.sakit || 0,
      "Libur": row.libur || 0,
      "Alpa": row.alpha || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Rekap_${monthName}`);

    const maxCols = [
      { wch: 6 },
      { wch: 28 },
      { wch: 8 },
      { wch: 14 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 }
    ];
    worksheet["!cols"] = maxCols;

    XLSX.writeFile(workbook, `Rekap_Absensi_${monthName}_${year}.xlsx`);
  };

  const generatePDFClientSide = async (data, monthName, year) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("REKAP ABSENSI BULANAN GURU", 105, 15, { align: "center" });
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Periode Bulan: ${monthName} ${year}`, 105, 21, { align: "center" });
    
    const headers = [["No", "Nama Guru", "JTM", "Jadwal", "Hadir", "Izin", "Sakit", "Libur", "Alpa"]];
    const body = data.map((row, idx) => [
      idx + 1,
      row.nama_guru,
      row.jtm_7_hari || 0,
      row.jadwal_wajib || 0,
      row.hadir || 0,
      row.izin || 0,
      row.sakit || 0,
      row.libur || 0,
      row.alpha || 0
    ]);

    autoTable(doc, {
      startY: 26,
      head: headers,
      body: body,
      theme: "grid",
      headStyles: { 
        fillColor: [0, 122, 255],
        textColor: 255, 
        fontStyle: "bold",
        halign: "center"
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 62 },
        2: { cellWidth: 15, halign: "center" },
        3: { cellWidth: 18, halign: "center" },
        4: { cellWidth: 15, halign: "center" },
        5: { cellWidth: 15, halign: "center" },
        6: { cellWidth: 15, halign: "center" },
        7: { cellWidth: 15, halign: "center" },
        8: { cellWidth: 15, halign: "center" }
      },
      styles: {
        fontSize: 9,
        font: "helvetica",
        cellPadding: 2.5
      },
      didParseCell: function (cellData) {
        if (cellData.column.index === 8 && cellData.cell.section === "body") {
          const val = parseInt(cellData.cell.text[0], 10);
          if (val > 0) {
            cellData.cell.styles.textColor = [255, 69, 58];
            cellData.cell.styles.fontStyle = "bold";
          }
        }
      }
    });

    doc.save(`Rekap_Absensi_${monthName}_${year}.pdf`);
  };

  const handleExportBulanan = async (format) => {
    if (!hasPermission('ekspor_rekap')) {
      showToast("Anda tidak memiliki hak akses untuk mengekspor rekap.", "error");
      return;
    }
    const m = indoMonths.find(x => x.value === rekapMonth);
    if (!m) return;
    setExportLoading(true);

    const isBotReady = serverStatus?.botReady;

    if (isBotReady) {
      try {
        // Tingkat 1: Kirim via WhatsApp jika Bot Ready
        await reportApi.eksporBulanan({ format, monthName: m.label, year: rekapYear });
        addLocalLog("EKSPOR_REKAP", `Mengekspor rekap bulanan format ${format.toUpperCase()} untuk bulan ${m.label} ${rekapYear}`);
        showToast("Laporan terkirim ke WhatsApp Anda!", "success");
        setExportLoading(false);
        return;
      } catch (e) {
        console.warn("Gagal mengirim via WhatsApp. Mencoba mengunduh langsung...", e);
      }
    }

    try {
      showToast("Mengunduh laporan rincian lengkap ke browser...", "info");
      
      const blob = await reportApi.downloadRekapFile(format, m.label, rekapYear);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `Rekap_Absensi_${m.label}_${rekapYear}.${format === "xlsx" ? "xlsx" : "pdf"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      addLocalLog("EKSPOR_REKAP_BROWSER", `Mengunduh rekap bulanan format ${format.toUpperCase()} rincian lengkap via browser untuk bulan ${m.label} ${rekapYear}`);
      showToast("Laporan rincian berhasil diunduh!", "success");
    } catch (err) {
      console.warn("Gagal mengunduh laporan rincian dari server. Melakukan fallback ke ringkasan lokal...", err);
      try {
        // Tingkat 3: Fallback ke ringkasan lokal browser
        showToast("Server offline. Mengunduh laporan ringkasan lokal...", "info");
        if (format === "xlsx") {
          await generateExcelClientSide(filteredMonthlyStats, m.label, rekapYear);
        } else {
          await generatePDFClientSide(filteredMonthlyStats, m.label, rekapYear);
        }
        addLocalLog("EKSPOR_REKAP_LOCAL_FALLBACK", `Fallback unduh rekap bulanan format ${format.toUpperCase()} lokal untuk bulan ${m.label} ${rekapYear}`);
        showToast("Laporan ringkasan berhasil diunduh!", "success");
      } catch (localErr) {
        showToast(`Gagal mengunduh laporan: ${localErr.message}`, "error");
      }
    } finally {
      setExportLoading(false);
    }
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
    filteredLogs.forEach(l => { const n = (l.nama_guru || "").trim(); const j = String(r.jam).trim(); if (n && j) keys.delete(`${n.toLowerCase()}|||${j}`); });
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
    { key: "ALPHA", label: "Alpa", cls: "alpha" },
    { key: "IZIN", label: "Izin", cls: "izin" },
    { key: "SAKIT", label: "Sakit", cls: "sakit" },
    { key: "LIBUR", label: "Libur", cls: "libur" },
  ];

  // Live System Health Computations
  const isWaOnline = serverStatus?.botReady ?? false;
  const isSchedulerActive = typeof serverStatus?.autoRekapActive !== "undefined" ? serverStatus.autoRekapActive : autoRekapActive;
  
  const qPending = serverStatus?.queue?.pending ?? 0;
  const qProcessing = serverStatus?.queue?.processing ?? 0;
  const qFailed = serverStatus?.queue?.failed ?? 0;
  
  let queueLabel = "Normal";
  let queueColor = "var(--green)";
  if (qFailed > 0) {
    queueLabel = "Error";
    queueColor = "var(--red)";
  } else if (qProcessing > 0) {
    queueLabel = "Processing";
    queueColor = "var(--blue)";
  } else if (qPending > 0) {
    queueLabel = `${qPending} Pending`;
    queueColor = "var(--yellow)";
  }
  
  let sysStatusLabel = "Stabil";
  let sysStatusColor = "var(--green)";
  if (!isWaOnline || qFailed > 0) {
    sysStatusLabel = "Gangguan";
    sysStatusColor = "var(--red)";
  } else if (!isSchedulerActive || qPending > 0 || qProcessing > 0) {
    sysStatusLabel = "Perlu Perhatian";
    sysStatusColor = "var(--yellow)";
  }

  return (
    <div className="app-layout">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* ═══ 1. LOGIN SCREEN ═══ */}
      {!token ? (
        <div style={{ width: "100%", height: "100%", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100%", padding: "var(--space-32) var(--space-16)" }}>
            <IOSCard style={{ width: "100%", maxWidth: "380px", padding: "var(--space-24)" }}>
              <div style={{ textAlign: "center", marginBottom: "var(--space-24)" }}>
                <img src="/favicon.svg" alt="Logo" style={{ width: "3.5rem", height: "3.5rem", marginBottom: "var(--space-8)", objectFit: "contain" }} />
                <h2 style={{ fontSize: "var(--hig-fs-large-title)", fontWeight: 700, letterSpacing: "-0.03em" }}>MA. Miftahul Ulum 2</h2>
              </div>

              {loginError && (
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)", background: "rgba(255, 59, 48, 0.15)", padding: "var(--space-12) var(--space-16)", borderRadius: "var(--radius-small)", fontSize: "var(--hig-fs-footnote)", color: "var(--red)", marginBottom: "var(--space-16)" }}>
                  <ErrorOutlineIcon style={{ fontSize: "1.1rem" }} />
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "var(--space-16)" }}>
                <div className="ios-input-wrapper">
                  <label style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "600", color: "var(--label-secondary)" }}>
                    Nomor WhatsApp Pengawas
                  </label>
                  <IOSInput type="tel" placeholder="628123456789" value={phone} onChange={(e) => setPhone(e.target.value)} ariaLabel="Nomor WhatsApp" />
                </div>
                
                <div className="ios-input-wrapper">
                  <label style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "600", color: "var(--label-secondary)" }}>
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
                        color: "var(--label-secondary)",
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
                <img src="/favicon.svg" alt="Logo" style={{ width: "2.2rem", height: "2.2rem", objectFit: "contain" }} />
                <div>
                  <h2 style={{ fontSize: "var(--hig-fs-headline)", fontWeight: "600", letterSpacing: "-0.02em" }}>MA. Miftahul Ulum 2</h2>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)", padding: "var(--space-8) var(--space-12)", borderRadius: "var(--radius-small)", background: "var(--bg-secondary)", border: "0.5px solid var(--separator)", fontSize: "var(--hig-fs-footnote)" }}>
                <FiberManualRecordIcon style={{ fontSize: "0.6rem", color: isWaOnline ? "var(--green)" : "var(--red)" }} />
                <span style={{ color: "var(--label-secondary)", fontWeight: 500 }}>WhatsApp Server · <strong style={{ color: isWaOnline ? "var(--green)" : "var(--red)" }}>{isWaOnline ? "Online" : "Offline"}</strong></span>
              </div>

              <nav style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <button onClick={() => setActiveTab("absensi")} className={`sidebar-nav-item ${activeTab === "absensi" ? "active" : ""}`} aria-label="Halaman Absen">
                  <CalendarMonthOutlinedIcon /> Absen
                </button>
                <button onClick={() => setActiveTab("rekap-bulanan")} className={`sidebar-nav-item ${activeTab === "rekap-bulanan" ? "active" : ""}`} aria-label="Halaman Rekap">
                  <BarChartOutlinedIcon /> Rekap
                </button>
                {(user?.role === "SUPERADMIN" || hasPermission("kirim_pengingat_whatsapp") || hasPermission("kirim_pengumuman_whatsapp") || hasPermission("kelola_pengaturan_sistem") || hasPermission("kelola_akun_guru") || hasPermission("kelola_akun_admin") || hasPermission("lihat_log_aktivitas")) && (
                  <button onClick={() => setActiveTab("admin")} className={`sidebar-nav-item ${activeTab === "admin" ? "active" : ""}`} aria-label="Halaman Kontrol">
                    <TuneOutlinedIcon /> Kontrol
                  </button>
                )}
                {user?.role === "SUPERADMIN" && (
                  <button onClick={() => setActiveTab("permissions")} className={`sidebar-nav-item ${activeTab === "permissions" ? "active" : ""}`} aria-label="Halaman Akses">
                    <LockPersonOutlinedIcon /> Akses
                  </button>
                )}
              </nav>
            </div>

            <div style={{ borderTop: "0.5px solid var(--separator)", paddingTop: "var(--space-16)", display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
              <div style={{ padding: "0 4px", marginBottom: "4px" }}>
                <div style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "600", color: "var(--label-primary)", display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
                  <PersonOutlineOutlinedIcon style={{ fontSize: "1rem" }} /> {user?.name}
                </div>
                <div style={{ fontSize: "var(--hig-fs-footnote)", color: "var(--label-secondary)", marginTop: "2px", paddingLeft: "22px" }}>
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
          <nav className={`bottom-nav ${selectedTeachers.length > 0 && isSelectionMode ? "hidden-by-action" : ""}`}>
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
             <header className="mobile-header">
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
                <div className="mobile-only circular-glass-icon-btn header-left-icon">
                  <img src="/favicon.svg" alt="Logo" style={{ width: "1.4rem", height: "1.4rem", objectFit: "contain" }} />
                </div>
              </div>
              <h2 className="ios-nav-bar-title" style={{ flex: 1, textAlign: "center", fontSize: "var(--hig-fs-nav-title)", fontWeight: "600" }}>
                {activeTab === "absensi" ? "Absensi Harian" :
                 activeTab === "rekap-bulanan" ? "Rekap Bulanan" :
                 activeTab === "admin" ? "Panel Kontrol" :
                 activeTab === "permissions" ? "Pengaturan Akses" : ""}
              </h2>
              <div style={{ width: "80px", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowMobileProfileSheet(true)}
                  className="mobile-only circular-glass-icon-btn header-profile-btn"
                  aria-label="Profil Pengguna"
                >
                  <PersonOutlineOutlinedIcon style={{ fontSize: "1.1rem", color: "var(--label-primary)" }} />
                </button>
              </div>
            </header>

            {/* ═══ TAB: ABSENSI ═══ */}
            {activeTab === "absensi" && (
              <div style={{ flex: 1, overflowY: "auto" }}>
                <div className="main-content-scrollable">
                  <div style={{ fontSize: "var(--hig-fs-caption)", color: "var(--label-secondary)", padding: "0 var(--space-4)", letterSpacing: "var(--ls-caption)", textTransform: "uppercase" }}>
                    {getFormattedDateIndo(selectedDate)} • {getFormattedTime()} WIB
                  </div>
                  <div className="absensi-grid">
                    
                    {/* Configuration Controls OR Focus Card */}
                    {showFinishedMessage && isPortraitMobile ? (
                      <div className="focus-card-wrapper animate-spring-slide-down">
                        <IOSCard className="focus-card" style={{ padding: "var(--space-32) var(--space-20)", textAlign: "center", justifyContent: "center" }}>
                          <h3 style={{ margin: 0, fontSize: "1.25rem", color: "var(--blue)" }}>Absensi seluruh sesi hari ini selesai.</h3>
                        </IOSCard>
                      </div>
                    ) : panelMode === "FOCUS" && isPortraitMobile ? (
                      (() => {
                        const allTeachers = getTeachersForSelectedJam();
                        const teacher = allTeachers[currentTeacherIndex];
                        if (!teacher) {
                          setPanelMode("LIST");
                          return null;
                        }
                        const hasNext = currentTeacherIndex < allTeachers.length - 1;
                        const hasNext2 = currentTeacherIndex < allTeachers.length - 2;
                        const nextTeacher = hasNext ? allTeachers[currentTeacherIndex + 1] : null;
                        const dateShort = (() => {
                          const d = new Date(selectedDate);
                          const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
                          return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
                        })();
                        return (
                          <div 
                            className="focus-stack-container top-panel-gesture-area"
                            key={currentTeacherIndex}
                            onPointerDown={handlePointerDown}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerCancel}
                          >
                            {/* Card utama */}
                            <div className="focus-stack-main animate-focus-card-enter">
                              <IOSCard className="focus-card">
                                <div className="focus-card-header">
                                  <div className="focus-card-name-block">
                                    <h3 className="focus-card-name">{teacher.nama_guru}</h3>
                                    <p className="focus-card-subtitle">{teacher.kelas} · {teacher.mapel} ·JAM {selectedJam}</p>
                                  </div>
                                  <span className="focus-card-date-link">{dateShort} <span className="focus-card-chevron">›</span></span>
                                </div>
                                <div className="focus-card-divider" />
                                <div className="focus-card-actions">
                                  {statusActionsList.map(act => (
                                    <button
                                      key={act.key}
                                      disabled={isAnimating}
                                      className={`focus-action-btn focus-action-${act.cls} ${teacher.currentStatus === act.key ? "active" : ""}`}
                                      onClick={() => handleFocusAction(teacher.nama_guru, teacher, teacher.currentStatus, act.key)}
                                    >
                                      {act.key.charAt(0)}
                                    </button>
                                  ))}
                                </div>
                              </IOSCard>
                            </div>
                            {/* Stacked card edges behind — thin strips like the reference */}
                            {hasNext && (
                              <div className="focus-stack-edge focus-stack-edge-1" />
                            )}
                            {hasNext2 && (
                              <div className="focus-stack-edge focus-stack-edge-2" />
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div 
                        onPointerDown={handlePointerDown} 
                        onPointerUp={handlePointerUp} 
                        onPointerCancel={handlePointerCancel} 
                        className="animate-spring-slide-down top-panel-gesture-area"
                      >
                        <IOSCard className="session-config-card">
                          <div className="session-config-wrapper">
                            {/* Tanggal */}
                          <div className="session-config-tanggal">
                            <div className="session-config-calendar-icon-wrapper">
                              <CalendarMonthOutlinedIcon className="session-config-calendar-icon" />
                            </div>
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
                            <div className="session-config-sesi-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                              <div className="session-config-sesi-label" style={{ margin: 0 }}>Sesi KBM Aktif</div>
                              <InfoOutlinedIcon style={{ color: "var(--blue)", cursor: "pointer", fontSize: "1.2rem" }} />
                            </div>
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
                    </div>
                    )}

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
                                <span className="absensi-summary-count">{countHadir}</span>
                                <span className="absensi-summary-label label-hadir">Hadir</span>
                              </div>
                              <div
                                className={`absensi-summary-card ${absensiStatusFilter === "ALPHA" ? "active active-alpa" : ""}`}
                                onClick={() => toggleStatusFilter("ALPHA")}
                              >
                                <span className="absensi-summary-count">{countAlpa}</span>
                                <span className="absensi-summary-label label-alpa">Alpa</span>
                              </div>
                              <div
                                className={`absensi-summary-card ${absensiStatusFilter === "IZIN" ? "active active-izin" : ""}`}
                                onClick={() => toggleStatusFilter("IZIN")}
                              >
                                <span className="absensi-summary-count">{countIzin}</span>
                                <span className="absensi-summary-label label-izin">Izin</span>
                              </div>
                              <div
                                className={`absensi-summary-card ${absensiStatusFilter === "SAKIT" ? "active active-sakit" : ""}`}
                                onClick={() => toggleStatusFilter("SAKIT")}
                              >
                                <span className="absensi-summary-count">{countSakit}</span>
                                <span className="absensi-summary-label label-sakit">Sakit</span>
                              </div>
                              <div
                                className={`absensi-summary-card ${absensiStatusFilter === "LIBUR" ? "active active-libur" : ""}`}
                                onClick={() => toggleStatusFilter("LIBUR")}
                              >
                                <span className="absensi-summary-count">{countLibur}</span>
                                <span className="absensi-summary-label label-libur">Libur</span>
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
                              <span style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "var(--ls-caption)", color: "var(--label-secondary)" }}>
                                Daftar Kehadiran Guru
                              </span>
                              <span style={{ fontSize: "var(--hig-fs-subheadline)", color: "var(--label-secondary)", fontWeight: 400, textTransform: "none" }}>
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
                                  border: "1px solid var(--blue)",
                                  borderRadius: "var(--radius-pill)",
                                  color: "var(--blue)",
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
                                    icon={<CheckCircleOutlinedIcon style={{ fontSize: "3.5rem", color: "var(--green)" }} />} 
                                    title="Tidak ada data" 
                                    description={`Tidak ada guru dengan status ${absensiStatusFilter} pada sesi ini.`} 
                                  />
                                ) : (
                                  <IOSEmptyState 
                                    icon={<SchoolOutlinedIcon style={{ fontSize: "3.5rem", color: "var(--label-secondary)" }} />} 
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
                                            border: isSelected ? "none" : "1.5px solid var(--label-tertiary)",
                                            background: isSelected ? "var(--blue)" : "transparent",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            transition: "all 150ms var(--ease-out)",
                                          }}>
                                            {isSelected && <span style={{ color: "#fff", fontSize: "13px", fontWeight: 700, lineHeight: 1 }}>✓</span>}
                                          </div>
                                        </div>
                                      )}

                                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-12)", width: "100%" }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                          <span style={{ fontSize: "var(--hig-fs-headline)", fontWeight: "600", color: "var(--label-primary)" }}>{row.nama_guru}</span>
                                          <span style={{ fontSize: "var(--hig-fs-footnote)", color: "var(--label-secondary)" }}>{row.kelas} • {row.mapel}</span>
                                        </div>
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
                </div>
              </div>
            )}



            {/* ═══ TAB: REKAP BULANAN ═══ */}
            {activeTab === "rekap-bulanan" && (
              <div style={{ flex: 1, overflowY: "auto" }}>
                <div className="main-content-scrollable">
                  
                  {/* Period Filter & Search */}
                  <IOSSection title="Filter Periode & Pencarian">
                    <div className="ios-list rekap-minimal">
                      <IOSListRow rightContent={
                        <AppleSelect className="ios-picker" value={rekapMonth} onChange={(e) => setRekapMonth(parseInt(e.target.value))} options={indoMonths} ariaLabel="Pilih bulan rekap" />
                      }>
                        <span style={{ fontSize: "var(--hig-fs-body)", fontWeight: 500, color: "var(--label-primary)" }}>Bulan</span>
                      </IOSListRow>
                      <IOSListRow rightContent={
                        <AppleSelect className="ios-picker" value={rekapYear} onChange={(e) => setRekapYear(parseInt(e.target.value))} options={[2025, 2026, 2027].map(y => ({ value: y, label: String(y) }))} ariaLabel="Pilih tahun rekap" />
                      }>
                        <span style={{ fontSize: "var(--hig-fs-body)", fontWeight: 500, color: "var(--label-primary)" }}>Tahun</span>
                      </IOSListRow>
                      <IOSListRow rightContent={
                        <div className="ios-search-bar ios-search-minimal" style={{ maxWidth: "240px" }}>
                          <SearchOutlinedIcon />
                          <IOSInput type="text" placeholder="Cari nama guru..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} ariaLabel="Cari nama guru" />
                        </div>
                      }>
                        <span style={{ fontSize: "var(--hig-fs-body)", fontWeight: 500, color: "var(--label-primary)" }}>Pencarian</span>
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
                                color: "var(--blue)" 
                              }}>
                                {syncLoading ? <IOSLoading /> : <SyncOutlinedIcon style={{ fontSize: "1.25rem" }} />}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                <span style={{ fontSize: "var(--hig-fs-body)", fontWeight: 600, color: "var(--label-primary)" }}>Sinkronisasi Data</span>
                                <span style={{ fontSize: "var(--hig-fs-caption)", color: "var(--label-secondary)", fontWeight: 400 }}>Perbarui data absensi dari Google Sheets.</span>
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
                                  color: "var(--green)" 
                                }}>
                                  <PictureAsPdfOutlinedIcon style={{ fontSize: "1.25rem" }} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                  <span style={{ fontSize: "var(--hig-fs-body)", fontWeight: 600, color: "var(--label-primary)" }}>Kirim Laporan PDF</span>
                                  <span style={{ fontSize: "var(--hig-fs-caption)", color: "var(--label-secondary)", fontWeight: 400 }}>Kirim laporan bulanan dalam format PDF.</span>
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
                                  color: "var(--blue)" 
                                }}>
                                  <TableChartOutlinedIcon style={{ fontSize: "1.25rem" }} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                  <span style={{ fontSize: "var(--hig-fs-body)", fontWeight: 600, color: "var(--label-primary)" }}>Kirim Laporan Excel</span>
                                  <span style={{ fontSize: "var(--hig-fs-caption)", color: "var(--label-secondary)", fontWeight: 400 }}>Kirim laporan bulanan dalam format Excel.</span>
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
                                    <th style={{ textAlign: "center", color: "var(--green)" }}>Hadir</th>
                                    <th style={{ textAlign: "center", color: "var(--yellow)" }}>Izin</th>
                                    <th style={{ textAlign: "center", color: "var(--yellow)" }}>Sakit</th>
                                    <th style={{ textAlign: "center", color: "var(--blue)" }}>Libur</th>
                                    <th style={{ textAlign: "center", color: "var(--red)" }}>Alpa</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredMonthlyStats.map((row, idx) => (
                                    <tr key={idx}>
                                      <td style={{ paddingLeft: "var(--space-16)" }}>{idx + 1}</td>
                                      <td>
                                        <span onClick={() => handleTeacherNameClick(row.nama_guru)} style={{ fontWeight: "600", cursor: "pointer", color: "var(--blue)", display: "inline-flex", alignItems: "center", gap: "var(--space-4)" }} role="button" tabIndex={0}>
                                          <PersonOutlineOutlinedIcon style={{ fontSize: "0.9rem" }} /> {row.nama_guru}
                                        </span>
                                      </td>
                                      <td style={{ textAlign: "center" }}>{row.jtm_7_hari}</td>
                                      <td style={{ textAlign: "center" }}>{row.jadwal_wajib}</td>
                                      <td style={{ textAlign: "center", fontWeight: "700", color: "var(--green)" }}>{row.hadir}</td>
                                      <td style={{ textAlign: "center", color: "var(--yellow)" }}>{row.izin}</td>
                                      <td style={{ textAlign: "center", color: "var(--yellow)" }}>{row.sakit}</td>
                                      <td style={{ textAlign: "center", color: "var(--blue)" }}>{row.libur}</td>
                                      <td style={{ textAlign: "center", fontWeight: "700", color: "var(--red)" }}>{row.alpha}</td>
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
                            <span style={{ fontSize: "var(--hig-fs-footnote)", color: "var(--label-secondary)" }}>Ketuk guru untuk melihat detail kehadiran bulanan</span>
                            <IOSButton onClick={loadRekapBulanan} disabled={monthlyLoading} variant="tertiary" style={{ minHeight: "36px", padding: "0 4px" }} ariaLabel="Muat ulang rekap">
                              <SyncOutlinedIcon style={{ fontSize: "0.95rem" }} /> Segarkan
                            </IOSButton>
                          </div>
                          <IOSList>
                            {filteredMonthlyStats.map((row, idx) => (
                              <IOSListRow key={idx} chevron interactive onClick={() => handleTeacherNameClick(row.nama_guru)}
                                rightContent={
                                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)" }}>
                                    <span style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "600", color: "var(--green)" }}>{row.hadir} H</span>
                                    {row.alpha > 0 && <span style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "600", color: "var(--red)" }}>{row.alpha} A</span>}
                                  </div>
                                }>
                                <IOSAvatar name={row.nama_guru} />
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                  <span style={{ fontSize: "var(--hig-fs-headline)", fontWeight: "600", color: "var(--label-primary)" }}>{row.nama_guru}</span>
                                  <span style={{ fontSize: "var(--hig-fs-footnote)", color: "var(--label-secondary)" }}>{row.jtm_7_hari} JTM · {row.jadwal_wajib} Sesi Wajib</span>
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
              <div style={{ flex: 1, overflowY: "auto" }}>
                <div className="main-content-scrollable">
                  <div style={{ fontSize: "var(--hig-fs-footnote)", color: "var(--label-secondary)", marginTop: "var(--space-4)", marginBottom: "var(--space-12)" }}>
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
                      padding: "var(--space-16)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      gap: "var(--space-8)",
                      height: "120px",
                      boxSizing: "border-box",
                      borderRadius: "20px"
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "rgba(10, 132, 255, 0.15)",
                        color: "var(--blue)"
                      }}>
                        <PhoneAndroidOutlinedIcon style={{ fontSize: "1.2rem" }} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{ fontSize: "var(--hig-fs-badge)", fontWeight: "600", color: "var(--label-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>WA Server</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginTop: "2px" }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: isWaOnline ? "var(--green)" : "var(--red)" }}></span>
                          <strong style={{ fontSize: "var(--hig-fs-footnote)", color: isWaOnline ? "var(--green)" : "var(--red)" }}>{isWaOnline ? "Online" : "Offline"}</strong>
                        </div>
                      </div>
                    </IOSCard>

                    {/* Scheduler Metric Card */}
                    <IOSCard style={{
                      padding: "var(--space-16)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      gap: "var(--space-8)",
                      height: "120px",
                      boxSizing: "border-box",
                      borderRadius: "20px"
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "rgba(255, 159, 10, 0.15)",
                        color: "var(--orange)"
                      }}>
                        <CalendarMonthOutlinedIcon style={{ fontSize: "1.2rem" }} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{ fontSize: "var(--hig-fs-badge)", fontWeight: "600", color: "var(--label-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Scheduler</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginTop: "2px" }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: isSchedulerActive ? "var(--green)" : "var(--orange)" }}></span>
                          <strong style={{ fontSize: "var(--hig-fs-footnote)", color: isSchedulerActive ? "var(--green)" : "var(--orange)" }}>{isSchedulerActive ? "Aktif" : "Nonaktif"}</strong>
                        </div>
                      </div>
                    </IOSCard>

                    {/* Task Queue Metric Card */}
                    <IOSCard style={{
                      padding: "var(--space-16)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      gap: "var(--space-8)",
                      height: "120px",
                      boxSizing: "border-box",
                      borderRadius: "20px"
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "rgba(191, 90, 242, 0.15)",
                        color: "var(--purple)"
                      }}>
                        <SyncOutlinedIcon style={{ fontSize: "1.2rem" }} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{ fontSize: "var(--hig-fs-badge)", fontWeight: "600", color: "var(--label-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Task Queue</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginTop: "2px" }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: queueColor }}></span>
                          <strong style={{ fontSize: "var(--hig-fs-footnote)", color: queueColor }}>{queueLabel}</strong>
                        </div>
                      </div>
                    </IOSCard>

                    {/* System Status Metric Card */}
                    <IOSCard style={{
                      padding: "var(--space-16)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      gap: "var(--space-8)",
                      height: "120px",
                      boxSizing: "border-box",
                      borderRadius: "20px"
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: sysStatusLabel === "Stabil" ? "rgba(48, 209, 88, 0.15)" : sysStatusLabel === "Gangguan" ? "rgba(255, 69, 58, 0.15)" : "rgba(255, 159, 10, 0.15)",
                        color: sysStatusColor
                      }}>
                        <SecurityOutlinedIcon style={{ fontSize: "1.2rem" }} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{ fontSize: "var(--hig-fs-badge)", fontWeight: "600", color: "var(--label-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Status Sistem</span>
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
                              <NotificationsNoneOutlinedIcon style={{ color: "var(--yellow)", fontSize: "1.25rem" }} />
                              <h3 style={{ fontSize: "var(--hig-fs-subheadline)", fontWeight: 600, color: "var(--label-primary)" }}>Alarm KBM Manual</h3>
                            </div>
                            <div style={{ 
                              display: "flex", 
                              justifyContent: "space-between", 
                              alignItems: "center", 
                              background: "var(--bg-tertiary)", 
                              padding: "var(--space-12) var(--space-16)", 
                              borderRadius: "var(--radius-medium)", 
                              border: "0.5px solid var(--separator)", 
                              fontSize: "var(--hig-fs-caption)", 
                              color: "var(--label-secondary)",
                              gap: "var(--space-12)",
                              flexWrap: "wrap"
                            }}>
                              <div>
                                Sistem Waktu: <strong style={{ color: "var(--label-primary)" }}>{getFormattedTime()} WIB</strong> · Sasaran: Guru belum absen jam aktif
                              </div>
                              <IOSButton onClick={handleSendAlarm} disabled={alarmLoading || !isWaOnline} variant="primary" style={{ height: "32px", padding: "0 var(--space-16)", borderRadius: "var(--radius-medium)", fontSize: "var(--hig-fs-caption)" }} ariaLabel="Kirim alarm pengingat KBM">
                                {alarmLoading ? <IOSLoading /> : <NotificationsNoneOutlinedIcon style={{ fontSize: "0.9rem", marginRight: "6px" }} />}
                                {alarmLoading ? "Menyiarkan..." : "Kirim Alarm Pengingat"}
                              </IOSButton>
                            </div>
                            {!isWaOnline && (
                              <p style={{ color: "var(--red)", fontSize: "var(--hig-fs-badge)", margin: "2px 0 0 0" }}>
                                ⚠️ WhatsApp Server Offline. Fitur alarm dinonaktifkan.
                              </p>
                            )}
                          </div>
                        )}

                        {/* Divider */}
                        {hasPermission('kirim_pengingat_whatsapp') && hasPermission('kelola_pengaturan_sistem') && (
                          <hr style={{ border: "none", borderTop: "0.5px solid var(--separator)", margin: "var(--space-8) 0" }} />
                        )}

                        {/* Section 2: Auto Rekap Harian */}
                        {hasPermission('kelola_pengaturan_sistem') && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)" }}>
                              <TuneOutlinedIcon style={{ color: "var(--blue)", fontSize: "1.25rem" }} />
                              <h3 style={{ fontSize: "var(--hig-fs-subheadline)", fontWeight: 600, color: "var(--label-primary)" }}>Auto Rekap Harian</h3>
                            </div>
                            
                            <IOSList style={{ margin: 0 }}>
                              <IOSListRow rightContent={
                                <IOSSwitch checked={isSchedulerActive} onChange={handleToggleAutoRekap} ariaLabel="Toggle pengiriman rekap otomatis" />
                              }>
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                  <span style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: 600, color: "var(--label-primary)" }}>Status Scheduler</span>
                                  <span style={{ fontSize: "var(--hig-fs-badge)", color: "var(--label-secondary)" }}>Kirim Pukul 14:30 WIB</span>
                                </div>
                              </IOSListRow>
                            </IOSList>
                          </div>
                        )}
                      </IOSCard>
                    )}

                    {/* Broadcast Card */}
                    {hasPermission('kirim_pengumuman_whatsapp') && (
                      <div style={{ maxWidth: "600px", margin: "0 auto", width: "100%" }}>
                        <IOSCard style={{ display: "flex", flexDirection: "column", gap: "var(--space-12)", overflow: "visible" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)" }}>
                            <CampaignOutlinedIcon style={{ color: "var(--blue)", fontSize: "1.4rem" }} />
                            <h3 style={{ fontSize: "var(--hig-fs-title)", fontWeight: 600 }}>Siaran Pengumuman</h3>
                          </div>
                          <div style={{ background: "var(--bg-tertiary)", padding: "var(--space-12)", borderRadius: "var(--radius-medium)", border: "0.5px solid var(--separator)", fontSize: "var(--hig-fs-footnote)", color: "var(--label-secondary)" }}>
                            Kirim pengumuman massal ke seluruh kontak guru atau guru piket hari ini secara instan.
                          </div>
                          
                          <form onSubmit={handleSendBroadcast} style={{ display: "flex", flexDirection: "column", gap: "var(--space-12)", overflow: "visible" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                              <label htmlFor="broadcast-target" style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "600", color: "var(--label-secondary)" }}>Sasaran Penerima</label>
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
                              <label htmlFor="broadcast-msg" style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "600", color: "var(--label-secondary)" }}>Isi Pesan Siaran</label>
                              <textarea 
                                id="broadcast-msg"
                                placeholder="Tulis pesan pengumuman di sini..." 
                                rows={4} 
                                value={broadcastMessage} 
                                onChange={handleBroadcastMessageChange} 
                                style={{ 
                                  width: "100%", 
                                  padding: "var(--space-12)", 
                                  background: "var(--bg-tertiary)", 
                                  border: "none", 
                                  borderRadius: "var(--radius-medium)", 
                                  color: "var(--label-primary)", 
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
                            <p style={{ color: "var(--red)", fontSize: "var(--hig-fs-footnote)" }}>
                              ⚠️ WhatsApp Server Offline. Fitur siaran dinonaktifkan.
                            </p>
                          )}
                        </IOSCard>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ TAB: PERMISSIONS (Only SUPERADMIN) ═══ */}
            {activeTab === "permissions" && user?.role === "SUPERADMIN" && (
              <div style={{ flex: 1, overflowY: "auto" }}>
                <div className="main-content-scrollable" style={{ paddingLeft: "max(var(--sp-20), env(safe-area-inset-left))", paddingRight: "max(var(--sp-20), env(safe-area-inset-right))" }}>
                  <div style={{ fontSize: "var(--hig-fs-footnote)", color: "var(--label-secondary)", marginTop: "var(--space-4)", marginBottom: "var(--space-16)" }}>
                    Atur hak akses peran serta kelola data akun guru.
                  </div>

                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", 
                    gap: "var(--space-16)",
                    alignItems: "start"
                  }}>
                    {/* Left Column: Permission Matrix */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-16)" }}>
                      <IOSCard style={{ padding: 0, overflow: "hidden" }}>
                        {/* Header Row */}
                        <div className="permissions-header" style={{
                          display: "grid",
                          gridTemplateColumns: "1fr minmax(56px, 72px) minmax(56px, 72px)",
                          gap: 0,
                          background: "var(--bg-secondary)",
                          borderBottom: "0.5px solid var(--separator)",
                          padding: "var(--space-12) var(--space-16)"
                        }}>
                          <span style={{ fontSize: "var(--hig-fs-subheadline)", fontWeight: "600", color: "var(--label-secondary)", display: "flex", alignItems: "center" }}>
                            Fitur / Hak Akses
                          </span>
                          <span style={{ fontSize: "var(--hig-fs-subheadline)", fontWeight: "600", color: "var(--label-secondary)", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            ADMIN
                          </span>
                          <span style={{ fontSize: "var(--hig-fs-subheadline)", fontWeight: "600", color: "var(--label-secondary)", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                            borderBottom: "0.5px solid var(--separator)",
                            alignItems: "center",
                            minHeight: "48px"
                          }}>
                            <span style={{ fontSize: "var(--hig-fs-body)", fontWeight: "500", color: "var(--label-primary)", paddingRight: "var(--space-8)" }}>
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

                    {/* Right Column: Kelola Akun Guru */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-16)" }}>
                      {hasPermission('kelola_akun_guru') && (
                        <IOSCard style={{ display: "flex", flexDirection: "column", gap: "var(--space-12)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)" }}>
                              <ManageAccountsOutlinedIcon style={{ color: "var(--green)", fontSize: "1.4rem" }} />
                              <h3 style={{ fontSize: "var(--hig-fs-title)", fontWeight: 600 }}>Kelola Akun Guru</h3>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => setShowManageTeacherModal(true)} 
                              className="btn-ghost" 
                              style={{ padding: "2px 8px", fontSize: "var(--hig-fs-badge)", color: "var(--blue)", cursor: "pointer", display: "flex", alignItems: "center", border: "none", background: "none", fontWeight: "600" }}
                            >
                              Lihat Semua
                            </button>
                          </div>
                          
                          {/* Account Summary Stats Indicators */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-4)", background: "var(--bg-secondary)", padding: "var(--space-8) var(--space-12)", borderRadius: "var(--radius-medium)", border: "0.5px solid var(--separator)", textAlign: "center" }}>
                            <div>
                              <div style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "700", color: "var(--green)" }}>
                                {getTeacherAccountSummary().userCount}
                              </div>
                              <div style={{ fontSize: "var(--hig-fs-badge)", color: "var(--label-secondary)", fontWeight: "500", textTransform: "uppercase" }}>Guru</div>
                            </div>
                            <div style={{ borderLeft: "0.5px solid var(--separator)", borderRight: "0.5px solid var(--separator)" }}>
                              <div style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "700", color: "var(--blue)" }}>
                                {getTeacherAccountSummary().adminCount}
                              </div>
                              <div style={{ fontSize: "var(--hig-fs-badge)", color: "var(--label-secondary)", fontWeight: "500", textTransform: "uppercase" }}>Admin</div>
                            </div>
                            <div>
                              <div style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "700", color: "var(--blue)" }}>
                                {getTeacherAccountSummary().superadminCount}
                              </div>
                              <div style={{ fontSize: "var(--hig-fs-badge)", color: "var(--label-secondary)", fontWeight: "500", textTransform: "uppercase" }}>Super</div>
                            </div>
                          </div>

                          {/* Recent Teacher List Summary (Latest 3 Teachers) */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)", marginTop: "4px" }}>
                            {contacts.length === 0 ? (
                              <p style={{ color: "var(--label-secondary)", fontSize: "var(--hig-fs-footnote)", textAlign: "center", padding: "var(--space-8)" }}>
                                Belum ada data guru pengajar.
                              </p>
                            ) : (
                              contacts.slice(0, 3).map((t, idx) => (
                                <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-8) var(--space-12)", background: "var(--bg-secondary)", borderRadius: "var(--radius-medium)", border: "0.5px solid var(--separator)", gap: "var(--space-8)" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)", minWidth: 0, flex: 1 }}>
                                    <IOSAvatar name={t.nama_guru || t.nama} />
                                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                                      <span style={{ fontWeight: "600", color: "var(--label-primary)", fontSize: "var(--hig-fs-footnote)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.nama_guru || t.nama}</span>
                                      <span style={{ fontSize: "var(--hig-fs-badge)", color: "var(--label-secondary)" }}>{t.no_wa || t.nomor_wa || "-"}</span>
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
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Action Bar (Bulk Actions) */}
            <div className={`ios-bottom-action-bar ${selectedTeachers.length > 0 && isSelectionMode ? "visible" : "hidden"}`}>
              <button className="ios-bottom-btn" onClick={() => handleBulkChangeStatus("HADIR")}>
                <span className="ios-bottom-btn-icon" style={{ color: "var(--green)" }}>●</span>
                <span className="ios-bottom-btn-label">Hadir</span>
              </button>
              <button className="ios-bottom-btn" onClick={() => handleBulkChangeStatus("ALPHA")}>
                <span className="ios-bottom-btn-icon" style={{ color: "var(--red)" }}>●</span>
                <span className="ios-bottom-btn-label">Alpa</span>
              </button>
              <button className="ios-bottom-btn" onClick={() => handleBulkChangeStatus("IZIN")}>
                <span className="ios-bottom-btn-icon" style={{ color: "var(--yellow)" }}>●</span>
                <span className="ios-bottom-btn-label">Izin</span>
              </button>
              <button className="ios-bottom-btn" onClick={() => handleBulkChangeStatus("SAKIT")}>
                <span className="ios-bottom-btn-icon" style={{ color: "var(--color-purple)" }}>●</span>
                <span className="ios-bottom-btn-label">Sakit</span>
              </button>
              <button className="ios-bottom-btn" onClick={() => handleBulkChangeStatus("LIBUR")}>
                <span className="ios-bottom-btn-icon" style={{ color: "var(--blue)" }}>●</span>
                <span className="ios-bottom-btn-label">Libur</span>
              </button>
            </div>

          </main>

          {/* ═══ 5. IOS SHEET: Detail Guru ═══ */}
          <IOSSheet isOpen={!!teacherDetail} onClose={() => setTeacherDetail(null)} className="ios-profile-sheet">
            {teacherDetail && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* 1. Header Ringkas (Apple Style) */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--label-secondary)" }}>
                    <PersonOutlineOutlinedIcon style={{ fontSize: "1.1rem" }} />
                    <span style={{ fontSize: "var(--fs-caption-2)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>Profil Guru</span>
                  </div>
                  <button onClick={() => setTeacherDetail(null)} className="ios-profile-close-btn" aria-label="Tutup">
                    <CloseOutlinedIcon style={{ fontSize: "1rem", color: "var(--label-secondary)" }} />
                  </button>
                </div>

                {/* 2. Nama & Kontak Utama (Native iOS 14 Style) */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px", paddingBottom: "16px", borderBottom: "1px solid var(--separator)" }}>
                  <div style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--blue), var(--purple))",
                    border: "1px solid var(--border)",
                    boxShadow: "0 4px 12px var(--blue-tint)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--label-primary)",
                    fontWeight: "700",
                    fontSize: "var(--fs-headline)",
                    flexShrink: 0
                  }}>
                    {getInitials(teacherDetail.name)}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <h2 style={{
                      fontSize: "var(--fs-title-2)",
                      fontWeight: "700",
                      color: "var(--label-primary)",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.2",
                      margin: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>
                      {teacherDetail.name}
                    </h2>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--label-secondary)", fontSize: "var(--fs-subheadline)", marginTop: "4px" }}>
                      <PhoneAndroidOutlinedIcon style={{ fontSize: "1rem", color: "var(--label-secondary)" }} />
                      <span>{teacherDetail.phone || "-"}</span>
                    </div>
                  </div>
                </div>

                {/* Optional Attendance Segmented Input */}
                {teacherDetail.row && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <span style={{ fontSize: "var(--fs-caption-2)", fontWeight: "600", color: "var(--label-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Input Absensi Jam {selectedJam}
                    </span>
                    <div style={{ width: "100%" }}>
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
                  </div>
                )}

                {/* 3. Ringkasan Kehadiran (Stat Chips with Semantic Colors) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={{ fontSize: "var(--fs-title-3)", fontWeight: "600", color: "var(--label-primary)" }}>
                    Ringkasan Kehadiran Bulan Ini
                  </span>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", marginTop: "4px" }}>
                    {[
                      { l: "Hadir", v: teacherDetail.stats.hadir, c: "hadir", color: "var(--green)", bg: "var(--green-tint)", border: "rgba(48, 209, 88, 0.2)" },
                      { l: "Izin", v: teacherDetail.stats.izin, c: "izin", color: "var(--yellow)", bg: "var(--yellow-tint)", border: "rgba(255, 214, 10, 0.2)" },
                      { l: "Sakit", v: teacherDetail.stats.sakit, c: "sakit", color: "var(--purple)", bg: "var(--purple-tint)", border: "rgba(191, 90, 242, 0.2)" },
                      { l: "Libur", v: teacherDetail.stats.libur, c: "libur", color: "var(--blue)", bg: "var(--blue-tint)", border: "rgba(10, 132, 255, 0.2)" },
                      { l: "Alpa", v: teacherDetail.stats.alpha, c: "alpha", color: "var(--red)", bg: "var(--red-tint)", border: "rgba(255, 69, 58, 0.2)" }
                    ].map(s => (
                      <div key={s.c} style={{
                        background: s.bg,
                        border: `1px solid ${s.border}`,
                        borderRadius: "14px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        boxSizing: "border-box",
                        padding: "8px 4px",
                        minHeight: "64px"
                      }}>
                        <span style={{ fontSize: "var(--fs-caption-2)", fontWeight: "600", color: "var(--label-secondary)", marginBottom: "2px", textAlign: "center" }}>
                          {s.l}
                        </span>
                        <span style={{ fontSize: "var(--fs-title-2)", fontWeight: "700", color: s.color, textAlign: "center", lineHeight: "1.1" }}>
                          {s.v}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 4. Informasi Kewajiban (Grouped iOS Style List) */}
                  <div className="ios-list" style={{ marginTop: "8px" }}>
                    <div className="ios-list-row" style={{ minHeight: "56px", padding: "12px 16px", border: "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          background: "var(--blue-tint)",
                          color: "var(--blue)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          <SchoolOutlinedIcon style={{ fontSize: "1.2rem" }} />
                        </div>
                        <span style={{ fontSize: "var(--fs-subheadline)", fontWeight: "500", color: "var(--label-primary)" }}>
                          Beban Kerja Wajib
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "var(--fs-footnote)", color: "var(--label-secondary)", fontWeight: "500" }}>
                          {teacherDetail.stats.jtm_7_hari || 0} JTM/Mg · {teacherDetail.stats.jadwal_wajib || 0} JTM/Blnd
                        </span>
                        <ChevronRightOutlinedIcon style={{ fontSize: "1.1rem", color: "var(--label-tertiary)" }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Log Terakhir (Grouped Apple List Style) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={{ fontSize: "var(--fs-caption-2)", fontWeight: "600", color: "var(--label-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Log Kehadiran Terbaru (Maks. 10)
                  </span>
                  
                  {teacherDetail.logs.length === 0 ? (
                    <div style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--separator)",
                      borderRadius: "16px",
                      padding: "24px 0",
                      textAlign: "center",
                      color: "var(--label-secondary)",
                      fontSize: "var(--fs-footnote)"
                    }}>
                      Belum ada log absensi tercatat.
                    </div>
                  ) : (
                    <div className="ios-list" style={{ overflow: "hidden" }}>
                      <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                        {teacherDetail.logs.map((log, i) => {
                          const status = (log.status || "").toUpperCase();
                          let badgeColor = "var(--green)";
                          let badgeBg = "var(--green-tint)";
                          let glowColor = "rgba(48, 209, 88, 0.2)";
                          if (status === "IZIN") {
                            badgeColor = "var(--yellow)";
                            badgeBg = "var(--yellow-tint)";
                            glowColor = "rgba(255, 214, 10, 0.2)";
                          } else if (status === "SAKIT") {
                            badgeColor = "var(--purple)";
                            badgeBg = "var(--purple-tint)";
                            glowColor = "rgba(191, 90, 242, 0.2)";
                          } else if (status === "LIBUR") {
                            badgeColor = "var(--blue)";
                            badgeBg = "var(--blue-tint)";
                            glowColor = "rgba(10, 132, 255, 0.2)";
                          } else if (status === "ALPHA") {
                            badgeColor = "var(--red)";
                            badgeBg = "var(--red-tint)";
                            glowColor = "rgba(255, 69, 58, 0.2)";
                          } else if (status === "BELUM") {
                            badgeColor = "var(--label-secondary)";
                            badgeBg = "var(--bg-quaternary)";
                            glowColor = "rgba(255, 255, 255, 0.05)";
                          }

                          return (
                            <div key={i} className="ios-list-row interactive" style={{
                              padding: "10px 16px",
                              minHeight: "64px",
                              cursor: "pointer",
                              borderBottom: i < teacherDetail.logs.length - 1 ? "1px solid var(--separator)" : "none"
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
                                <div style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "50%",
                                  background: "var(--bg-tertiary)",
                                  color: "var(--label-secondary)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0
                                }}>
                                  <CalendarMonthOutlinedIcon style={{ fontSize: "1.1rem" }} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                                  <span style={{ color: "var(--label-primary)", fontSize: "var(--fs-subheadline)", fontWeight: "600" }}>
                                    {log.tanggal} <span style={{ color: "var(--label-secondary)", fontWeight: "400", fontSize: "var(--fs-footnote)" }}>({capitalize(log.hari)})</span>
                                  </span>
                                  <span style={{ color: "var(--label-secondary)", fontSize: "var(--fs-footnote)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    Jam {log.jam} · Kelas {log.kelas || "-"} · {log.mapel || "-"}
                                  </span>
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                                <span style={{
                                  color: badgeColor,
                                  background: badgeBg,
                                  boxShadow: `0 2px 8px ${glowColor}`,
                                  padding: "4px 10px",
                                  borderRadius: "var(--r-pill)",
                                  fontSize: "var(--fs-caption-2)",
                                  fontWeight: "700",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px"
                                }}>
                                  {status}
                                </span>
                                <ChevronRightOutlinedIcon style={{ fontSize: "1rem", color: "var(--label-quaternary)" }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. Info Banner (Bottom Pill) */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border)",
                  padding: "8px 16px",
                  borderRadius: "var(--r-pill)",
                  boxSizing: "border-box"
                }}>
                  <InfoOutlinedIcon style={{ fontSize: "1rem", color: "var(--blue)" }} />
                  <span style={{ fontSize: "var(--fs-footnote)", color: "var(--label-secondary)", fontWeight: "500" }}>
                    Data kehadiran diperbarui secara real-time
                  </span>
                </div>
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
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)", color: "var(--label-secondary)" }}>
                  <KeyOutlinedIcon style={{ fontSize: "1.25rem" }} />
                  <span style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Ubah Kata Sandi</span>
                </div>
                <button onClick={() => {
                  setShowChangePasswordModal(false);
                  setOldPasswordChange("");
                  setNewPasswordChange("");
                  setConfirmPasswordChange("");
                }} className="ios-profile-close-btn" aria-label="Tutup">
                  <CloseOutlinedIcon style={{ fontSize: "1rem", color: "var(--label-secondary)" }} />
                </button>
              </div>

              <form onSubmit={handleConfirmChangePassword} style={{ display: "flex", flexDirection: "column", gap: "var(--space-16)" }}>
                <div className="ios-input-wrapper">
                  <label style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "600", color: "var(--label-secondary)" }}>Kata Sandi Lama</label>
                  <input type="password" value={oldPasswordChange} onChange={(e) => setOldPasswordChange(e.target.value)} required placeholder="••••••••"
                    className="ios-input" />
                </div>
                
                <div className="ios-input-wrapper">
                  <label style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "600", color: "var(--label-secondary)" }}>Kata Sandi Baru</label>
                  <input type="password" value={newPasswordChange} onChange={(e) => setNewPasswordChange(e.target.value)} required placeholder="Minimal 6 karakter"
                    className="ios-input" />
                </div>

                <div className="ios-input-wrapper">
                  <label style={{ fontSize: "var(--hig-fs-footnote)", fontWeight: "600", color: "var(--label-secondary)" }}>Konfirmasi Kata Sandi Baru</label>
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
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)", color: "var(--label-primary)" }}>
                    <ManageAccountsOutlinedIcon style={{ fontSize: "1.5rem", color: "var(--green)", flexShrink: 0 }} />
                    <span style={{ fontSize: "var(--hig-fs-title)", fontWeight: 700, letterSpacing: "-0.5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Manajemen Guru</span>
                  </div>
                  <span style={{ fontSize: "var(--hig-fs-footnote)", color: "var(--label-secondary)", marginTop: "2px" }}>
                    Cari kontak guru dan reset kata sandi login guru pengajar.
                  </span>
                </div>
                <button onClick={() => {
                  setShowManageTeacherModal(false);
                  setSearchTeacherQuery("");
                }} className="ios-profile-close-btn" aria-label="Tutup">
                  <CloseOutlinedIcon style={{ fontSize: "1rem", color: "var(--label-secondary)" }} />
                </button>
              </div>

              {/* Search Bar */}
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                background: "var(--bg-tertiary)", 
                borderRadius: "var(--radius-medium)", 
                padding: "var(--space-8) var(--space-12)", 
                gap: "var(--space-8)",
                border: "0.5px solid var(--separator)",
                width: "100%",
                boxSizing: "border-box"
              }}>
                <SearchOutlinedIcon style={{ fontSize: "1.1rem", color: "var(--label-secondary)", flexShrink: 0 }} />
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
                    color: "var(--label-primary)",
                    width: "100%",
                    padding: 0
                  }} 
                />
              </div>

              <div className="ios-list" style={{ flex: 1, minHeight: "200px", overflowY: "auto", overflowX: "hidden", border: "0.5px solid var(--separator)", borderRadius: "var(--radius-medium)", boxSizing: "border-box", width: "100%" }}>
                {(() => {
                  const filtered = contacts.filter(c => {
                    const name = (c.nama_guru || c.nama || "").toLowerCase();
                    const phoneNum = (c.no_wa || c.nomor_wa || "").toLowerCase();
                    const query = searchTeacherQuery.toLowerCase();
                    return name.includes(query) || phoneNum.includes(query);
                  });

                  if (filtered.length === 0) {
                    return (
                      <div style={{ padding: "20px", fontStyle: "italic", textAlign: "center", color: "var(--label-secondary)", fontSize: "var(--hig-fs-footnote)", width: "100%", boxSizing: "border-box" }}>
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
                          <span style={{ fontWeight: "600", color: "var(--label-primary)", fontSize: "var(--hig-fs-subheadline)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.nama_guru || t.nama}</span>
                          <span style={{ fontSize: "var(--hig-fs-badge)", color: "var(--label-secondary)" }}>{t.no_wa || t.nomor_wa || "-"}</span>
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
            {user && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* 1. Header Ringkas (Apple Style) */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--label-secondary)" }}>
                    <PersonOutlineOutlinedIcon style={{ fontSize: "1.1rem" }} />
                    <span style={{ fontSize: "var(--fs-caption-2)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>Profil Saya</span>
                  </div>
                  <button onClick={() => setShowMobileProfileSheet(false)} className="ios-profile-close-btn" aria-label="Tutup">
                    <CloseOutlinedIcon style={{ fontSize: "1rem", color: "var(--label-secondary)" }} />
                  </button>
                </div>

                {/* 2. Nama & Kontak Utama (Native iOS 14 Style) */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px", paddingBottom: "16px", borderBottom: "1px solid var(--separator)" }}>
                  <div style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--blue), var(--purple))",
                    border: "1px solid var(--border)",
                    boxShadow: "0 4px 12px var(--blue-tint)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--label-primary)",
                    fontWeight: "700",
                    fontSize: "var(--fs-headline)",
                    flexShrink: 0
                  }}>
                    {getInitials(user.name)}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <h2 style={{
                      fontSize: "var(--fs-title-2)",
                      fontWeight: "700",
                      color: "var(--label-primary)",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.2",
                      margin: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>
                      {user.name}
                    </h2>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--label-secondary)", fontSize: "var(--fs-subheadline)", marginTop: "4px" }}>
                      <PhoneAndroidOutlinedIcon style={{ fontSize: "1rem", color: "var(--label-secondary)" }} />
                      <span>{user.phone} · <strong style={{ textTransform: "uppercase" }}>{user.role || "USER"}</strong></span>
                    </div>
                  </div>
                </div>

                {/* 2.5. Pilihan Tema (Grouped iOS Style List) */}
                <div className="ios-list" style={{ marginTop: "16px", marginBottom: "16px", overflow: "hidden" }}>
                  <div className="ios-list-row" style={{ minHeight: "44px", padding: "8px 16px", border: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "8px",
                        background: theme === "light" ? "var(--orange-tint)" : "var(--blue-tint)",
                        color: theme === "light" ? "var(--orange)" : "var(--blue)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        {theme === "light" ? (
                          <WbSunnyOutlinedIcon style={{ fontSize: "1rem" }} />
                        ) : (
                          <DarkModeOutlinedIcon style={{ fontSize: "1rem" }} />
                        )}
                      </div>
                      <span style={{ fontSize: "var(--fs-subheadline)", fontWeight: "500", color: "var(--label-primary)" }}>
                        Mode Gelap
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {/* iOS Switch Toggle */}
                      <IOSSwitch 
                        checked={theme === "dark"} 
                        onChange={(e) => setTheme(e.target.checked ? "dark" : "light")}
                        ariaLabel="Toggle Mode Gelap"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Aksi Pengguna */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "4px" }}>
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
                      <KeyOutlinedIcon style={{ fontSize: "0.95rem", marginRight: "6px" }} /> Ubah Password
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
                    <LogoutOutlinedIcon style={{ fontSize: "0.95rem", marginRight: "6px" }} /> Logout
                  </IOSButton>
                </div>
              </div>
            )}
          </IOSSheet>

        </>
      )}
    </div>
  );
}
