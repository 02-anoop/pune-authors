import React, {
  useState,
  useEffect,
  useRef,
  lazy,
  Suspense,
  useMemo,
} from "react";
const AdminOverviewTab = React.lazy(() =>
  import("./AdminOverviewTab").then((m) => ({ default: m.AdminOverviewTab })),
);
import FocusTrap from "focus-trap-react";
import axios from "axios";
import {
  RefreshCw,
  Users,
  BookOpen,
  Calendar as CalendarIcon,
  Settings,
  Plus,
  Search,
  Eye,
  Edit,
  Edit2,
  Trash2,
  X,
  BarChart3,
  Filter,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Bell,
  MapPin,
  MoreVertical,
  Check,
  CreditCard,
  Menu,
  ShoppingCart,
  Package,
  LogOut,
  ArrowLeft,
  ClipboardList,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  AlertCircle,
  LayoutDashboard,
  LayoutGrid,
  CheckCircle,
  Clock,
  ChevronRight,
  ChevronLeft,
  Download,
  BarChart2,
  DollarSign,
  ExternalLink,
  HelpCircle,
  Key,
  Globe,
  Mail,
  Phone,
  PieChart,
  Activity,
  Printer,
  FileDown,
  CheckSquare,
  Lock,
  MessageSquare,
  Star,
  Megaphone,
  UserCircle,
  Send,
  User,
  Library,
  Upload,
  Truck,
  PackageCheck,
  Archive,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart as RechartsPieChart,
  Pie,
  LineChart,
  Line,
  LabelList,
} from "recharts";
import { useNavigate, useLocation } from "react-router";
import { toast } from "sonner";
// exceljs and file-saver are dynamically imported inside export handlers to reduce initial bundle size
import { QueryThreadDisplay } from "./QueryThreadDisplay";
import EventExcelManager from "./EventExcelManager";
import { checkIsPastEvent } from "../utils/eventUtils";
import { bookCategories } from "../data/categories";
// html2canvas is dynamically imported inside the poster generation handler

// Automatically attach token to all admin requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    if (config.headers && typeof config.headers.set === "function") {
      config.headers.set("Authorization", `Bearer ${token}`);
    } else if (config.headers) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return config;
});

// Automatically handle 401 errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

const AuthorFullProfileView = lazy(() =>
  import("./AuthorFullProfileView").then((m) => ({
    default: m.AuthorFullProfileView,
  })),
);
const AuthorRegistrationPage = lazy(() =>
  import("./AuthorRegistrationPage").then((m) => ({
    default: m.AuthorRegistrationPage,
  })),
);
const LibraryDonationsTab = lazy(() =>
  import("./LibraryDonationsTab").then((m) => ({
    default: m.LibraryDonationsTab,
  })),
);
const AdminInventoryTab = lazy(() =>
  import("./AdminInventoryTab").then((m) => ({ default: m.AdminInventoryTab })),
);
const AdminReviewsTab = lazy(() =>
  import("./AdminReviewsTab").then((m) => ({ default: m.AdminReviewsTab })),
);
const AdminInvitationsTab = lazy(() =>
  import("./AdminInvitationsTab").then((m) => ({
    default: m.AdminInvitationsTab,
  })),
);
const SalesReportTabLazy = lazy(() =>
  import("./SalesReportTab").then((m) => ({ default: m.SalesReportTab })),
);
const AdminAuthorsTabLazy = lazy(() =>
  import("./AdminAuthorsTab").then((m) => ({ default: m.AdminAuthorsTab })),
);
// WebOrdersTab is lazy-loaded: it contains recharts (PieChart) and is only needed when admin visits the Orders tab
const WebOrdersTabLazy = lazy(() => import("./WebOrdersTab"));
// downloadCataloguePDF is dynamically imported inside handleDownloadCatalogue to decouple CataloguePage from this bundle

const Modal = ({ isOpen, onClose, title, children, maxWidthClass }: any) => {
  if (!isOpen) return null;
  return (
    <FocusTrap
      focusTrapOptions={{ initialFocus: false, allowOutsideClick: true }}
    >
      <div
        className="dash-modal-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          className={`dash-modal ${maxWidthClass || ""}`}
        >
          <div className="dash-modal-header">
            <h3 className="text-sm font-bold uppercase tracking-widest text-paa-navy">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/6 text-paa-gray-text hover:text-paa-navy transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="dash-modal-body space-y-4">{children}</div>
        </div>
      </div>
    </FocusTrap>
  );
};

const SettingsTabComponent = ({
  books,
  API,
}: {
  books: any[];
  API: string;
}) => {
  const activeCategories = React.useMemo(() => {
    const catMap = new Map<string, number>();

    books.forEach((b: any) => {
      let cat = "";
      if (
        b.subGenre &&
        b.subGenre.trim() !== "All" &&
        b.subGenre.trim() !== ""
      ) {
        const parts = b.subGenre.split(">").map((s: string) => s.trim());
        cat = parts[0];
      } else if (b.originalGenre) {
        cat = b.originalGenre;
      }

      if (cat) {
        catMap.set(cat, (catMap.get(cat) || 0) + 1);
      }
    });

    return Array.from(catMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [books]);
  const [settings, setSettings] = useState({
    manualAuthorsCount: "",
    manualBooksCount: "",
    manualEventsCount: "",
    manualDonatedBooksCount: "",
    landing_hero_title: "",
    landing_hero_highlight: "",
    landing_hero_subtitle: "",
    landing_title_color: "",
    landing_highlight_color: "",
    landing_subtitle_color: "",
    landing_featured_categories: "",
    author_hero_title: "",
    author_hero_highlight: "",
    author_hero_subtitle: "",
    organizer_hero_title: "",
    organizer_hero_highlight: "",
    organizer_hero_subtitle: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    axios
      .get(`${API}/api/admin/settings`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => {
        if (res.data) {
          setSettings((prev) => ({ ...prev, ...res.data }));
        }
      })
      .catch((err) => console.error(err));
  }, []);
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await axios.post(`${API}/api/admin/settings`, settings, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.success("Settings saved successfully!");
    } catch (err) {
      toast.error("Failed to save settings");
    }
    setIsSaving(false);
  };
  const [activeSettingTab, setActiveSettingTab] = useState("system");

  return (
    <FocusTrap
      focusTrapOptions={{
        initialFocus: false,
        escapeDeactivates: true,
        clickOutsideDeactivates: true,
      }}
    >
      <div className="space-y-8 w-full animate-fade-in-up">
        {/* System Overrides */}
        <div className="bg-white p-8 border border-paa-navy/5 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out rounded-3xl-2xl">
          <div className="border-b border-paa-navy/5 pb-4 mb-8">
            <h2 className="text-xl font-serif font-medium text-paa-navy mb-1">
              System Overrides
            </h2>
            <p className="text-paa-gray-text text-sm">
              Configure manual overrides for catalogue and landing page
              statistics here.
            </p>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-paa-navy mb-2">
                Total Authors (Manual Override)
              </label>
              <input
                type="number"
                value={settings.manualAuthorsCount || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    manualAuthorsCount: e.target.value,
                  })
                }
                placeholder="Leave blank for dynamic count"
                className="w-full border border-paa-navy/20 bg-gray-50 rounded-lg p-3 text-sm outline-none focus:border-paa-navy focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-paa-navy mb-2">
                Total Books (Manual Override)
              </label>
              <input
                type="number"
                value={settings.manualBooksCount || ""}
                onChange={(e) =>
                  setSettings({ ...settings, manualBooksCount: e.target.value })
                }
                placeholder="Leave blank for dynamic count"
                className="w-full border border-paa-navy/20 bg-gray-50 rounded-lg p-3 text-sm outline-none focus:border-paa-navy focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-paa-navy mb-2">
                Total Events (Manual Override)
              </label>
              <input
                type="number"
                value={settings.manualEventsCount || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    manualEventsCount: e.target.value,
                  })
                }
                placeholder="Leave blank for dynamic count"
                className="w-full border border-paa-navy/20 bg-gray-50 rounded-lg p-3 text-sm outline-none focus:border-paa-navy focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-paa-navy mb-2">
                Total Donated Books (Manual Override)
              </label>
              <input
                type="number"
                value={settings.manualDonatedBooksCount || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    manualDonatedBooksCount: e.target.value,
                  })
                }
                placeholder="Leave blank for dynamic count"
                className="w-full border border-paa-navy/20 bg-gray-50 rounded-lg p-3 text-sm outline-none focus:border-paa-navy focus:bg-white transition-colors"
              />
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-paa-navy text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-paa-gold hover:text-paa-navy transition-all duration-300 disabled:opacity-50 shadow-md"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>

        {/* Main Landing Page Content */}
        <div className="bg-white p-8 border border-paa-navy/5 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out rounded-3xl-2xl">
          <div className="border-b border-paa-navy/5 pb-4 mb-8">
            <h2 className="text-xl font-serif font-medium text-paa-navy mb-1">
              Main Landing Page Content
            </h2>
            <p className="text-paa-gray-text text-sm">
              Configure the hero text, colors, and featured categories
              dynamically.
            </p>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-paa-navy mb-2">
                Hero Title
              </label>
              <input
                type="text"
                value={settings.landing_hero_title || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    landing_hero_title: e.target.value,
                  })
                }
                placeholder="e.g. Helping indie authors self-publish, promote and sell."
                className="w-full border border-paa-navy/20 bg-gray-50 rounded-lg p-3 text-sm outline-none focus:border-paa-navy focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-paa-navy mb-2">
                Highlighted Word(s) in Title
              </label>
              <input
                type="text"
                value={settings.landing_hero_highlight || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    landing_hero_highlight: e.target.value,
                  })
                }
                placeholder="e.g. authors"
                className="w-full border border-paa-navy/20 bg-gray-50 rounded-lg p-3 text-sm outline-none focus:border-paa-navy focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-paa-navy mb-2">
                Hero Subtitle
              </label>
              <textarea
                value={settings.landing_hero_subtitle || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    landing_hero_subtitle: e.target.value,
                  })
                }
                placeholder="e.g. We provide independent authors with refined publishing assistance..."
                className="w-full border border-paa-navy/20 bg-gray-50 rounded-lg p-3 text-sm outline-none focus:border-paa-navy focus:bg-white transition-colors h-24 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-paa-navy mb-2">
                  Title Color
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={settings.landing_title_color || "#0f172a"}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        landing_title_color: e.target.value,
                      })
                    }
                    className="h-10 w-10 p-0 border-0 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.landing_title_color || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        landing_title_color: e.target.value,
                      })
                    }
                    placeholder="#0f172a"
                    className="w-full border border-paa-navy/20 bg-gray-50 rounded-lg p-2 text-sm outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-paa-navy mb-2">
                  Highlight Color
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={settings.landing_highlight_color || "#f16522"}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        landing_highlight_color: e.target.value,
                      })
                    }
                    className="h-10 w-10 p-0 border-0 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.landing_highlight_color || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        landing_highlight_color: e.target.value,
                      })
                    }
                    placeholder="#f16522"
                    className="w-full border border-paa-navy/20 bg-gray-50 rounded-lg p-2 text-sm outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-paa-navy mb-2">
                  Subtitle Color
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={settings.landing_subtitle_color || "#334155"}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        landing_subtitle_color: e.target.value,
                      })
                    }
                    className="h-10 w-10 p-0 border-0 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.landing_subtitle_color || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        landing_subtitle_color: e.target.value,
                      })
                    }
                    placeholder="#334155"
                    className="w-full border border-paa-navy/20 bg-gray-50 rounded-lg p-2 text-sm outline-none"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-paa-navy mb-2">
                Featured Categories (Select multiple)
              </label>
              <div className="border border-paa-navy/20 rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeCategories.map((cat) => {
                  let selectedCategories: string[] = [];
                  try {
                    selectedCategories = settings.landing_featured_categories
                      ? JSON.parse(settings.landing_featured_categories)
                      : [];
                  } catch (e) {}
                  const isSelected = selectedCategories.includes(cat.name);

                  return (
                    <label
                      key={cat.name}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          let updated = [...selectedCategories];
                          if (e.target.checked) {
                            updated.push(cat.name);
                          } else {
                            updated = updated.filter((c) => c !== cat.name);
                          }
                          setSettings({
                            ...settings,
                            landing_featured_categories:
                              JSON.stringify(updated),
                          });
                        }}
                        className="rounded border-paa-navy/30 text-paa-navy focus:ring-paa-navy/50"
                      />
                      <span>
                        {cat.name}{" "}
                        <span className="text-xs text-gray-500">
                          ({cat.count})
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-paa-navy text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-paa-gold hover:text-paa-navy transition-all duration-300 disabled:opacity-50 shadow-md"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>

        {/* Author Landing Page Content */}
        <div className="bg-white p-8 border border-paa-navy/5 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out rounded-3xl-2xl">
          <div className="border-b border-paa-navy/5 pb-4 mb-8">
            <h2 className="text-xl font-serif font-medium text-paa-navy mb-1">
              Author Landing Page Content
            </h2>
            <p className="text-paa-gray-text text-sm">
              Configure the hero text for the /authors page.
            </p>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-paa-navy mb-2">
                Hero Title
              </label>
              <input
                type="text"
                value={settings.author_hero_title || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    author_hero_title: e.target.value,
                  })
                }
                placeholder="e.g. Join the Group and reach out to readers."
                className="w-full border border-paa-navy/20 bg-gray-50 rounded-lg p-3 text-sm outline-none focus:border-paa-navy focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-paa-navy mb-2">
                Highlighted Word(s) in Title
              </label>
              <input
                type="text"
                value={settings.author_hero_highlight || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    author_hero_highlight: e.target.value,
                  })
                }
                placeholder="e.g. Group"
                className="w-full border border-paa-navy/20 bg-gray-50 rounded-lg p-3 text-sm outline-none focus:border-paa-navy focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-paa-navy mb-2">
                Hero Subtitle
              </label>
              <textarea
                value={settings.author_hero_subtitle || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    author_hero_subtitle: e.target.value,
                  })
                }
                placeholder="e.g. Join Pune Authors' Association to self-publish, promote, and sell your books..."
                className="w-full border border-paa-navy/20 bg-gray-50 rounded-lg p-3 text-sm outline-none focus:border-paa-navy focus:bg-white transition-colors h-24 resize-none"
              />
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-paa-navy text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-paa-gold hover:text-paa-navy transition-all duration-300 disabled:opacity-50 shadow-md"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>

        {/* Organizer Landing Page Content */}
        <div className="bg-white p-8 border border-paa-navy/5 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out rounded-3xl-2xl">
          <div className="border-b border-paa-navy/5 pb-4 mb-8">
            <h2 className="text-xl font-serif font-medium text-paa-navy mb-1">
              Organizer Landing Page Content
            </h2>
            <p className="text-paa-gray-text text-sm">
              Configure the hero text for the /organizers page.
            </p>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-paa-navy mb-2">
                Hero Title
              </label>
              <input
                type="text"
                value={settings.organizer_hero_title || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    organizer_hero_title: e.target.value,
                  })
                }
                placeholder="e.g. Invite Authors to Your School or Society"
                className="w-full border border-paa-navy/20 bg-gray-50 rounded-lg p-3 text-sm outline-none focus:border-paa-navy focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-paa-navy mb-2">
                Highlighted Word(s) in Title
              </label>
              <input
                type="text"
                value={settings.organizer_hero_highlight || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    organizer_hero_highlight: e.target.value,
                  })
                }
                placeholder="e.g. Authors"
                className="w-full border border-paa-navy/20 bg-gray-50 rounded-lg p-3 text-sm outline-none focus:border-paa-navy focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-paa-navy mb-2">
                Hero Subtitle
              </label>
              <textarea
                value={settings.organizer_hero_subtitle || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    organizer_hero_subtitle: e.target.value,
                  })
                }
                placeholder="e.g. The Pune Authors' Association is highly active in organizing..."
                className="w-full border border-paa-navy/20 bg-gray-50 rounded-lg p-3 text-sm outline-none focus:border-paa-navy focus:bg-white transition-colors h-24 resize-none"
              />
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-paa-navy text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-paa-gold hover:text-paa-navy transition-all duration-300 disabled:opacity-50 shadow-md"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </FocusTrap>
  );
};

const parseEventDateHelper = (dateStr: string) => {
  if (!dateStr) return new Date(0);
  const d = new Date(dateStr.replace(/-/g, " "));
  return isNaN(d.getTime()) ? new Date(0) : d;
};

export const getAuthorParticipationStats = (author: any, allEvents: any[]) => {
  if (!author) return { participated: 0, total: 0, percentage: 0 };

  const joinDate = author.groupJoiningDate
    ? new Date(author.groupJoiningDate)
    : (author.createdAt ? new Date(author.createdAt) : new Date(0));

  const joinDayStart = new Date(joinDate);
  if (!isNaN(joinDayStart.getTime())) {
    joinDayStart.setHours(0, 0, 0, 0);
  }

  const eligibleEvents = (allEvents || []).filter((ev: any) => {
    if (!ev) return false;
    const evDateStr = ev.date || ev.startDate || ev.createdAt;
    if (!evDateStr) return true;
    const evTime = parseEventDateHelper(evDateStr).getTime();
    return isNaN(joinDayStart.getTime()) || evTime >= joinDayStart.getTime() || evTime === 0;
  });
  const eligibleEventIds = eligibleEvents.map((e: any) => e.id);

  let participatedCount = 0;
  if (typeof author.aggParticipatedEvents === 'number' && author.aggParticipatedEvents > 0) {
    participatedCount = author.aggParticipatedEvents;
  } else {
    const participationList = author.eventParticipation || author.eventAuthors || author.eventRegistrations || [];
    participatedCount = participationList.filter(
      (ea: any) =>
        ea &&
        ea.optInStatus !== "Pending" &&
        ea.optInStatus !== "Rejected" &&
        ea.optInStatus !== "Awaiting Approval" &&
        ea.status !== "Pending" &&
        ea.status !== "Rejected" &&
        ea.status !== "Pending Approval"
    ).length;
  }

  const total = (typeof author.aggEligibleEvents === 'number' && author.aggEligibleEvents > 0)
    ? author.aggEligibleEvents
    : (eligibleEventIds.length > 0 ? eligibleEventIds.length : (allEvents?.length || 0));

  const percentage = total === 0 ? 0 : Math.min(100, Math.round((participatedCount / total) * 100));
  return { participated: participatedCount, total, percentage };
};

export function OperationsDashboardPage() {
  const [selectedAuthorsForCatalogue, setSelectedAuthorsForCatalogue] =
    useState<number[]>([]);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [loading, setLoading] = useState(
    !sessionStorage.getItem("adminAuthors"),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  const [lastFetchedBooks, setLastFetchedBooks] = useState(Date.now());
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "orders"
    | "web_orders"
    | "sales_report"
    | "authors"
    | "books"
    | "inventory"
    | "events"
    | "forms"
    | "gallery"
    | "reviews"
    | "invitations"
    | "late_authors"
    | "helpdesk"
    | "settings"
    | "library_donations"
    | "broadcasts"
    | "event-requests"
    | "documents"
  >(
    (() => {
      const t = localStorage.getItem("adminActiveTab");
      return t === "author_data" ? "overview" : (t as any) || "overview";
    })(),
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedBookDetails, setSelectedBookDetails] = useState<any>(null);
  const [pendingAlerts, setPendingAlerts] = useState({
    orders: false,
    queries: false,
    authors: false,
    books: false,
    fines: false,
  });

  useEffect(() => {
    setPendingAlerts((prev) => {
      const next = { ...prev };
      if (activeTab === "orders" || activeTab === "web_orders")
        next.orders = false;
      if (activeTab === "helpdesk") next.queries = false;
      if (activeTab === "authors") next.authors = false;
      if (activeTab === "books") next.books = false;
      if (activeTab === "late_authors") next.fines = false;
      return next;
    });
  }, [activeTab]);

  const prevCountsRef = React.useRef({
    orders: 0,
    queries: 0,
    authors: 0,
    books: 0,
    fines: 0,
  });
  const prevQueryCountRef = useRef<number>(0);
  const prevOrderCountRef = useRef<number>(0);
  const [dismissedActions, setDismissedActions] = useState<string[]>([]);
  useEffect(() => {}, [activeTab]);
  const [searchTerm, setSearchTerm] = useState("");
  const [authorStatusFilter, setAuthorStatusFilter] = useState("All");
  const [bookStatusFilter, setBookStatusFilter] = useState("All");
  const navigate = useNavigate();
  const location = useLocation();

  // State for data
  const [stats, setStats] = useState<any>(() => {
    const cached = sessionStorage.getItem("adminStats");
    return cached
      ? JSON.parse(cached)
      : {
          totalAuthors: 0,
          totalBooks: 0,
          totalEvents: 0,
          totalLibraries: 0,
          totalRevenue: 0,
          revenueData: [],
          recentActivities: [],
          salesByAuthor: [],
          salesByGenre: [],
          topSellingBooks: [],
          topCustomers: [],
          lowStockAlerts: [],
        };
  });
  const [authors, setAuthors] = useState<any[]>(() => {
    const cached = sessionStorage.getItem("adminAuthors");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed)
          ? parsed.sort((a: any, b: any) =>
              (a.name || "").localeCompare(b.name || "", undefined, {
                sensitivity: "base",
              }),
            )
          : [];
      } catch (e) {}
    }
    return [];
  });
  const [books, setBooks] = useState<any[]>(() => {
    const cached = sessionStorage.getItem("adminBooks");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed)
          ? parsed.sort((a: any, b: any) =>
              (a.title || "").localeCompare(b.title || "", undefined, {
                sensitivity: "base",
              }),
            )
          : [];
      } catch (e) {}
    }
    return [];
  });
  const [events, setEvents] = useState<any[]>(() => {
    const cached = sessionStorage.getItem("adminEvents");
    return cached ? JSON.parse(cached) : [];
  });
  const [orders, setOrders] = useState<any[]>(() => {
    const cached = sessionStorage.getItem("adminOrders");
    return cached ? JSON.parse(cached) : [];
  });
  const [libraries, setLibraries] = useState<any[]>([]);
  const [ordersMeta, setOrdersMeta] = useState<any>({});
  const [ordersPage, setOrdersPage] = useState(1);
  const [authorsMeta, setAuthorsMeta] = useState<any>({});
  const [authorsPage, setAuthorsPage] = useState(1);

  // Modals state
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [participantsData, setParticipantsData] = useState<any>(null);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
  const [isAuthorModalOpen, setIsAuthorModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);
  const [posterData, setPosterData] = useState<{
    name: string;
    date: string;
    location: string;
  } | null>(null);
  const [generatedPoster, setGeneratedPoster] = useState<File | null>(null);
  const [generatedPosterPreview, setGeneratedPosterPreview] = useState<
    string | null
  >(null);

  const [showAuthorDataModal, setShowAuthorDataModal] = useState(false);
  const [showAllPlatformAuthors, setShowAllPlatformAuthors] = useState(false);
  const [isEditingKPIs, setIsEditingKPIs] = useState(false);
  const [selectedEventForData, setSelectedEventForData] = useState<any>(null);
  const [selectedAuthorForData, setSelectedAuthorForData] = useState<any>(null);

  const [reportEventId, setReportEventId] = useState<number | null>(null);
  const [eventReportData, setEventReportData] = useState<any>(null);
  const [pendingReportStatus, setPendingReportStatus] = useState<any>(null);

  const [selectedAuthor, setSelectedAuthor] = useState<any>(null);
  const [selectedPendingAuthor, setSelectedPendingAuthor] = useState<any>(null);
  const handleViewEditAuthor = async (author: any) => {
    toast.promise(
      axios
        .get(`${API}/api/admin/authors/${author.id}/dashboard-data`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
        .then((res) => res.data.authorProfile),
      {
        loading: "Loading author details...",
        success: (fullAuthor) => {
          setSelectedPendingAuthor(fullAuthor);
          return "Details loaded!";
        },
        error: "Failed to load author details",
      },
    );
  };
  const [editingBook, setEditingBook] = useState<any>(null);
  const [isEditBookModalOpen, setIsEditBookModalOpen] = useState(false);
  const [rejectAuthorTarget, setRejectAuthorTarget] = useState<any>(null);
  const [rejectReasons, setRejectReasons] = useState<string[]>([]);
  const [otherReason, setOtherReason] = useState("");
  const [selectedAuthorIds, setSelectedAuthorIds] = useState<number[]>([]);
  const [showArchivedEvents, setShowArchivedEvents] = useState(false);
  const [showArchivedDocs, setShowArchivedDocs] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<any>(null);
  const [isEditAuthorModalOpen, setIsEditAuthorModalOpen] = useState(false);

  const [forms, setForms] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [selectedFormResponses, setSelectedFormResponses] = useState<any>(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);

  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const [selectedGalleryEvent, setSelectedGalleryEvent] = useState<any>(null);
  const [isEditGalleryModalOpen, setIsEditGalleryModalOpen] = useState(false);
  const [editingGalleryEvent, setEditingGalleryEvent] = useState<any>(null);

  // Gallery Tab State
  const [galleryTabSearchTerm, setGalleryTabSearchTerm] = useState("");
  const [galleryTabFilterType, setGalleryTabFilterType] = useState("");
  const [galleryTabFilterDate, setGalleryTabFilterDate] = useState("");
  const [galleryTabSortBy, setGalleryTabSortBy] = useState("date_desc");
  const [galleryUploadFiles, setGalleryUploadFiles] = useState<File[]>([]);
  const [galleryUploadCaption, setGalleryUploadCaption] = useState("");
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [bannerUploadFile, setBannerUploadFile] = useState<File | null>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isDeletingBanner, setIsDeletingBanner] = useState(false);
  const [gallerySubTab, setGallerySubTab] = useState<"events" | "carousel">(
    "events",
  );
  const [carouselImages, setCarouselImages] = useState<any[]>([]);
  const [uploadingCarousel, setUploadingCarousel] = useState(false);
  const carouselFileInputRef = useRef<HTMLInputElement>(null);
  const [viewingGalleryImage, setViewingGalleryImage] = useState<string | null>(
    null,
  );

  // Events tab lifted state
  const [selectedEventBreakdown, setSelectedEventBreakdown] =
    useState<any>(null);
  const [hasGranularData, setHasGranularData] = useState(false);
  const [pendingQueriesCount, setPendingQueriesCount] = useState(0);
  const [authorSearch, setAuthorSearch] = useState("");
  const [expandedAuthorId, setExpandedAuthorId] = useState<number | null>(null);
  const [expandedEventIndex, setExpandedEventIndex] = useState<number | null>(
    null,
  );
  const [eventSearch, setEventSearch] = useState("");
  const [createEventDate, setCreateEventDate] = useState("");
  const [createDateType, setCreateDateType] = useState<"exact" | "tentative">("exact");
  const [lastAdminVisit] = useState<number>(() => {
    const saved = localStorage.getItem('lastAdminVisit');
    const time = saved ? parseInt(saved) : Date.now() - (24 * 60 * 60 * 1000); // default to 24h ago
    localStorage.setItem('lastAdminVisit', Date.now().toString());
    return time;
  });
  const [createTentativeDate, setCreateTentativeDate] = useState("");
  const [createEventStatus, setCreateEventStatus] = useState("Upcoming");
  const [manageAuthorBooks, setManageAuthorBooks] = useState<any[]>([]);
  const [manageRegStatus, setManageRegStatus] = useState("Registered");
  const [managePaymentStatus, setManagePaymentStatus] = useState("Unpaid");
  const [manageAmountPaid, setManageAmountPaid] = useState<number>(0);
  const [isPublishingData, setIsPublishingData] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isManageDataDirty, setIsManageDataDirty] = useState(false);
  const [currentOptInStatus, setCurrentOptInStatus] = useState<string | null>(
    null,
  );
  const [useGlobalOverride, setUseGlobalOverride] = useState(false);
  const [globalSold, setGlobalSold] = useState(0);
  const [globalRevenue, setGlobalRevenue] = useState(0);
  const [manualDailySales, setManualDailySales] = useState<Record<string, {sold: number, revenue: number}>>({});
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [showBooksSold, setShowBooksSold] = useState(true);
  const [eventGraphFilter, setEventGraphFilter] = useState("All");
  const [eventTimeFilter, setEventTimeFilter] = useState(new Date().getFullYear().toString());
  const [viewingRegistrationsEventId, setViewingRegistrationsEventId] =
    useState<number | null>(null);
  const [eventRegistrations, setEventRegistrations] = useState<any[]>([]);
  const [eventUniqueDates, setEventUniqueDates] = useState<string[]>([]);
  const [eventRegistryFilter, setEventRegistryFilter] = useState("All Events");
  const [rankingMode, setRankingMode] = useState<"participation" | "books">(
    "participation",
  );
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [registrationsFilter, setRegistrationsFilter] = useState("All");
  const [registrationsPage, setRegistrationsPage] = useState(1);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [serverFiles, setServerFiles] = useState<any[]>([]);
  const [newNotification, setNewNotification] = useState("");
  const [notificationDocument, setNotificationDocument] = useState<File | null>(
    null,
  );
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(-1);

  const fetchEventRegistrations = async (eventId: number) => {
    setLoadingRegistrations(true);
    try {
      const res = await axios.get(
        `${API}/api/admin/events/${eventId}/registrations`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setEventRegistrations(res.data.registrations || res.data);
      setEventUniqueDates(res.data.uniqueDates || []);
    } catch (err) {
      toast.error("Failed to load registrations");
    } finally {
      setLoadingRegistrations(false);
    }
  };

  const handleApproveRegistration = async (
    eventId: number,
    authorId: number,
  ) => {
    try {
      await axios.post(
        `${API}/api/admin/events/${eventId}/author/${authorId}/approve`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      toast.success("Registration approved");
      fetchEventRegistrations(eventId);
      fetchEvents();
    } catch (err) {
      toast.error("Failed to approve registration");
    }
  };

  const updateTransactionId = async (
    eventId: number,
    authorId: number,
    txnId: string,
  ) => {
    if (!txnId.trim()) return;
    try {
      await axios.put(
        `${API}/api/admin/events/${eventId}/author/${authorId}/transaction`,
        { transactionId: txnId },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      toast.success("Transaction ID updated");
      fetchEventRegistrations(eventId);
    } catch (err) {
      toast.error("Failed to update Transaction ID");
    }
  };

  const EVENT_REJECTION_REASONS = [
    "Incomplete or Invalid Payment Screenshot",
    "Event is Full / No Stalls Available",
    "Author Profile Incomplete",
    "Payment Not Received in Bank",
    "Mismatch in Fee Amount Paid",
    "Duplicate Registration",
  ];
  const [rejectEventTarget, setRejectEventTarget] = useState<any>(null); // { eventId, authorId }
  const [rejectEventReasons, setRejectEventReasons] = useState<string[]>([]);
  const [otherEventReason, setOtherEventReason] = useState("");

  const openRejectEventModal = (eventId: number, authorId: number) => {
    setRejectEventTarget({ eventId, authorId });
    setRejectEventReasons([]);
    setOtherEventReason("");
  };

  const handleRejectEventSubmit = async () => {
    const reasons = [...rejectEventReasons];
    if (otherEventReason.trim()) reasons.push(otherEventReason.trim());
    if (reasons.length === 0) {
      alert("Please select or enter at least one reason.");
      return;
    }
    const reason = reasons.join("; ");
    try {
      await axios.post(
        `${API}/api/admin/events/${rejectEventTarget.eventId}/author/${rejectEventTarget.authorId}/reject`,
        { reason },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      toast.success("Registration rejected");
      fetchEventRegistrations(rejectEventTarget.eventId);
      setRejectEventTarget(null);
    } catch (err) {
      toast.error("Failed to reject registration");
    }
  };

  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

  const fetchOverview = async (isBackground = false) => {
    if (!isBackground) setIsRefreshing(true);
    try {
      const res = await axios.get(`${API}/api/admin/dashboard-stats`);
      setStats(res.data);
      sessionStorage.setItem("adminStats", JSON.stringify(res.data));
    } catch (err) {
    } finally {
      if (!isBackground) setIsRefreshing(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API}/api/notifications`);
      setNotifications(res.data);
    } catch (err) {}
  };

  const fetchServerFiles = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/server-files`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setServerFiles(res.data);
    } catch (err) {}
  };

  const fetchAuthors = async (isBackground = false) => {
    if (!isBackground) setIsRefreshing(true);
    try {
      const res = await axios.get(
        `${API}/api/admin/authors?page=${authorsPage}&limit=50`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      if (res.data.data) {
        const sortedData = res.data.data.sort((a: any, b: any) =>
          (a.name || "").localeCompare(b.name || "", undefined, {
            sensitivity: "base",
          }),
        );
        setAuthors(sortedData);
        setAuthorsMeta(res.data.meta);
        sessionStorage.setItem("adminAuthors", JSON.stringify(sortedData));
        setLastFetchedBooks(Date.now());
        const c = res.data.meta.totalPending || 0;
        if (c > prevCountsRef.current.authors)
          setPendingAlerts((prev) => ({ ...prev, authors: true }));
        prevCountsRef.current.authors = c;
      } else {
        const sortedData = res.data.sort((a: any, b: any) =>
          (a.name || "").localeCompare(b.name || "", undefined, {
            sensitivity: "base",
          }),
        );
        setAuthors(sortedData);
        sessionStorage.setItem("adminAuthors", JSON.stringify(sortedData));
        setLastFetchedBooks(Date.now());
        const c = res.data.filter((a: any) => a.status === "Pending").length;
        if (c > prevCountsRef.current.authors)
          setPendingAlerts((prev) => ({ ...prev, authors: true }));
        prevCountsRef.current.authors = c;
      }

      const latestAuthors = res.data.data ? res.data.data : res.data;
      const pendingFineCount = latestAuthors.filter((a: any) => {
        const ed =
          typeof a.extraData === "string"
            ? (() => {
                try {
                  return JSON.parse(a.extraData);
                } catch (e) {
                  return {};
                }
              })()
            : a.extraData || {};
        return (
          ed?.fineStatus === "Pending Verification" ||
          (!ed?.fineStatus && ed?.finePaymentScreenshot)
        );
      }).length;
      if (pendingFineCount > prevCountsRef.current.fines)
        setPendingAlerts((prev) => ({ ...prev, fines: true }));
      prevCountsRef.current.fines = pendingFineCount;
    } catch (err) {
    } finally {
      if (!isBackground) setIsRefreshing(false);
    }
  };

  const fetchBooks = async (isBackground = false) => {
    if (!isBackground) setIsRefreshing(true);
    try {
      const res = await axios.get(`${API}/api/admin/books`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const sortedData = res.data.sort((a: any, b: any) =>
        (a.title || "").localeCompare(b.title || "", undefined, {
          sensitivity: "base",
        }),
      );
      setBooks(sortedData);
      sessionStorage.setItem("adminBooks", JSON.stringify(sortedData));
      setLastFetchedBooks(Date.now());
      const c = sortedData.filter((b: any) => b.status === "Pending").length;
      if (c > prevCountsRef.current.books)
        setPendingAlerts((prev) => ({ ...prev, books: true }));
      prevCountsRef.current.books = c;
    } catch (err) {
    } finally {
      if (!isBackground) setIsRefreshing(false);
    }
  };

  const fetchEvents = async (isBackground = false) => {
    if (!isBackground) setIsRefreshing(true);
    try {
      const res = await axios.get(
        `${API}/api/admin/events?_t=${new Date().getTime()}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      let allEvts = res.data;
      try {
        const propRes = await axios.get(`${API}/api/admin/proposed-events`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        allEvts = [...propRes.data, ...res.data];
      } catch (err) {}
      setEvents(allEvts);
      sessionStorage.setItem("adminEvents", JSON.stringify(res.data));
    } catch (err) {
    } finally {
      if (!isBackground) setIsRefreshing(false);
    }
  };

  const fetchLibraries = async (isBackground = false) => {
    try {
      const res = await axios.get(`${API}/api/admin/libraries`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setLibraries(res.data);
    } catch (err) {}
  };

  const handleNotifySettlement = async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/events/${reportEventId}/notify-settlement`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      toast.success("Notification emails sent to all pending authors!");
    } catch (err) {
      toast.error("Failed to notify authors");
    }
  };

  const fetchEventReport = async (eventId: any) => {
    if (typeof eventId === "string" && eventId.startsWith("legacy_")) return;
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/events/${eventId}/report`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      if (res.data.status === "live") {
        setEventReportData(res.data);
        setPendingReportStatus(null);
      } else if (res.data.status === "pending") {
        setPendingReportStatus(res.data);
        setEventReportData(res.data.data || []);
      } else {
        setPendingReportStatus(null);
        setEventReportData(res.data.data);
      }
      setReportEventId(eventId);
    } catch (err) {
      toast.error("Failed to load event report");
    }
  };

  const handleBroadcastEvent = async (
    eventId: number,
    target: "Authors" | "Customers",
  ) => {
    try {
      const res = await axios.post(
        `${API}/api/admin/events/${eventId}/broadcast`,
        { target },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      toast.success(res.data.message);
      fetchEvents();
    } catch (err) {
      toast.error("Failed to broadcast event");
    }
  };

  const handleDeleteServerFile = async (filename: string) => {
    if (window.confirm("Are you sure you want to delete this uploaded doc?")) {
      await axios.delete(`${API}/api/admin/server-files/${filename}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.success("Document deleted successfully");
      fetchServerFiles();
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!window.confirm("Are you sure you want to archive this event?")) return;
    try {
      await axios.delete(`${API}/api/admin/events/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.success("Event archived successfully");
      fetchEvents();
    } catch (err) {
      toast.error("Failed to archive event");
    }
  };

  const handleHardDeleteEvent = async (id: number) => {
    if (!window.confirm("Are you sure you want to PERMANENTLY DELETE this event? This action cannot be undone.")) return;
    try {
      await axios.delete(`${API}/api/admin/events/${id}?hard=true`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.success("Event permanently deleted");
      fetchEvents();
    } catch (err) {
      toast.error("Failed to delete event");
    }
  };

  const handleRestoreEvent = async (id: number) => {
    if (!window.confirm("Are you sure you want to restore this event?")) return;
    try {
      await axios.put(`${API}/api/admin/events/${id}/restore`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.success("Event restored successfully");
      fetchEvents();
    } catch (err) {
      toast.error("Failed to restore event");
    }
  };

  const handleEditEventClick = (event: any) => {
    let dt = event.dateType;
    if (!dt) {
      dt = event.date && isNaN(Date.parse(event.date)) ? "tentative" : "exact";
    }
    setEditingEvent({
      id: event.id,
      name: event.name,
      date: event.date,
      dateType: dt,
      tentativeDate:
        event.tentativeDate || (dt === "tentative" ? event.date : ""),
      duration: event.duration,
      location: event.location,
      status: event.status,
      eventType: event.eventType || "Book Fair",
      category: event.category || "",
      description: event.description || "",
      registrationFee: event.registrationFee || 0,
      feeType: event.feeType || "Per Author",
      startTime: event.startTime || "",
      endTime: event.endTime || "",
      livePosEnabled: event.livePosEnabled,
    });
    setIsEditEventModalOpen(true);
  };

  const handleEditEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    try {
      const form = e.target as HTMLFormElement;

      const fd = new FormData();
      fd.append("name", editingEvent.name);
      const editDateTypeVal = editingEvent.dateType || "exact";
      const editDateVal =
        editDateTypeVal === "exact"
          ? editingEvent.date
          : editingEvent.tentativeDate || editingEvent.date;
      fd.append("dateType", editDateTypeVal);
      fd.append("date", editDateVal);
      if (editDateTypeVal === "tentative") {
        fd.append("tentativeDate", editDateVal);
      }
      fd.append("location", editingEvent.location);
      fd.append("duration", editingEvent.duration);
      fd.append("startTime", editingEvent.startTime || "");
      fd.append("endTime", editingEvent.endTime || "");
      fd.append("eventType", editingEvent.eventType || "");
      fd.append("category", editingEvent.category || "");
      fd.append("registrationFee", editingEvent.registrationFee.toString());
      fd.append("feeType", editingEvent.feeType);
      fd.append("status", editingEvent.status);
      fd.append(
        "livePosEnabled",
        editingEvent.livePosEnabled ? "true" : "false",
      );

      const descVal = (
        form.elements.namedItem("description") as HTMLTextAreaElement
      )?.value;
      if (descVal) fd.append("description", descVal);

      const bannerInput = form.elements.namedItem("banner") as HTMLInputElement;
      if (bannerInput && bannerInput.files && bannerInput.files[0]) {
        fd.append("banner", bannerInput.files[0]);
      }

      await axios.put(`${API}/api/admin/events/${editingEvent.id}`, fd, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.success("Event updated successfully");
      setIsEditEventModalOpen(false);
      fetchEvents();
    } catch (err) {
      toast.error("Failed to update event");
    }
  };

  const fetchOrders = async (background = false) => {
    if (!background) setIsRefreshing(true);
    try {
      const w = window as any;
      w.__apiCache = w.__apiCache || {};
      if (!background && w.__apiCache.adminOrders) {
        setOrders(w.__apiCache.adminOrders);
        if (w.__apiCache.adminOrdersMeta)
          setOrdersMeta(w.__apiCache.adminOrdersMeta);
        prevOrderCountRef.current = w.__apiCache.adminOrders.length;
      }

      // Fetch overview stats in the background so KPI cards stay in sync
      fetchOverview(true).catch(() => {});

      const res = await axios.get(
        `${API}/api/admin/orders?page=${ordersPage}&limit=50`,
      );
      const newCount = res.data.meta?.total || res.data.length;

      if (
        background &&
        prevOrderCountRef.current > 0 &&
        newCount > prevOrderCountRef.current &&
        activeTab !== "orders"
      ) {
        setPendingAlerts((prev) => ({ ...prev, orders: true }));
      }
      prevOrderCountRef.current = newCount;
      if (res.data.data) {
        w.__apiCache.adminOrders = res.data.data;
        w.__apiCache.adminOrdersMeta = res.data.meta;
        sessionStorage.setItem("adminOrders", JSON.stringify(res.data.data));
        setOrders(res.data.data);
        setOrdersMeta(res.data.meta);
        const c = res.data.meta.toApproveOrders || 0;
        if (c > prevCountsRef.current.orders)
          setPendingAlerts((prev) => ({ ...prev, orders: true }));
        prevCountsRef.current.orders = c;
      } else {
        setOrders(res.data);
      }
    } catch (err) {
    } finally {
      if (!background) setIsRefreshing(false);
    }
  };

  const fetchQueriesAlert = async (silent?: boolean) => {
    try {
      const res = await axios.get(`${API}/api/admin/queries`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const c = res.data.filter((q: any) => q.status === "Pending").length;
      if (c > prevCountsRef.current.queries)
        setPendingAlerts((prev) => ({ ...prev, queries: true }));
      setPendingQueriesCount(c);
      prevCountsRef.current.queries = c;
    } catch (err) {}
  };

  const fetchForms = async (isBackground = false) => {
    if (!isBackground) setIsRefreshing(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/api/admin/forms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setForms(res.data);
    } catch (err) {
    } finally {
      if (!isBackground) setIsRefreshing(false);
    }
  };

  const fetchGallery = async (isBackground = false) => {
    if (!isBackground) setIsRefreshing(true);
    try {
      const res = await axios.get(`${API}/api/gallery`);
      const now = new Date();
      setGallery(res.data.filter((e: any) => new Date(e.date) <= now));
    } catch (err) {
    } finally {
      if (!isBackground) setIsRefreshing(false);
    }
  };

  const fetchCarouselImages = async () => {
    try {
      const res = await axios.get(`${API}/api/carousel`);
      setCarouselImages(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (
      location.pathname === "/operations" ||
      location.pathname === "/operations/"
    ) {
      if (selectedEventBreakdown) {
        setSelectedEventBreakdown(null);
        setSelectedAuthorForData(null);
      }
    } else if (
      events.length > 0 &&
      location.pathname.startsWith("/operations/events/")
    ) {
      const slug = location.pathname.split("/operations/events/")[1];
      if (slug) {
        const idMatch = slug.match(/^(\d+)-/);
        const eventId = idMatch ? parseInt(idMatch[1], 10) : null;

        let evt = null;
        if (eventId) evt = events.find((e: any) => e.id === eventId);
        if (!evt)
          evt = events.find(
            (e: any) => e.name.replace(/\s+/g, "-").toLowerCase() === slug,
          );

        if (evt) {
          if (!selectedEventBreakdown || selectedEventBreakdown.id !== evt.id) {
            setActiveTab("events");
            setSelectedEventBreakdown(evt);
            const isPastOrLegacy =
              evt.isLegacy ||
              evt.status === "Past" ||
              evt.status === "Legacy Archive";
            setShowAllPlatformAuthors(false);
            fetchEventRegistrations(evt.id);
            fetchAuthors(true);
            setTimeout(() => {
              const scrollEl = document.getElementById(
                "admin-dashboard-scroll",
              );
              if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: "auto" });
              else window.scrollTo({ top: 0, behavior: "auto" });
            }, 0);
          }
        }
      }
    }
  }, [events, location.pathname, selectedEventBreakdown]);

  // Removing auto-refresh per user request
  useEffect(() => {
    if (!selectedEventBreakdown?.id) return;
    // Removed 15s poller
  }, [selectedEventBreakdown?.id]);

  useEffect(() => {
    const fetchCurrentTabData = async (isBackground = false) => {
      if (!isBackground) setIsRefreshing(true);
      try {
        // Optimized data fetching: Only fetch what is necessary for the active tab
        const promises = [];
        if (activeTab === "overview") {
          promises.push(fetchOverview(isBackground));
          promises.push(fetchOrders(true));
          promises.push(fetchAuthors(isBackground));
          promises.push(fetchBooks(isBackground));
          promises.push(fetchNotifications());
          promises.push(fetchServerFiles());
        } else if (activeTab === "authors") {
          promises.push(fetchAuthors(isBackground));
        } else if (activeTab === "books") {
          promises.push(fetchBooks(isBackground));
        } else if (activeTab === "events") {
          promises.push(fetchEvents());
        } else if (activeTab === "invitations") {
          // No alerts required to clear on init, just navigating
        } else if (activeTab === "orders" || activeTab === "web_orders") {
          promises.push(fetchOrders(true));
        } else if (activeTab === "forms") {
          promises.push(fetchForms(isBackground));
        } else if (activeTab === "gallery") {
          promises.push(fetchGallery(isBackground));
          promises.push(fetchCarouselImages());
          promises.push(fetchEvents(isBackground));
          promises.push(fetchLibraries(isBackground));
        } else if (activeTab === "helpdesk") {
          promises.push(fetchQueriesAlert(true));
        } else if (activeTab === "broadcasts" || activeTab === "documents") {
          promises.push(fetchNotifications());
          promises.push(fetchServerFiles());
        }
        // Always fetch lightweight alerts
        promises.push(fetchQueriesAlert(true));

        await Promise.all(promises);
        setLastRefreshTime(Date.now());
      } finally {
        if (!isBackground) setTimeout(() => setIsRefreshing(false), 800);
        if (!isBackground) setLoading(false);
      }
    };

    fetchCurrentTabData(false);
  }, [activeTab]);

  const hasCheckedCatalogue = useRef(false);
  useEffect(() => {
    if (hasCheckedCatalogue.current) return;
    hasCheckedCatalogue.current = true;

    // Silent background check for catalogue PDF existence on initial load
    const checkAndGenerateCatalogue = async () => {
      try {
        const pdfUrl = API
          ? `${API}/uploads/catalogue.pdf`
          : "http://localhost:3001/uploads/catalogue.pdf";
        const res = await fetch(pdfUrl, { method: "HEAD" });
        if (!res.ok && res.status === 404) {
          console.log(
            "Catalogue PDF not found on server, generating first-time backup silently...",
          );
          autoRegenerateCompleteCatalogue();
        }
      } catch (err) {
        // Ignore network errors or CORS errors, we just want to catch the 404
      }
    };

    // Slight delay to ensure dashboard renders first without blocking
    setTimeout(() => {
      checkAndGenerateCatalogue();
    }, 2000);
  }, []);

  // Handlers
  const handleDeleteAuthor = async (id: number) => {
    if (window.confirm("Are you sure you want to remove this author?")) {
      try {
        await axios.delete(`${API}/api/admin/authors/${id}`);
        toast.success("Author Removed");
        fetchAuthors();
        fetchOverview();
        autoRegenerateCompleteCatalogue();
      } catch (err) {
        toast.error("Failed to remove author");
      }
    }
  };

  const handleRestoreAuthor = async (id: number) => {
    try {
      await axios.put(`${API}/api/admin/authors/${id}/restore`);
      toast.success("Author Restored from Archive");
      fetchAuthors();
      fetchBooks();
      fetchOverview();
      autoRegenerateCompleteCatalogue();
    } catch (err) {
      toast.error("Failed to restore author");
    }
  };

  const autoRegenerateCompleteCatalogue = async () => {
    try {
      console.log("Auto-regenerating complete catalogue in the background...");
      // Get all active authors directly using public endpoint
      const res = await axios.get(`${API}/api/public/authors`);
      const fullAuthorsData = res.data;

      const formattedBooks: any[] = [];
      fullAuthorsData.forEach((author: any) => {
        if (!author) return;
        let ed = author.extraData;
        if (typeof ed === "string") {
          try {
            ed = JSON.parse(ed);
          } catch (e) {
            ed = {};
          }
        }
        ed = ed || {};

        const authorBooks = author.books || [];
        if (authorBooks.length === 0) {
          formattedBooks.push({
            id: "NO_BOOK",
            title: "",
            synopsis: "",
            mrp: null,
            mrpRaw: "",
            coverUrl: "",
            authorName: author.name || "Unknown Author",
            authorBio: author.bio || "",
            authorPhotoUrl: author.photoUrl || "",
            authorInstagram: author.instagram || ed.instagram || "",
            authorFacebook: author.facebook || ed.facebook || "",
            authorWhatsapp: author.whatsapp || ed.whatsapp || "",
            authorQualification: author.qualification || ed.qualification || "",
            authorAge: author.age || ed.age || "",
            authorExperience: author.experience || ed.experience || "",
            authorSkills: author.skills || ed.skills || "",
            authorHobbies: author.hobbies || ed.hobbies || "",
            genre: "",
            subGenre: "",
            pages: null,
            language: "",
            isbn: "",
            publisher: "",
            publicationDate: "",
            edition: "",
            format: "",
            rating: 5,
            reviewsCount: 10,
          });
        } else {
          authorBooks.forEach((book: any) => {
            formattedBooks.push({
              id: book.id || String(Math.random()),
              title: book.title || "Untitled",
              synopsis: book.synopsis || "",
              mrp: parseFloat(book.mrp) || null,
              mrpRaw: String(book.mrp || ""),
              coverUrl: book.coverUrl || "",
              authorName: author.name || "Unknown Author",
              authorBio: author.bio || "",
              authorPhotoUrl: author.photoUrl || "",
              authorInstagram: author.instagram || ed.instagram || "",
              authorFacebook: author.facebook || ed.facebook || "",
              authorWhatsapp: author.whatsapp || ed.whatsapp || "",
              authorQualification:
                author.qualification || ed.qualification || "",
              authorAge: author.age || ed.age || "",
              authorExperience: author.experience || ed.experience || "",
              authorSkills: author.skills || ed.skills || "",
              authorHobbies: author.hobbies || ed.hobbies || "",
              genre: book.genre || "General",
              subGenre: book.subGenre || "",
              pages: parseInt(book.pages) || null,
              language: book.language || "English",
              isbn: book.isbn || "",
              publisher: book.publisher || "",
              publicationDate: book.publicationDate || "",
              edition: book.edition || "",
              format: book.format || "",
              rating: 5,
              reviewsCount: 10,
            });
          });
        }
      });
      // Call downloadCataloguePDF silently!
      // signature: (label, books, setDownloading, stats, isPrintable, autoUpload, silentSave)
      const { downloadCataloguePDF } = await import("./CataloguePage");
      await downloadCataloguePDF(
        "Complete",
        formattedBooks,
        () => {},
        {},
        false,
        true,
        true,
      );
      console.log("Background catalogue regeneration complete.");
    } catch (err) {
      console.error("Auto regeneration failed", err);
    }
  };

  const handleApproveAuthor = async (id: number) => {
    try {
      setLoadingAction("approveAuthor_" + id);
      await axios.post(`${API}/api/admin/authors/${id}/approve`);
      toast.success("Author Approved!");
      fetchAuthors();
      fetchBooks();

      // Auto regenerate catalogue when new author is approved
      autoRegenerateCompleteCatalogue();
    } catch (err) {
      toast.error("Failed to approve author");
    } finally {
      setLoadingAction(null);
    }
  };

  const AUTHOR_REJECTION_REASONS = [
    "Book cover image not provided or incorrect",
    "Book title is missing or unclear",
    "Author bio is too short or missing",
    "Incomplete registration details",
    "Duplicate registration detected",
    "Book synopsis not provided",
    "Contact information incorrect",
    "Payment not verified",
    "Content policy violation",
  ];

  const BOOK_REJECTION_REASONS = [
    "Cover image is blurry, low quality, or inappropriate",
    "Synopsis is missing, unclear, or too short",
    "Book pricing is missing or incorrect",
    "Content violates platform guidelines",
    "Formatting, language, or metadata issues",
    "Duplicate book entry detected",
    "ISBN or Publication details are invalid",
  ];

  const [rejectBookTarget, setRejectBookTarget] = useState<any>(null);
  const [rejectBookReasons, setRejectBookReasons] = useState<string[]>([]);
  const [otherBookReason, setOtherBookReason] = useState("");

  const openRejectAuthorModal = (author: any) => {
    setRejectAuthorTarget(author);
    setRejectReasons([]);
    setOtherReason("");
  };

  const handleRejectAuthorSubmit = async () => {
    const reasons = [...rejectReasons];
    if (otherReason.trim()) reasons.push(otherReason.trim());
    if (reasons.length === 0) {
      alert("Please select or enter at least one reason.");
      return;
    }
    const reason = reasons.join("; ");
    setLoadingAction("rejectAuthor");
    try {
      const isEdit =
        rejectAuthorTarget.status === "Edited" ||
        (() => {
          try {
            return JSON.parse(rejectAuthorTarget.extraData).hasPendingEdits;
          } catch (e) {
            return rejectAuthorTarget.extraData?.hasPendingEdits;
          }
        })();
      if (isEdit) {
        await axios.post(
          `${API}/api/admin/authors/${rejectAuthorTarget.id}/reject-edits`,
          { reason },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        toast.success("Author Edits Rejected");
      } else {
        await axios.post(
          `${API}/api/admin/authors/${rejectAuthorTarget.id}/reject`,
          { reason },
        );
        toast.success("Author Rejected");
      }
      setRejectAuthorTarget(null);
      fetchAuthors();
    } catch (err) {
      toast.error("Failed to reject author");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEditAuthorClick = (author: any) => {
    setEditingAuthor({
      id: author.id,
      name: author.name,
      bio: author.bio || "",
      phone: author.phone || "",
      whatsapp: author.whatsapp || "",
      penName: author.penName || "",
      city: author.city || "",
      state: author.state || "",
      address: author.address || "",
      aadharNumber: author.aadharNumber || "",
      qualification: author.qualification || "",
      age: author.age || "",
      experience: author.experience || "",
      skills: author.skills || "",
      hobbies: author.hobbies || "",
      instagram: author.instagram || "",
      facebook: author.facebook || "",
      whyJoining: author.whyJoining || "",
      groupJoiningDate: author.groupJoiningDate || "",
      books: author.books || [],
    });
    setIsEditAuthorModalOpen(true);
  };

  const handleUpdateAuthor = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingAuthor) return;

    // Validation
    const errors: string[] = [];
    if (!editingAuthor.name?.trim()) errors.push("Name is required");
    if (!editingAuthor.phone?.trim()) errors.push("Phone is required");
    if (
      editingAuthor.phone &&
      !/^\d{10}$/.test(editingAuthor.phone.replace(/\D/g, ""))
    )
      errors.push("Phone must be 10 digits");
    if (editingAuthor.email && !/^\S+@\S+\.\S+$/.test(editingAuthor.email))
      errors.push("Invalid email format");
    const bioWords =
      editingAuthor.bio?.split(/\s+/).filter(Boolean).length || 0;
    if (editingAuthor.bio && (bioWords < 100 || bioWords > 150))
      errors.push(`Bio must be 100-150 words (currently ${bioWords})`);
    if (editingAuthor.books && editingAuthor.books.length > 0) {
      editingAuthor.books.forEach((b: any, i: number) => {
        if (!b.title?.trim()) errors.push(`Book ${i + 1}: Title is required`);
        if (!b.genre?.trim()) errors.push(`Book ${i + 1}: Genre is required`);
        if (!b.mrp || parseFloat(b.mrp) <= 0)
          errors.push(`Book ${i + 1}: MRP must be greater than 0`);
        if (!b.stock || parseInt(b.stock) < 0)
          errors.push(`Book ${i + 1}: Initial Stock is required (>= 0)`);
        if (!b.pages) errors.push(`Book ${i + 1}: Pages is required`);
      });
    }
    if (errors.length > 0) {
      alert(`Please fix the following:\n\n${errors.join("\n")}`);
      return;
    }

    setLoadingAction("updateAuthor");
    try {
      await axios.put(
        `${API}/api/admin/authors/${editingAuthor.id}`,
        editingAuthor,
      );
      setIsEditAuthorModalOpen(false);
      setEditingAuthor(null);
      fetchAuthors();
      toast.success("Author profile updated!");
    } catch (err) {
      toast.error("Failed to update author");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteBook = async (id: number) => {
    if (window.confirm("Are you sure you want to remove this book?")) {
      await axios.delete(`${API}/api/admin/books/${id}`);
      fetchBooks();
      fetchOverview();
    }
  };

  const handleSendNotification = async (
    e?: React.FormEvent,
    forceTarget?: boolean | string,
  ) => {
    if (e) e.preventDefault();
    if (!newNotification.trim() && !notificationDocument) return;
    try {
      const token = localStorage.getItem("token");
      let target = "ALL";
      
      if (typeof forceTarget === 'string') {
        target = forceTarget;
      } else if (forceTarget === true) {
        target = "ALL";
      } else {
        const mentionedAuthors = authors?.filter((a) =>
          newNotification.includes(`@${a.name}`),
        );
        if (mentionedAuthors && mentionedAuthors.length > 0) {
          target = mentionedAuthors.map(a => a.name).join(",");
        }
      }

      const formData = new FormData();
      formData.append("message", newNotification);
      formData.append("target", target);
      if (notificationDocument) {
        formData.append("document", notificationDocument);
      }

      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/notifications`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );
      if (res.ok) {
        const notif = await res.json();
        setNotifications([notif, ...notifications]);
        setNewNotification("");
        setNotificationDocument(null);
        if (forceTarget) {
          toast.success("Document uploaded successfully!");
          setShowNotifications(false);
        }
      } else {
        toast.error("Failed to send notification");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to send notification");
    }
  };

  const handleDeleteNotification = async (id: number) => {
    if (
      !window.confirm(
        "Are you sure you want to archive this document/notification? This action cannot be undone.",
      )
    )
      return;
    try {
      const token = localStorage.getItem("token");
      await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/notifications/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setNotifications(notifications.map((n) => n.id === id ? { ...n, isArchived: true } : n));
      toast.success("Archived successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to archive");
    }
  };

  const handleHardDeleteNotification = async (id: number) => {
    if (
      !window.confirm(
        "Are you sure you want to PERMANENTLY DELETE this document/notification? This action cannot be undone.",
      )
    )
      return;
    try {
      const token = localStorage.getItem("token");
      await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/notifications/${id}?hard=true`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setNotifications(notifications.filter((n) => n.id !== id));
      toast.success("Permanently deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete permanently");
    }
  };

  const handleRestoreNotification = async (id: number) => {
    if (!window.confirm("Are you sure you want to restore this document/notification?")) return;
    try {
      const token = localStorage.getItem("token");
      await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/notifications/${id}/restore`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setNotifications(notifications.map((n) => n.id === id ? { ...n, isArchived: false } : n));
      toast.success("Restored successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to restore");
    }
  };

  const handleNotificationChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const val = e.target.value;
    setNewNotification(val);

    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentionDropdown(true);
      setMentionIndex(textBeforeCursor.lastIndexOf("@"));
    } else {
      setShowMentionDropdown(false);
    }
  };

  const handleMentionSelect = (authorName: string) => {
    const before = newNotification.slice(0, mentionIndex);
    const after = newNotification.slice(mentionIndex + mentionQuery.length + 1);
    setNewNotification(before + "@" + authorName + " " + after);
    setShowMentionDropdown(false);
  };

  const handleApproveBook = async (id: number) => {
    setLoadingAction("approveBook_" + id);
    try {
      await axios.post(`${API}/api/admin/books/${id}/approve`);
      toast.success("Book Approved!");
      fetchBooks();
      autoRegenerateCompleteCatalogue();
    } catch (err) {
      toast.error("Failed to approve book");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRejectBook = (bookId: number) => {
    const book = books.find((b) => b.id === bookId);
    if (!book) return;
    setRejectBookTarget(book);
    setRejectBookReasons([]);
    setOtherBookReason("");
  };

  const handleRejectBookSubmit = async () => {
    if (!rejectBookTarget) return;
    const reasons = [...rejectBookReasons];
    if (otherBookReason.trim()) reasons.push(otherBookReason.trim());
    if (reasons.length === 0) {
      alert("Please select or enter at least one reason.");
      return;
    }

    const finalReason = reasons.join("; ");
    setLoadingAction("rejectBook_" + rejectBookTarget.id);
    try {
      await axios.post(`${API}/api/admin/books/${rejectBookTarget.id}/reject`, {
        reason: finalReason,
      });
      fetchBooks();
      setRejectBookTarget(null);
    } catch (err) {
      alert("Failed to reject book");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEditBookClick = (book: any) => {
    setEditingBook({
      id: book.id,
      title: book.title,
      genre: book.genre,
      subGenre: book.subGenre || "",
      mrp: book.mrp,
      stock: book.stock,
      synopsis: book.synopsis || "",
    });
    setIsEditBookModalOpen(true);
  };

  const handleUpdateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;
    setLoadingAction("updateBook");
    try {
      await axios.put(`${API}/api/admin/books/${editingBook.id}`, {
        title: editingBook.title,
        genre: editingBook.genre,
        subGenre: editingBook.subGenre,
        mrp: parseFloat(editingBook.mrp),
        stock: parseInt(editingBook.stock),
        synopsis: editingBook.synopsis,
      });
      setIsEditBookModalOpen(false);
      setEditingBook(null);
      fetchBooks();
      toast.success("Book updated successfully!");
    } catch (err) {
      toast.error("Failed to update book details");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEscalateOrder = async (id: number) => {
    try {
      await axios.post(
        `${API}/api/admin/orders/${id}/escalate`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      toast.success("Escalation email sent to author!");
    } catch (err) {
      toast.error("Failed to escalate order");
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/orders/export?type=web`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "web_orders_summary.xlsx");
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      toast.error("Failed to export Excel");
    }
  };

  const handleExportBulkCSV = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/orders/export?type=bulk`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "bulk_orders_summary.xlsx");
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      toast.error("Failed to export Excel");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    navigate("/login");
  };
  const handleRejectEdits = async () => {
    if (!editingAuthor) return;
    setLoadingAction("rejectEdits");
    try {
      await axios.post(
        `${API}/api/admin/authors/${editingAuthor.id}/reject-edits`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      toast.success("Author edits rejected (reverted)");
      setIsEditAuthorModalOpen(false);
      fetchAuthors();
    } catch (err) {
      toast.error("Failed to reject edits");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRejectEditsDirect = async (id: number) => {
    setLoadingAction("rejectEdits_" + id);
    try {
      await axios.post(
        `${API}/api/admin/authors/${id}/reject-edits`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      toast.success("Author edits rejected (reverted)");
      fetchAuthors();
    } catch (err) {
      toast.error("Failed to reject edits");
    } finally {
      setLoadingAction(null);
    }
  };

  const LateAuthorsSystemTab = useMemo(() => {
    return function LateAuthorsTab({ orders, authors, fetchAuthors }: any) {
      const [activeTable, setActiveTable] = React.useState<
        "approvals" | "suspended" | "late" | "history"
      >("late");
      const [fineModalAuthor, setFineModalAuthor] = React.useState<{
        id: number;
        name: string;
        orderId?: string;
        count?: number;
        hours?: number;
        delayType?: string;
      } | null>(null);
      const [fineAmount, setFineAmount] = React.useState("500");
      const [isSubmittingFine, setIsSubmittingFine] = React.useState(false);
      const [expandedCustomerRow, setExpandedCustomerRow] = React.useState<
        number | null
      >(null);

      // Reconstruct lateDeliveriesMap for active deliveries (to charge fine)
      const lateDeliveriesMap: Record<string, any> = {};
      orders.forEach((o: any) => {
        o.items?.forEach((it: any) => {
          if (
            (it.status === "Pending Verification" ||
              it.status === "Pending" ||
              it.status === "Accepted") &&
            it.createdAt
          ) {
            const hours =
              (new Date().getTime() - new Date(it.createdAt).getTime()) /
              (1000 * 3600);

            const aId = it.authorId || it.book?.author?.id;
            const aName =
              it.authorName || it.book?.author?.name || "Unknown Author";
            const aEmail = it.authorEmail || it.book?.author?.email;

            let ignoreForLate = false;
            const authorData = authors.find((a: any) => a.id === aId);
            if (authorData?.extraData?.lastFinePaidAt) {
              if (
                new Date(it.createdAt).getTime() <
                new Date(authorData.extraData.lastFinePaidAt).getTime()
              ) {
                ignoreForLate = true;
              }
            }

            let isLate = false;
            let delayType = "";
            if (
              (it.status === "Pending Verification" ||
                it.status === "Pending") &&
              hours > 24
            ) {
              isLate = true;
              delayType = "Acceptance (>24h)";
            } else if (it.status === "Accepted" && hours > 48) {
              isLate = true;
              delayType = "Dispatch (>48h)";
            }

            if (isLate && aId && !ignoreForLate) {
              const key = `${aId}-${o.id}`;
              if (!lateDeliveriesMap[key]) {
                lateDeliveriesMap[key] = {
                  authorId: aId,
                  authorName: aName,
                  authorEmail: aEmail,
                  orderId: o.id,
                  hours: Math.round(hours),
                  count: 0,
                  customerInfo: {
                    name:
                      o.customerName && o.customerName !== "N/A"
                        ? o.customerName
                        : "Guest Customer",
                    phone: o.customerPhone || "No Phone",
                    email: o.customerEmail || "No Email",
                  },
                  delayType,
                  lateItems: [],
                };
              }
              lateDeliveriesMap[key].count++;
              lateDeliveriesMap[key].lateItems.push({
                title: it.book?.title || "Unknown Book",
                quantity: it.quantity || 1,
                price: it.book?.price || it.price || 0,
                status: it.status,
              });

              if (Math.round(hours) > lateDeliveriesMap[key].hours) {
                lateDeliveriesMap[key].hours = Math.round(hours);
                lateDeliveriesMap[key].customerInfo = {
                  name:
                    o.customerName && o.customerName !== "N/A"
                      ? o.customerName
                      : "Guest Customer",
                  phone: o.customerPhone || "No Phone",
                  email: o.customerEmail || "No Email",
                };
                lateDeliveriesMap[key].delayType = delayType;
              }
            }
          }
        });
      });
      const lateDeliveries = Object.values(lateDeliveriesMap).sort(
        (a: any, b: any) => b.hours - a.hours,
      );

      // Identify pending fine approvals
      const pendingFineApprovals = authors.filter(
        (a: any) =>
          (a.extraData?.fineStatus === "Pending Verification" ||
            (!a.extraData?.fineStatus && a.extraData?.finePaymentScreenshot)) &&
          a.extraData?.finePaymentScreenshot,
      );
      // Identify fined authors (fine active)
      const activeFines = authors.filter(
        (a: any) =>
          a.extraData?.lateFines > 0 &&
          a.extraData?.fineStatus !== "Pending Verification",
      );
      // Identify authors with fine history
      const historyAuthors = authors.filter(
        (a: any) =>
          a.extraData?.fineHistory && a.extraData.fineHistory.length > 0,
      );

      const handleOpenFineModal = (
        authorId: number,
        authorName: string,
        ld?: any,
      ) => {
        setFineModalAuthor({ id: authorId, name: authorName, ...ld });
        setFineAmount("500");
      };

      const submitFine = async () => {
        if (!fineModalAuthor) return;
        const amount = parseInt(fineAmount);
        if (isNaN(amount) || amount <= 0) return toast.error("Invalid amount");
        setIsSubmittingFine(true);
        try {
          await axios.post(
            `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/authors/${fineModalAuthor.id}/fine`,
            {
              amount,
              orderId: fineModalAuthor.orderId,
              count: fineModalAuthor.count,
              hours: fineModalAuthor.hours,
              delayType: fineModalAuthor.delayType,
            },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            },
          );
          toast.success(`Fine of ₹${amount} charged successfully`);
          setFineModalAuthor(null);
          fetchAuthors();
        } catch (err) {
          toast.error("Failed to charge fine");
        } finally {
          setIsSubmittingFine(false);
        }
      };

      const handleApproveFine = async (authorId: number) => {
        try {
          await axios.post(
            `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/authors/${authorId}/approve-fine`,
            {},
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            },
          );
          toast.success(`Fine payment approved.`);
          fetchAuthors();
        } catch (err) {
          toast.error("Failed to approve fine payment");
        }
      };

      const handleRejectFine = async (authorId: number) => {
        try {
          await axios.post(
            `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/authors/${authorId}/reject-fine`,
            {},
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            },
          );
          toast.success(`Fine payment rejected.`);
          fetchAuthors();
        } catch (err) {
          toast.error("Failed to reject fine payment");
        }
      };

      return (
        <div className="space-y-6 animate-fade-in-up">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 px-6 sm:px-0">
            <div className="shrink-0">
              <h2 className="text-2xl font-serif text-paa-navy tracking-tight">
                Late Authors System
              </h2>
              <p className="text-sm text-gray-500 mt-1 hidden xl:block">
                Manage delayed dispatches, charge fines, and approve fine
                payments.
              </p>
            </div>

            <div className="w-full xl:w-auto">
              <div className="flex flex-wrap bg-gray-100 rounded-xl p-1 w-full sm:w-auto gap-1">
                <button
                  onClick={() => setActiveTable("late")}
                  className={`px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-colors rounded-lg flex items-center gap-2 shrink-0 ${activeTable === "late" ? "bg-white text-paa-navy shadow-sm" : "text-gray-500 hover:text-paa-navy"}`}
                >
                  <Clock size={14} /> Late Dispatches
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[9px] min-w-[1.25rem] text-center leading-none ${activeTable === "late" ? "bg-paa-navy/10 text-paa-navy" : "bg-gray-200 text-gray-600"}`}
                  >
                    {lateDeliveries.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTable("approvals")}
                  className={`px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-colors rounded-lg flex items-center gap-2 shrink-0 ${activeTable === "approvals" ? "bg-white text-paa-navy shadow-sm" : "text-gray-500 hover:text-paa-navy"}`}
                >
                  <CheckCircle size={14} /> Approvals
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[9px] min-w-[1.25rem] text-center leading-none ${activeTable === "approvals" ? "bg-paa-navy/10 text-paa-navy" : "bg-gray-200 text-gray-600"}`}
                  >
                    {pendingFineApprovals.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTable("suspended")}
                  className={`px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-colors rounded-lg flex items-center gap-2 shrink-0 ${activeTable === "suspended" ? "bg-white text-paa-navy shadow-sm" : "text-gray-500 hover:text-paa-navy"}`}
                >
                  <AlertCircle size={14} /> Suspended
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[9px] min-w-[1.25rem] text-center leading-none ${activeTable === "suspended" ? "bg-paa-navy/10 text-paa-navy" : "bg-gray-200 text-gray-600"}`}
                  >
                    {activeFines.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTable("history")}
                  className={`px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-colors rounded-lg flex items-center gap-2 shrink-0 ${activeTable === "history" ? "bg-white text-paa-navy shadow-sm" : "text-gray-500 hover:text-paa-navy"}`}
                >
                  <FileText size={14} /> History
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[9px] min-w-[1.25rem] text-center leading-none ${activeTable === "history" ? "bg-paa-navy/10 text-paa-navy" : "bg-gray-200 text-gray-600"}`}
                  >
                    {historyAuthors.reduce(
                      (sum: number, a: any) =>
                        sum + (a.extraData?.fineHistory?.length || 0),
                      0,
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* --- Pending Fine Approvals --- */}
          {activeTable === "approvals" && (
            <div className="bg-white py-4 sm:p-6 rounded-none sm:rounded-xl border-y sm:border border-paa-navy/5 shadow-sm animate-fade-in-up">
              <div className="flex justify-between items-center mb-4 px-6 sm:px-0">
                <h3 className="text-lg font-serif font-semibold text-paa-navy flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" /> Pending
                  Fine Payment Approvals
                </h3>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
                  <thead className="border-b-[1.5px] border-black">
                    <tr>
                      <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        S. No
                      </th>
                      <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        Author Name
                      </th>
                      <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        Reason
                      </th>
                      <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        Screenshot
                      </th>
                      <th className="px-4 py-3 font-bold text-center !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendingFineApprovals.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-gray-500 italic"
                        >
                          No pending payments.
                        </td>
                      </tr>
                    ) : (
                      pendingFineApprovals.map((a: any, idx: number) => (
                        <tr
                          key={idx}
                          className={`${idx % 2 === 0 ? "bg-white" : "bg-[#ebd8c0]"} hover:bg-slate-200/60 transition-colors`}
                        >
                          <td className="px-4 py-3 font-bold text-paa-gray-text">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 font-medium text-paa-navy">
                            {a.name}
                          </td>
                          <td
                            className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate"
                            title={
                              a.extraData.finePaymentReason ||
                              "No reason provided"
                            }
                          >
                            {a.extraData.finePaymentReason || (
                              <span className="italic text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <a
                              href={`${import.meta.env.VITE_API_URL || "http://localhost:3001"}${a.extraData.finePaymentScreenshot}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <ImageIcon size={14} /> View Screenshot
                            </a>
                          </td>
                          <td className="px-4 py-3 text-center flex justify-center gap-2">
                            <button
                              onClick={() => handleApproveFine(a.id)}
                              className="dash-btn dash-btn-primary bg-green-600 hover:bg-green-700 border-none text-white text-xs px-3 py-1.5 h-auto"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectFine(a.id)}
                              className="dash-btn dash-btn-primary bg-red-600 hover:bg-red-700 border-none text-white text-xs px-3 py-1.5 h-auto"
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Active Fines (Unpaid) ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
          {activeTable === "suspended" && (
            <div className="bg-white py-4 sm:p-6 rounded-none sm:rounded-xl border-y sm:border border-paa-navy/5 shadow-sm animate-fade-in-up">
              <div className="flex justify-between items-center mb-4 px-6 sm:px-0">
                <h3 className="text-lg font-serif font-semibold text-paa-navy flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" /> Currently
                  Fined Authors (Suspended)
                </h3>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
                  <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                    <tr>
                      <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        S. No
                      </th>
                      <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        Author Name
                      </th>
                      <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        Fine Amount
                      </th>
                      <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        Date Charged
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeFines.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-8 text-center text-gray-500 italic"
                        >
                          No currently fined authors.
                        </td>
                      </tr>
                    ) : (
                      activeFines.map((a: any, idx: number) => (
                        <tr
                          key={idx}
                          className={`${idx % 2 === 0 ? "bg-white" : "bg-[#ebd8c0]"} hover:bg-slate-200/60 transition-colors`}
                        >
                          <td className="px-4 py-3 font-bold text-paa-gray-text">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 font-medium text-paa-navy">
                            {a.name}
                          </td>
                          <td className="px-4 py-3 font-bold text-red-600">
                            ₹{a.extraData.lateFines}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {a.extraData.fineDate
                              ? new Date(
                                  a.extraData.fineDate,
                                ).toLocaleDateString()
                              : "N/A"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Late Deliveries Row (Charging) ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
          {activeTable === "late" && (
            <div className="bg-white py-4 sm:p-6 rounded-none sm:rounded-xl border-y sm:border border-paa-navy/5 shadow-sm animate-fade-in-up">
              <div className="flex justify-between items-center mb-4 px-6 sm:px-0">
                <h3 className="text-lg font-serif font-semibold text-paa-navy flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-500" /> Dispatches
                  Pending &gt; 24 Hrs
                </h3>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
                  <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                    <tr>
                      <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        S. No
                      </th>
                      <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        Latest Order ID
                      </th>
                      <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        Author Name
                      </th>
                      <th className="px-4 py-3 font-bold text-center !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        Unaccepted Items
                      </th>
                      <th className="px-4 py-3 font-bold text-center !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        Delay
                      </th>
                      <th className="px-4 py-3 font-bold text-center !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lateDeliveries.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-gray-500 italic"
                        >
                          No late deliveries currently.
                        </td>
                      </tr>
                    ) : (
                      lateDeliveries.map((ld, idx) => (
                        <React.Fragment key={idx}>
                          <tr
                            className={`${idx % 2 === 0 ? "bg-white" : "bg-[#ebd8c0]"} hover:bg-slate-200/60 transition-colors`}
                          >
                            <td className="px-4 py-3 font-bold text-paa-gray-text">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3 font-bold text-paa-navy flex items-center gap-2">
                              <button
                                onClick={() =>
                                  setExpandedCustomerRow(
                                    expandedCustomerRow === idx ? null : idx,
                                  )
                                }
                                className="text-gray-400 hover:text-paa-navy transition-colors focus:outline-none"
                              >
                                <ChevronDown
                                  size={16}
                                  className={`transition-transform duration-300 ${expandedCustomerRow === idx ? "rotate-180" : ""}`}
                                />
                              </button>
                              {ld.orderId}
                            </td>
                            <td className="px-4 py-3 font-medium text-paa-navy">
                              {ld.authorName}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-orange-600">
                              {ld.count}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="font-bold text-orange-500 mb-1">
                                {ld.hours} hrs
                              </div>
                              {ld.delayType === "Dispatch (>48h)" ? (
                                <span className="bg-purple-100 text-purple-700 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest shadow-sm inline-block">
                                  Dispatch Wait
                                </span>
                              ) : (
                                <span className="bg-orange-100 text-orange-700 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest shadow-sm inline-block">
                                  Acceptance Wait
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center flex justify-center gap-2">
                              {(() => {
                                const authorInfo = authors.find(
                                  (a: any) => a.id === ld.authorId,
                                );
                                const fineAmt =
                                  authorInfo?.extraData?.lateFines || 0;
                                const isPendingApprove =
                                  authorInfo?.extraData?.fineStatus ===
                                  "Pending Verification";

                                if (fineAmt > 0 && !isPendingApprove) {
                                  return (
                                    <span className="bg-red-100 text-red-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                      <AlertCircle size={12} /> Fine Active
                                    </span>
                                  );
                                }
                                if (isPendingApprove) {
                                  return (
                                    <span className="bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                      <CheckCircle size={12} /> Reviewing Pmt
                                    </span>
                                  );
                                }

                                const notifiedDateStr =
                                  authorInfo?.extraData?.lateNotificationDate;
                                let diffDays = -1;
                                if (notifiedDateStr) {
                                  diffDays =
                                    (new Date().getTime() -
                                      new Date(notifiedDateStr).getTime()) /
                                    (1000 * 3600 * 24);
                                }

                                if (diffDays >= 0 && diffDays <= 1) {
                                  const daysLeft = Math.max(
                                    0,
                                    1 - Math.floor(diffDays),
                                  );
                                  return (
                                    <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                      <Check size={12} /> Notified ({daysLeft}d
                                      left)
                                    </span>
                                  );
                                } else {
                                  return (
                                    <>
                                      <button
                                        onClick={async () => {
                                          try {
                                            await axios.post(
                                              `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/authors/${ld.authorId}/notify-late`,
                                              {
                                                orderId: ld.orderId,
                                                count: ld.count,
                                                hours: ld.hours,
                                                delayType: ld.delayType,
                                              },
                                              {
                                                headers: {
                                                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                                                },
                                              },
                                            );
                                            toast.success(
                                              `Notification sent to ${ld.authorName}`,
                                            );
                                            fetchAuthors();
                                          } catch (err) {
                                            toast.error(
                                              "Failed to notify author",
                                            );
                                          }
                                        }}
                                        className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-[#ebd8c0] transition-colors shadow-sm border border-blue-100"
                                        title="Send 1-Day Warning"
                                      >
                                        <Bell size={14} />
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleOpenFineModal(
                                            ld.authorId,
                                            ld.authorName,
                                            ld,
                                          )
                                        }
                                        className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 font-bold text-xs shadow-sm border border-red-100 transition-colors"
                                        title="Charge Fine"
                                      >
                                        ₹
                                      </button>
                                    </>
                                  );
                                }
                              })()}
                            </td>
                          </tr>
                          {expandedCustomerRow === idx && (
                            <tr className="bg-orange-50/30">
                              <td
                                colSpan={5}
                                className="px-8 py-4 border-b border-orange-100"
                              >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div className="flex flex-col gap-1 text-sm text-paa-navy">
                                    <div className="font-semibold text-paa-gray-text text-xs uppercase tracking-widest mb-2">
                                      Customer Contact for {ld.orderId}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <User
                                        size={14}
                                        className="text-orange-400"
                                      />{" "}
                                      {ld.customerInfo.name}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Phone
                                        size={14}
                                        className="text-orange-400"
                                      />{" "}
                                      {ld.customerInfo.phone}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Mail
                                        size={14}
                                        className="text-orange-400"
                                      />{" "}
                                      {ld.customerInfo.email}
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1 text-sm text-paa-navy">
                                    <div className="font-semibold text-paa-gray-text text-xs uppercase tracking-widest mb-2">
                                      Delayed Items in {ld.orderId}
                                    </div>
                                    <div className="space-y-1">
                                      {ld.lateItems.map(
                                        (item: any, i: number) => (
                                          <div
                                            key={i}
                                            className="flex justify-between items-center bg-white px-3 py-2 rounded shadow-sm border border-orange-100/50"
                                          >
                                            <div className="flex flex-col">
                                              <span className="font-medium text-paa-navy">
                                                {item.title}
                                              </span>
                                              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                                                {item.status}
                                              </span>
                                            </div>
                                            <div className="text-right">
                                              <span className="text-xs text-gray-500">
                                                Qty: {item.quantity}
                                              </span>
                                              <br />
                                              <span className="font-bold text-orange-600">
                                                ₹{item.price * item.quantity}
                                              </span>
                                            </div>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ——— Fine History ——— */}
          {activeTable === "history" && (
            <div className="bg-white py-4 sm:p-6 rounded-none sm:rounded-xl border-y sm:border border-paa-navy/5 shadow-sm animate-fade-in-up">
              <div className="flex justify-between items-center mb-4 px-6 sm:px-0">
                <h3 className="text-lg font-serif font-semibold text-paa-navy flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" /> Fine Payment
                  History
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                    <tr>
                      <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        S. No
                      </th>
                      <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        Author Name
                      </th>
                      <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        Fine Amount
                      </th>
                      <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        Payment Date
                      </th>
                      <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        Approved Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historyAuthors.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-gray-500 italic"
                        >
                          No fine history available.
                        </td>
                      </tr>
                    ) : (
                      historyAuthors.flatMap((a: any) =>
                        a.extraData.fineHistory.map((h: any, idx: number) => (
                          <tr
                            key={`${a.id}-${idx}`}
                            className={`${idx % 2 === 0 ? "bg-white" : "bg-[#ebd8c0]"} hover:bg-slate-200/60 transition-colors`}
                          >
                            <td className="px-4 py-3 font-bold text-paa-gray-text">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3 font-medium text-paa-navy">
                              {a.name}
                            </td>
                            <td className="px-4 py-3 font-bold text-indigo-600">
                              ₹{h.amount}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {h.paidAt
                                ? new Date(h.paidAt).toLocaleDateString()
                                : "N/A"}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {h.approvedAt
                                ? new Date(h.approvedAt).toLocaleDateString()
                                : "N/A"}
                            </td>
                          </tr>
                        )),
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {fineModalAuthor && (
            <div
              className="absolute inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
              onClick={(e) =>
                e.target === e.currentTarget && setFineModalAuthor(null)
              }
            >
              <div className="dash-modal" style={{ maxWidth: 400 }}>
                <div className="dash-modal-header">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-paa-navy">
                    Charge Fine
                  </h3>
                  <button
                    onClick={() => setFineModalAuthor(null)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/6 text-paa-gray-text transition-colors"
                  >
                    ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢
                  </button>
                </div>
                <div className="dash-modal-body flex flex-col gap-4">
                  <div>
                    <label className="text-[10px] font-bold tracking-widest uppercase text-paa-gray-text mb-1 block">
                      Author
                    </label>
                    <p className="font-semibold text-paa-navy">
                      {fineModalAuthor.name}
                    </p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-widest uppercase text-paa-gray-text mb-1 block">
                      Fine Amount (₹)
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="dash-input text-xs w-full"
                      value={fineAmount}
                      onChange={(e) => setFineAmount(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => setFineModalAuthor(null)}
                      className="dash-btn dash-btn-ghost"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitFine}
                      disabled={isSubmittingFine}
                      className="dash-btn dash-btn-primary bg-red-600 hover:bg-red-700 disabled:opacity-50 border-none text-white"
                    >
                      {isSubmittingFine ? "Processing..." : "Charge Fine"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    };
  }, []);

  const BooksTab = () => {
    const [bookSearchTerm, setBookSearchTerm] = useState("");
    const [expandedBookId, setExpandedBookId] = useState<number | null>(null);
    const [showExportModal, setShowExportModal] = useState(false);

    const ALL_EXPORT_COLUMNS = [
      { key: 'authorName',     label: 'Author Name' },
      { key: 'title',          label: 'Book Title' },
      { key: 'subtitle',       label: 'Subtitle' },
      { key: 'synopsis',       label: 'Synopsis' },
      { key: 'purpose',        label: 'Purpose of Writing' },
      { key: 'genre',          label: 'Genre' },
      { key: 'subGenre',       label: 'Sub-Genre' },
      { key: 'mrp',            label: 'Price (MRP)' },
      { key: 'language',       label: 'Language' },
      { key: 'format',         label: 'Format' },
      { key: 'printFormat',    label: 'Print Format' },
      { key: 'pages',          label: 'Pages' },
      { key: 'isbn',           label: 'ISBN' },
      { key: 'publisher',      label: 'Publisher' },
      { key: 'edition',        label: 'Edition' },
      { key: 'publicationDate',label: 'Publication Date' },
      { key: 'stock',          label: 'Current Stock' },
      { key: 'status',         label: 'Status' },
    ];

    const uniqueAuthors: string[] = Array.from(
      new Set(books.map((b: any) => b.author?.name || b.authorName || 'Unknown Author'))
    ).sort() as string[];

    const [selectedExportAuthors, setSelectedExportAuthors] = useState<string[]>(uniqueAuthors);
    const [selectedExportCols, setSelectedExportCols] = useState<string[]>(ALL_EXPORT_COLUMNS.map(c => c.key));
    const [isExporting, setIsExporting] = useState(false);

    const toggleAuthor = (name: string) =>
      setSelectedExportAuthors(prev => prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]);
    const toggleCol = (key: string) =>
      setSelectedExportCols(prev => prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]);

    const openExportModal = () => {
      setSelectedExportAuthors(uniqueAuthors);
      setSelectedExportCols(ALL_EXPORT_COLUMNS.map(c => c.key));
      setShowExportModal(true);
    };

    const handleExportBookCatalogue = async () => {
      setIsExporting(true);
      try {
        const { saveAs } = await import("file-saver");
        const ExcelJS = (await import("exceljs")).default;
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Book Catalogue");

        // Filter books by selected authors
        const filteredBooks = books.filter((b: any) => {
          const aName = b.author?.name || b.authorName || 'Unknown Author';
          return selectedExportAuthors.includes(aName);
        });

        // Determine active columns in order
        const activeCols = ALL_EXPORT_COLUMNS.filter(c => selectedExportCols.includes(c.key));

        // Header row
        const headerRow = sheet.addRow(['S. NO', ...activeCols.map(c => c.label.toUpperCase())]);
        headerRow.font = { bold: true };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // Bright Yellow
          cell.font = { bold: true, color: { argb: 'FF000000' }, size: 10 }; // Black text
          cell.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        });
        sheet.getRow(1).height = 22;

        const sortedBooks = [...filteredBooks].sort((a: any, b: any) =>
          (a.author?.name || a.authorName || '').localeCompare(b.author?.name || b.authorName || '')
        );

        sortedBooks.forEach((book: any, idx: number) => {
          const authorName = book.author?.name || book.authorName || 'Unknown Author';
          const rowValues = [
            idx + 1,
            ...activeCols.map(col => {
              switch (col.key) {
                case 'authorName':      return authorName;
                case 'title':           return book.title || '-';
                case 'subtitle':        return book.subtitle || '-';
                case 'synopsis':        return book.synopsis || '-';
                case 'purpose':         return book.purpose || '-';
                case 'genre':           return book.genre || '-';
                case 'subGenre':        return book.subGenre || '-';
                case 'mrp':             return book.mrp ? `₹${book.mrp}` : '-';
                case 'language':        return book.language || '-';
                case 'format':          return book.format || '-';
                case 'printFormat':     return book.printFormat || '-';
                case 'pages':           return book.pages || '-';
                case 'isbn':            return book.isbn || '-';
                case 'publisher':       return book.publisher || '-';
                case 'edition':         return book.edition || '-';
                case 'publicationDate': return book.publicationDate || '-';
                case 'stock':           return book.stock ?? '-';
                case 'status':          return book.status || '-';
                default:                return '';
              }
            })
          ];

          const row = sheet.addRow(rowValues);
          const isEven = idx % 2 === 0;
          row.eachCell((cell, colIdx) => {
            cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
            cell.font = { size: 10, color: { argb: 'FF000000' } };
            cell.alignment = { vertical: 'middle', wrapText: true };
            
            const colKey = colIdx === 1 ? 'sno' : activeCols[colIdx - 2]?.key;
            let bgColor = 'FFFFFFFF';
            
            if (colKey === 'sno') bgColor = 'FFFFFF00'; // Yellow
            else if (colKey === 'authorName') bgColor = 'FF00FFFF'; // Cyan
            else if (['title', 'subtitle', 'synopsis', 'purpose', 'genre', 'subGenre'].includes(colKey)) {
              const genre = (book.genre || '').toLowerCase();
              if (genre.includes('non-fiction') || genre.includes('non fiction')) bgColor = 'FFFFCC99'; // Peach/Orange
              else if (genre.includes('fiction')) bgColor = 'FFFF99CC'; // Pink
              else if (genre.includes('poetry') || genre.includes('poem')) bgColor = 'FFFFFF99'; // Light Yellow
              else if (genre.includes('children') || genre.includes('education')) bgColor = 'FFCCFFCC'; // Light Green
              else bgColor = 'FFEBD8C0';
            }
            else if (colKey === 'mrp') bgColor = 'FF99FF99'; // Green
            else if (colKey === 'stock') bgColor = 'FFFFFF00'; // Yellow
            else bgColor = 'FFEEEEEE'; // Light Gray for others

            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
          });
        });

        // Auto-width columns
        sheet.getColumn(1).width = 6;
        activeCols.forEach((col, idx) => {
          const colObj = sheet.getColumn(idx + 2);
          if (col.key === 'authorName') colObj.width = 28;
          else if (col.key === 'title') colObj.width = 35;
          else if (col.key === 'synopsis' || col.key === 'purpose') colObj.width = 50;
          else if (col.key === 'mrp') colObj.width = 12;
          else colObj.width = 20;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Book_Catalogue_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success('Excel downloaded successfully!');
        setShowExportModal(false);
      } catch (err) {
        toast.error('Failed to generate Excel file');
        console.error(err);
      } finally {
        setIsExporting(false);
      }
    };

    return (
      <>
      {/* ── Export Excel Modal ── */}
      {showExportModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setShowExportModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#0b1a2e]">
              <div>
                <h2 className="text-base font-bold text-white tracking-wider uppercase">Export Excel — Customise</h2>
                <p className="text-xs text-white/60 mt-0.5">Choose authors & columns to include in the export</p>
              </div>
              <button onClick={() => setShowExportModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white transition-colors text-lg font-bold">✕</button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* ── Author Selector ── */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#0b1a2e]">Select Authors ({selectedExportAuthors.length}/{uniqueAuthors.length})</span>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedExportAuthors(uniqueAuthors)} className="text-[10px] font-bold text-indigo-600 hover:underline">All</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={() => setSelectedExportAuthors([])} className="text-[10px] font-bold text-red-500 hover:underline">None</button>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-y-auto max-h-72 divide-y divide-gray-50">
                  {uniqueAuthors.map((name) => (
                    <label key={name} className="flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50/50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedExportAuthors.includes(name)}
                        onChange={() => toggleAuthor(name)}
                        className="w-4 h-4 rounded border-gray-300 text-[#0b1a2e] accent-[#0b1a2e] cursor-pointer"
                      />
                      <span className="text-sm font-medium text-[#0b1a2e] truncate">{name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* ── Column Selector ── */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#0b1a2e]">Select Columns ({selectedExportCols.length}/{ALL_EXPORT_COLUMNS.length})</span>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedExportCols(ALL_EXPORT_COLUMNS.map(c => c.key))} className="text-[10px] font-bold text-indigo-600 hover:underline">All</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={() => setSelectedExportCols([])} className="text-[10px] font-bold text-red-500 hover:underline">None</button>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-y-auto max-h-72 divide-y divide-gray-50">
                  {ALL_EXPORT_COLUMNS.map((col) => (
                    <label key={col.key} className="flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50/50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedExportCols.includes(col.key)}
                        onChange={() => toggleCol(col.key)}
                        className="w-4 h-4 rounded border-gray-300 text-[#0b1a2e] accent-[#0b1a2e] cursor-pointer"
                      />
                      <span className="text-sm font-medium text-[#0b1a2e]">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between gap-4">
              <p className="text-xs text-gray-500">
                Exporting <span className="font-bold text-[#0b1a2e]">{selectedExportAuthors.length}</span> author(s) × <span className="font-bold text-[#0b1a2e]">{selectedExportCols.length}</span> column(s)
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowExportModal(false)} className="px-4 py-2 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleExportBookCatalogue}
                  disabled={isExporting || selectedExportAuthors.length === 0 || selectedExportCols.length === 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold bg-[#0b1a2e] text-white hover:bg-[#1a2e4a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isExporting ? 'Generating...' : 'Download Excel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white border border-paa-navy/5 shadow-premium hover:shadow-premium-hover transition-all duration-500 ease-out flex flex-col max-h-[calc(100vh-120px)] overflow-auto">
        <div className="p-4 border-b border-paa-navy/5 flex flex-col gap-3 bg-white">
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-serif font-semibold text-paa-navy tracking-tight">
              List of Books
            </h3>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <div className="flex flex-wrap sm:flex-nowrap bg-gray-100 rounded-xl p-1 gap-1 w-full sm:w-auto">
                {["All", "Pending", "Approved", "Rejected"].map((status) => {
                  const tabCount =
                    status === "All"
                      ? books.length
                      : books.filter((b) => b.status === status).length;
                  return (
                    <button
                      key={status}
                      onClick={() => setBookStatusFilter(status)}
                      className={`px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-colors rounded-3xl-2xl flex items-center gap-1.5 ${bookStatusFilter === status ? "bg-white text-paa-navy shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out" : "text-gray-500 hover:text-paa-navy"}`}
                    >
                      {status}{" "}
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${bookStatusFilter === status ? "bg-gray-100 text-paa-navy" : "bg-gray-200 text-gray-500"}`}
                      >
                        {tabCount}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="relative flex-1 sm:flex-none">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-paa-gray-text" />
                <input
                  type="text"
                  placeholder="SEARCH BOOKS/AUTHORS..."
                  value={bookSearchTerm}
                  onChange={(e) => setBookSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white border border-paa-navy/20 text-xs font-bold tracking-widest uppercase outline-none focus:border-paa-navy transition-colors w-full sm:w-56"
                />
              </div>
            <button
              onClick={openExportModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all border border-paa-navy/20 text-paa-navy bg-white hover:bg-paa-navy hover:text-white shadow-sm whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" /> Export Excel
            </button>
          </div>
        </div>

        <div className="w-full relative">
          <table className="w-full text-left text-[11px] border-collapse" style={{ minWidth: 2200 }}>
            <thead>
              <tr>
                {[
                  { label: 'S.No', cls: 'w-[40px] text-center' },
                  { label: 'Cover', cls: 'w-[100px]' },
                  { label: 'Book Title', cls: 'w-[200px]' },
                  { label: 'Subtitle', cls: 'w-[150px]' },
                  { label: 'Author Name', cls: 'w-[180px]' },
                  { label: 'Genre', cls: '' },
                  { label: 'Sub-Genre', cls: '' },
                  { label: 'ISBN', cls: 'text-center' },
                  { label: 'MRP', cls: 'text-center' },
                  { label: 'Language', cls: 'text-center' },
                  { label: 'Format', cls: 'text-center' },
                  { label: 'Pages', cls: 'text-center' },
                  { label: 'Publisher', cls: '' },
                  { label: 'Edition', cls: 'text-center' },
                  { label: 'Pub Date', cls: 'text-center' },
                  { label: 'Status', cls: 'text-center' },
                  { label: 'Stock', cls: 'text-center' },
                  { label: 'Synopsis', cls: 'w-[250px]' },
                ].map(({ label, cls }) => (
                  <th key={label} className={`sticky top-0 z-10 px-2 py-2 text-[11px] font-extrabold text-black border border-black/30 align-middle bg-[#FFE600] uppercase tracking-wider ${cls}`}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {books
                .filter((b) => bookStatusFilter === 'All' || b.status === bookStatusFilter)
                .filter((b) => {
                  if (!bookSearchTerm) return true;
                  const term = bookSearchTerm.toLowerCase();
                  return (
                    (b.title && b.title.toLowerCase().includes(term)) ||
                    (b.authorName && b.authorName.toLowerCase().includes(term))
                  );
                })
                .sort((a, b) => {
                  const authorCompare = (a.authorName || '').localeCompare(b.authorName || '', undefined, { sensitivity: 'base' });
                  if (authorCompare !== 0) return authorCompare;
                  return (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' });
                })
                .map((book, idx) => {
                  const even = idx % 2 === 0;
                  const cell = (bg0, bg1, extra = '') =>
                    `px-2 py-1.5 border border-black/15 align-middle ${extra}` + ' ' + (even ? bg0 : bg1);
                  return (
                    <tr key={book.id} className="hover:brightness-[0.96] transition-all">
                      {/* S.No */}
                      <td className={cell('bg-[#E2E8F0]', 'bg-[#CBD5E1]', 'text-center font-bold text-gray-500')}>{idx + 1}</td>

                      {/* Cover: front + back thumbnails */}
                      <td className={cell('bg-[#F8FAFC]', 'bg-[#F1F5F9]')}>
                        <div className="flex gap-1 justify-center">
                          {[book.coverUrl, book.backCoverUrl].map((url, ci) => (
                            <div key={ci} className="relative w-11 h-16 bg-gray-100 rounded border border-gray-300 overflow-hidden shrink-0">
                              {url
                                ? <img loading="lazy" src={(url.startsWith('http') ? url : `${API}${url.startsWith('/') ? '' : '/'}${url}`) + `?t=${lastFetchedBooks}`} alt={ci === 0 ? 'Front' : 'Back'} className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                : <span className="text-[7px] text-gray-300 font-bold absolute inset-0 flex items-center justify-center">{ci === 0 ? 'F' : 'B'}</span>}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Book Title */}
                      <td className={cell('bg-[#EFF6FF]', 'bg-[#DBEAFE]', 'font-bold text-[#0b1a2e] max-w-[200px] whitespace-normal break-words')}>
                        {book.title}
                        {(book.overpriced || book.isOverpriced) && (
                          <span className="ml-1 bg-yellow-100 text-yellow-800 text-[9px] px-1 py-0.5 rounded font-bold">⚠</span>
                        )}
                      </td>

                      {/* Subtitle */}
                      <td className={cell('bg-[#F0F9FF]', 'bg-[#E0F2FE]', 'text-gray-500 italic max-w-[150px] whitespace-normal break-words')}>
                        {(!book.subtitle || book.subtitle.trim().toUpperCase() === 'NA' || book.subtitle.trim().toUpperCase() === 'N/A') ? "" : book.subtitle}
                      </td>

                      {/* Author */}
                      <td className={cell('bg-[#FFF7ED]', 'bg-[#FFEDD5]', 'font-bold text-[#0b1a2e]')}>{book.authorName}</td>
                      {/* Genre */}
                      <td className={cell('bg-[#F0FDF4]', 'bg-[#DCFCE7]', 'font-bold')} style={{ color: '#166534' }}>
                        {book.genre || <span className="text-gray-300 font-normal">—</span>}
                      </td>

                      {/* Sub-Genre */}
                      <td className={cell('bg-[#F7FEE7]', 'bg-[#ECFCCB]')} style={{ color: '#3F6212' }}>
                        {(!book.subGenre || book.subGenre.trim().toUpperCase() === 'NA' || book.subGenre.trim().toUpperCase() === 'N/A') ? "" : book.subGenre}
                      </td>



                      {/* ISBN */}
                      <td className={cell('bg-[#FAF5FF]', 'bg-[#F3E8FF]', 'text-center font-mono')} style={{ color: '#6B21A8' }}>
                        {book.isbn || <span className="text-gray-300">—</span>}
                      </td>

                      {/* MRP */}
                      <td className={cell('bg-[#F0FDF4]', 'bg-[#DCFCE7]', 'text-center font-bold')} style={{ color: '#15803D' }}>
                        ₹{book.mrp}
                      </td>

                      {/* Language */}
                      <td className={cell('bg-[#FEFCE8]', 'bg-[#FEF9C3]', 'text-center')} style={{ color: '#854D0E' }}>
                        {book.language || <span className="text-gray-300">—</span>}
                      </td>

                      {/* Format */}
                      <td className={cell('bg-[#FFF1F2]', 'bg-[#FFE4E6]', 'text-center')} style={{ color: '#9F1239' }}>
                        {book.format || <span className="text-gray-300">—</span>}
                      </td>

                      {/* Pages */}
                      <td className={cell('bg-[#F0F9FF]', 'bg-[#E0F2FE]', 'text-center font-bold')} style={{ color: '#075985' }}>
                        {book.pages || <span className="text-gray-300 font-normal">—</span>}
                      </td>

                      {/* Publisher */}
                      <td className={cell('bg-[#FDF2F8]', 'bg-[#FCE7F3]')} style={{ color: '#831843' }}>
                        {book.publisher || <span className="text-gray-300">—</span>}
                      </td>

                      {/* Edition */}
                      <td className={cell('bg-[#ECFDF5]', 'bg-[#D1FAE5]', 'text-center')} style={{ color: '#065F46' }}>
                        {book.edition || <span className="text-gray-300">—</span>}
                      </td>

                      {/* Pub Date */}
                      <td className={cell('bg-[#FFF7ED]', 'bg-[#FEF3C7]', 'text-center')} style={{ color: '#92400E' }}>
                        {book.publicationDate || <span className="text-gray-300">—</span>}
                      </td>

                      {/* Status */}
                      <td className={cell('bg-[#F8FAFC]', 'bg-[#F1F5F9]', 'text-center')}>
                        <span className={`dash-badge ${book.status === 'Approved' ? 'approved' : book.status === 'Rejected' ? 'rejected' : 'pending'}`}>
                          {book.status}
                        </span>
                      </td>

                      {/* Stock */}
                      <td className={cell('bg-[#F0FDF4]', 'bg-[#DCFCE7]', 'text-center font-bold')} style={{ color: '#15803D' }}>
                        {book.stock ?? <span className="text-gray-300 font-normal">—</span>}
                      </td>

                      {/* Synopsis */}
                      <td className={cell('bg-[#FDF4FF]', 'bg-[#FAE8FF]', 'text-[10px] italic leading-tight')} style={{ maxWidth: '250px', whiteSpace: 'normal', minWidth: '200px' }}>
                        <div className="line-clamp-2" title={book.synopsis}>{book.synopsis || <span className="text-gray-300 not-italic">—</span>}</div>
                      </td>
                    </tr>
                  );
                })}
              {books.length === 0 && (
                <tr>
                  <td colSpan={17} className="text-center py-8 text-paa-gray-text bg-white">No books found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
      </>
    );
  };

  const allCombinedEvents = React.useMemo(() => {
    return events
      .map((e: any) => ({ ...e, isLegacy: e.status === "Legacy Archive" }))
      .sort((a: any, b: any) => {
        if (a.status === "Pending Approval" && b.status !== "Pending Approval")
          return -1;
        if (b.status === "Pending Approval" && a.status !== "Pending Approval")
          return 1;
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
      });
  }, [events]);

  const eventBreakdownKPIs = React.useMemo(() => {
    if (!selectedEventBreakdown) return null;
    
const totalAuthorsBase = eventRegistrations.length;
      const totalListedBase = eventRegistrations.reduce(
        (acc: number, a: any) =>
          acc +
          (a.books?.reduce(
            (s: number, b: any) => s + (b.listedStock || 0),
            0,
          ) || 0),
        0,
      );
      const totalSoldBase = eventRegistrations.reduce(
        (acc: number, a: any) =>
          acc +
          (a.books && a.books.length > 0
            ? a.books.reduce((s: number, b: any) => s + (b.soldStock || 0), 0)
            : a.manualTotalSold || 0),
        0,
      );
      const totalSaleBase = eventRegistrations.reduce(
        (acc: number, a: any) =>
          acc +
          (a.books && a.books.length > 0
            ? a.books.reduce(
                (s: number, b: any) =>
                  s +
                  (b.soldStock || 0) *
                    (b.overrideMrp || b.mrp || b.book?.mrp || 0),
                0,
              )
            : a.manualTotalRevenue || 0),
        0,
      );
      const totalTitlesBase = eventRegistrations.reduce(
        (acc: number, a: any) => acc + (a.books ? a.books.length : 0),
        0,
      );

      const pubRegs = eventRegistrations.filter(
        (a: any) => a.optInStatus === "Registered",
      );
      const pubAuthors = pubRegs.length;
      const pubListed = pubRegs.reduce(
        (acc: number, a: any) =>
          acc +
          (a.books?.reduce(
            (s: number, b: any) => s + (b.listedStock || 0),
            0,
          ) || 0),
        0,
      );
      const pubSold = pubRegs.reduce(
        (acc: number, a: any) =>
          acc +
          (a.books && a.books.length > 0
            ? a.books.reduce((s: number, b: any) => s + (b.soldStock || 0), 0)
            : a.manualTotalSold || 0),
        0,
      );
      const pubSale = pubRegs.reduce(
        (acc: number, a: any) =>
          acc +
          (a.books && a.books.length > 0
            ? a.books.reduce(
                (s: number, b: any) =>
                  s +
                  (b.soldStock || 0) *
                    (b.overrideMrp || b.mrp || b.book?.mrp || 0),
                0,
              )
            : a.manualTotalRevenue || 0),
        0,
      );
      const pubTitles = pubRegs.reduce(
        (acc: number, a: any) => acc + (a.books ? a.books.length : 0),
        0,
      );

      const totalRegistered =
        selectedEventBreakdown.aggEligibleAuthors != null
          ? selectedEventBreakdown.aggEligibleAuthors
          : selectedEventBreakdown.isLegacy
            ? "NA"
            : totalAuthorsBase;
      const totalAuthors =
        selectedEventBreakdown.aggAuthors != null
          ? selectedEventBreakdown.aggAuthors
          : selectedEventBreakdown.isLegacy
            ? "NA"
            : pubAuthors;
      const totalTitles =
        selectedEventBreakdown.aggTitles != null
          ? selectedEventBreakdown.aggTitles
          : selectedEventBreakdown.isLegacy
            ? "NA"
            : totalTitlesBase;
      const totalListed =
        selectedEventBreakdown.aggSent != null
          ? selectedEventBreakdown.aggSent
          : selectedEventBreakdown.isLegacy
            ? "NA"
            : totalListedBase;
      const totalSold =
        selectedEventBreakdown.aggSold != null
          ? selectedEventBreakdown.aggSold
          : selectedEventBreakdown.isLegacy
            ? "NA"
            : totalSoldBase;
      const totalSale =
        selectedEventBreakdown.aggRevenue != null
          ? selectedEventBreakdown.aggRevenue
          : selectedEventBreakdown.isLegacy
            ? "NA"
            : totalSaleBase;
      const totalPaymentsBase = eventRegistrations.reduce(
        (acc: number, a: any) => acc + (a.amountPaid || 0),
        0,
      );
      const totalPayments =
        selectedEventBreakdown.aggPayments != null
          ? selectedEventBreakdown.aggPayments
          : selectedEventBreakdown.isLegacy
            ? "NA"
            : totalPaymentsBase;

      let maxSold = -1;
      let bestSellingBook = "-";
      if (!selectedEventBreakdown.isLegacy) {
        eventRegistrations.forEach((a: any) => {
          (a.books || []).forEach((b: any) => {
            if ((b.soldStock || 0) > maxSold) {
              maxSold = b.soldStock;
              bestSellingBook = b.title || b.book?.title || "";
            }
          });
        });
      }

    return {
      totalAuthorsBase, totalListedBase, totalSoldBase, totalSaleBase, totalTitlesBase,
      pubAuthors, pubListed, pubSold, pubSale, pubTitles,
      totalPaymentsBase, maxSold, bestSellingBook
    };
  }, [selectedEventBreakdown, eventRegistrations]);

  const renderEventsTab = () => {
    const handleExportEventRegistrations = async () => {
      const ExcelJS = (await import("exceljs")).default;
      const { saveAs } = await import("file-saver");
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Event Registrations");

      const headers = [
        "S.No",
        "Author Name",
        "City",
        "Date Registered",
        "Included in the Catalogue",
        "Included in the Database",
        "Donating Books to the Airport",
        "Participating in Website",
      ];
      events.forEach((e) =>
        headers.push(`Participated in ${e.name.replace(/,/g, "")}`),
      );
      headers.push(
        "No of Literary Events participated in",
        "No of Literary Events Organised",
        "No of Book Fair Stall Organised",
        "Authors Offering Publishing Services",
      );

      sheet.mergeCells(1, 1, 1, headers.length);
      const titleCell = sheet.getCell(1, 1);
      titleCell.value = "EVENT REGISTRATIONS EXPORT";
      titleCell.font = {
        name: "Arial",
        size: 14,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0B1A2E" },
      };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };

      const headerRow = sheet.addRow(headers);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FF000000" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD4AF37" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });

      authors.forEach((author, idx) => {
        const city = author.address
          ? author.address.split(",").pop()?.trim() || ""
          : "";
        const registeredDate = new Date(author.createdAt).toLocaleDateString(
          "en-GB",
          { day: "2-digit", month: "short", year: "2-digit" },
        );

        const rowData = [
          idx + 1,
          author.name,
          city,
          registeredDate,
          "Yes",
          "Yes",
          "NA",
          "Yes",
        ];

        const registeredEventIds = author.eventRegistrations
          ? author.eventRegistrations.map((r: any) => r.eventId)
          : [];
        let numEventsParticipated = registeredEventIds.length;

        events.forEach((e) => {
          rowData.push(registeredEventIds.includes(e.id) ? "Yes" : "No");
        });

        const literaryParticipated = events.filter(
          (e) =>
            registeredEventIds.includes(e.id) &&
            e.eventType?.toLowerCase().includes("literary"),
        ).length;
        const bookFairs = events.filter(
          (e) =>
            registeredEventIds.includes(e.id) &&
            e.eventType?.toLowerCase().includes("fair"),
        ).length;

        rowData.push(
          numEventsParticipated,
          literaryParticipated,
          bookFairs,
          "No",
        );

        const addedRow = sheet.addRow(rowData);
        addedRow.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          };
          cell.font = { name: "Arial", size: 10, color: { argb: "000000" } };

          let colBgColor = "FFFFFF";
          if (colNumber === 2)
            colBgColor = "FF8B8B"; // Light red (Author Name)
          else if (colNumber === 3)
            colBgColor = "FFD2A3"; // Light orange (City)
          else if (colNumber === 4)
            colBgColor = "D4D8DD"; // Light gray (Registration Date)
          else if (colNumber >= 9 && colNumber <= 8 + events.length)
            colBgColor = "DDA0DD"; // Lavender (Events Participated)
          else if (colNumber > 8 + events.length) colBgColor = "B3E5FC"; // Cyan for final columns

          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: colBgColor },
          };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, "event_registrations.xlsx");
    };

    const handleExportEventsExcel = async () => {
      try {
        const toastId = toast.loading("Generating Excel file...");
        const res = await axios.get(`${API}/api/admin/events/export`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          responseType: "blob",
        });
        toast.dismiss(toastId);
        toast.success("Excel generated successfully!");

        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "Events_Export.xlsx");
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (err) {
        toast.dismiss();
        toast.error("Failed to export Events to Excel");
        console.error(err);
      }
    };

    const handleOpenBreakdown = (evt: any) => {
      setSelectedEventBreakdown(evt);
      const isPastOrLegacy =
        evt.isLegacy ||
        evt.status === "Past" ||
        evt.status === "Legacy Archive";
      setShowAllPlatformAuthors(false);
      fetchEventRegistrations(evt.id);
      fetchAuthors(true);
      const slug = `${evt.id}-${evt.name.replace(/\s+/g, "-").toLowerCase()}`;
      navigate(`/operations/events/${slug}`);
      setTimeout(() => {
        const scrollEl = document.getElementById("admin-dashboard-scroll");
        if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: "auto" });
        else window.scrollTo({ top: 0, behavior: "auto" });
      }, 0);
    };

    const handleCloseBreakdown = () => {
      setSelectedEventBreakdown(null);
      setSelectedAuthorForData(null);
      navigate("/operations");
    };

    const handleSaveAggregateData = async () => {
      try {
        const formData = new FormData();
        formData.append(
          "aggAuthors",
          selectedEventBreakdown.aggAuthors?.toString() || "0",
        );
        formData.append(
          "aggTitles",
          selectedEventBreakdown.aggTitles?.toString() || "0",
        );
        formData.append(
          "aggSent",
          selectedEventBreakdown.aggSent?.toString() || "0",
        );
        formData.append(
          "aggSold",
          selectedEventBreakdown.aggSold?.toString() || "0",
        );
        formData.append(
          "aggRevenue",
          selectedEventBreakdown.aggRevenue?.toString() || "0",
        );
        formData.append(
          "aggEligibleAuthors",
          selectedEventBreakdown.aggEligibleAuthors?.toString() || "0",
        );

        await axios.put(
          `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/events/${selectedEventBreakdown.id}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        toast.success("Aggregate stats saved!");
        fetchEvents();
      } catch (err) {
        toast.error("Failed to save aggregate stats");
      }
    };

    const handleGeneratePoster = async () => {
      const form = document.getElementById(
        "create-event-form",
      ) as HTMLFormElement;
      if (!form) return;
      const name = (form.elements.namedItem("name") as HTMLInputElement)?.value;
      const date = (form.elements.namedItem("date") as HTMLInputElement)?.value;
      const location = (form.elements.namedItem("location") as HTMLInputElement)
        ?.value;

      if (!name || !date || !location) {
        toast.error(
          "Please enter Event Name, Date, and Location to generate poster",
        );
        return;
      }

      setPosterData({ name, date, location });

      setTimeout(async () => {
        if (!posterRef.current) return;
        try {
          toast.loading("Generating poster...", { id: "poster-toast" });

          let h2c = (window as any).html2canvas;
          if (!h2c) {
            await new Promise<void>((resolve, reject) => {
              if (document.querySelector('script[src*="html2canvas"]')) { resolve(); return; }
              const script = document.createElement('script');
              script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
              script.onload = () => resolve();
              script.onerror = () => reject(new Error('Failed to load html2canvas'));
              document.head.appendChild(script);
            });
            h2c = (window as any).html2canvas;
          }

          if (!h2c) throw new Error('html2canvas library unavailable');

          const canvas = await h2c(posterRef.current, {
            scale: 2,
            useCORS: true,
            onclone: (clonedDoc: Document) => {
              const target = clonedDoc.querySelector('[data-poster-root]') as HTMLElement;
              if (!target) return;
              const allElems = target.getElementsByTagName('*');
              for (let i = 0; i < allElems.length; i++) {
                const el = allElems[i] as HTMLElement;
                if (!el.style) continue;
                const comp = clonedDoc.defaultView?.getComputedStyle(el);
                if (comp) {
                  ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'fill', 'stroke'].forEach(prop => {
                    const val = (comp as any)[prop];
                    if (val && (val.includes('oklab') || val.includes('oklch'))) {
                      (el.style as any)[prop] = 'transparent';
                    }
                  });
                }
              }
            }
          });
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], "event-poster.png", {
                type: "image/png",
              });
              setGeneratedPoster(file);
              setGeneratedPosterPreview(URL.createObjectURL(file));
              toast.success("Poster generated and set as banner!", {
                id: "poster-toast",
              });
            }
          });
        } catch (err) {
          console.error("Poster generation error:", err);
          toast.error("Failed to generate poster", { id: "poster-toast" });
        }
      }, 500);
    };

    if (isEventModalOpen) {
      const isPastEvent =
        createEventStatus === "Past" || createEventStatus === "Legacy Archive";
      return (
        <div className="bg-white rounded-xl shadow-premium p-8 border border-gray-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-6 border-b pb-4">
            <h3 className="text-2xl font-serif text-paa-navy">
              Create New Event
            </h3>
            <button
              onClick={() => setIsEventModalOpen(false)}
              className="dash-btn bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors shadow-sm"
            >
              Cancel & Go Back
            </button>
          </div>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              escapeDeactivates: true,
              clickOutsideDeactivates: true,
            }}
          >
            <div>
              <form
                id="create-event-form"
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const target = e.target as any;
                  setIsSubmittingEvent(true);
                  try {
                    const fd = new FormData();
                    fd.append("name", target.name.value);
                    const createDateTypeVal = createDateType;
                    const createDateVal =
                      createDateTypeVal === "exact"
                        ? target.date.value
                        : target.tentativeDateInput?.value ||
                          createTentativeDate;
                    fd.append("dateType", createDateTypeVal);
                    fd.append("date", createDateVal);
                    if (createDateTypeVal === "tentative") {
                      fd.append("tentativeDate", createDateVal);
                    }
                    fd.append("location", target.location.value);

                    const days = target.durationDays.value;
                    const hours = target.durationHours.value;
                    let durationStr = [];
                    if (days && parseInt(days) > 0)
                      durationStr.push(`${days} Days`);
                    if (hours && parseInt(hours) > 0)
                      durationStr.push(`${hours} Hours`);
                    fd.append(
                      "duration",
                      durationStr.length > 0
                        ? durationStr.join(", ")
                        : "0 Days",
                    );

                    if (target.startTime?.value)
                      fd.append("startTime", target.startTime.value);
                    if (target.endTime?.value)
                      fd.append("endTime", target.endTime.value);
                    fd.append("eventType", target.eventType.value);
                    fd.append("status", createEventStatus);
                    fd.append("category", target.category.value);
                    fd.append("registrationFee", target.registrationFee.value);
                    fd.append("feeType", target.feeType.value);
                    if (target.description.value)
                      fd.append("description", target.description.value);
                    fd.append(
                      "livePosEnabled",
                      target.livePosEnabled?.checked ? "true" : "false",
                    );
                                        if (target.banner.files[0]) {
                      fd.append("banner", target.banner.files[0]);
                    } else if (generatedPoster) {
                      fd.append("banner", generatedPoster);
                    }

                    if (!hasGranularData) {
                      fd.append("aggAuthors", target.aggAuthors?.value || "0");
                      fd.append("aggSent", target.aggSent?.value || "0");
                      fd.append("aggSold", target.aggSold?.value || "0");
                      fd.append("aggRevenue", target.aggRevenue?.value || "0");
                      fd.append(
                        "aggEligibleAuthors",
                        target.aggEligibleAuthors?.value || "0",
                      );
                    }

                    await axios.post(
                      `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/events`,
                      fd,
                      {
                        headers: {
                          Authorization: `Bearer ${localStorage.getItem("token")}`,
                        },
                      },
                    );
                    toast.success("Event Created Successfully!");
                    setIsEventModalOpen(false);
                    fetchEvents();
                  } catch (err: any) {
                    toast.error(err.response?.data?.error || err.message);
                  } finally {
                    setIsSubmittingEvent(false);
                  }
                }}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="dash-label">Event Name</label>
                      <input
                        required
                        name="name"
                        type="text"
                        className="dash-input"
                      />
                    </div>
                    <div>
                      <label className="dash-label">Event Status</label>
                      <select
                        name="status"
                        className="dash-input"
                        value={createEventStatus}
                        onChange={(e) => setCreateEventStatus(e.target.value)}
                      >
                        <option value="Upcoming">Upcoming</option>
                        <option value="Past">Past (Granular Data)</option>
                        <option value="Legacy Archive">
                          Legacy Archive (Aggregate Data)
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="dash-label">
                        Event Banner (Optional)
                      </label>
                      <div className="flex flex-col gap-2">
                        <input
                          name="banner"
                          type="file"
                          accept="image/*"
                          className="dash-input"
                        />
                        <button
                          type="button"
                          onClick={handleGeneratePoster}
                          className="px-3 py-1.5 bg-paa-gold text-paa-navy text-xs font-bold uppercase rounded border border-paa-gold hover:bg-white transition-colors"
                        >
                          Generate Event Poster
                        </button>
                      </div>
                      {generatedPosterPreview && (
                        <div className="mt-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                          <span className="text-[10px] text-paa-navy font-bold uppercase tracking-wider block mb-2">
                            Generated Poster:
                          </span>
                          <div className="relative group inline-block">
                            <a
                              href={generatedPosterPreview}
                              target="_blank"
                              rel="noreferrer"
                              title="Click to view full poster"
                            >
                              <img
                                loading="lazy"
                                src={generatedPosterPreview}
                                alt="Generated Poster"
                                className="w-full max-w-[150px] h-auto object-contain border-2 border-white shadow-sm rounded hover:shadow-md transition-shadow cursor-pointer"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded pointer-events-none">
                                <span className="text-white text-[10px] font-bold uppercase tracking-wider bg-black/50 px-2 py-1 rounded">
                                  View
                                </span>
                              </div>
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                setGeneratedPoster(null);
                                setGeneratedPosterPreview(null);
                              }}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition-colors z-10"
                              title="Remove Poster"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="dash-label">Event Description</label>
                    <textarea
                      name="description"
                      rows={3}
                      className="dash-input resize-y"
                      placeholder="Short details about the event..."
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="dash-label">Format</label>
                      <select name="eventType" className="dash-input">
                        <option value="" disabled hidden>
                          Select Format
                        </option>
                        <option value="Meet the Authors">
                          Meet the Authors
                        </option>
                        <option value="Stall">Stall</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div>
                      <label className="dash-label">Category</label>
                      <select name="category" className="dash-input">
                        <option value="" disabled hidden>
                          Select Category
                        </option>
                        <option value="Housing Society">Housing Society</option>
                        <option value="College">College</option>
                        <option value="Book Fair">Book Fair</option>
                        <option value="Corporate Office">
                          Corporate Office
                        </option>
                        <option value="University">University</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div>
                      <label className="dash-label">Location (Venue)</label>
                      <input
                        required
                        name="location"
                        type="text"
                        className="dash-input"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="dash-label !mb-0">Date</label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-gray-600 hover:text-paa-navy transition-colors select-none">
                          <input
                            type="checkbox"
                            checked={createDateType === "tentative"}
                            onChange={(e) =>
                              setCreateDateType(
                                e.target.checked ? "tentative" : "exact",
                              )
                            }
                            className="w-3.5 h-3.5 accent-paa-navy rounded cursor-pointer"
                          />
                          Tentative Date
                        </label>
                      </div>
                      {createDateType === "exact" ? (
                        <>
                          <input
                            required={createDateType === "exact"}
                            name="date"
                            type="date"
                            className="dash-input"
                            value={createEventDate || ""}
                            onChange={(e) => setCreateEventDate(e.target.value)}
                          />
                          {createEventDate && (
                            <div
                              className={`text-[10px] mt-1 font-bold ${isPastEvent ? "text-orange-500" : "text-emerald-500"}`}
                            >
                              {isPastEvent
                                ? "— Past Event"
                                : "— Upcoming Event"}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <input
                            required={createDateType === "tentative"}
                            name="tentativeDateInput"
                            type="text"
                            className="dash-input"
                            placeholder="e.g. August 2026, Coming Soon, Q4 2026"
                            value={createTentativeDate || ""}
                            onChange={(e) =>
                              setCreateTentativeDate(e.target.value)
                            }
                          />
                          <span className="text-[10px] text-gray-500 mt-1 block font-medium">
                            Freeform tentative date text
                          </span>
                        </>
                      )}
                    </div>
                    <div>
                      <label className="dash-label">Duration</label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <input
                            required
                            name="durationDays"
                            type="number"
                            min="0"
                            className="dash-input"
                            placeholder="Days"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            required
                            name="durationHours"
                            type="number"
                            min="0"
                            className="dash-input"
                            placeholder="Hours"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="dash-label">From Timing</label>
                      <input
                        name="startTime"
                        type="time"
                        className="dash-input"
                      />
                    </div>
                    <div>
                      <label className="dash-label">To Timing</label>
                      <input
                        name="endTime"
                        type="time"
                        className="dash-input"
                      />
                    </div>
                    <div>
                      <label className="dash-label">Registration Fee (₹)</label>
                      <input
                        required
                        name="registrationFee"
                        type="number"
                        defaultValue={0}
                        className="dash-input"
                      />
                    </div>
                    <div>
                      <label className="dash-label">Fee Type</label>
                      <select name="feeType" className="dash-input">
                        <option value="Per Author">Per Author</option>
                        <option value="Per Title">Per Title</option>
                        <option value="Flat Fee">Flat Fee</option>
                      </select>
                    </div>
                  </div>
                </div>

                
                <div className="flex items-center gap-2 mt-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                  <input
                    type="checkbox"
                    name="livePosEnabled"
                    id="livePosEnabled"
                    className="w-4 h-4 text-paa-navy focus:ring-paa-navy rounded border-gray-300"
                    defaultChecked={!isPastEvent}
                  />
                  <label
                    htmlFor="livePosEnabled"
                    className="text-sm font-medium text-paa-navy"
                  >
                    Enable Live POS tracking for this event
                  </label>
                </div>

                <div className="border-t border-gray-200 pt-6 mt-6">
                  {createEventStatus !== "Legacy Archive" && (
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-sm text-blue-800">
                      * You can manage granular data for each author from the
                      Event Breakdown view after creating this event.
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                  <button
                    type="button"
                    onClick={() => setIsEventModalOpen(false)}
                    className="dash-btn dash-btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEvent}
                    className="dash-btn dash-btn-primary min-w-[120px]"
                  >
                    {isSubmittingEvent ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                      </span>
                    ) : (
                      "Save Event Details"
                    )}
                  </button>
                </div>
              </form>

              <div
                style={{
                  position: "absolute",
                  top: "0",
                  left: "0",
                  zIndex: -999,
                  opacity: 0,
                  pointerEvents: "none",
                }}
              >
                <div
                  ref={posterRef}
                  className="w-[800px] h-[1200px] p-12 flex flex-col items-center justify-between relative overflow-hidden font-serif"
                  style={{
                    background:
                      "linear-gradient(to bottom right, #0B1A2E, #312e81, #000000)",
                    color: "#ffffff",
                  }}
                >
                  {/* Background decorative elements */}
                  <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div
                      className="absolute top-10 left-10 w-64 h-64 rounded-full mix-blend-overlay filter blur-3xl"
                      style={{ backgroundColor: "#D4AF37" }}
                    ></div>
                    <div
                      className="absolute bottom-10 right-10 w-96 h-96 rounded-full mix-blend-overlay filter blur-3xl"
                      style={{ backgroundColor: "#3b82f6" }}
                    ></div>
                  </div>

                  <div className="relative z-10 w-full flex flex-col items-center">
                    <div
                      className="mb-8 w-40 h-40 rounded-full p-4 flex items-center justify-center"
                      style={{
                        backgroundColor: "#ffffff",
                        border: "4px solid #D4AF37",
                      }}
                    >
                      <img
                        loading="lazy"
                        src="/logo.png"
                        alt="PAA Logo"
                        className="max-w-full max-h-full object-contain"
                        crossOrigin="anonymous"
                      />
                    </div>

                    <h2
                      className="text-2xl font-bold tracking-widest uppercase mb-2"
                      style={{ color: "#D4AF37" }}
                    >
                      Pune Authors Association
                    </h2>
                    <div
                      className="w-24 h-1 mb-16"
                      style={{ backgroundColor: "#D4AF37" }}
                    ></div>

                    <h1
                      className="text-6xl font-black text-center mb-8 leading-tight"
                      style={{
                        color: "#ffffff",
                        textShadow: "0 4px 6px rgba(0,0,0,0.5)",
                      }}
                    >
                      {posterData?.name || "LITERARY EVENT"}
                    </h1>
                  </div>

                  <div
                    className="relative z-10 w-full backdrop-blur-md rounded-3xl p-10"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <div className="flex flex-col gap-8">
                      <div className="flex items-center gap-6">
                        <div
                          className="w-16 h-16 rounded-2xl flex items-center justify-center"
                          style={{ backgroundColor: "#D4AF37" }}
                        >
                          <CalendarIcon
                            className="w-8 h-8"
                            style={{ color: "#0B1A2E" }}
                          />
                        </div>
                        <div>
                          <p
                            className="font-bold tracking-widest text-sm uppercase mb-1"
                            style={{ color: "#D4AF37" }}
                          >
                            Date & Time
                          </p>
                          <p
                            className="text-3xl font-bold"
                            style={{ color: "#ffffff" }}
                          >
                            {posterData?.date
                              ? new Date(posterData.date).toLocaleDateString(
                                  "en-US",
                                  {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  },
                                )
                              : "To Be Announced"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div
                          className="w-16 h-16 rounded-2xl flex items-center justify-center"
                          style={{ backgroundColor: "#D4AF37" }}
                        >
                          <MapPin
                            className="w-8 h-8"
                            style={{ color: "#0B1A2E" }}
                          />
                        </div>
                        <div>
                          <p
                            className="font-bold tracking-widest text-sm uppercase mb-1"
                            style={{ color: "#D4AF37" }}
                          >
                            Venue
                          </p>
                          <p
                            className="text-3xl font-bold leading-snug"
                            style={{ color: "#ffffff" }}
                          >
                            {posterData?.location || "Venue TBA"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 w-full text-center mt-12">
                    <p
                      className="text-xl font-medium italic mb-6"
                      style={{ color: "#d1d5db" }}
                    >
                      "Empowering voices, inspiring readers."
                    </p>
                    <p
                      className="text-lg font-bold tracking-wider"
                      style={{ color: "#ffffff" }}
                    >
                      WWW.PUNEAUTHORS.COM
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </FocusTrap>
        </div>
      );
    }



    const handleEditAuthorData = (m: any) => {
      const authorProfile = m.author || m;
      setSelectedAuthorForData(authorProfile);
      setCurrentOptInStatus(m.optInStatus || null);
      const hasPaid = m.paymentStatus === "Paid" || (m.amountPaid && m.amountPaid > 0);
      setManageRegStatus(
        hasPaid ? "Registered" :
        m.optInStatus?.startsWith("Declined") || m.optInStatus?.startsWith("Rejected") ? "Declined" :
        m.optInStatus?.startsWith("Approved") ? "Approved" :
        m.optInStatus?.startsWith("Pending") ? "Pending Approval" :
        m.optInStatus?.startsWith("Registered") ? "Registered" : "Pending"
      );
      setManagePaymentStatus(m.paymentStatus || (hasPaid ? "Paid" : "Unpaid"));
      const expectedFee =
        selectedEventBreakdown?.feeType === "Per Title"
          ? (m.books?.length || 0) *
            (selectedEventBreakdown.registrationFee || 0)
          : selectedEventBreakdown?.registrationFee || 0;
      setManageAmountPaid(
        m.amountPaid ||
          (m.paymentStatus === "Paid" || m.optInStatus?.startsWith("Registered")
            ? expectedFee
            : 0),
      );
      const isLegacyEvent =
        selectedEventBreakdown?.status === "Legacy Archive" ||
        selectedEventBreakdown?.isLegacy;
      setUseGlobalOverride(
        isLegacyEvent ||
          (m.manualTotalSold !== null && m.manualTotalSold !== undefined),
      );
      const globalBooks = authorProfile.books || [];
      const eventBooks = (m.books || []).filter(
        (b: any) => b.bookId !== undefined,
      );

      const builtAuthorBooks = globalBooks.map((gb: any) => {
        const evb = eventBooks.find((eb: any) => eb.bookId === gb.id);
        let prefilledDailySales: Record<string, any> = { ...(evb?.manualDailySales || {}) };
        
        let totalPosSold = 0;
        if (evb?.dailySales) {
           Object.entries(evb.dailySales).forEach(([posDate, qty]) => {
              totalPosSold += (qty as number) || 0;
              const dateKey = new Date(posDate).toDateString();
              if (!prefilledDailySales[dateKey] || prefilledDailySales[dateKey].sold === undefined) {
                 const mrp = parseFloat(evb.overrideMrp || evb.book?.mrp || gb.mrp) || 0;
                 prefilledDailySales[dateKey] = { sold: qty as number, revenue: (qty as number) * mrp };
              }
           });
        }
        
        return {
          bookId: gb.id,
          title: gb.title || "Unknown Book",
          mrp: parseFloat(gb.mrp) || 0,
          overrideMrp: evb?.overrideMrp || undefined,
          isSelected: eventBooks.length === 0 ? true : !!evb,
          listedStock: evb ? evb.listedStock || 0 : 0,
          soldStock: evb ? evb.soldStock || 0 : 0,
          returnedStock: evb ? evb.returnedStock || 0 : 0,
          posSold: totalPosSold,
          manualDailySales: prefilledDailySales
        };
      });

      let initialGlobalSold = m.manualTotalSold || 0;
      let initialGlobalRevenue = m.manualTotalRevenue || 0;
      
      let sumS = 0; let sumR = 0;
      let hasAnyDaily = false;
      builtAuthorBooks.forEach((b: any) => {
         if (b.manualDailySales && Object.keys(b.manualDailySales).length > 0) {
            hasAnyDaily = true;
            Object.values(b.manualDailySales).forEach((d:any) => { sumS+=(d.sold||0); sumR+=(d.revenue||0); });
         }
      });
      if (hasAnyDaily) {
          initialGlobalSold = sumS;
          initialGlobalRevenue = sumR;
      }
      
      setGlobalSold(initialGlobalSold);
      setGlobalRevenue(initialGlobalRevenue);
      setManageAuthorBooks(builtAuthorBooks);
      setIsManageDataDirty(false);
    };

    const handlePublishData = async () => {
      try {
        setIsPublishingData(true);
        await axios.post(
          `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/events/${selectedEventBreakdown.id}/author/${selectedAuthorForData.id}/publish`,
          {
            registrationStatus: manageRegStatus,
            paymentStatus: managePaymentStatus,
            amountPaid: manageAmountPaid,
            booksData: manageAuthorBooks,
            useGlobalOverride,
            globalSold,
            globalRevenue,
            manualDailySales,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        fetchEventRegistrations(selectedEventBreakdown.id);
        toast.success(
          "Data Published! The author will now see these metrics in their dashboard.",
        );
        setIsPublishingData(false);
        setIsManageDataDirty(false);
      } catch (err: any) {
        toast.error(err.response?.data?.error || "Failed to publish data.");
        if (err.response?.data?.stack) console.error(err.response.data.stack);
        setIsPublishingData(false);
      }
    };

    const handleSaveDraft = async () => {
      try {
        setIsSavingDraft(true);
        await axios.post(
          `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/events/${selectedEventBreakdown.id}/author/${selectedAuthorForData.id}/publish`,
          {
            registrationStatus: manageRegStatus,
            paymentStatus: managePaymentStatus,
            amountPaid: manageAmountPaid,
            booksData: manageAuthorBooks,
            useGlobalOverride,
            globalSold,
            globalRevenue,
            manualDailySales,
            isDraft: true,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        await fetchEventRegistrations(selectedEventBreakdown.id);
        toast.success("Draft Saved! Data instantly reflected on the table.");
        setIsSavingDraft(false);
      } catch (err: any) {
        toast.error(err.response?.data?.error || "Failed to save draft.");
        setIsSavingDraft(false);
      }
    };
    const handleDownloadEventReport = async () => {
      if (!selectedEventBreakdown) return;

      const eventNameStr = (selectedEventBreakdown.name || "").toLowerCase();
      let staticFile = null;
      if (eventNameStr.includes("dehradun"))
        staticFile = "DehradunBookFair (5).xlsx";
      else if (eventNameStr.includes("goa"))
        staticFile = "GoaBookFair (2).xlsx";
      else if (eventNameStr.includes("jammu"))
        staticFile = "JammuBookFair (1).xlsx";
      else if (eventNameStr.includes("srinagar"))
        staticFile = "SrinagarBookFair (1).xlsx";

      if (staticFile) {
        const aLink = document.createElement("a");
        aLink.href = `/Events/${staticFile}`;
        aLink.download = staticFile;
        document.body.appendChild(aLink);
        aLink.click();
        document.body.removeChild(aLink);
        return;
      }

      const totalParticipants = eventRegistrations.length;
      const totalBooksListed = eventRegistrations.reduce(
        (acc: number, a: any) =>
          acc +
          (a.books?.reduce(
            (s: number, b: any) => s + (b.listedStock || 0),
            0,
          ) ||
            a.manualTotalListed ||
            0),
        0,
      );
      const totalBooksSold = eventRegistrations.reduce(
        (acc: number, a: any) =>
          acc +
          (a.books && a.books.length > 0
            ? a.books.reduce((s: number, b: any) => s + (b.soldStock || 0), 0)
            : a.manualTotalSold || 0),
        0,
      );
      const totalSalesRevenue = eventRegistrations.reduce(
        (acc: number, a: any) =>
          acc +
          (a.books && a.books.length > 0
            ? a.books.reduce(
                (s: number, b: any) =>
                  s +
                  (b.soldStock || 0) *
                    (parseFloat(b.overrideMrp || b.book?.mrp || b.mrp) || 0),
                0,
              )
            : a.manualTotalRevenue || 0),
        0,
      );
      const totalFeesReceived = eventRegistrations.reduce(
        (acc: number, a: any) => {
          const fee =
            a.amountPaid != null
              ? parseFloat(a.amountPaid)
              : a.paymentStatus === "Paid" ||
                  a.optInStatus?.startsWith("Registered")
                ? parseFloat(selectedEventBreakdown.registrationFee || 0)
                : 0;
          return acc + (!isNaN(fee) ? fee : 0);
        },
        0,
      );

      const ExcelJS = (await import("exceljs")).default;
      const { saveAs } = await import("file-saver");
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Event Report");

      // Title & Summary styling
      sheet.mergeCells("A1:O1");
      sheet.getCell("A1").value =
        `Event Report: ${selectedEventBreakdown.name}`;
      sheet.getCell("A1").font = {
        size: 12,
        bold: true,
        color: { argb: "FF000000" },
      };
      sheet.getCell("A1").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF00FFFF" },
      }; // Cyan
      sheet.getCell("A1").alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      sheet.getCell("A1").border = {
        top: { style: "medium" },
        left: { style: "medium" },
        right: { style: "medium" },
        bottom: { style: "medium" },
      };

      sheet.getCell("A2").value = "Date/Duration:";
      sheet.getCell("B2").value =
        `${selectedEventBreakdown.date} / ${selectedEventBreakdown.duration}`;

      sheet.addRow([]);
      sheet.getCell("A4").value = "Total Participants:";
      sheet.getCell("B4").value = totalParticipants;
      sheet.getCell("A5").value = "Total Books Listed:";
      sheet.getCell("B5").value = totalBooksListed;
      sheet.getCell("A6").value = "Total Books Sold:";
      sheet.getCell("B6").value = totalBooksSold;
      sheet.getCell("A7").value = "Total Sales Revenue (MRP):";
      sheet.getCell("B7").value = `₹${totalSalesRevenue}`;
      sheet.getCell("A8").value = "Total Fees Received:";
      sheet.getCell("B8").value = `₹${totalFeesReceived}`;

      ["A4", "A5", "A6", "A7", "A8"].forEach((cell) => {
        sheet.getCell(cell).font = { bold: true };
      });

      sheet.addRow([]);

      // Headers
      const headers = [
        "S.No",
        "Author Name",
        "Phone",
        "Email",
        "Participated",
        "Payment Status",
        "Fees Paid",
        "Book Title",
        "MRP",
        "Copies Received",
        "Copies Sold",
        "Revenue",
        "Balance Remaining",
      ];

      eventUniqueDates.forEach((date, i) => {
        headers.push(`Day ${i + 1} (${date})`);
      });

      const headerRow = sheet.addRow(headers);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FF000000" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFFF00" },
        }; // Yellow
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });

      let sNo = 1;

      authors.forEach((author: any) => {
        const reg = eventRegistrations.find(
          (r: any) =>
            r.author?.id === author.id ||
            r.authorId === author.id ||
            r.id === author.id,
        );
        const isParticipating = reg ? "Yes" : "No";
        const amountPaid =
          reg?.amountPaid != null
            ? reg.amountPaid
            : reg?.paymentStatus === "Paid" ||
                reg?.optInStatus?.startsWith("Registered")
              ? selectedEventBreakdown.registrationFee || 0
              : 0;
        const paymentStatus = reg?.paymentStatus || "NA";
        const authorName = author.name || "";
        const phone = author.phone || "NA";
        const email = author.email || "NA";

        if (reg && reg.books && reg.books.length > 0) {
          reg.books.forEach((b: any) => {
            const title = b.book?.title || b.title || "Unknown";
            const mrp = b.overrideMrp || b.book?.mrp || b.mrp || 0;
            const listed = b.listedStock || 0;
            const sold = b.soldStock || 0;
            const balance = listed - sold;
            const revenue = sold * (parseFloat(mrp) || 0);

            const rowData = [
              sNo,
              authorName,
              phone,
              email,
              "Yes",
              paymentStatus,
              amountPaid,
              title,
              mrp,
              listed,
              sold,
              revenue,
              balance,
            ];

            eventUniqueDates.forEach((date) => {
              rowData.push(b.dailySales?.[date] || 0);
            });

            const addedRow = sheet.addRow(rowData);
            addedRow.eachCell((cell, colNumber) => {
              cell.border = {
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" },
              };
              if (colNumber === 5) {
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: {
                    argb: cell.value === "Yes" ? "FFCCFFCC" : "FFFFCCCC",
                  },
                };
              } else if (colNumber === 6) {
                if (cell.value === "Paid" || cell.value === "Confirmed")
                  cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFCCFFCC" },
                  };
                else if (cell.value === "Pending")
                  cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFFFFF99" },
                  };
                else if (cell.value === "NA")
                  cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFFFCCCC" },
                  };
              } else if (colNumber === 9) {
                if (cell.value === "NA")
                  cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFFFCCCC" },
                  };
              }
            });
            sNo++;
          });
        } else if (reg) {
          const listed = reg.manualTotalListed || "NA";
          const sold = reg.manualTotalSold || 0;
          const revenue = reg.manualTotalRevenue || 0;
          const rowData = [
            sNo,
            authorName,
            phone,
            email,
            "Yes",
            paymentStatus,
            amountPaid,
            "NA",
            "NA",
            listed,
            sold,
            revenue,
            "NA",
          ];
          eventUniqueDates.forEach(() => rowData.push("NA"));
          const addedRow = sheet.addRow(rowData);
          addedRow.eachCell((cell, colNumber) => {
            cell.border = {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" },
            };
            if (colNumber === 5) {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: {
                  argb: cell.value === "Yes" ? "FFCCFFCC" : "FFFFCCCC",
                },
              };
            } else if (colNumber === 6) {
              if (cell.value === "Paid" || cell.value === "Confirmed")
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "FFCCFFCC" },
                };
              else if (cell.value === "Pending")
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "FFFFFF99" },
                };
              else if (cell.value === "NA")
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "FFFFCCCC" },
                };
            } else if (colNumber === 9) {
              if (cell.value === "NA")
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "FFFFCCCC" },
                };
            }
          });
          sNo++;
        } else {
          const rowData = [
            sNo,
            authorName,
            phone,
            email,
            "No",
            "NA",
            0,
            "NA",
            "NA",
            0,
            0,
            0,
            0,
          ];
          eventUniqueDates.forEach(() => rowData.push("NA"));
          const addedRow = sheet.addRow(rowData);
          addedRow.eachCell((cell, colNumber) => {
            cell.border = {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" },
            };
            if (colNumber === 5) {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: {
                  argb: cell.value === "Yes" ? "FFCCFFCC" : "FFFFCCCC",
                },
              };
            } else if (colNumber === 6) {
              if (cell.value === "Paid" || cell.value === "Confirmed")
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "FFCCFFCC" },
                };
              else if (cell.value === "Pending")
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "FFFFFF99" },
                };
              else if (cell.value === "NA")
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "FFFFCCCC" },
                };
            } else if (colNumber === 9) {
              if (cell.value === "NA")
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "FFFFCCCC" },
                };
            }
          });
          sNo++;
        }
      });

      sheet.columns.forEach((col, i) => {
        col.width = i === 1 || i === 3 || i === 7 ? 30 : 15;
      });

      workbook.xlsx.writeBuffer().then((buffer) => {
        const blob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = window.URL.createObjectURL(blob);
        const aLink = document.createElement("a");
        aLink.href = url;
        aLink.download = `${selectedEventBreakdown.name}.xlsx`;
        document.body.appendChild(aLink);
        aLink.click();
        document.body.removeChild(aLink);
        window.URL.revokeObjectURL(url);
      });
    };

    if (selectedEventBreakdown) {
      const isPastOrArchive =
        selectedEventBreakdown.isLegacy ||
        selectedEventBreakdown.status === "Past" ||
        selectedEventBreakdown.status === "Legacy Archive";

            const {
        totalAuthorsBase = 0, totalListedBase = 0, totalSoldBase = 0, totalSaleBase = 0, totalTitlesBase = 0,
        pubAuthors = 0, pubListed = 0, pubSold = 0, pubSale = 0, pubTitles = 0,
        totalPaymentsBase = 0, maxSold = -1, bestSellingBook = "-"
      } = eventBreakdownKPIs || {};

      const totalAuthors = isPastOrArchive ? "NA" : totalAuthorsBase;
      const totalRegistered = isPastOrArchive ? "NA" : (selectedEventBreakdown.eventAuthors ? selectedEventBreakdown.eventAuthors.length : 0);
      const totalTitles = isPastOrArchive ? "NA" : totalTitlesBase;
      const totalListed = isPastOrArchive ? "NA" : totalListedBase;
      const totalSold = isPastOrArchive ? "NA" : totalSoldBase;
      const totalSale = isPastOrArchive ? "NA" : totalSaleBase;
      const totalPayments = isPastOrArchive ? "NA" : totalPaymentsBase;

      return (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-x-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 border-b pb-4 gap-4">
            <div>
              <h3 className="text-2xl font-serif text-paa-navy mb-1">
                {selectedEventBreakdown.name}
              </h3>
              <p className="text-sm text-gray-500 font-medium">
                {selectedEventBreakdown.date} &bull;{" "}
                {selectedEventBreakdown.location || "Location TBA"} &bull;{" "}
                {selectedEventBreakdown.duration || "Duration N/A"}
              </p>
              {selectedEventBreakdown.description && (
                <p className="text-sm text-gray-600 mt-2 max-w-3xl leading-relaxed">
                  {selectedEventBreakdown.description}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {!selectedAuthorForData && (
                <>
<button
                    onClick={handleDownloadEventReport}
                    className="dash-btn bg-[#ebd8c0] text-emerald-700 hover:bg-[#ebd8c0] border border-emerald-200 transition-colors shadow-sm font-bold flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      ></path>
                    </svg>{" "}
                    Download Report
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  if (selectedAuthorForData) {
                    setSelectedAuthorForData(null);
                  } else {
                    handleCloseBreakdown();
                  }
                }}
                className="dash-btn bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors shadow-sm"
              >
                {selectedAuthorForData
                  ? "Back to Authors List"
                  : "Back to Events"}
              </button>
            </div>
          </div>
          {selectedAuthorForData ? (
            <div className="border border-gray-200 rounded-xl p-6 bg-gray-50 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                  {selectedAuthorForData.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-paa-navy text-lg">
                    {selectedAuthorForData.name}
                  </h4>
                  <p className="text-xs text-gray-500 font-medium">
                    Managing Event Data
                  </p>
                </div>
              </div>

              <h4 className="font-semibold text-paa-navy mb-4 border-b border-gray-200 pb-2">
                Author Registration & Logistics
              </h4>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Event Participation
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded p-2 text-sm font-semibold text-paa-navy"
                    value={manageRegStatus}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      setManageRegStatus(newStatus);
                      setIsManageDataDirty(true);
                      if (newStatus === "Registered") {
                        setManagePaymentStatus("Paid");
                        if (manageAmountPaid === 0) {
                          const expectedFee =
                            selectedEventBreakdown?.feeType === "Per Title"
                              ? (manageAuthorBooks.length || 0) *
                                (selectedEventBreakdown.registrationFee || 0)
                              : selectedEventBreakdown?.registrationFee || 0;
                          setManageAmountPaid(expectedFee);
                        }
                      }
                    }}
                  >
                    <option value="Registered">Participated / Registered</option>
                    <option value="Approved">Approved</option>
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Pending">Pending (Invited)</option>
                    <option value="Declined">Did Not Participate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Payment Status
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                    value={managePaymentStatus}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      setManagePaymentStatus(newStatus);
                      setIsManageDataDirty(true);
                      if (newStatus === "Paid" && manageAmountPaid === 0) {
                        const expectedFee =
                          selectedEventBreakdown?.feeType === "Per Title"
                            ? (manageAuthorBooks.length || 0) *
                              (selectedEventBreakdown.registrationFee || 0)
                            : selectedEventBreakdown?.registrationFee || 0;
                        setManageAmountPaid(expectedFee);
                      }
                    }}
                  >
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="-">-</option>
                  </select>
                </div>
                {managePaymentStatus === "Paid" && (
                  <div>
                    <label className="block text-xs font-bold text-emerald-600 mb-1">
                      Amount Paid (₹)
                    </label>
                    <input
                      type="number"
                      className="w-full border border-emerald-300 bg-[#ebd8c0] text-emerald-800 rounded p-2 text-sm font-bold"
                      value={manageAmountPaid}
                      onChange={(e) => {
                        setManageAmountPaid(parseFloat(e.target.value) || 0);
                        setIsManageDataDirty(true);
                      }}
                    />
                  </div>
                )}
              </div>

              <h4 className="font-semibold text-paa-navy mb-4 border-b border-gray-200 pb-2">
                Book Sales & Metrics
              </h4>

              <div className="mb-4">
                <label className="flex items-center gap-2 text-sm font-bold text-paa-navy cursor-pointer bg-paa-gold/10 p-3 rounded-lg border border-paa-gold/30">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-paa-navy"
                    checked={useGlobalOverride}
                    onChange={(e) => {
                      setUseGlobalOverride(e.target.checked);
                      setIsManageDataDirty(true);
                    }}
                  />
                  Use Global Override (No book-wise breakdown available)
                </label>
              </div>

              {useGlobalOverride ? (
                <div className="space-y-4 mb-6 bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">
                        Total Books Sold (Overall)
                      </label>
                      <input
                        type="number"
                        className="w-full border border-gray-300 rounded p-2 font-mono"
                        value={globalSold}
                        onChange={(e) => {
                          setGlobalSold(parseInt(e.target.value) || 0);
                          setIsManageDataDirty(true);
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-emerald-600 mb-1 uppercase tracking-wider">
                        Total Revenue (₹)
                      </label>
                      <input
                        type="number"
                        className="w-full border border-emerald-200 bg-[#ebd8c0] text-emerald-700 rounded p-2 font-mono font-bold"
                        value={globalRevenue}
                        onChange={(e) => {
                          setGlobalRevenue(parseInt(e.target.value) || 0);
                          setIsManageDataDirty(true);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                    <h5 className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wider border-b pb-2">Select Books to List</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {manageAuthorBooks.map((book: any, idx: number) => (
                        <div key={idx} className={`flex items-center p-2 border rounded transition-colors ${book.isSelected ? 'border-paa-navy/30 bg-indigo-50/30' : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'}`}>
                          <input
                            type="checkbox"
                            checked={book.isSelected}
                            onChange={(e) => {
                              const newBooks = [...manageAuthorBooks];
                              newBooks[idx].isSelected = e.target.checked;
                              setManageAuthorBooks(newBooks);
                              setIsManageDataDirty(true);
                            }}
                            className="rounded text-paa-navy w-4 h-4 cursor-pointer mr-3 shrink-0"
                          />
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="font-medium text-sm text-gray-800 truncate" title={book.title}>{book.title}</div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0 ml-auto">
                            <div className="flex items-center gap-1">
                              <span title="Quantity Listed">Listed:</span>
                              <input
                                type="number"
                                className="w-12 border border-gray-200 rounded p-0.5 text-xs text-center outline-none focus:border-paa-navy bg-white font-bold text-paa-navy"
                                value={book.listedStock || ""}
                                onChange={(e) => {
                                  const newBooks = [...manageAuthorBooks];
                                  const val = parseInt(e.target.value) || 0;
                                  newBooks[idx].listedStock = val;
                                  if (val > 0) newBooks[idx].isSelected = true;
                                  
                                  let bookTotalSold = 0;
                                  if (newBooks[idx].manualDailySales) {
                                      Object.values(newBooks[idx].manualDailySales).forEach((d:any) => { bookTotalSold += (d.sold||0); });
                                  }
                                  newBooks[idx].returnedStock = Math.max(0, val - bookTotalSold);
                                  
                                  setManageAuthorBooks(newBooks);
                                  setIsManageDataDirty(true);
                                }}
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              MRP: ₹
                              <input
                                type="text"
                                className="w-10 border border-gray-200 rounded p-0.5 text-xs text-center outline-none focus:border-paa-navy bg-white"
                                value={book.overrideMrp !== undefined ? book.overrideMrp : book.mrp || ""}
                                onChange={(e) => {
                                  const newBooks = [...manageAuthorBooks];
                                  newBooks[idx].overrideMrp = e.target.value;
                                  setManageAuthorBooks(newBooks);
                                  setIsManageDataDirty(true);
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 mt-4">
                    <h5 className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wider">Day-wise Sales (Manual Entry)</h5>
                    <div className="space-y-4">
                      {Array.from({ length: parseInt((selectedEventBreakdown?.duration || '1').toString().match(/\d+/)?.[0] || '1') }).map((_, i) => {
                        const baseDate = new Date(selectedEventBreakdown?.date || new Date());
                        baseDate.setDate(baseDate.getDate() + i);
                        const dateStr = baseDate.toDateString();
                        const isEven = i % 2 === 0;
                        const bgClass = isEven ? "bg-[#f5f7ff] border-[#dbe4ff]" : "bg-[#fff9f0] border-[#ffe8cc]";
                        const headerTextClass = isEven ? "text-[#3b5bdb]" : "text-[#d9480f]";
                        const borderClass = isEven ? "border-[#dbe4ff]" : "border-[#ffe8cc]";
                        const titleClass = isEven ? "text-[#4c6ef5]" : "text-[#e8590c]";
                        
                        return (
                          <div key={dateStr} className={`p-4 border rounded-xl shadow-sm ${bgClass}`}>
                            <div className={`text-xs font-bold mb-3 pb-2 flex justify-between border-b ${borderClass} ${headerTextClass}`}>
                              <span>Day {i + 1} &bull; <span className="font-normal opacity-80">{dateStr}</span></span>
                            </div>
                            <div className="space-y-2">
                               {manageAuthorBooks.map((book: any, bIdx: number) => {
                                  if (!book.isSelected) return null;
                                  const mrpToUse = book.overrideMrp !== undefined && book.overrideMrp !== "" ? parseFloat(book.overrideMrp) : book.mrp;
                                  
                                  let prevSold = 0;
                                  if (book.manualDailySales) {
                                      const currentDayTime = new Date(baseDate.toDateString()).getTime();
                                      Object.entries(book.manualDailySales).forEach(([dKey, dVal]: [string, any]) => {
                                          const entryTime = new Date(dKey).getTime();
                                          if (!isNaN(entryTime) && entryTime < currentDayTime) {
                                              prevSold += (dVal.sold || 0);
                                          }
                                      });
                                  }
                                  const startQty = Math.max(0, (book.listedStock || 0) - prevSold);

                                  return (
                                  <div key={bIdx} className="flex items-center justify-between gap-3 text-sm flex-wrap md:flex-nowrap">
                                    <span className={`text-[11px] font-bold truncate flex-1 min-w-[120px] ${titleClass}`} title={book.title}>
                                      {book.title} <span className="text-[10px] font-normal text-gray-500 ml-1">x{startQty}</span>
                                    </span>
                                    <div className="flex gap-2 shrink-0 items-center">
                                      <div className="flex items-center">
                                        <input type="number" placeholder="Sold" className="dash-input w-16 py-1 px-2 text-xs bg-white/90 shadow-sm border-gray-300 h-7" 
                                          value={book.manualDailySales?.[dateStr]?.sold !== undefined ? book.manualDailySales[dateStr].sold : ''}
                                          onChange={(e) => {
                                            const newBooks = [...manageAuthorBooks];
                                            const valStr = e.target.value;
                                            const val = valStr ? (parseInt(valStr) || 0) : undefined;
                                            const autoRev = val !== undefined ? (val * (mrpToUse || 0)) : undefined;
                                            newBooks[bIdx].manualDailySales = { 
                                                ...(newBooks[bIdx].manualDailySales || {}), 
                                                [dateStr]: { ...(newBooks[bIdx].manualDailySales?.[dateStr]||{}), sold: val, revenue: autoRev }
                                            };
                                            
                                            let bookTotalSold = 0;
                                            if (newBooks[bIdx].manualDailySales) {
                                                Object.values(newBooks[bIdx].manualDailySales).forEach((d:any) => { bookTotalSold += (d.sold||0); });
                                            }
                                            newBooks[bIdx].soldStock = bookTotalSold;
                                            newBooks[bIdx].returnedStock = Math.max(0, (newBooks[bIdx].listedStock || 0) - bookTotalSold);

                                            setManageAuthorBooks(newBooks);
                                            setIsManageDataDirty(true);
                                            
                                            let sumS = 0; let sumR = 0;
                                            newBooks.forEach(b => {
                                              if (b.manualDailySales) {
                                                Object.values(b.manualDailySales).forEach((d:any) => { sumS+=(d.sold||0); sumR+=(d.revenue||0); });
                                              }
                                            });
                                            setGlobalSold(sumS); setGlobalRevenue(sumR);
                                          }} 
                                        />
                                      </div>
                                      <div>
                                        <input type="number" placeholder="Rev (₹)" className="dash-input w-20 py-1 px-2 text-xs bg-white/50 cursor-not-allowed text-emerald-700 font-bold h-7" 
                                          value={book.manualDailySales?.[dateStr]?.revenue !== undefined ? book.manualDailySales[dateStr].revenue : ''}
                                          readOnly
                                          title="Auto-calculated from MRP/Price and Sold quantity"
                                        />
                                      </div>
                                    </div>
                                  </div>
                               )})}
                               {manageAuthorBooks.filter((b:any)=>b.isSelected).length === 0 && (
                                  <div className={`text-[10px] italic opacity-60 ${headerTextClass}`}>No books selected for this event. Check 'Listed' above.</div>
                               )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary Footer for Totals */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-inner">
                    <h5 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider flex items-center justify-between">
                      <span>Event Totals Summary</span>
                      <span className="text-[9px] font-normal lowercase italic text-gray-400">Total Returned Stock auto-calculated</span>
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {manageAuthorBooks.filter((b:any) => b.isSelected).map((book: any, idx: number) => (
                         <div key={idx} className="bg-white p-2.5 rounded-lg border border-gray-200 text-[10px] flex justify-between items-center shadow-sm">
                            <span className="font-bold text-paa-navy truncate w-1/2 pr-2" title={book.title}>{book.title}</span>
                            <div className="flex gap-2.5 text-gray-500">
                               <span title="Listed Qty">L: <b className="text-gray-800 text-xs">{book.listedStock || 0}</b></span>
                               <span title="Total Sold">S: <b className="text-emerald-600 text-xs">{book.soldStock || 0}</b></span>
                               <span title="Total Returned">R: <b className="text-rose-600 text-xs">{book.returnedStock || 0}</b></span>
                            </div>
                         </div>
                      ))}
                      {manageAuthorBooks.filter((b:any) => b.isSelected).length === 0 && (
                        <div className="text-[10px] italic text-gray-400 col-span-full">No books selected.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end gap-3 items-center">
                <span className="text-xs text-gray-500 mr-auto font-medium">
                  * Explicit publish required for authors to see past data in
                  their dashboard.
                </span>
                <button
                  onClick={handleSaveDraft}
                  disabled={
                    isPublishingData ||
                    isSavingDraft ||
                    (!isManageDataDirty &&
                      currentOptInStatus?.includes("-Draft"))
                  }
                  className="px-6 py-2.5 text-sm text-paa-navy border border-paa-navy rounded-lg font-bold hover:bg-paa-navy hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingDraft
                    ? "SAVING..."
                    : currentOptInStatus?.includes("-Draft")
                      ? isManageDataDirty
                        ? "RESAVE DRAFT"
                        : "SAVED AS DRAFT"
                      : "SAVE DRAFT"}
                </button>
                <button
                  onClick={handlePublishData}
                  disabled={
                    isPublishingData ||
                    isSavingDraft ||
                    (!isManageDataDirty &&
                      currentOptInStatus &&
                      !currentOptInStatus.includes("-Draft") &&
                      currentOptInStatus !== "Pending Approval" &&
                      currentOptInStatus !== "Pending")
                  }
                  className="px-8 py-2.5 text-sm bg-paa-gold text-paa-navy rounded-lg font-black hover:brightness-110 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPublishingData
                    ? "PUBLISHING..."
                    : currentOptInStatus &&
                        !currentOptInStatus.includes("-Draft") &&
                        currentOptInStatus !== "Pending Approval" &&
                        currentOptInStatus !== "Pending"
                      ? isManageDataDirty
                        ? "REPUBLISH DATA"
                        : "PUBLISHED"
                      : "PUBLISH TO AUTHOR"}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <EventExcelManager 
                 eventBreakdown={selectedEventBreakdown}
                 registrations={eventRegistrations}
                 onRefresh={() => fetchEventRegistrations(selectedEventBreakdown.id)}
                 API={import.meta.env.VITE_API_URL || "http://localhost:3001"}
                 isLoading={isRefreshing}
                 platformAuthors={authors}
              />
              
              
            </div>
          )}
        </div>
      );
    }

    if (isRefreshing)
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-paa-navy/5 pb-4">
            <div className="h-8 w-64 bg-gray-200 animate-pulse rounded"></div>
            <div className="flex gap-3">
              <div className="h-10 w-40 bg-gray-200 animate-pulse rounded-lg"></div>
              <div className="h-10 w-36 bg-gray-200 animate-pulse rounded-lg"></div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-24 bg-gray-100 animate-pulse rounded-xl p-4 flex flex-col justify-between shadow-sm"
              >
                <div className="h-3 w-2/3 bg-gray-200 rounded"></div>
                <div className="h-8 w-1/3 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>

          <div className="h-72 bg-gray-100 animate-pulse rounded-xl mb-8 p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="h-5 w-40 bg-gray-200 rounded"></div>
              <div className="h-8 w-32 bg-gray-200 rounded"></div>
            </div>
            <div className="flex-1 w-full bg-gray-200/50 rounded-lg"></div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <div className="h-6 w-40 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-10 w-64 bg-gray-200 animate-pulse rounded-lg"></div>
          </div>

          <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="w-full bg-indigo-50/50 p-4 border-b-2 border-indigo-100 flex gap-4">
              <div className="h-4 w-[30%] bg-gray-200 animate-pulse rounded"></div>
              <div className="h-4 w-[10%] bg-gray-200 animate-pulse rounded"></div>
              <div className="h-4 w-[10%] bg-gray-200 animate-pulse rounded"></div>
              <div className="h-4 w-[10%] bg-gray-200 animate-pulse rounded"></div>
              <div className="h-4 w-[10%] bg-gray-200 animate-pulse rounded"></div>
              <div className="h-4 w-[10%] bg-gray-200 animate-pulse rounded"></div>
              <div className="h-4 flex-1 bg-gray-200 animate-pulse rounded"></div>
            </div>
            <div className="bg-white divide-y divide-gray-50">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="p-4 flex gap-4 items-center">
                  <div className="w-[30%] flex flex-col gap-2">
                    <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded"></div>
                    <div className="h-3 w-1/2 bg-gray-100 animate-pulse rounded"></div>
                  </div>
                  <div className="w-[10%]">
                    <div className="h-4 w-full bg-gray-100 animate-pulse rounded"></div>
                  </div>
                  <div className="w-[10%]">
                    <div className="h-4 w-full bg-gray-100 animate-pulse rounded"></div>
                  </div>
                  <div className="w-[10%]">
                    <div className="h-6 w-full bg-gray-200 animate-pulse rounded-full"></div>
                  </div>
                  <div className="w-[10%]">
                    <div className="h-4 w-full bg-gray-100 animate-pulse rounded"></div>
                  </div>
                  <div className="w-[10%]">
                    <div className="h-4 w-full bg-gray-100 animate-pulse rounded"></div>
                  </div>
                  <div className="flex-1 flex justify-end gap-2">
                    <div className="h-8 w-8 bg-gray-200 animate-pulse rounded-lg"></div>
                    <div className="h-8 w-8 bg-gray-200 animate-pulse rounded-lg"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    const now = new Date();
    let chartEvents = allCombinedEvents.filter((e: any) => {
      const eventDate = new Date(e.date || e.startDate || 0);
      if (eventDate >= now) return false;

      if (eventGraphFilter === "All") return true;
      // Format filters
      if (eventGraphFilter === "Meet the Authors")
        return e.eventType === "Meet the Authors";
      if (eventGraphFilter === "Stall") return e.eventType === "Stall";
      // Category filters
      if (eventGraphFilter === "Housing Society")
        return e.category === "Housing Society";
      if (eventGraphFilter === "Corporate Office")
        return e.category === "Corporate Office";
      if (eventGraphFilter === "College") return e.category === "College";
      if (eventGraphFilter === "University") return e.category === "University";
      if (eventGraphFilter === "Book Fair") return e.category === "Book Fair";

      return true;
    });

    chartEvents.sort((a: any, b: any) => {
      const dateA = new Date(a.date || a.startDate || 0);
      const dateB = new Date(b.date || b.startDate || 0);
      return dateA.getTime() - dateB.getTime();
    });

    if (eventTimeFilter === "Last 15") {
      chartEvents = chartEvents.slice(-15);
    } else if (eventTimeFilter === "Last Quarter") {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      chartEvents = chartEvents.filter(
        (e: any) => new Date(e.date || e.startDate) >= threeMonthsAgo,
      );
    } else if (!isNaN(parseInt(eventTimeFilter))) {
      const targetYear = parseInt(eventTimeFilter);
      const startOfYear = new Date(targetYear, 0, 1);
      const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);
      chartEvents = chartEvents.filter((e: any) => {
        const d = new Date(e.date || e.startDate);
        return d >= startOfYear && d <= endOfYear;
      });
    }

    const currentYear = new Date().getFullYear();
    const availableYears = [];
    for (let y = currentYear; y >= 2025; y--) {
      availableYears.push(y);
    }

    const chartData = chartEvents.map((e: any) => ({
      name: e.name,
      booksSold: Number(
        e.aggSold != null
          ? e.aggSold
          : e.isLegacy
            ? (e.aggSold || 0)
            : e.eventBooks?.reduce(
                (s: number, eb: any) => s + (eb.soldStock || 0),
                0,
              ) || 0
      ) || 0,
    }));

    let dateRangeString = "All Time";
    if (chartEvents.length > 0) {
      const validDates = chartEvents
        .map((e) => new Date(e.date || e.startDate).getTime())
        .filter((t) => !isNaN(t))
        .sort((a, b) => a - b);

      if (validDates.length > 0) {
        const firstDate = new Date(validDates[0]);
        const lastDate = new Date(validDates[validDates.length - 1]);
        const formatOpts: Intl.DateTimeFormatOptions = {
          month: "short",
          year: "numeric",
        };
        if (firstDate.getTime() === lastDate.getTime()) {
          dateRangeString = firstDate.toLocaleDateString(undefined, formatOpts);
        } else {
          dateRangeString = `${firstDate.toLocaleDateString(undefined, formatOpts)} - ${lastDate.toLocaleDateString(undefined, formatOpts)}`;
        }
      }
    }

    let filteredTableEvents = allCombinedEvents.filter((e: any) => {
      if (showArchivedEvents) return e.isArchived;
      if (e.isArchived) return false;
      if (eventGraphFilter === "All") return true;
      // Format filters
      if (eventGraphFilter === "Meet the Authors")
        return e.eventType === "Meet the Authors";
      if (eventGraphFilter === "Stall") return e.eventType === "Stall";
      // Category filters
      if (eventGraphFilter === "Housing Society")
        return e.category === "Housing Society";
      if (eventGraphFilter === "Corporate Office")
        return e.category === "Corporate Office";
      if (eventGraphFilter === "College") return e.category === "College";
      if (eventGraphFilter === "University") return e.category === "University";
      if (eventGraphFilter === "Book Fair") return e.category === "Book Fair";

      return true;
    });

    if (eventSearch.trim()) {
      filteredTableEvents = filteredTableEvents.filter((e: any) =>
        e.name.toLowerCase().includes(eventSearch.toLowerCase()),
      );
    }

    if (eventRegistryFilter !== "Proposed Events") {
      filteredTableEvents = filteredTableEvents.filter(
        (e: any) => !e.isProposed,
      );
    }

    if (eventRegistryFilter !== "All Events") {
      if (eventRegistryFilter === "Pending Approval") {
        filteredTableEvents = filteredTableEvents.filter(
          (e: any) =>
            (e.status === "Upcoming" ||
              e.status === "Live" ||
              e.status === "Ongoing") &&
            e.eventAuthors?.some(
              (r: any) =>
                r.optInStatus === "Pending" ||
                r.optInStatus === "Pending Approval",
            ),
        );
      } else if (eventRegistryFilter === "Upcoming & Live") {
        filteredTableEvents = filteredTableEvents.filter(
          (e: any) =>
            e.status === "Upcoming" ||
            e.status === "Live" ||
            e.status === "Ongoing",
        );
      } else if (eventRegistryFilter === "Past Events") {
        filteredTableEvents = filteredTableEvents.filter(
          (e: any) => e.status === "Past",
        );
      } else if (eventRegistryFilter === "Legacy Archive") {
        filteredTableEvents = filteredTableEvents.filter(
          (e: any) => e.isLegacy || e.status === "Legacy Archive",
        );
      } else if (eventRegistryFilter === "Proposed Events") {
        filteredTableEvents = filteredTableEvents.filter(
          (e: any) => e.isProposed,
        );
      }
    }

    const eventsChartData = filteredTableEvents
      .map((evt) => {
        const isPastOrArchive =
          evt.isLegacy ||
          evt.status === "Past" ||
          evt.status === "Legacy Archive";
        const participated = isPastOrArchive
          ? evt.aggAuthors || 0
          : evt._count?.eventAuthors || 0;
        // Use stored eligible count if available (verified ground truth), else compute dynamically
        const eligibleAuthorsCount =
          evt.aggEligibleAuthors != null
            ? evt.aggEligibleAuthors
            : authors.filter((a: any) => {
                const joinDate = a.groupJoiningDate
                  ? new Date(a.groupJoiningDate)
                  : new Date(a.createdAt);
                joinDate.setHours(0, 0, 0, 0);
                return (
                  parseEventDateHelper(evt.date || evt.startDate).getTime() >=
                  joinDate.getTime()
                );
              }).length;
        const participationPercentage =
          eligibleAuthorsCount === 0
            ? 0
            : Math.round(
                (participated /
                  (evt.aggEligibleAuthors || eligibleAuthorsCount)) *
                  100,
              );

        return {
          name: evt.name,
          participationPercentage,
          participated,
          eligible: eligibleAuthorsCount,
        };
      })
      .filter((evt) => evt.participationPercentage > 0)
      .sort((a, b) => b.participationPercentage - a.participationPercentage);

    const handleViewParticipantsList = async () => {
      setShowParticipantsModal(true);
      if (participantsData) return; // Prevent re-fetching if data already exists
      setIsLoadingParticipants(true);
      try {
        const sortedEvents = [...allCombinedEvents].sort((a, b) => {
          let da = new Date(a.date).getTime();
          let db = new Date(b.date).getTime();
          if (isNaN(da)) da = new Date(a.createdAt).getTime();
          if (isNaN(db)) db = new Date(b.createdAt).getTime();
          return da - db;
        });

        const headers = ["S.No", "Author Name"];
        sortedEvents.forEach((e) => headers.push(e.name));

        const columnSums = new Array(sortedEvents.length).fill(0);

        const authorsRes = await axios.get(
          `${API}/api/admin/authors?limit=10000`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        const allAuthors = authorsRes.data.data || [];
        
        const rows: any[][] = [];

        allAuthors.forEach((author: any, idx: number) => {
          const rowData = [idx + 1, author.name];

          const participatedEventIds = author.eventParticipation
            ? author.eventParticipation
                .filter(
                  (r: any) =>
                    r.status !== "Pending" &&
                    r.status !== "Declined" &&
                    !r.status?.endsWith("-Draft"),
                )
                .map((r: any) => r.eventId)
            : [];

          sortedEvents.forEach((evt, eIdx) => {
            const isRegistered =
              participatedEventIds.includes(evt.id) ||
              (evt.eventAuthors &&
                evt.eventAuthors.some(
                  (ea: any) =>
                    ea.authorId === author.id &&
                    ea.optInStatus !== "Pending" &&
                    ea.optInStatus !== "Declined" &&
                    !ea.optInStatus?.endsWith("-Draft"),
                ));

            if (isRegistered) {
              rowData.push("PARTICIPATED");
              columnSums[eIdx]++;
            } else {
              rowData.push("");
            }
          });
          
          rows.push(rowData);
        });

        setParticipantsData({ headers, rows, sums: columnSums, sortedEvents });
      } catch (err) {
        toast.error("Failed to fetch Participants List");
        console.error(err);
      } finally {
        setIsLoadingParticipants(false);
      }
    };

    const handleDownloadExcel = async () => {
      if (!participantsData) return;
      const toastId = toast.loading("Generating Excel file...");
      try {
        const ExcelJS = (await import("exceljs")).default;
        const { saveAs } = await import("file-saver");
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Participants List");
        
        const { headers, rows, sums, sortedEvents } = participantsData;
        
        const headerRow = sheet.addRow(headers);
        headerRow.eachCell((cell, colNumber) => {
          cell.font = { bold: true, color: { argb: "FF000000" } };
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };

          if (colNumber <= 2) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD4AF37" } };
          } else {
            const evt = sortedEvents[colNumber - 3];
            const catLower = (evt.category || evt.eventType || evt.name || "").toLowerCase();
            let catColor = "FFFFFFFF";
            if (catLower.includes("housing") || catLower.includes("college")) catColor = "FFF4C2C2";
            else if (catLower.includes("corporate") || catLower.includes("university")) catColor = "FFFFFF00";
            else if (catLower.includes("book fair")) catColor = "FF00FF00";
            else if (catLower.includes("fair")) catColor = "FF90EE90";
            else catColor = "FFB0C4DE";
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: catColor } };
          }
        });

        rows.forEach((rowData: any[]) => {
          const addedRow = sheet.addRow(rowData);
          addedRow.eachCell((cell, colNumber) => {
            cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
            if (colNumber > 2 && cell.value === "PARTICIPATED") {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF00FF00" } };
              cell.font = { bold: true };
              cell.alignment = { horizontal: "center" };
            } else if (colNumber === 2) {
              cell.font = { bold: true };
            }
          });
        });

        const sumRowData: any[] = ["-", "TOTAL PARTICIPANTS"];
        sums.forEach((sum: number) => sumRowData.push(sum));
        const sumRow = sheet.addRow(sumRowData);
        sumRow.eachCell((cell, colNumber) => {
          cell.font = { bold: true };
          cell.alignment = { horizontal: "center" };
          cell.border = { top: { style: "thick" }, bottom: { style: "thick" }, left: { style: "thin" }, right: { style: "thin" } };
          if (colNumber > 2) {
            const evt = sortedEvents[colNumber - 3];
            const catLower = (evt.category || evt.eventType || evt.name || "").toLowerCase();
            let catColor = "FFFFFFFF";
            if (catLower.includes("housing") || catLower.includes("college")) catColor = "FFF4C2C2";
            else if (catLower.includes("corporate") || catLower.includes("university")) catColor = "FFFFFF00";
            else if (catLower.includes("book fair")) catColor = "FF00FF00";
            else if (catLower.includes("fair")) catColor = "FF90EE90";
            else catColor = "FFB0C4DE";
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: catColor } };
          } else {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD4AF37" } };
          }
        });

        sheet.getColumn(1).width = 8;
        sheet.getColumn(2).width = 25;
        for (let i = 0; i < sortedEvents.length; i++) {
          sheet.getColumn(i + 3).width = 18;
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        saveAs(blob, "participants_list.xlsx");
        toast.dismiss(toastId);
        toast.success("Participants List Excel downloaded!");
      } catch (err) {
        toast.dismiss(toastId);
        toast.error("Failed to generate Excel file");
        console.error(err);
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-paa-navy/5 pb-4 gap-4">
          <h3 className="text-3xl font-serif font-bold text-paa-navy">
            Event and Fairs
          </h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleViewParticipantsList}
              className="dash-btn dash-btn-ghost flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <Eye className="w-4 h-4" /> View Participants List
            </button>
            {showParticipantsModal && (
              <div className="fixed inset-0 md:left-64 z-[100] bg-white flex flex-col animate-in fade-in slide-in-from-right-4 duration-300 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-[#0b1a2e] text-white shrink-0">
                  <div>
                    <h2 className="text-xl font-bold uppercase tracking-widest text-white">Participants List</h2>
                    <p className="text-sm text-gray-300 mt-1">Detailed view of author participation across events</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleDownloadExcel}
                      className="dash-btn dash-btn-primary flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white shadow-md border-none"
                    >
                      <Download className="w-4 h-4" /> Download Excel
                    </button>
                    <button 
                      onClick={() => setShowParticipantsModal(false)} 
                      className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                {/* Table */}
                <div className="flex-1 p-6 bg-gray-50/50 flex flex-col min-h-0">
                  <div className="flex-1 border border-gray-200 rounded-none bg-white shadow-sm overflow-auto relative">
                    {isLoadingParticipants ? (
                      <div className="p-4 space-y-4">
                        <div className="h-10 bg-gray-200 animate-pulse w-full"></div>
                        {[...Array(10)].map((_, i) => (
                          <div key={i} className="h-12 bg-gray-100 animate-pulse w-full"></div>
                        ))}
                      </div>
                    ) : participantsData ? (
                      <table className="w-full text-sm text-left border-collapse min-w-max">
                        <thead className="text-black sticky top-0 z-20 shadow-sm">
                          <tr>
                            {participantsData.headers.map((h: string, i: number) => {
                              let bgColor = "#D4AF37";
                              if (i > 1) {
                                const evt = participantsData.sortedEvents[i - 2];
                                const catLower = (evt.category || evt.eventType || evt.name || "").toLowerCase();
                                if (catLower.includes("housing") || catLower.includes("college")) bgColor = "#F4C2C2";
                                else if (catLower.includes("corporate") || catLower.includes("university")) bgColor = "#FFFF00";
                                else if (catLower.includes("book fair")) bgColor = "#00FF00";
                                else if (catLower.includes("fair")) bgColor = "#90EE90";
                                else bgColor = "#B0C4DE";
                              }
                              return (
                                <th key={i} style={{ backgroundColor: bgColor }} className="px-4 py-3 border-b border-r border-gray-400 font-bold whitespace-nowrap text-center text-xs uppercase tracking-wider">
                                  {h}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {participantsData.rows.map((row: any[], i: number) => (
                            <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                              {row.map((cell: any, j: number) => (
                                <td key={j} className={`px-4 py-2 border-b border-r border-gray-200 whitespace-nowrap ${j > 1 && cell === 'PARTICIPATED' ? 'bg-[#00FF00]/10 text-green-700 font-bold text-center' : j === 1 ? 'font-semibold text-[#0b1a2e]' : 'text-gray-600 text-center'}`}>
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="text-black sticky bottom-0 z-20 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
                          <tr>
                            <td style={{ backgroundColor: "#D4AF37" }} className="px-4 py-3 border-t border-r border-gray-400 font-bold text-center">-</td>
                            <td style={{ backgroundColor: "#D4AF37" }} className="px-4 py-3 border-t border-r border-gray-400 font-bold text-center uppercase tracking-wider">TOTAL PARTICIPANTS</td>
                            {participantsData.sums.map((sum: number, i: number) => {
                              let bgColor = "#D4AF37";
                              const evt = participantsData.sortedEvents[i];
                              const catLower = (evt.category || evt.eventType || evt.name || "").toLowerCase();
                              if (catLower.includes("housing") || catLower.includes("college")) bgColor = "#F4C2C2";
                              else if (catLower.includes("corporate") || catLower.includes("university")) bgColor = "#FFFF00";
                              else if (catLower.includes("book fair")) bgColor = "#00FF00";
                              else if (catLower.includes("fair")) bgColor = "#90EE90";
                              else bgColor = "#B0C4DE";
                              return (
                                <td key={i} style={{ backgroundColor: bgColor }} className="px-4 py-3 border-t border-r border-gray-400 font-bold text-center text-lg">{sum}</td>
                              );
                            })}
                          </tr>
                        </tfoot>
                      </table>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        No data available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={handleExportEventsExcel}
              className="dash-btn dash-btn-ghost flex items-center gap-2 border-green-200 text-green-700 hover:bg-green-50"
            >
              <Download className="w-4 h-4" /> Event Summary
            </button>
            <button
              onClick={() => setIsEventModalOpen(true)}
              className="dash-btn dash-btn-primary bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
            >
              <Plus className="w-4 h-4" /> Create New Event
            </button>
          </div>
        </div>

        {/* ── Two-column layout: left = KPI + chart, right = ranking table ── */}
        <div className="flex flex-col xl:flex-row gap-6">
          {/* LEFT COLUMN */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 border-none text-white rounded-xl p-4 shadow-sm">
                <p className="text-xs font-bold text-indigo-100 uppercase tracking-wider mb-1">
                  Total Events Organized
                </p>
                <div className="text-2xl font-serif">
                  {
                    allCombinedEvents.filter(e => e.status !== "Rejected" && e.status !== "Pending Approval").length
                  }
                </div>
              </div>
              <div className="bg-gradient-to-br from-rose-500 to-rose-600 border-none text-white rounded-xl p-4 shadow-sm">
                <p className="text-xs font-bold text-rose-100 uppercase tracking-wider mb-1">
                  Total Books Sold
                </p>
                <div className="text-2xl font-serif">
                  {allCombinedEvents.reduce(
                    (acc, evt) => {
                      const books =
                        evt.aggSold != null
                          ? evt.aggSold
                          : evt.isLegacy
                            ? 0
                            : (evt.eventBooks?.reduce(
                                (s: number, eb: any) => s + (eb.soldStock || 0),
                                0,
                              ) || 0);
                      return acc + (Number(books) || 0);
                    },
                    0,
                  )}
                </div>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-orange-500 border-none text-white rounded-xl p-4 shadow-sm">
                <p className="text-xs font-bold text-orange-100 uppercase tracking-wider mb-1">
                  Forthcoming Events
                </p>
                <div className="text-2xl font-serif">
                  {
                    allCombinedEvents.filter((e) => {
                      const d = new Date(e.date).getTime();
                      return !isNaN(d) && d > Date.now();
                    }).length
                  }
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-teal-500 border-none text-white rounded-xl p-4 shadow-sm">
                <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider mb-1">
                  Total Gross Revenue
                </p>
                <div className="text-2xl font-serif font-bold">
                  ₹
                  {allCombinedEvents
                    .reduce(
                      (acc, evt) => {
                        const revenue =
                          evt.aggRevenue != null
                            ? evt.aggRevenue
                            : evt.isLegacy
                              ? 0
                              : (evt.eventBooks?.reduce(
                                  (s: number, eb: any) =>
                                    s +
                                    (eb.soldStock || 0) *
                                      ((parseFloat(eb.overrideMrp) || parseFloat(eb.mrp) || parseFloat(eb.book?.mrp)) || 0),
                                  0,
                                ) || 0);
                        return acc + (Number(revenue) || 0);
                      },
                      0,
                    )
                    .toLocaleString()}
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                  <h4 className="font-bold text-paa-navy">
                    Events Performance Overview{" "}
                    <span className="text-gray-500 font-normal ml-2 text-sm tracking-wide">
                      ({dateRangeString})
                    </span>
                  </h4>
                  <p className="text-xs text-gray-500 font-medium mt-1">
                    Comparing book sales and author participation across all
                    events.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                  <select
                    className="border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-paa-navy text-gray-700 bg-gray-50"
                    value={eventTimeFilter}
                    onChange={(e) => setEventTimeFilter(e.target.value)}
                  >
                    <option value="Last 15">Last 15 Events</option>
                    
                    <option value="Last Quarter">Last Quarter</option>
                    {availableYears.map((y) => (
                      <option key={y} value={y.toString()}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <select
                    className="border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-paa-navy text-gray-700 bg-gray-50"
                    value={eventGraphFilter}
                    onChange={(e) => setEventGraphFilter(e.target.value)}
                  >
                    <option value="All">All types of event</option>
                    <optgroup label="── By Format ──">
                      <option value="Meet the Authors">Meet the Authors</option>
                      <option value="Stall">Stall</option>
                    </optgroup>
                    <optgroup label="── By Category ──">
                      <option value="Housing Society">Housing Society</option>
                      <option value="Corporate Office">Corporate Office</option>
                      <option value="College">College</option>
                      <option value="University">University</option>
                      <option value="Book Fair">Book Fair</option>
                    </optgroup>
                  </select>
                  <div className="w-px h-6 bg-gray-200 hidden md:block"></div>
                  <div
                    className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${!showBooksSold ? "opacity-50" : ""}`}
                    onClick={() => setShowBooksSold(!showBooksSold)}
                  >
                    <div className="w-3 h-3 rounded-sm bg-paa-navy"></div> Books
                    Sold
                  </div>
                </div>
              </div>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 25, right: 10, left: -20, bottom: 80 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#E5E7EB"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#6B7280" }}
                      angle={-45}
                      textAnchor="end"
                      dy={10}
                      interval="preserveStartEnd"
                      height={90}
                      tickFormatter={(v) =>
                        v.length > 15 ? v.substring(0, 15) + "..." : v
                      }
                    />
                    <YAxis
                      orientation="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#6B7280" }}
                    />
                    <RechartsTooltip
                      cursor={{
                        stroke: "#9CA3AF",
                        strokeWidth: 1,
                        strokeDasharray: "3 3",
                      }}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #E5E7EB",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        fontSize: "12px",
                      }}
                    />
                    {showBooksSold && (
                      <Line
                        type="linear"
                        dataKey="booksSold"
                        name="Books Sold"
                        stroke="#ec4899"
                        strokeWidth={3}
                        dot={(props: any) => {
                          const { cx, cy, index } = props;
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={4}
                              fill="#ec4899"
                              stroke="#fff"
                              strokeWidth={2}
                              key={`dot-${index}`}
                            />
                          );
                        }}
                        activeDot={{ r: 6 }}
                      >
                        <LabelList
                          dataKey="booksSold"
                          position="top"
                          content={(props: any) => {
                            const { x, y, value, index } = props;
                            if (value === undefined) return null;
                            
                            const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
                            if (isMobile) {
                              if (value === 0) return null;
                              
                              const topIndices = [...chartData]
                                .map((d, i) => ({ v: d.booksSold || 0, i }))
                                .sort((a, b) => b.v - a.v)
                                .slice(0, 6)
                                .map((item) => item.i);
                                
                              if (!topIndices.includes(index)) return null;
                            }
                            
                            const prev = chartData[index - 1]?.booksSold;
                            const next = chartData[index + 1]?.booksSold;
                            let yPos = y - 12;

                            if (prev !== undefined && next !== undefined && value <= prev && value <= next) {
                              yPos = y + 20;
                            } else if (prev !== undefined && value < prev && next === undefined) {
                              yPos = y + 20;
                            }

                            return (
                              <g>
                                <text x={x} y={yPos} fill="none" stroke="#ffffff" strokeWidth={4} strokeLinejoin="round" fontSize="10px" fontWeight="bold" textAnchor="middle">{value}</text>
                                <text x={x} y={yPos} fill="#ec4899" fontSize="10px" fontWeight="bold" textAnchor="middle">{value}</text>
                              </g>
                            );
                          }}
                        />
                      </Line>
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          {/* end left column */}


        </div>
        {/* end two-col flex */}

        <div className="flex flex-col gap-4 mb-4 mt-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
            <h4 className="text-2xl font-serif font-bold text-paa-navy">
              Event and Fairs History
            </h4>
            <input
              type="text"
              placeholder="Search events..."
              className="border border-gray-300 rounded-lg p-2 text-sm w-full sm:w-64 outline-none focus:border-paa-navy shadow-sm"
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-2 border border-black overflow-hidden shadow-sm animate-in fade-in duration-500">
          <div className="w-full overflow-x-auto pb-2">
            <table className="w-full text-left text-[11px] border-collapse border-[1.5px] border-black">
              <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                <tr>
                  <th className="w-12 p-1 text-center text-[13px] font-bold text-black bg-[#FFE600] border-[1.5px] border-black capitalize align-middle">
                    S.No
                  </th>
                  <th className="p-1 text-[13px] font-bold text-black bg-[#FFE600] border-[1.5px] border-black capitalize align-middle">
                    Event Name
                  </th>
                  <th className="p-1 text-[13px] font-bold text-black bg-[#FFE600] border-[1.5px] border-black capitalize text-center align-middle">
                    Format
                  </th>
                  <th className="p-1 text-[13px] font-bold text-black bg-[#FFE600] border-[1.5px] border-black capitalize text-center align-middle">
                    Category
                  </th>
                  <th className="p-1 text-[13px] font-bold text-black bg-[#FFE600] border-[1.5px] border-black capitalize text-center align-middle">
                    Address
                  </th>
                  <th className="p-1 text-[13px] font-bold text-black bg-[#FFE600] border-[1.5px] border-black capitalize text-center align-middle">
                    Month
                  </th>
                  <th className="p-1 text-[13px] font-bold text-black bg-[#FFE600] border-[1.5px] border-black capitalize text-center align-middle">
                    Year
                  </th>
                  <th className="p-1 text-[13px] font-bold text-black bg-[#FFE600] border-[1.5px] border-black capitalize text-center align-middle">
                    Duration
                  </th>
                  <th className="p-1 text-[13px] font-bold text-black bg-[#FFE600] border-[1.5px] border-black capitalize text-center align-middle">
                    No. of Authors
                  </th>
                  <th className="p-1 text-[13px] font-bold text-black bg-[#FFE600] border-[1.5px] border-black capitalize text-center align-middle">
                    Books Sold
                  </th>
                  <th className="p-1 text-[13px] font-bold text-black bg-[#FFE600] border-[1.5px] border-black capitalize text-center align-middle">
                    Revenue
                  </th>
                  <th className="w-28 p-1 text-[13px] font-bold text-black bg-[#FFE600] border-[1.5px] border-black capitalize text-center align-middle">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white text-[11px]">
                {filteredTableEvents.map((evt: any, i: number) => {
                  const isPastOrArchive =
                    evt.isLegacy ||
                    evt.status === "Past" ||
                    evt.status === "Legacy Archive";
                  const evtAuthors =
                    evt.aggAuthors != null
                      ? evt.aggAuthors
                      : evt.isLegacy
                        ? "NA"
                        : evt._count?.eventAuthors || 0;

                  // Use stored eligible count if available (verified ground truth), else compute dynamically
                  const eligibleAuthorsCount =
                    evt.aggEligibleAuthors != null
                      ? evt.aggEligibleAuthors
                      : evt.isLegacy
                        ? "NA"
                        : authors.filter((a: any) => {
                            const joinDate = a.groupJoiningDate
                              ? new Date(a.groupJoiningDate)
                              : new Date(a.createdAt);
                            joinDate.setHours(0, 0, 0, 0);
                            return (
                              parseEventDateHelper(
                                evt.date || evt.startDate,
                              ).getTime() >= joinDate.getTime()
                            );
                          }).length;
                  const participationPercentage =
                    eligibleAuthorsCount === "NA" ||
                    eligibleAuthorsCount === 0 ||
                    evtAuthors === "NA"
                      ? 0
                      : Math.round(
                          (Number(evtAuthors) / Number(eligibleAuthorsCount)) *
                            100,
                        );

                  const books =
                    evt.aggSold != null
                      ? evt.aggSold
                      : evt.isLegacy
                        ? "NA"
                        : (evt.eventBooks?.reduce(
                            (s: number, eb: any) => s + (eb.soldStock || 0),
                            0,
                          ) || 0);
                  const catRowColor = i % 2 === 0 ? "bg-[#FFFFFF]" : "bg-[#FCFCFC]";
                  
                  // Clean duration formatting
                  let cleanDuration = evt.duration || (evt.durationDays ? `${evt.durationDays} Days` : "-");
                  if (cleanDuration) {
                    cleanDuration = cleanDuration.replace(/0(\d)/g, '$1');
                    cleanDuration = cleanDuration.replace(/\b0 Hours\b/gi, '').trim();
                    cleanDuration = cleanDuration.replace(/Days/gi, 'days').replace(/Hrs?/gi, 'hrs').replace(/Mins?/gi, 'mins');
                  }

                  const startDate = new Date(evt.date || evt.startDate);
                  const month = !isNaN(startDate.getTime()) ? startDate.toLocaleString('default', { month: 'short' }) : "-";
                  const year = !isNaN(startDate.getTime()) ? startDate.getFullYear() : "-";
                  const addressStr = evt.location || evt.address || "-";

                  const formatColor = evt.eventType === "Meet the Authors" 
                                    ? "bg-[#AFC6E9] text-black" 
                                    : evt.eventType === "Stall" 
                                      ? "bg-[#8EE88C] text-black" 
                                      : "bg-gray-100 text-black";

                  const categoryColor = evt.category === "Housing Society" ? "bg-[#F3C29E] text-black"
                                      : evt.category === "Corporate Office" ? "bg-[#FFE066] text-black"
                                      : evt.category === "Book Fair" ? "bg-[#6FEF59] text-black"
                                      : evt.category === "College" ? "bg-[#F6C6C6] text-black"
                                      : evt.category === "University" ? "bg-[#FFF176] text-black"
                                      : "bg-gray-100 text-black";

                  const revenueVal = evt.aggRevenue != null ? evt.aggRevenue : evt.isLegacy ? "NA" : (evt.eventBooks?.reduce((s: number, eb: any) => s + (eb.soldStock || 0) * ((parseFloat(eb.overrideMrp) || parseFloat(eb.mrp) || parseFloat(eb.book?.mrp)) || 0), 0) || 0);
                  const revenue = revenueVal === "NA" ? "NA" : `₹${revenueVal}`;
                  
                  return (
                    <React.Fragment key={i}>
                      <tr
                        className={`text-[13px] font-medium text-black border-[1.5px] border-black ${expandedEventIndex === i ? "bg-indigo-50" : catRowColor}`}
                      >
                        <td
                          className="p-1 text-center align-middle border-[1.5px] border-black"
                          onClick={() => setExpandedEventIndex(expandedEventIndex === i ? null : i)}
                        >
                          <div className="flex items-center justify-center gap-1 cursor-pointer w-full h-full">
                            <span>{i + 1}</span>
                            <button className="text-gray-400">
                              {expandedEventIndex === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>
                        </td>
                        <td className="p-1 text-left align-middle border-[1.5px] border-black font-medium">
                          {evt.name}
                        </td>
                        <td className={`p-1 text-center align-middle border-[1.5px] border-black capitalize ${formatColor}`}>
                          {evt.eventType || "-"}
                        </td>
                        <td className={`p-1 text-center align-middle border-[1.5px] border-black capitalize ${categoryColor}`}>
                          {evt.category || "-"}
                        </td>
                        <td className="p-1 text-center align-middle border-[1.5px] border-black capitalize">
                          {addressStr}
                        </td>
                        <td className="p-1 text-center align-middle border-[1.5px] border-black">
                          {month}
                        </td>
                        <td className="p-1 text-center align-middle border-[1.5px] border-black">
                          {year}
                        </td>
                        <td className="p-1 text-center align-middle border-[1.5px] border-black">
                          {cleanDuration}
                        </td>
                        <td className="p-1 text-center font-medium align-middle border-[1.5px] border-black">
                          {evtAuthors}
                        </td>
                        <td className="p-1 text-center font-medium align-middle border-[1.5px] border-black">
                          {books}
                        </td>
                        <td className="p-1 text-center font-medium align-middle border-[1.5px] border-black text-green-700">
                          {revenue}
                        </td>
                        <td className="p-1 align-middle border-[1.5px] border-black text-center">
                          <div className="flex gap-1 justify-end flex-nowrap min-w-[120px]">
                            {evt.isProposed ? (
                              <button
                                title="Discard Proposed Event"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (
                                    window.confirm(
                                      "Delete this proposed event?",
                                    )
                                  ) {
                                    try {
                                      await axios.delete(
                                        `${API}/api/admin/queries/inq_${evt.id.replace("proposed_", "")}`,
                                        {
                                          headers: {
                                            Authorization: `Bearer ${localStorage.getItem("token")}`,
                                          },
                                        },
                                      );
                                      toast.success("Proposed event discarded");
                                      fetchEvents();
                                    } catch (err) {
                                      toast.error(
                                        "Failed to discard proposed event",
                                      );
                                    }
                                  }
                                }}
                                className="p-2 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white hover:border-red-600 rounded-lg border border-red-200 transition-colors shadow-sm"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : evt.status === "Pending Approval" ? (
                              <>
                                <button
                                  title="Approve Event"
                                  onClick={async () => {
                                    if (window.confirm("Approve this event?")) {
                                      try {
                                        await axios.put(
                                          `${API}/api/admin/events/${evt.id}/status`,
                                          { status: "Upcoming" },
                                          {
                                            headers: {
                                              Authorization: `Bearer ${localStorage.getItem("token")}`,
                                            },
                                          },
                                        );
                                        toast.success("Event approved");
                                        fetchEvents();
                                      } catch (err) {
                                        toast.error("Failed to approve");
                                      }
                                    }
                                  }}
                                  className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 rounded-lg border border-emerald-200 transition-colors shadow-sm"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  title="Reject Event"
                                  onClick={async () => {
                                    if (window.confirm("Reject this event?")) {
                                      try {
                                        await axios.put(
                                          `${API}/api/admin/events/${evt.id}/status`,
                                          { status: "Rejected" },
                                          {
                                            headers: {
                                              Authorization: `Bearer ${localStorage.getItem("token")}`,
                                            },
                                          },
                                        );
                                        toast.success("Event rejected");
                                        fetchEvents();
                                      } catch (err) {
                                        toast.error("Failed to reject");
                                      }
                                    }
                                  }}
                                  className="p-2 text-orange-600 bg-orange-50 hover:bg-orange-600 hover:text-white hover:border-orange-600 rounded-lg border border-orange-200 transition-colors shadow-sm"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                title="Manage Participants"
                                onClick={() => handleOpenBreakdown(evt)}
                                className="py-1.5 px-2.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white border border-indigo-200 rounded-lg shadow-sm transition-colors relative flex items-center justify-center"
                              >
                                <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">MANAGE PARTICIPANTS</span>
                                {(evt.eventAuthors || evt.registrations || [])?.filter(
                                  (r: any) => r.optInStatus === "Pending Approval",
                                ).length > 0 && (
                                  <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse shadow-sm" title="Pending Approvals">
                                    {
                                      (evt.eventAuthors || evt.registrations || []).filter(
                                        (r: any) => r.optInStatus === "Pending Approval",
                                      ).length
                                    }
                                  </span>
                                )}
                              </button>
                            )}
                            {!evt.isProposed && (
                              <>
                                {!evt.isArchived && (
                                  <button
                                    title="Edit Event"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setEditingEvent(evt);
                                      setTimeout(
                                        () => setIsEditEventModalOpen(true),
                                        10,
                                      );
                                    }}
                                    className="py-1.5 px-2.5 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg shadow-sm transition-colors relative flex items-center justify-center"
                                  >
                                    <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">EDIT EVENT</span>
                                  </button>
                                )}
                                {evt.isArchived ? (
                                  <button
                                    title="Restore Event"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRestoreEvent(evt.id);
                                    }}
                                    className="p-2 text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-200 rounded-lg shadow-sm transition-colors font-bold text-[9px] uppercase tracking-widest"
                                  >
                                    Restore
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      title="Archive Event"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteEvent(evt.id);
                                      }}
                                      className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-600 hover:text-white border border-amber-200 rounded-lg shadow-sm transition-colors"
                                    >
                                      <Archive className="w-4 h-4" />
                                    </button>
                                    <button
                                      title="Permanently Delete Event"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleHardDeleteEvent(evt.id);
                                      }}
                                      className="p-2 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg shadow-sm transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedEventIndex === i && (
                        <tr className="bg-[#f8fafc] border-b border-gray-100 shadow-inner">
                          <td colSpan={11} className="p-0">
                            <div className="flex flex-col md:flex-row gap-8 px-8 py-6 border-l-4 border-indigo-400 ml-6 my-4 bg-white rounded-r-xl shadow-sm mr-6">
                              <div className="flex-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1">
                                  <FileText className="w-3 h-3" /> Event
                                  Description
                                </p>
                                <p className="text-sm text-paa-navy leading-relaxed">
                                  {evt.description ||
                                    "No description provided."}
                                </p>
                              </div>
                              <div className="w-px bg-gray-100 hidden md:block"></div>
                              <div className="flex flex-col gap-5 min-w-[150px]">
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> Location
                                  </p>
                                  <p className="text-sm text-paa-navy font-semibold">
                                    {evt.location || evt.address || "TBA"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1">
                                    <CalendarIcon className="w-3 h-3" />{" "}
                                    Duration
                                  </p>
                                  <p className="text-sm text-paa-navy font-semibold">
                                    {evt.duration ||
                                      (evt.durationDays
                                        ? `${evt.durationDays} Days`
                                        : "N/A")}
                                  </p>
                                </div>
                              </div>
                              <div className="w-px bg-gray-100 hidden md:block"></div>
                              <div className="min-w-[160px]">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1">
                                  <ImageIcon className="w-3 h-3" /> Event Banner
                                </p>
                                {evt.bannerUrl ? (
                                  <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm aspect-video w-40 relative group">
                                    <img
                                      loading="lazy"
                                      src={
                                        evt.bannerUrl.startsWith("http")
                                          ? evt.bannerUrl
                                          : `${API}${evt.bannerUrl}`
                                      }
                                      alt="Banner"
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  </div>
                                ) : (
                                  <div className="aspect-video w-40 bg-gray-50 rounded-lg border border-gray-200 border-dashed flex items-center justify-center text-[10px] text-gray-400 italic">
                                    No Banner Uploaded
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredTableEvents.length === 0 && (
                  <tr>
                    <td
                      colSpan={12}
                      className="text-center py-6 text-[13px] text-gray-500 italic border-[1.5px] border-black"
                    >
                      No events found.
                    </td>
                  </tr>
                )}
                {filteredTableEvents.length > 0 && (
                  <tr className="bg-[#F7C79B] font-bold text-black border-[1.5px] border-black text-[13px]">
                    <td colSpan={8} className="p-1 text-center font-bold uppercase tracking-widest align-middle border-[1.5px] border-black">
                      Yearly Total
                    </td>
                    <td className="p-1 text-center align-middle border-[1.5px] border-black">
                      {filteredTableEvents.reduce((acc: number, evt: any) => {
                        const evtAuthors = evt.aggAuthors != null ? evt.aggAuthors : evt.isLegacy ? 0 : evt._count?.eventAuthors || 0;
                        return acc + (Number(evtAuthors) || 0);
                      }, 0)}
                    </td>
                    <td className="p-1 text-center align-middle border-[1.5px] border-black">
                      {filteredTableEvents.reduce((acc: number, evt: any) => {
                        const books = evt.aggSold != null ? evt.aggSold : evt.isLegacy ? 0 : (evt.eventBooks?.reduce((s: number, eb: any) => s + (eb.soldStock || 0), 0) || 0);
                        return acc + (Number(books) || 0);
                      }, 0)}
                    </td>
                    <td className="p-1 text-center align-middle border-[1.5px] border-black">
                      ₹{filteredTableEvents.reduce((acc: number, evt: any) => {
                        const revenueVal = evt.aggRevenue != null ? evt.aggRevenue : evt.isLegacy ? 0 : (evt.eventBooks?.reduce((s: number, eb: any) => s + (eb.soldStock || 0) * ((parseFloat(eb.overrideMrp) || parseFloat(eb.mrp) || parseFloat(eb.book?.mrp)) || 0), 0) || 0);
                        return acc + (Number(revenueVal) || 0);
                      }, 0)}
                    </td>
                    <td className="p-1 text-center align-middle border-[1.5px] border-black">
                      {filteredTableEvents.length} Events
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const AuthorDataTab = ({ refreshTrigger }: any) => {
    const [fields, setFields] = useState<any[]>([]);
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
    const [showColumnsMenu, setShowColumnsMenu] = useState(false);

    // Get all unique extraData keys from all authors to form table columns
    const dynamicKeys = Array.from(
      new Set<string>(
        authors.reduce((acc: string[], author: any) => {
          if (author.extraData) {
            const parsed =
              typeof author.extraData === "string"
                ? (() => {
                    try {
                      return JSON.parse(author.extraData);
                    } catch (e) {
                      return {};
                    }
                  })()
                : author.extraData;
            acc = acc.concat(Object.keys(parsed));
          }
          return acc;
        }, []),
      ),
    );

    useEffect(() => {
      axios
        .get(`${API}/api/admin/author-fields`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
        .then((res) => setFields(res.data));
    }, []);

    // Initialize all columns as selected
    useEffect(() => {
      if (selectedColumns.length === 0 && dynamicKeys.length > 0) {
        setSelectedColumns(dynamicKeys);
      }
    }, [dynamicKeys.length]);

    const [newField, setNewField] = useState({
      name: "",
      type: "text",
      requiredForRegistration: false,
    });

    const saveFields = () => {
      axios
        .post(
          `${API}/api/admin/author-fields`,
          { fields },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        )
        .then(() => toast.success("Fields saved successfully!"))
        .catch(() => toast.error("Failed to save fields"));
    };

    const handleColumnToggle = (col: string) => {
      if (selectedColumns.includes(col)) {
        setSelectedColumns(selectedColumns.filter((c) => c !== col));
      } else {
        setSelectedColumns([...selectedColumns, col]);
      }
    };

    const handleEscalateOrder = async (id: number) => {
      try {
        await axios.post(
          `${API}/api/admin/orders/${id}/escalate`,
          {},
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        toast.success("Escalation email sent to author!");
      } catch (err) {
        toast.error("Failed to escalate order");
      }
    };

    const handleExportCSV = async () => {
      const ExcelJS = (await import("exceljs")).default;
      const { saveAs } = await import("file-saver");
      const baseFields = [
        "Status",
        "Name",
        "Pen Name",
        "Email",
        "Phone",
        "WhatsApp",
        "Address",
        "District",
        "City",
        "State",
        "Pincode",
        "Aadhar/Voter ID/DL",
        "DOB",
        "Bio",
        "Experience",
        "Qualification",
        "Skills",
        "Hobbies",
        "Why Joining",
        "Instagram",
        "Facebook",
        "LinkedIn",
        "YouTube",
        "Conflict of Interest Signature",
        "Agreed To Guidelines",
        "Agreed To Info Doc",
        "Transaction ID",
        "Payment Screenshot",
        "Joined Date",
        "Books Data",
      ];

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Authors Data");

      const allHeaders = [...baseFields, ...selectedColumns];

      sheet.mergeCells(1, 1, 1, allHeaders.length);
      const titleCell = sheet.getCell(1, 1);
      titleCell.value = "AUTHORS DATA EXPORT";
      titleCell.font = {
        name: "Arial",
        size: 14,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0B1A2E" },
      };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };

      const headerRow = sheet.addRow(allHeaders);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FF000000" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD4AF37" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });

      authors.forEach((author) => {
        const joinedDate = author.groupJoiningDate
          ? new Date(author.groupJoiningDate).toLocaleDateString()
          : (author.createdAt ? new Date(author.createdAt).toLocaleDateString() : "");
        const extra =
          typeof author.extraData === "string"
            ? JSON.parse(author.extraData)
            : author.extraData || {};

        let booksData = "";
        if (author.books && author.books.length > 0) {
          booksData = author.books
            .map(
              (b: any, i: number) =>
                `Book ${i + 1}: ${b.title || "NA"} | Subtitle: ${b.subtitle || "NA"} | Genre: ${b.genre || "NA"} (${b.subGenre || "NA"}) | Synopsis: ${b.synopsis || "NA"} | Pages: ${b.pages || 0} | MRP: ${b.mrp || 0} | Stock: ${b.stock || 0} | Language: ${b.language || "NA"} | ISBN: ${b.isbn || "NA"} | Publisher: ${b.publisher || "NA"} | Pub Date: ${b.publicationDate || "NA"} | Edition: ${b.edition || "1"} | Format: ${b.format || "NA"} | Print: ${b.printFormat || "NA"} | Purpose: ${b.purpose || "NA"}`,
            )
            .join("\n-----------------\n");
        }

        const rowData = [
          author.status,
          author.name,
          author.penName,
          author.email,
          author.phone,
          author.whatsapp,
          author.address,
          author.district,
          author.city,
          author.state,
          author.pincode,
          author.aadharNumber,
          author.age || author.dob,
          author.bio,
          author.experience,
          author.qualification,
          author.skills,
          author.hobbies,
          author.whyJoining,
          author.instagram,
          author.facebook,
          extra.linkedin,
          extra.youtube,
          extra.conflictOfInterestSignature,
          extra.agreedToGuidelines,
          extra.agreedToInfoDoc,
          author.transactionId,
          author.paymentScreenshot,
          joinedDate,
          booksData,
        ];

        selectedColumns.forEach((col) => {
          rowData.push(extra && extra[col] ? extra[col] : "");
        });

        const addedRow = sheet.addRow(rowData);
        addedRow.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, "author_extra_data_report.xlsx");
    };

    return (
      <div className="space-y-8 max-w-6xl">
        <div className="bg-white p-8 border border-paa-navy/5 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out rounded-3xl-2xl">
          <h3 className="text-xl font-serif font-medium text-paa-navy mb-1">
            Author Dynamic Fields Management
          </h3>
          <p className="text-paa-gray-text text-sm mb-6 border-b border-paa-navy/5 pb-4">
            Define extra information that all authors must provide. This will
            appear on their dashboard until filled.
          </p>

          <div className="flex flex-wrap gap-3 mb-6">
            {fields.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-gray-50 border border-paa-navy/20 px-3 py-1.5 rounded-3xl-2xl shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out text-sm"
              >
                <span className="font-bold text-paa-navy">{f.name}</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  ({f.type})
                </span>
                {f.requiredForRegistration && (
                  <span className="text-[9px] bg-paa-navy text-white px-1.5 py-0.5 rounded-3xl-2xl uppercase tracking-widest font-bold">
                    Registration
                  </span>
                )}
                <button
                  onClick={() =>
                    setFields(fields.filter((_, idx) => idx !== i))
                  }
                  className="text-red-500 hover:text-red-700 ml-2"
                  title="Remove Field"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {fields.length === 0 && (
              <p className="text-sm text-gray-500 italic w-full">
                No dynamic fields created yet.
              </p>
            )}
          </div>

          <div className="bg-[#f0fdf4] border border-[#bbf7d0] p-4 rounded-3xl-2xl mb-6 flex flex-col md:flex-row gap-4 items-center">
            <input
              type="text"
              placeholder="New Field Name (e.g. Aadhar/Voter ID/DL)"
              className="border border-paa-navy/20 p-2 text-sm flex-1 outline-none focus:border-paa-navy bg-white rounded-3xl-2xl w-full md:w-auto"
              value={newField.name}
              onChange={(e) =>
                setNewField({ ...newField, name: e.target.value })
              }
            />
            <select
              className="border border-paa-navy/20 p-2 text-sm outline-none focus:border-paa-navy bg-white rounded-3xl-2xl"
              value={newField.type}
              onChange={(e) =>
                setNewField({ ...newField, type: e.target.value })
              }
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
            </select>
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-paa-navy cursor-pointer">
              <input
                type="checkbox"
                className="accent-paa-navy w-4 h-4"
                checked={newField.requiredForRegistration}
                onChange={(e) =>
                  setNewField({
                    ...newField,
                    requiredForRegistration: e.target.checked,
                  })
                }
              />
              Require on Reg.
            </label>
            <button
              onClick={() => {
                if (!newField.name) return;
                setFields([...fields, { ...newField, required: true }]);
                setNewField({
                  name: "",
                  type: "text",
                  requiredForRegistration: false,
                });
              }}
              className="px-4 py-2 border border-paa-navy text-paa-navy bg-white text-xs font-bold uppercase tracking-widest hover:bg-paa-navy hover:text-white transition-colors rounded-3xl-2xl shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out whitespace-nowrap"
            >
              Add Field
            </button>
          </div>

          <div className="flex">
            <button
              onClick={saveFields}
              className="px-6 py-2 bg-paa-navy text-white text-xs font-bold uppercase tracking-widest hover:bg-paa-gold hover:text-paa-navy transition-colors rounded-3xl-2xl shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out rounded-full active:scale-95 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out"
            >
              Save Fields Settings
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl-2xl border border-paa-navy/5 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-paa-navy uppercase tracking-widest flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-paa-gold" />
                Author Data Report
              </h2>
              <p className="text-sm text-paa-gray-text mt-1">
                View and export the custom fields data filled out by authors.
              </p>
            </div>
            <div className="flex gap-3 items-center">
              {dynamicKeys.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowColumnsMenu(!showColumnsMenu)}
                    className="px-3 py-2 border border-paa-navy/20 bg-gray-50 hover:bg-gray-100 rounded-3xl-2xl text-paa-navy transition-colors text-xs font-bold uppercase tracking-widest flex items-center gap-1"
                  >
                    Columns <ChevronDown className="w-4 h-4" />
                  </button>
                  {showColumnsMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 shadow-xl rounded-3xl-2xl z-20 py-2">
                      {dynamicKeys.map((key) => (
                        <label
                          key={key}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-xs font-bold uppercase tracking-widest text-paa-navy cursor-pointer whitespace-nowrap"
                        >
                          <input
                            type="checkbox"
                            className="accent-paa-navy"
                            checked={selectedColumns.includes(key)}
                            onChange={() => handleColumnToggle(key)}
                          />
                          {key}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold uppercase tracking-widest rounded-3xl-2xl transition-colors shadow rounded-full active:scale-95 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out"
              >
                Export Excel
              </button>
              <button
                onClick={() => fetchAuthors()}
                className="p-2 border border-paa-navy/20 bg-gray-50 hover:bg-gray-100 rounded-3xl-2xl text-paa-navy transition-colors shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out rounded-full active:scale-95 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out"
              >
                <RefreshCw
                  size={18}
                  className={isRefreshing ? "animate-spin" : ""}
                />
              </button>
            </div>
          </div>

          <div className="border border-paa-navy/5 rounded-3xl-2xl shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out overflow-hidden">
            <div className="overflow-x-auto">
              <table className="dash-table">
                <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                  <tr>
                    <th className="!text-[14px] !text-indigo-800 !bg-transparent">
                      Author Name
                    </th>
                    <th className="!text-[14px] !text-indigo-800 !bg-transparent">
                      Email
                    </th>
                    {dynamicKeys
                      .filter((k) => selectedColumns.includes(k))
                      .map((key) => (
                        <th
                          key={key}
                          className="text-paa-gold !text-[14px] !text-indigo-800 !bg-transparent"
                        >
                          {key}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {authors.length === 0 ? (
                    <tr>
                      <td
                        colSpan={selectedColumns.length + 2}
                        className="px-6 py-8 text-center text-gray-500 italic"
                      >
                        No authors found.
                      </td>
                    </tr>
                  ) : (
                    authors.map((author) => (
                      <tr key={author.id}>
                        <td className="font-medium text-paa-navy flex items-center">
                          {author.name}
                          {(() => {
                            let ed = author.extraData;
                            if (typeof ed === "string") {
                              try {
                                ed = JSON.parse(ed);
                              } catch (e) {}
                            }
                            return (
                              ed?.hasPendingEdits && (
                                <span className="ml-2 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[9px] uppercase tracking-wider font-bold rounded-full">
                                  Edited
                                </span>
                              )
                            );
                          })()}
                        </td>
                        <td className="text-gray-500">{author.email}</td>
                        {dynamicKeys
                          .filter((k) => selectedColumns.includes(k))
                          .map((key) => (
                            <td key={key} className="text-gray-700">
                              {author.extraData && author.extraData[key] ? (
                                String(author.extraData[key])
                              ) : (
                                <span className="text-gray-300 italic">-</span>
                              )}
                            </td>
                          ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const FormsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-serif font-semibold text-paa-navy tracking-tight border-l-4 border-paa-navy pl-2">
          Forms Management
        </h3>
        <button
          onClick={() => setIsFormModalOpen(true)}
          className="px-4 py-2 bg-paa-navy text-paa-cream text-xs font-bold uppercase transition hover:bg-paa-gold"
        >
          Create Form
        </button>
      </div>

      {selectedFormResponses ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedFormResponses(null)}
              className="text-paa-navy hover:text-paa-gold"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h4 className="font-bold text-paa-navy">
              Responses for: {selectedFormResponses.formTitle}
            </h4>
          </div>
          <div className="overflow-x-auto bg-white border border-paa-navy/5 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out">
            <table className="dash-table">
              <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                <tr>
                  <th className="!text-[14px] !text-indigo-800 !bg-transparent">
                    Author
                  </th>
                  <th className="!text-[14px] !text-indigo-800 !bg-transparent">
                    Date
                  </th>
                  <th className="!text-[14px] !text-indigo-800 !bg-transparent">
                    Answers
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectedFormResponses.responses.map((r: any) => (
                  <tr key={r.id}>
                    <td>
                      <p className="font-bold text-paa-navy">
                        {r.author?.name}
                      </p>
                    </td>
                    <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="max-w-sm truncate text-xs text-paa-gray-text font-medium">
                      {JSON.stringify(r.answers)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {forms.map((f: any) => (
            <div
              key={f.id}
              className="p-4 bg-white border border-paa-navy/5 flex flex-col gap-2 hover:shadow-md transition"
            >
              <div className="font-bold text-paa-navy text-lg">{f.title}</div>
              <div className="text-sm text-paa-gray-text">{f.description}</div>
              <div className="text-xs text-paa-gray-text">
                Fields: {f.fields.length}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  className="px-3 py-1.5 bg-paa-navy/10 text-paa-navy text-xs font-bold uppercase hover:bg-paa-navy hover:text-white transition rounded-full active:scale-95 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out"
                  onClick={() => {
                    axios
                      .get(`${API}/api/admin/forms/${f.id}/responses`, {
                        headers: {
                          Authorization: `Bearer ${localStorage.getItem("token")}`,
                        },
                      })
                      .then((res) =>
                        setSelectedFormResponses({
                          formTitle: f.title,
                          responses: res.data,
                        }),
                      );
                  }}
                >
                  View Responses
                </button>
                <button
                  className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold uppercase hover:bg-red-600 hover:text-white transition rounded-full active:scale-95 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out"
                  onClick={() => {
                    if (
                      window.confirm("Delete this form and all its responses?")
                    ) {
                      axios
                        .delete(`${API}/api/admin/forms/${f.id}`, {
                          headers: {
                            Authorization: `Bearer ${localStorage.getItem("token")}`,
                          },
                        })
                        .then(() => fetchForms());
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderGalleryTab = () => {
    const handleCarouselUpload = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (carouselImages.length >= 10)
        return toast.error("Maximum 10 images allowed for the carousel.");

      setUploadingCarousel(true);
      const formData = new FormData();
      formData.append("image", file);
      try {
        await axios.post(`${API}/api/admin/carousel`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        toast.success("Carousel image uploaded.");
        fetchCarouselImages();
      } catch (err) {
        toast.error("Failed to upload image.");
      } finally {
        setUploadingCarousel(false);
      }
    };

    const handleCarouselMove = async (
      index: number,
      direction: "left" | "right",
    ) => {
      const newImages = [...carouselImages];
      if (direction === "left" && index > 0) {
        [newImages[index - 1], newImages[index]] = [
          newImages[index],
          newImages[index - 1],
        ];
      } else if (direction === "right" && index < newImages.length - 1) {
        [newImages[index + 1], newImages[index]] = [
          newImages[index],
          newImages[index + 1],
        ];
      } else {
        return;
      }
      setCarouselImages(newImages);
      try {
        await axios.post(
          `${API}/api/admin/carousel/reorder`,
          {
            order: newImages.map((img) => img.id),
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
      } catch (err) {
        console.error(err);
        toast.error("Failed to save new order");
        fetchCarouselImages();
      }
    };

    const handleCarouselDelete = async (filename: string) => {
      try {
        await axios.delete(`${API}/api/admin/carousel/${filename}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        toast.success("Carousel image removed.");
        fetchCarouselImages();
      } catch (err) {
        toast.error("Failed to remove image.");
      }
    };

    const handleUploadGalleryImage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedGalleryEvent || galleryUploadFiles.length === 0) return;

      setIsUploadingGallery(true);
      try {
        const token = localStorage.getItem("token");
        const promises = galleryUploadFiles.map((file) => {
          const formData = new FormData();
          formData.append("photo", file);
          if (galleryUploadCaption)
            formData.append("caption", galleryUploadCaption);
          formData.append("itemType", selectedGalleryEvent.itemType || "Event");
          // Pass the raw event.id, the backend automatically resolves/creates the galleryEvent
          return axios.post(
            `${API}/api/admin/gallery/${selectedGalleryEvent.id}/images`,
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
                Authorization: `Bearer ${token}`,
              },
            },
          );
        });

        const results = await Promise.all(promises);
        const newImages = results.map((r) => r.data);

        toast.success(
          "Images uploaded successfully. They are now live on the Customer Site!",
        );
        setGalleryUploadFiles([]);
        setGalleryUploadCaption("");

        // Update the current view without closing it
        setSelectedGalleryEvent((prev: any) => ({
          ...prev,
          galleryEvent: {
            ...prev.galleryEvent,
            images: [...(prev.galleryEvent?.images || []), ...newImages],
          },
        }));
      } catch (err) {
        console.error(err);
        toast.error("Failed to upload image.");
      } finally {
        setIsUploadingGallery(false);
      }
    };

    const handleUploadBannerImage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedGalleryEvent || !bannerUploadFile) return;
      setIsUploadingBanner(true);
      try {
        const token = localStorage.getItem("token");
        const fd = new FormData();
        fd.append("banner", bannerUploadFile);

        const isLib = selectedGalleryEvent.itemType === "Library";

        if (!isLib) {
          fd.append("name", selectedGalleryEvent.name);
          fd.append("location", selectedGalleryEvent.location);
          fd.append("date", selectedGalleryEvent.date);
          fd.append("duration", selectedGalleryEvent.duration);
          fd.append("status", selectedGalleryEvent.status);
          fd.append("eventType", selectedGalleryEvent.eventType);
        }

        const endpoint = isLib
          ? `${API}/api/admin/libraries/${selectedGalleryEvent.id}/banner`
          : `${API}/api/admin/events/${selectedGalleryEvent.id}`;

        const res = await axios.put(endpoint, fd, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        });

        toast.success("Banner uploaded successfully!");
        setBannerUploadFile(null);

        // Update the current view without closing it
        setSelectedGalleryEvent((prev: any) => ({
          ...prev,
          bannerUrl: res.data.bannerUrl,
        }));

        if (isLib) {
          fetchLibraries(true);
        } else {
          fetchEvents(true);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to upload banner.");
      } finally {
        setIsUploadingBanner(false);
      }
    };

    const handleDeleteBanner = async () => {
      if (!selectedGalleryEvent) return;
      if (!confirm("Are you sure you want to delete the current banner?"))
        return;
      setIsDeletingBanner(true);
      try {
        const token = localStorage.getItem("token");
        const isLib = selectedGalleryEvent.itemType === "Library";
        const endpoint = isLib
          ? `${API}/api/admin/libraries/${selectedGalleryEvent.id}/banner`
          : `${API}/api/admin/events/${selectedGalleryEvent.id}/banner`;

        await axios.delete(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        toast.success("Banner deleted successfully!");
        setSelectedGalleryEvent((prev: any) => ({
          ...prev,
          bannerUrl: null,
        }));

        if (isLib) {
          fetchLibraries(true);
        } else {
          fetchEvents(true);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to delete banner.");
      } finally {
        setIsDeletingBanner(false);
      }
    };

    const combinedGalleryItems = [
      ...events.map((e: any) => ({ ...e, itemType: "Event" })),
      ...libraries
        .map((l: any) => {
          // Use the oldest drive's registrationEndDate as the gallery date.
          // announcements are returned sorted asc by registrationEndDate from the backend.
          const oldestDriveDate =
            l.announcements && l.announcements.length > 0
              ? l.announcements[0].registrationEndDate
              : l.createdAt;
          return {
            ...l,
            itemType: "Library",
            eventType: l.type,
            date: oldestDriveDate || l.createdAt,
            location: l.city,
          };
        }),
    ];

    const filteredEvents = combinedGalleryItems
      .filter((e: any) => {
        const matchSearch =
          (e.name?.toLowerCase() || "").includes(
            galleryTabSearchTerm.toLowerCase(),
          ) ||
          (e.location?.toLowerCase() || "").includes(
            galleryTabSearchTerm.toLowerCase(),
          );
        const matchType = galleryTabFilterType
          ? e.eventType === galleryTabFilterType
          : true;
        const matchDate = galleryTabFilterDate
          ? new Date(e.date).toISOString().startsWith(galleryTabFilterDate)
          : true;
        // Libraries are permanent installations — always show them regardless of date.
        // Events must be past their end date to appear in the gallery.
        const isPastEvent =
          e.itemType === "Library" ||
          checkIsPastEvent(e.date, e.duration || "1 Day");
        return matchSearch && matchType && matchDate && isPastEvent;
      })
      .sort((a: any, b: any) => {
        if (galleryTabSortBy === "date_desc")
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (galleryTabSortBy === "date_asc")
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (galleryTabSortBy === "name_asc")
          return (a.name || "").localeCompare(b.name || "");
        if (galleryTabSortBy === "name_desc")
          return (b.name || "").localeCompare(a.name || "");
        return 0;
      });

    return (
      <div className="space-y-6">
        {!selectedGalleryEvent ? (
          <div className="dash-panel animate-fade-in-up">
            <div className="dash-panel-header flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
              <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                <button
                  onClick={() => setGallerySubTab("events")}
                  className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-xl transition-colors text-center whitespace-nowrap ${gallerySubTab === "events" ? "bg-paa-navy text-white shadow-md" : "bg-gray-100 text-gray-500 hover:text-paa-navy hover:bg-gray-200"}`}
                >
                  Event Galleries
                </button>
                <button
                  onClick={() => setGallerySubTab("carousel")}
                  className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-xl transition-colors text-center whitespace-nowrap ${gallerySubTab === "carousel" ? "bg-paa-navy text-white shadow-md" : "bg-gray-100 text-gray-500 hover:text-paa-navy hover:bg-gray-200"}`}
                >
                  Featured Gallery Images
                </button>
              </div>
              {gallerySubTab === "events" && (
                <span className="px-4 py-2 bg-paa-cream text-paa-navy text-xs font-bold uppercase tracking-widest border border-paa-navy/10 rounded-xl text-center w-full lg:w-auto">
                  Auto-synced with All Events
                </span>
              )}
            </div>

            <div className="p-6">
              {gallerySubTab === "carousel" ? (
                <div className="animate-fade-in-up">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="font-bold text-paa-navy text-lg tracking-tight">
                        Featured Gallery Images
                      </h3>
                      <p className="text-sm text-gray-500">
                        Upload up to 10 high-quality images for the landing page
                        showcase. ({carouselImages.length}/10 uploaded)
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={carouselFileInputRef}
                      onChange={handleCarouselUpload}
                    />
                    <button
                      onClick={() => carouselFileInputRef.current?.click()}
                      disabled={
                        uploadingCarousel || carouselImages.length >= 10
                      }
                      className="bg-paa-navy text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-paa-gold transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                    >
                      {uploadingCarousel ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}{" "}
                      Add Image
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {carouselImages.map((img, index) => (
                      <div
                        key={img.id}
                        className="bg-white rounded-2xl border border-gray-100 shadow-premium overflow-hidden group relative aspect-[4/3]"
                      >
                        <img
                          loading="lazy"
                          src={`${API}${img.url}`}
                          alt="Featured Image"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleCarouselMove(index, "left")}
                              disabled={index === 0}
                              className="w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
                              title="Move Left"
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <button
                              onClick={() =>
                                handleCarouselDelete(img.url.split("/").pop()!)
                              }
                              className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                              title="Remove"
                            >
                              <Trash2 size={16} />
                            </button>
                            <button
                              onClick={() => handleCarouselMove(index, "right")}
                              disabled={index === carouselImages.length - 1}
                              className="w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
                              title="Move Right"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                          <span className="text-white text-[10px] font-bold uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded-full">
                            Position: {index + 1}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {carouselImages.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 border-dashed mt-6">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ImageIcon className="w-8 h-8 text-gray-300" />
                      </div>
                      <h3 className="text-lg font-bold text-paa-navy">
                        No Featured Images
                      </h3>
                      <p className="text-gray-500 text-sm mt-1">
                        Upload images here to feature them on the main landing
                        page showcase.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-4 rounded-xl border border-paa-navy/5 shadow-sm">
                    <div className="flex-1 relative w-full min-w-[200px]">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search by name or location..."
                        value={galleryTabSearchTerm}
                        onChange={(e) =>
                          setGalleryTabSearchTerm(e.target.value)
                        }
                        className="dash-input w-full"
                        style={{ paddingLeft: "2.5rem" }}
                      />
                    </div>
                    <select
                      value={galleryTabFilterType}
                      onChange={(e) => setGalleryTabFilterType(e.target.value)}
                      className="dash-input !w-full md:!w-48 shrink-0"
                    >
                      <option value="">All Event Types</option>
                      <option value="Book Fair">Book Fair</option>
                      <option value="Literary Event">Literary Event</option>
                      <option value="Airport Library">Flybraries</option>
                      <option value="Public Library">Public Library</option>
                      <option value="Institutional Library">Institutional Library</option>
                      <option value="Military Library">Military Library</option>
                      <option value="Café Library">Café Library</option>
                    </select>
                    <input
                      type="date"
                      value={galleryTabFilterDate}
                      onChange={(e) => setGalleryTabFilterDate(e.target.value)}
                      className="dash-input !w-full md:!w-40 shrink-0"
                    />
                    <select
                      value={galleryTabSortBy}
                      onChange={(e) => setGalleryTabSortBy(e.target.value)}
                      className="dash-input !w-full md:!w-48 shrink-0"
                    >
                      <option value="date_desc">Latest First</option>
                      <option value="date_asc">Oldest First</option>
                      <option value="name_asc">Name (A-Z)</option>
                      <option value="name_desc">Name (Z-A)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredEvents.map((evt: any) => {
                      const firstImage = evt.galleryEvent?.images?.[0]?.url;
                      const bannerUrl = firstImage
                        ? firstImage.startsWith("http")
                          ? firstImage
                          : `${API}${firstImage}`
                        : evt.bannerUrl
                          ? evt.bannerUrl.startsWith("http")
                            ? evt.bannerUrl
                            : `${API}${evt.bannerUrl}`
                          : null;
                      const imageCount = evt.galleryEvent?.images?.length || 0;
                      const pendingCount =
                        evt.galleryEvent?.images?.filter(
                          (i: any) => i.status !== "Approved",
                        ).length || 0;
                      return (
                        <div
                          key={evt.id}
                          className="group flex flex-col bg-white border border-paa-navy/10 rounded-xl overflow-hidden hover:shadow-premium transition-all duration-300"
                        >
                          <div className="relative h-48 w-full overflow-hidden bg-paa-navy/5 shrink-0">
                            {bannerUrl ? (
                              <img
                                loading="lazy"
                                src={bannerUrl}
                                alt={evt.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-paa-navy/40 group-hover:scale-105 transition-transform duration-700 ease-in-out bg-gradient-to-br from-paa-cream to-gray-200">
                                <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                                <span className="text-xs font-bold uppercase tracking-widest text-paa-navy/60">
                                  No Photos Yet
                                </span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-paa-navy/90 via-paa-navy/40 to-transparent"></div>
                            <div className="absolute top-3 right-3">
                              <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-extrabold uppercase tracking-widest rounded-full text-paa-navy shadow-sm">
                                {evt.eventType || "Event"}
                              </span>
                            </div>
                            {pendingCount > 0 && (
                              <div className="absolute top-3 left-3">
                                <span className="px-3 py-1 bg-orange-500 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-full shadow-md">
                                  {pendingCount} Pending
                                </span>
                              </div>
                            )}
                            <div className="absolute bottom-4 left-4 right-4">
                              <h4 className="text-white font-serif font-bold text-xl leading-tight line-clamp-2 drop-shadow-md">
                                {evt.name}
                              </h4>
                              <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mt-1 flex items-center gap-1 drop-shadow-sm">
                                <CalendarIcon size={12} />{" "}
                                {evt.date
                                  ? new Date(evt.date).toLocaleDateString()
                                  : "N/A"}
                              </p>
                            </div>
                          </div>

                          <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                            <div className="flex items-start justify-between text-sm">
                              <div>
                                <p className="font-bold text-paa-navy">
                                  {evt.location}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {evt.duration}
                                </p>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-2xl font-black text-paa-navy leading-none">
                                  {imageCount}
                                </span>
                                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                                  Photos
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => setSelectedGalleryEvent(evt)}
                              className="w-full dash-btn dash-btn-primary flex justify-center items-center gap-2 group-hover:bg-paa-gold group-hover:text-paa-navy group-hover:border-paa-gold transition-colors"
                            >
                              <ImageIcon size={16} /> Manage Gallery
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="dash-panel animate-fade-in-up">
            <div className="dash-panel-header flex justify-between items-center">
              <div>
                <h3 className="dash-panel-title">
                  {selectedGalleryEvent.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1 uppercase tracking-widest font-bold text-[10px]">
                  Gallery Management
                </p>
              </div>
              <button
                onClick={() => {
                  fetchEvents(true);
                  setSelectedGalleryEvent(null);
                  setGalleryUploadFiles([]);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors"
              >
                &larr; Back to Events
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-gray-50/30">
              <div className="lg:col-span-1 flex flex-col gap-6">
                {/* Upload Section */}
                <div className="bg-white p-6 rounded-2xl border border-paa-navy/5 shadow-sm h-fit">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-paa-navy mb-4 border-b border-gray-100 pb-2">
                    Upload New Photos
                  </h4>
                  <FocusTrap
                    focusTrapOptions={{
                      initialFocus: false,
                      escapeDeactivates: true,
                      clickOutsideDeactivates: true,
                    }}
                  >
                    <form
                      onSubmit={handleUploadGalleryImage}
                      className="flex flex-col gap-4"
                    >
                      <div>
                        <label className="dash-label">
                          Photos (Select Multiple) *
                        </label>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="dash-input text-xs w-full"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              const selected = Array.from(e.target.files);
                              setGalleryUploadFiles((prev) => [
                                ...prev,
                                ...selected,
                              ]);
                            }
                          }}
                        />
                      </div>
                      {galleryUploadFiles.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto py-2 px-1">
                          {galleryUploadFiles.map((file, i) => (
                            <div
                              key={i}
                              className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-gray-200 group shadow-sm"
                            >
                              <img
                                loading="lazy"
                                src={URL.createObjectURL(file)}
                                className="w-full h-full object-cover"
                                alt="Preview"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setGalleryUploadFiles((prev) =>
                                    prev.filter((_, idx) => idx !== i),
                                  )
                                }
                                className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div>
                        <label className="dash-label">Caption (Optional)</label>
                        <input
                          className="dash-input w-full"
                          placeholder="e.g., Book signing moment..."
                          value={galleryUploadCaption}
                          onChange={(e) =>
                            setGalleryUploadCaption(e.target.value)
                          }
                        />
                      </div>
                      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => setGalleryUploadFiles([])}
                          className="px-6 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100"
                        >
                          Clear
                        </button>
                        <button
                          type="submit"
                          disabled={isUploadingGallery}
                          className="dash-btn dash-btn-primary disabled:opacity-50"
                        >
                          {isUploadingGallery ? "Uploading..." : "Upload Image"}
                        </button>
                      </div>
                    </form>
                  </FocusTrap>
                </div>

                {/* Upload Banner Section */}
                <div className="bg-white p-6 rounded-2xl border border-paa-navy/5 shadow-sm h-fit">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-paa-navy mb-4 border-b border-gray-100 pb-2">
                    Upload Banner Image
                  </h4>
                  <FocusTrap
                    focusTrapOptions={{
                      initialFocus: false,
                      escapeDeactivates: true,
                      clickOutsideDeactivates: true,
                    }}
                  >
                    <form
                      onSubmit={handleUploadBannerImage}
                      className="flex flex-col gap-4"
                    >
                      <div>
                        <label className="dash-label">Banner Photo *</label>
                        <input
                          type="file"
                          accept="image/*"
                          className="dash-input text-xs w-full"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              setBannerUploadFile(e.target.files[0]);
                            }
                          }}
                        />
                      </div>
                      {bannerUploadFile && (
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-200 shadow-sm mt-2">
                          <img
                            loading="lazy"
                            src={URL.createObjectURL(bannerUploadFile)}
                            className="w-full h-full object-cover"
                            alt="Banner Preview"
                          />
                          <button
                            type="button"
                            onClick={() => setBannerUploadFile(null)}
                            className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white flex items-center justify-center rounded-full hover:bg-red-500 transition-all"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                      {selectedGalleryEvent.bannerUrl && !bannerUploadFile && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">
                            Current Banner:
                          </p>
                          <div className="relative">
                            <img
                              loading="lazy"
                              src={`${API}${selectedGalleryEvent.bannerUrl}`}
                              className="w-full aspect-video object-cover rounded-lg border border-gray-200"
                              alt="Current Banner"
                            />
                            <button
                              type="button"
                              onClick={handleDeleteBanner}
                              disabled={isDeletingBanner}
                              className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-sm transition-all disabled:opacity-50"
                              title="Delete Banner"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => setBannerUploadFile(null)}
                          className="px-6 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100"
                        >
                          Clear
                        </button>
                        <button
                          type="submit"
                          disabled={isUploadingBanner || !bannerUploadFile}
                          className="dash-btn dash-btn-primary disabled:opacity-50"
                        >
                          {isUploadingBanner ? "Uploading..." : "Upload Banner"}
                        </button>
                      </div>
                    </form>
                  </FocusTrap>
                </div>
              </div>

              {/* Existing Images Section */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-paa-navy/5 shadow-sm">
                <h4 className="text-sm font-bold uppercase tracking-widest text-paa-navy mb-4 border-b border-gray-100 pb-2">
                  Existing Photos (
                  {selectedGalleryEvent.galleryEvent?.images?.length || 0})
                </h4>

                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...(selectedGalleryEvent.galleryEvent?.images || [])]
                    .sort((a: any, b: any) => {
                      if (a.status === "Pending" && b.status !== "Pending")
                        return -1;
                      if (b.status === "Pending" && a.status !== "Pending")
                        return 1;
                      return (
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime()
                      );
                    })
                    .map((img: any) => (
                      <div
                        key={img.id}
                        className="relative aspect-square rounded-xl overflow-hidden group bg-gray-100 border border-gray-200 shadow-sm cursor-pointer"
                        onClick={() =>
                          setViewingGalleryImage(`${API}${img.url}`)
                        }
                      >
                        <img
                          loading="lazy"
                          src={`${API}${img.url}`}
                          className="w-full h-full object-cover"
                          alt="Gallery photo"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />

                        {/* Always visible status badge */}
                        <div className="absolute top-2 left-2 z-10">
                          <span
                            className={`px-2 py-0.5 text-[9px] uppercase font-bold rounded-sm shadow-md ${img.status === "Approved" ? "bg-green-500 text-white" : "bg-orange-500 text-white"}`}
                          >
                            {img.status}
                          </span>
                        </div>

                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 z-20">
                          <div className="flex justify-end items-start">
                            <div className="flex gap-1">
                              {img.status !== "Approved" && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await axios.put(
                                        `${API}/api/admin/gallery/images/${img.id}/approve`,
                                        {},
                                        {
                                          headers: {
                                            Authorization: `Bearer ${localStorage.getItem("token")}`,
                                          },
                                        },
                                      );
                                      toast.success("Photo approved.");
                                      setSelectedGalleryEvent({
                                        ...selectedGalleryEvent,
                                        galleryEvent: {
                                          ...selectedGalleryEvent.galleryEvent,
                                          images:
                                            selectedGalleryEvent.galleryEvent.images.map(
                                              (i: any) =>
                                                i.id === img.id
                                                  ? { ...i, status: "Approved" }
                                                  : i,
                                            ),
                                        },
                                      });
                                      fetchEvents(true);
                                    } catch (err: any) {
                                      toast.error(
                                        err.response?.data?.error ||
                                          err.message ||
                                          "Failed to approve photo.",
                                      );
                                    }
                                  }}
                                  className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 shadow-sm"
                                  title="Approve Photo"
                                >
                                  <CheckCircle2 size={12} />
                                </button>
                              )}
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (
                                    window.confirm(
                                      "Delete this photo completely?",
                                    )
                                  ) {
                                    try {
                                      await axios.delete(
                                        `${API}/api/admin/gallery/images/${img.id}`,
                                        {
                                          headers: {
                                            Authorization: `Bearer ${localStorage.getItem("token")}`,
                                          },
                                        },
                                      );
                                      toast.success("Photo deleted.");
                                      setSelectedGalleryEvent({
                                        ...selectedGalleryEvent,
                                        galleryEvent: {
                                          ...selectedGalleryEvent.galleryEvent,
                                          images:
                                            selectedGalleryEvent.galleryEvent.images.filter(
                                              (i: any) => i.id !== img.id,
                                            ),
                                        },
                                      });
                                      fetchEvents(true);
                                    } catch (err: any) {
                                      toast.error(
                                        err.response?.data?.error ||
                                          err.message ||
                                          "Failed to delete photo.",
                                      );
                                    }
                                  }
                                }}
                                className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-sm"
                                title="Delete Photo"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                          <div className="mt-auto pb-1 px-1">
                            {String(img.caption || "")
                              .replace(/\(Uploaded by .*?\)/, "")
                              .trim() && (
                              <p className="text-white text-xs line-clamp-2 font-medium leading-tight drop-shadow-md mb-1">
                                {String(img.caption || "")
                                  .replace(/\(Uploaded by .*?\)/, "")
                                  .trim()}
                              </p>
                            )}
                            {String(img.caption || "").match(
                              /\(Uploaded by (.*?)\)/,
                            ) && (
                              <p className="text-paa-gold text-[9px] uppercase tracking-widest font-bold">
                                By:{" "}
                                {
                                  String(img.caption || "").match(
                                    /\(Uploaded by (.*?)\)/,
                                  )?.[1]
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  {(!selectedGalleryEvent.galleryEvent?.images ||
                    selectedGalleryEvent.galleryEvent.images.length === 0) && (
                    <div className="col-span-full py-16 text-center text-gray-400 italic bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No photos uploaded for this event yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex font-sans"
        style={{ background: "#f8f8f6" }}
      >
        <div className="w-64 shrink-0 h-screen hidden md:flex flex-col p-5 gap-3 dash-sidebar">
          <div className="h-14 mb-4 dash-skeleton opacity-20 rounded-xl"></div>
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="h-10 dash-skeleton opacity-10 rounded-xl"
            ></div>
          ))}
        </div>
        <div className="flex-1 p-8 space-y-6">
          <div className="h-16 dash-skeleton w-full rounded-2xl"></div>
          <div className="grid grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 dash-skeleton rounded-2xl"></div>
            ))}
          </div>
          <div className="h-80 dash-skeleton rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paa-cream flex flex-col md:flex-row font-sans text-paa-navy selection:bg-paa-gold selection:text-white">
      {/* SIDEBAR */}
      <aside
        className={`w-64 flex flex-col shrink-0 h-screen fixed md:sticky top-0 bg-paa-cream z-50 transform transition-transform duration-300 border-r border-paa-navy/5 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="p-4 md:p-6 h-20 flex items-center justify-between shrink-0 border-b border-paa-navy/5">
          <div className="flex items-center gap-2">
            <img
              loading="lazy"
              src="/logo.webp"
              alt="PAA Logo"
              className="h-8 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.nextElementSibling?.classList.remove("hidden");
              }}
            />
            <div className="hidden w-8 h-8 rounded-full bg-[#b44d28] flex items-center justify-center text-white text-sm font-bold">
              P
            </div>
            <span className="font-serif font-bold text-lg tracking-tight hidden md:block text-paa-navy ml-1">
              Admin Portal
            </span>
          </div>
          <span className="font-serif font-bold text-lg md:hidden text-paa-navy">
            Menu
          </span>
        </div>

        <nav className="flex-1 py-5 px-4 space-y-1.5 overflow-y-auto">
          {[
            {
              id: "overview",
              label: "Dashboard Overview",
              icon: LayoutDashboard,
            },
            {
              id: "web_orders",
              label: "Web Orders",
              icon: ShoppingCart,
              hasAlert: pendingAlerts.orders,
            },
            { id: "sales_report", label: "Sales Reports", icon: FileText },
            { id: "documents", label: "Policy Documents", icon: FileText },
            {
              id: "authors",
              label: "List of Authors",
              icon: Users,
              hasAlert: pendingAlerts.authors,
            },
            {
              id: "books",
              label: "List of Books",
              icon: BookOpen,
              hasAlert: pendingAlerts.books,
            },
            {
              id: "inventory",
              label: "Inventory / Distribution",
              icon: BookOpen,
            },
            { id: "events", label: "Events & Fairs", icon: CalendarIcon },
            {
              id: "library_donations",
              label: "Library Donations",
              icon: BookOpen,
            },
            { id: "reviews", label: "Reviews & Feedback", icon: MessageSquare },
            { id: "gallery", label: "Gallery Management", icon: ImageIcon },
            {
              id: "late_authors",
              label: "Late Authors System",
              icon: AlertCircle,
              hasAlert: pendingAlerts.fines,
            },
            {
              id: "helpdesk",
              label: "Helpdesk / Queries",
              icon: Users,
              hasAlert: pendingAlerts.queries,
            },
            {
              id: "event-requests",
              label: "Organize Event",
              icon: CalendarIcon,
            },
            {
              id: "invitations",
              label: "Author Invitations",
              icon: CalendarIcon,
            },
            { id: "settings", label: "System Settings", icon: Settings },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                localStorage.setItem("adminActiveTab", item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-start text-left gap-3 px-4 py-2.5 text-xs font-bold tracking-widest uppercase transition-all duration-300 rounded-xl border ${
                activeTab === item.id
                  ? "bg-paa-navy text-paa-cream border-paa-navy shadow-premium"
                  : "text-paa-navy border-[transparent] hover:bg-black/5 hover:border-black/5"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.hasAlert && (
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 shrink-0 flex gap-2">
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-paa-navy/5 bg-white text-xs font-bold uppercase hover:bg-red-50 text-red-600 transition-colors rounded-full active:scale-95 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main
        className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative"
        style={{ background: "#f5f5f3" }}
      >
        {/* Top Header */}
        <header className="dash-header h-[68px] flex items-center justify-between px-6 md:px-8 shrink-0 relative z-50">
          <div className="flex items-center gap-2">
            <button
              aria-label="Toggle menu"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 text-paa-navy rounded-lg hover:bg-black/5 transition-colors mr-1"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
            <img
              loading="lazy"
              src="/logo.webp"
              alt="PAA Logo"
              width="100"
              height="24"
              className="h-6 w-auto object-contain md:hidden mr-1"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.nextElementSibling?.classList.remove("hidden");
              }}
            />
            <div className="hidden md:hidden w-6 h-6 rounded-full bg-[#b44d28] items-center justify-center text-white text-[10px] font-bold mr-1">
              P
            </div>
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="text-paa-gray-text">Admin Portal</span>
              <span className="text-paa-navy/20">/</span>
              <span className="font-semibold text-paa-navy capitalize">
                {activeTab.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
            {/* Refresh spinner */}
            {isRefreshing && (
              <RefreshCw className="w-3.5 h-3.5 text-paa-gray-text animate-spin" />
            )}

            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-black/8 text-paa-navy hover:bg-black/4 transition-colors"
            >
              <Megaphone className="w-4 h-4" />
              {(pendingAlerts.orders ||
                pendingAlerts.queries ||
                pendingAlerts.authors ||
                pendingAlerts.books ||
                pendingAlerts.fines) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>

            {showNotifications && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: 8,
                  width: 420,
                  background: "#fff",
                  borderRadius: 16,
                  border: "1px solid rgba(0,0,0,0.08)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
                  zIndex: 9999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                    background: "#fafafa",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "#1a1a2e",
                      }}
                    >
                      📣 Broadcast to Authors
                    </p>
                    <button
                      onClick={() => setShowNotifications(false)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 4,
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p style={{ fontSize: 12, color: "#6b6b80", marginTop: 4 }}>
                    Type{" "}
                    <span
                      style={{
                        background: "#e0e7ff",
                        color: "#3b82f6",
                        padding: "1px 6px",
                        borderRadius: 4,
                        fontWeight: 700,
                        fontFamily: "monospace",
                      }}
                    >
                      @
                    </span>{" "}
                    to mention an author, or send to all.
                  </p>
                </div>

                <div style={{ padding: "16px 20px", position: "relative" }}>
                  <textarea
                    value={newNotification}
                    onChange={handleNotificationChange}
                    placeholder="Type your message... Use @authorname to tag specific authors"
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      border: "1px solid rgba(0,0,0,0.12)",
                      borderRadius: 10,
                      fontFamily: "var(--font-body)",
                      fontSize: 14,
                      background: "#f7f7f9",
                      outline: "none",
                      resize: "vertical",
                      boxSizing: "border-box",
                    }}
                  />

                  {/* @mention dropdown */}
                  {showMentionDropdown && (
                    <div
                      style={{
                        position: "absolute",
                        left: 20,
                        right: 20,
                        bottom: "100%",
                        marginBottom: -60,
                        background: "#fff",
                        border: "1px solid rgba(0,0,0,0.12)",
                        borderRadius: 10,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                        maxHeight: 180,
                        overflowY: "auto",
                        zIndex: 10,
                      }}
                    >
                      {authors
                        .filter(
                          (a: any) =>
                            (a.name || "")
                              .toLowerCase()
                              .includes(mentionQuery.toLowerCase()) ||
                            (a.email || "")
                              .toLowerCase()
                              .includes(mentionQuery.toLowerCase()),
                        )
                        .slice(0, 8)
                        .map((a: any) => (
                          <button
                            key={a.id}
                            onClick={() =>
                              handleMentionSelect(a.name || a.email || "Author")
                            }
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              width: "100%",
                              padding: "10px 14px",
                              background: "none",
                              border: "none",
                              borderBottom: "1px solid rgba(0,0,0,0.04)",
                              cursor: "pointer",
                              textAlign: "left",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = "#f0f0f4")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                          >
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                background: "#e0e7ff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 12,
                                fontWeight: 700,
                                color: "#3b82f6",
                              }}
                            >
                              {(a.name || a.email || "A")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <div>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: "#1a1a2e",
                                }}
                              >
                                {a.name || a.email}
                              </div>
                              {a.name && (
                                <div style={{ fontSize: 11, color: "#6b6b80" }}>
                                  {a.email || a.phone || "Author"}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      {authors.filter(
                        (a: any) =>
                          (a.name || "")
                            .toLowerCase()
                            .includes(mentionQuery.toLowerCase()) ||
                          (a.email || "")
                            .toLowerCase()
                            .includes(mentionQuery.toLowerCase()),
                      ).length === 0 && (
                        <div
                          style={{
                            padding: "12px 14px",
                            fontSize: 12,
                            color: "#6b6b80",
                            textAlign: "center",
                          }}
                        >
                          No authors found
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ padding: "0 20px 10px" }}>
                  {/* Document upload removed, moved to Documents tab */}
                </div>

                <div
                  style={{ padding: "0 20px 16px", display: "flex", gap: 10 }}
                >
                  <button
                    onClick={() => handleSendNotification(undefined, true)}
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      background: "#1a1a2e",
                      color: "#fff",
                      border: "none",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      transition: "opacity 0.2s",
                    }}
                  >
                    <Users className="w-4 h-4" /> Notify All
                  </button>
                  <button
                    onClick={() => handleSendNotification()}
                    disabled={!newNotification.trim()}
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      background: newNotification.includes("@")
                        ? "#2563eb"
                        : "#e5e5e5",
                      color: newNotification.includes("@") ? "#fff" : "#999",
                      border: "none",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: newNotification.includes("@")
                        ? "pointer"
                        : "default",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      transition: "all 0.2s",
                    }}
                  >
                    <MessageSquare className="w-4 h-4" /> Send to Tagged
                  </button>
                </div>

                {notifications.filter((n: any) => !n.documentUrl).length >
                  0 && (
                  <div
                    style={{
                      borderTop: "1px solid rgba(0,0,0,0.06)",
                      maxHeight: 160,
                      overflowY: "auto",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 20px 6px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          color: "#6b6b80",
                        }}
                      >
                        Recent Broadcasts
                      </span>
                      <button
                        onClick={() => {
                          setShowNotifications(false);
                          setActiveTab("broadcasts" as any);
                          localStorage.setItem("adminActiveTab", "broadcasts");
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#3b82f6",
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: "pointer",
                          textTransform: "uppercase",
                        }}
                      >
                        View All
                      </button>
                    </div>
                    {notifications
                      .filter((n: any) => !n.documentUrl)
                      .slice(0, 5)
                      .map((n: any) => (
                        <div
                          key={n.id}
                          style={{
                            padding: "8px 20px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "start",
                            gap: 8,
                            borderBottom: "1px solid rgba(0,0,0,0.03)",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <p
                              style={{
                                fontSize: 12,
                                color: "#1a1a2e",
                                lineHeight: 1.4,
                              }}
                            >
                              {n.message}
                            </p>
                            <p
                              style={{
                                fontSize: 10,
                                color: "#9ca3af",
                                marginTop: 2,
                              }}
                            >
                              {n.target === "ALL"
                                ? "→ All Authors"
                                : `→ @${n.target}`}{" "}
                              • {new Date(n.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeleteNotification(n.id)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: 2,
                                color: "#d97706",
                                opacity: 0.7,
                              }}
                              title="Archive"
                            >
                              <Archive className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleHardDeleteNotification(n.id)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: 2,
                                color: "#ef4444",
                                opacity: 0.5,
                              }}
                              title="Permanent Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        {/* Thin refresh sweep bar */}
        <div className="dash-refresh-bar shrink-0">
          {isRefreshing && <div className="sweep" />}
        </div>

        {/* Scrollable Body */}
        <div
          id="admin-dashboard-scroll"
          className="flex-1 overflow-auto p-0 sm:p-7"
        >
          <Suspense
            fallback={
              <div className="p-10 text-center text-gray-500 font-medium">
                Loading module...
              </div>
            }
          >
            {activeTab === "overview" && (
              <React.Suspense
                fallback={
                  <div className="p-8 text-center text-gray-500 animate-pulse font-medium">
                    Loading Dashboard Overview...
                  </div>
                }
              >
                <AdminOverviewTab
                  refreshTrigger={lastRefreshTime}
                  books={books}
                  authors={authors}
                  orders={orders}
                  events={events}
                  stats={stats}
                  lastAdminVisit={lastAdminVisit}
                  prevQueries={pendingQueriesCount}
                  API={API}
                  setActiveTab={setActiveTab}
                  setAuthorStatusFilter={setAuthorStatusFilter}
                />
              </React.Suspense>
            )}
            {activeTab === "broadcasts" && (
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm animate-fade-in-up">
                <h2 className="text-xl font-serif text-paa-navy mb-6 flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-indigo-500" /> All
                  Broadcasted Messages
                </h2>
                {notifications.filter((n: any) => !n.documentUrl).length ===
                0 ? (
                  <p className="text-gray-500 italic text-sm">
                    No broadcasts found.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {notifications
                      .filter((n: any) => !n.documentUrl)
                      .map((n: any) => (
                        <div
                          key={n.id}
                          className="p-5 bg-[#f8fafc] border border-gray-100 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-paa-navy mb-3 leading-relaxed">
                              {n.message}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                              <span className="font-bold text-[10px] uppercase tracking-widest bg-white border border-gray-200 px-2 py-1 rounded-md">
                                Target:{" "}
                                {n.target === "ALL"
                                  ? "All Authors"
                                  : `@${n.target}`}
                              </span>
                              <span className="font-medium flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" />{" "}
                                {new Date(n.createdAt).toLocaleDateString()} at{" "}
                                {new Date(n.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDeleteNotification(n.id)}
                              className="p-2.5 text-amber-600 bg-amber-50 border border-amber-100 hover:bg-amber-100 rounded-xl transition-colors shadow-sm shrink-0"
                              title="Archive Broadcast"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleHardDeleteNotification(n.id)}
                              className="p-2.5 text-red-500 bg-white border border-red-100 hover:bg-red-50 rounded-xl transition-colors shadow-sm shrink-0"
                              title="Delete Broadcast"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
            {activeTab === "documents" && (
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm animate-fade-in-up">
                <h2 className="text-xl font-serif text-paa-navy mb-6 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" /> Policy
                  Documents
                </h2>

                <div className="bg-[#f8fafc] border border-gray-100 rounded-2xl p-5 mb-8">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-paa-navy mb-4">
                    Upload & Share Document
                  </h3>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="dash-label">
                        Document Message / Description
                      </label>
                      <input
                        className="dash-input w-full"
                        placeholder="e.g., Updated Guidelines for 2026..."
                        value={newNotification}
                        onChange={(e) => setNewNotification(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="dash-label">
                        Attach File (Required)
                      </label>
                      <input
                        type="file"
                        className="dash-input text-xs w-full bg-white"
                        onChange={(e) =>
                          setNotificationDocument(
                            e.target.files ? e.target.files[0] : null,
                          )
                        }
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setNewNotification("");
                          setNotificationDocument(null);
                        }}
                        className="px-6 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => handleSendNotification(undefined, 'SILENT_ALL')}
                        disabled={!notificationDocument}
                        className="dash-btn disabled:opacity-50 border border-gray-200 hover:bg-gray-50 text-gray-700 bg-white"
                      >
                        Upload Only
                      </button>
                      <button
                        onClick={() => handleSendNotification(undefined, 'ALL')}
                        disabled={!notificationDocument}
                        className="dash-btn dash-btn-primary disabled:opacity-50"
                      >
                        Upload & Broadcast
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-paa-navy">
                    Previously Uploaded Docs
                  </h3>
                  <div 
                    onClick={() => setShowArchivedDocs(!showArchivedDocs)}
                    className="flex items-center gap-2 cursor-pointer shrink-0 ml-1"
                  >
                    <div className={`relative w-8 h-4 rounded-full transition-colors ${showArchivedDocs ? 'bg-red-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform duration-200 ${showArchivedDocs ? 'translate-x-4' : 'translate-x-0'} shadow-sm`}></div>
                    </div>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-gray-600">Archived</span>
                  </div>
                </div>
                {(() => {
                  const catalogueFile = serverFiles.find(
                    (f: any) => f.name.toLowerCase() === "catalogue.pdf"
                  );
                  const notificationUrls = new Set(
                    notifications
                      .filter((n: any) => n.documentUrl)
                      .map((n: any) => n.documentUrl.toLowerCase())
                  );
                  


                  const unifiedDocs = [
                    ...(catalogueFile
                      ? [
                          {
                            id: "catalogue",
                            message: "Book Catalogue (Auto-generated)",
                            documentName: catalogueFile.name,
                            documentUrl: catalogueFile.url,
                            createdAt: catalogueFile.createdAt,
                            isServerFile: true,
                          },
                        ]
                      : []),
                    ...notifications
                      .filter((n: any) => n.documentUrl)
                      .filter((n: any) => showArchivedDocs ? n.isArchived : !n.isArchived)
                      .map((n: any) => ({
                        id: n.id,
                        message: n.message || "No description",
                        documentName: n.documentName || "View Document",
                        documentUrl: n.documentUrl,
                        createdAt: n.createdAt,
                        isServerFile: false,
                      })),
                  ];

                  if (unifiedDocs.length === 0) {
                    return (
                      <p className="text-gray-500 italic text-sm">
                        No documents have been shared yet.
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {unifiedDocs.map((doc: any) => (
                        <div
                          key={doc.id}
                          className="p-5 bg-white border border-gray-100 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-paa-navy mb-3 leading-relaxed flex items-center gap-2">
                              {doc.message}
                              {doc.isServerFile && (
                                <span className="bg-green-100 text-green-700 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded">
                                  System Gen
                                </span>
                              )}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                              <span className="font-medium flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" />{" "}
                                {(() => {
                                  const d = new Date(doc.createdAt);
                                  const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                                  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                                  return `${dateStr} ${timeStr}`;
                                })()}
                                {doc.isServerFile && " (Last updated)"}
                              </span>
                              <a
                                href={`${API}${doc.documentUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 font-bold uppercase tracking-widest text-[10px] rounded-md hover:bg-indigo-100 transition-colors"
                              >
                                <FileText className="w-3 h-3" />{" "}
                                {doc.documentName}
                              </a>
                            </div>
                          </div>
                          {!doc.isServerFile && (
                            <>
                              {doc.isArchived || showArchivedDocs ? (
                                <button
                                  onClick={() => handleRestoreNotification(doc.id)}
                                  className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors shadow-sm shrink-0"
                                  title="Restore Document"
                                >
                                  Restore
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleDeleteNotification(doc.id)}
                                    className="p-2.5 text-amber-600 bg-amber-50 border border-amber-100 hover:bg-amber-100 rounded-xl transition-colors shadow-sm shrink-0"
                                    title="Archive Document"
                                  >
                                    <Archive className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleHardDeleteNotification(doc.id)}
                                    className="p-2.5 text-red-500 bg-white border border-red-100 hover:bg-red-50 rounded-xl transition-colors shadow-sm shrink-0"
                                    title="Permanently Delete Document"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
            {activeTab === "web_orders" && (
              <Suspense
                fallback={
                  <div className="p-8 text-center text-sm text-gray-500">
                    Loading orders...
                  </div>
                }
              >
                <WebOrdersTabLazy
                  orders={orders}
                  stats={stats}
                  fetchOrders={fetchOrders}
                  API={API}
                  handleExportCSV={handleExportCSV}
                  handleExportBulkCSV={handleExportBulkCSV}
                  ordersMeta={ordersMeta}
                  ordersPage={ordersPage}
                  setOrdersPage={setOrdersPage}
                />
              </Suspense>
            )}
            {activeTab === "sales_report" && (
              <Suspense
                fallback={
                  <div className="p-10 text-center text-gray-500 font-medium animate-pulse">
                    Loading Sales Report...
                  </div>
                }
              >
                <SalesReportTabLazy refreshTrigger={lastRefreshTime} />
              </Suspense>
            )}
            {activeTab === "authors" && (
              <Suspense
                fallback={
                  <div className="p-10 text-center animate-pulse">
                    Loading Authors...
                  </div>
                }
              >
                <AdminAuthorsTabLazy
                  authors={authors}
                  API={API}
                  selectedAuthorIds={selectedAuthorIds}
                  setSelectedAuthorIds={setSelectedAuthorIds}
                  isDownloadingPdf={isDownloadingPdf}
                  setIsDownloadingPdf={setIsDownloadingPdf}
                  authorSearchTerm={searchTerm}
                  setAuthorSearchTerm={setSearchTerm}
                  authorStatusFilter={authorStatusFilter}
                  setAuthorStatusFilter={setAuthorStatusFilter}
                  setAuthorsPage={setAuthorsPage}
                  fetchAuthors={fetchAuthors}
                  fetchBooks={fetchBooks}
                  loadingAction={loadingAction}
                  handleApproveAuthor={handleApproveAuthor}
                  openRejectAuthorModal={openRejectAuthorModal}
                  handleViewEditAuthor={handleViewEditAuthor}
                  handleDeleteAuthor={handleDeleteAuthor}
                  handleRestoreAuthor={handleRestoreAuthor}
                  books={books}
                  authorsMeta={authorsMeta}
                  authorsPage={authorsPage}
                  selectedPendingAuthor={selectedPendingAuthor}
                  setSelectedPendingAuthor={setSelectedPendingAuthor}
                  selectedAuthor={selectedAuthor}
                  setSelectedAuthor={setSelectedAuthor}
                />
              </Suspense>
            )}
            {activeTab === "books" && <BooksTab />}
            {activeTab === "inventory" && <AdminInventoryTab />}
            {activeTab === "events" && renderEventsTab()}
            {activeTab === "forms" && <FormsTab />}
            {activeTab === "gallery" && renderGalleryTab()}
            {activeTab === "invitations" && <AdminInvitationsTab />}
            {activeTab === "reviews" && <AdminReviewsTab />}
            {activeTab === "late_authors" && (
              <LateAuthorsSystemTab
                orders={orders}
                authors={authors}
                fetchAuthors={fetchAuthors}
              />
            )}
            {activeTab === "helpdesk" && (
              <HelpdeskTab refreshTrigger={lastRefreshTime} />
            )}
            {activeTab === "event-requests" && (
              <EventRequestsTab refreshTrigger={lastRefreshTime} />
            )}
            {activeTab === "library_donations" && <LibraryDonationsTab />}
            {activeTab === "settings" && (
              <SettingsTabComponent books={books} API={API} />
            )}
          </Suspense>
        </div>
      </main>

      <Modal
        isOpen={!!selectedBookDetails}
        onClose={() => setSelectedBookDetails(null)}
        title="Book Details"
      >
        {selectedBookDetails && (
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
            <div className="flex gap-4">
              <div className="flex gap-2">
                {selectedBookDetails.coverUrl && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400">
                      Front Cover
                    </span>
                    <img
                      loading="lazy"
                      src={
                        (selectedBookDetails.coverUrl.startsWith("http")
                          ? selectedBookDetails.coverUrl
                          : `${API}${selectedBookDetails.coverUrl}`) + `?t=${lastFetchedBooks}`
                      }
                      alt="Cover"
                      className="w-28 h-40 object-cover border border-paa-navy/20 shadow-sm rounded"
                    />
                  </div>
                )}
                {selectedBookDetails.backCoverUrl && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400">
                      Back Cover
                    </span>
                    <img
                      loading="lazy"
                      src={
                        (selectedBookDetails.backCoverUrl.startsWith("http")
                          ? selectedBookDetails.backCoverUrl
                          : `${API}${selectedBookDetails.backCoverUrl}`) + `?t=${lastFetchedBooks}`
                      }
                      alt="Back Cover"
                      className="w-28 h-40 object-cover border border-paa-navy/20 shadow-sm rounded"
                    />
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-paa-navy mt-4">
                  {selectedBookDetails.title}
                </h3>
                {selectedBookDetails.subtitle && (
                  <p className="text-sm font-medium text-paa-gray-text">
                    {selectedBookDetails.subtitle}
                  </p>
                )}
                <p className="text-sm font-medium mt-1">
                  Author:{" "}
                  <span className="font-bold">
                    {selectedBookDetails.authorName}
                  </span>
                </p>
                <p className="text-xs font-bold uppercase tracking-widest text-paa-navy mt-2 bg-[#eef2f6] inline-block px-2 py-0.5">
                  {selectedBookDetails.genre}{" "}
                  {selectedBookDetails.subGenre &&
                    `> ${selectedBookDetails.subGenre}`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-paa-navy/5 pt-4">
              <div>
                <span className="text-[10px] uppercase text-paa-gray-text block">
                  MRP
                </span>
                <span className="text-sm font-bold text-green-700">
                  ₹{selectedBookDetails.mrp}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-paa-gray-text block">
                  Language
                </span>
                <span className="text-sm font-bold text-paa-navy">
                  {selectedBookDetails.language || "-"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-paa-gray-text block">
                  Format
                </span>
                <span className="text-sm font-bold text-paa-navy">
                  {selectedBookDetails.format || "-"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-paa-gray-text block">
                  Pages
                </span>
                <span className="text-sm font-bold text-paa-navy">
                  {selectedBookDetails.pages || "-"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-paa-gray-text block">
                  Publisher
                </span>
                <span className="text-sm font-bold text-paa-navy">
                  {selectedBookDetails.publisher || "-"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-paa-gray-text block">
                  Pub Date
                </span>
                <span className="text-sm font-bold text-paa-navy">
                  {selectedBookDetails.publicationDate || "-"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-paa-gray-text block">
                  ISBN
                </span>
                <span className="text-sm font-bold text-paa-navy">
                  {selectedBookDetails.isbn || "-"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-paa-gray-text block">
                  Edition
                </span>
                <span className="text-sm font-bold text-paa-navy">
                  {selectedBookDetails.edition || "-"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-paa-gray-text block">
                  Print Format
                </span>
                <span className="text-sm font-bold text-paa-navy">
                  {selectedBookDetails.printFormat || "-"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-paa-gray-text block">
                  Purpose
                </span>
                <span className="text-sm font-bold text-paa-navy">
                  {selectedBookDetails.purpose || "-"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-paa-gray-text block">
                  Current Stock
                </span>
                <span className="text-sm font-bold text-paa-navy">
                  {selectedBookDetails.stock}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-paa-gray-text block">
                  Total Sales
                </span>
                <span className="text-sm font-bold text-paa-navy">
                  {selectedBookDetails.sales || 0}
                </span>
              </div>
            </div>

            <div className="border-t border-paa-navy/5 pt-4">
              <span className="text-[10px] uppercase text-paa-gray-text block mb-1">
                Synopsis
              </span>
              <p className="text-sm text-paa-navy whitespace-pre-wrap">
                {selectedBookDetails.synopsis || "No synopsis provided."}
              </p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isEditEventModalOpen}
        onClose={() => setIsEditEventModalOpen(false)}
        title="Edit Event"
        maxWidthClass="!max-w-4xl w-[90vw]"
      >
        {editingEvent &&
          (() => {
            try {
              const safeDate = editingEvent.date
                ? !isNaN(new Date(editingEvent.date).getTime())
                  ? new Date(editingEvent.date).toISOString().substring(0, 10)
                  : typeof editingEvent.date === "string"
                    ? editingEvent.date.substring(0, 10)
                    : ""
                : "";
              const safeDays =
                typeof editingEvent.duration === "string" &&
                editingEvent.duration.match(/(\d+)\s*Days?/i)
                  ? parseInt(editingEvent.duration.match(/(\d+)\s*Days?/i)[1])
                  : 0;
              const safeHours =
                typeof editingEvent.duration === "string" &&
                editingEvent.duration.match(/(\d+)\s*Hours?/i)
                  ? parseInt(editingEvent.duration.match(/(\d+)\s*Hours?/i)[1])
                  : 0;

              return (
                <form className="space-y-4" onSubmit={handleEditEventSubmit}>
                  <div>
                    <label className="dash-label">Event Name</label>
                    <input
                      required
                      type="text"
                      className="dash-input"
                      value={editingEvent.name || ""}
                      onChange={(e) =>
                        setEditingEvent({
                          ...editingEvent,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="dash-label">Event Description</label>
                    <textarea
                      name="description"
                      rows={2}
                      className="dash-input"
                      defaultValue={editingEvent.description || ""}
                    ></textarea>
                  </div>
                  <div>
                    <label className="dash-label">
                      Event Banner (Leave empty to keep existing)
                    </label>
                    <input
                      name="banner"
                      type="file"
                      accept="image/*"
                      className="dash-input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="dash-label">From Timing</label>
                      <input
                        type="time"
                        className="dash-input"
                        value={editingEvent.startTime || ""}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            startTime: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="dash-label">To Timing</label>
                      <input
                        type="time"
                        className="dash-input"
                        value={editingEvent.endTime || ""}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            endTime: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="dash-label">Format</label>
                      <select
                        name="eventType"
                        className="dash-input"
                        value={editingEvent.eventType || ""}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            eventType: e.target.value,
                          })
                        }
                      >
                        <option value="" disabled hidden>
                          Select Format
                        </option>
                        <option value="Meet the Authors">
                          Meet the Authors
                        </option>
                        <option value="Stall">Stall</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div>
                      <label className="dash-label">Category</label>
                      <select
                        name="category"
                        className="dash-input"
                        value={editingEvent.category || ""}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            category: e.target.value,
                          })
                        }
                      >
                        <option value="" disabled hidden>
                          Select Category
                        </option>
                        <option value="Housing Society">Housing Society</option>
                        <option value="College">College</option>
                        <option value="Book Fair">Book Fair</option>
                        <option value="Corporate Office">
                          Corporate Office
                        </option>
                        <option value="University">University</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="dash-label !mb-0">Date</label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-gray-600 hover:text-paa-navy transition-colors select-none">
                          <input
                            type="checkbox"
                            checked={editingEvent.dateType === "tentative"}
                            onChange={(e) =>
                              setEditingEvent({
                                ...editingEvent,
                                dateType: e.target.checked
                                  ? "tentative"
                                  : "exact",
                              })
                            }
                            className="w-3.5 h-3.5 accent-paa-navy rounded cursor-pointer"
                          />
                          Tentative Date
                        </label>
                      </div>
                      {editingEvent.dateType === "tentative" ? (
                        <input
                          required
                          type="text"
                          className="dash-input"
                          placeholder="e.g. August 2026, Coming Soon, Q4 2026"
                          value={
                            editingEvent.tentativeDate ??
                            editingEvent.date ??
                            ""
                          }
                          onChange={(e) =>
                            setEditingEvent({
                              ...editingEvent,
                              tentativeDate: e.target.value,
                              date: e.target.value,
                            })
                          }
                        />
                      ) : (
                        <input
                          required
                          type="date"
                          className="dash-input"
                          value={safeDate}
                          onChange={(e) =>
                            setEditingEvent({
                              ...editingEvent,
                              date: e.target.value,
                            })
                          }
                        />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="dash-label">No. of Days</label>
                        <input
                          required
                          type="number"
                          min="0"
                          className="dash-input"
                          value={safeDays}
                          onChange={(e) => {
                            const h =
                              typeof editingEvent.duration === "string" &&
                              editingEvent.duration.match(/(\d+)\s*Hours?/i)
                                ? parseInt(
                                    editingEvent.duration.match(
                                      /(\d+)\s*Hours?/i,
                                    )[1],
                                  )
                                : 0;
                            setEditingEvent({
                              ...editingEvent,
                              duration: `${e.target.value} Days ${h} Hours`,
                            });
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="dash-label">No. of Hours</label>
                        <input
                          required
                          type="number"
                          min="0"
                          className="dash-input"
                          value={safeHours}
                          onChange={(e) => {
                            const d =
                              typeof editingEvent.duration === "string" &&
                              editingEvent.duration.match(/(\d+)\s*Days?/i)
                                ? parseInt(
                                    editingEvent.duration.match(
                                      /(\d+)\s*Days?/i,
                                    )[1],
                                  )
                                : 0;
                            setEditingEvent({
                              ...editingEvent,
                              duration: `${d} Days ${e.target.value} Hours`,
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="dash-label">Location</label>
                    <input
                      required
                      type="text"
                      className="dash-input"
                      value={editingEvent.location || ""}
                      onChange={(e) =>
                        setEditingEvent({
                          ...editingEvent,
                          location: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="dash-label">Registration Fee (₹)</label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        className="dash-input"
                        value={editingEvent.registrationFee ?? ""}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            registrationFee: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="dash-label">Fee Type</label>
                      <select
                        className="dash-input"
                        value={editingEvent.feeType || ""}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            feeType: e.target.value,
                          })
                        }
                      >
                        <option value="Per Author">Per Author</option>
                        <option value="Per Title">Per Title</option>
                        <option value="Flat Fee">Flat Fee</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="dash-label">Status</label>
                      <select
                        className="dash-input"
                        value={editingEvent.status || ""}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            status: e.target.value,
                          })
                        }
                      >
                        <option value="Upcoming">Upcoming</option>
                        <option value="Past">Past</option>
                        <option value="Legacy Archive">Legacy Archive</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-3 pt-6">
                      <input
                        type="checkbox"
                        id="editPosEnable"
                        checked={editingEvent.livePosEnabled || false}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            livePosEnabled: e.target.checked,
                          })
                        }
                        className="w-5 h-5 rounded border-gray-300 text-paa-navy focus:ring-paa-navy"
                      />
                      <label
                        htmlFor="editPosEnable"
                        className="text-sm font-bold text-paa-navy cursor-pointer"
                      >
                        Live POS Enabled
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-paa-navy/5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditEventModalOpen(false)}
                      className="bg-gray-100 text-paa-navy px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-paa-navy text-paa-cream px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-paa-gold hover:text-paa-navy transition-colors rounded-full active:scale-95 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              );
            } catch (err: any) {
              console.error("Crash in Edit Modal Render:", err);
              return (
                <div className="p-6 bg-red-50 text-red-600 rounded-lg">
                  <h3 className="font-bold">Error rendering Edit Modal</h3>
                  <p className="text-sm mt-2">{err.toString()}</p>
                  <button
                    onClick={() => setIsEditEventModalOpen(false)}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
                  >
                    Close
                  </button>
                </div>
              );
            }
          })()}
      </Modal>

      {/* Event Report Modal */}
      {reportEventId && (
        <div className="fixed inset-0 bg-paa-navy/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-y-auto">
            <div className="p-8 border-b border-paa-navy/5 flex justify-between items-center bg-[#f8fafc]">
              <div>
                <h2 className="text-2xl font-serif text-paa-navy">
                  Event Settlement Report
                </h2>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mt-1">
                  Full breakdown of all author sales and revenue.
                </p>
              </div>
              <div className="flex gap-4 items-center">
                <button
                  onClick={async () => {
                    if (!eventReportData || !eventReportData.authors) return;
                    const ExcelJS = (await import("exceljs")).default;
                    const { saveAs } = await import("file-saver");
                    const uniqueDates = eventReportData.uniqueDates || [];

                    const workbook = new ExcelJS.Workbook();
                    const sheet = workbook.addWorksheet(
                      "Event Settlement Report",
                    );

                    const baseHeaders = [
                      "Author Name",
                      "Email",
                      "Phone",
                      "Registration Fee",
                      "Payment Paid",
                      "Transaction ID",
                      "Book Title",
                      "Category",
                      "MRP",
                      "Listed Stock",
                      "Sold Stock",
                      "Available Stock",
                      "Returned Stock",
                      "Revenue",
                    ];
                    const dateHeaders = uniqueDates.map(
                      (d: string, i: number) =>
                        `Day ${i + 1} Sold (${new Date(d).toLocaleDateString()})`,
                    );
                    const allHeaders = [...baseHeaders, ...dateHeaders];

                    sheet.mergeCells(1, 1, 1, allHeaders.length);
                    const titleCell = sheet.getCell(1, 1);
                    titleCell.value = "EVENT SETTLEMENT REPORT";
                    titleCell.font = {
                      name: "Arial",
                      size: 14,
                      bold: true,
                      color: { argb: "FFFFFFFF" },
                    };
                    titleCell.fill = {
                      type: "pattern",
                      pattern: "solid",
                      fgColor: { argb: "FF0B1A2E" },
                    };
                    titleCell.alignment = {
                      horizontal: "center",
                      vertical: "middle",
                    };

                    const headerRow = sheet.addRow(allHeaders);
                    headerRow.eachCell((cell) => {
                      cell.font = { bold: true, color: { argb: "FF000000" } };
                      cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: "FFD4AF37" },
                      };
                      cell.alignment = {
                        horizontal: "center",
                        vertical: "middle",
                      };
                      cell.border = {
                        top: { style: "thin" },
                        bottom: { style: "thin" },
                        left: { style: "thin" },
                        right: { style: "thin" },
                      };
                    });

                    eventReportData.authors.forEach((author: any) => {
                      const expectedFee = author.expectedFee || 0;
                      const amountPaid = author.amountPaid || 0;
                      const txnId = author.transactionId || "";
                      if (author.books && author.books.length > 0) {
                        author.books.forEach((b: any) => {
                          const rowData = [
                            author.name,
                            author.email,
                            author.phone,
                            expectedFee,
                            amountPaid,
                            txnId,
                            b.title,
                            b.category,
                            b.mrp,
                            b.listedStock,
                            b.soldStock,
                            b.availableStock,
                            b.returnedStock,
                            b.revenue,
                          ];
                          uniqueDates.forEach((d: string) => {
                            rowData.push(
                              b.dayWiseSales ? b.dayWiseSales[d] || 0 : 0,
                            );
                          });
                          const addedRow = sheet.addRow(rowData);
                          addedRow.eachCell(
                            (cell) =>
                              (cell.border = {
                                top: { style: "thin" },
                                bottom: { style: "thin" },
                                left: { style: "thin" },
                                right: { style: "thin" },
                              }),
                          );
                        });
                      } else {
                        const rowData = [
                          author.name,
                          author.email,
                          author.phone,
                          expectedFee,
                          amountPaid,
                          txnId,
                          "No Books Listed",
                          "",
                          "",
                          "",
                          "",
                          "",
                          "",
                          "",
                        ];
                        uniqueDates.forEach(() => rowData.push(""));
                        const addedRow = sheet.addRow(rowData);
                        addedRow.eachCell(
                          (cell) =>
                            (cell.border = {
                              top: { style: "thin" },
                              bottom: { style: "thin" },
                              left: { style: "thin" },
                              right: { style: "thin" },
                            }),
                        );
                      }
                    });

                    const buffer = await workbook.xlsx.writeBuffer();
                    const blob = new Blob([buffer], {
                      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    });
                    saveAs(blob, `event_sales_report_${reportEventId}.xlsx`);
                  }}
                  className="bg-paa-navy text-paa-cream px-4 py-2 font-bold text-xs uppercase tracking-widest hover:bg-paa-gold hover:text-paa-navy transition-colors rounded-3xl-2xl shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out"
                >
                  Download Excel Report
                </button>
                <button
                  onClick={() => setReportEventId(null)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X size={24} className="text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 flex-1">
              {pendingReportStatus && (
                <div className="text-center p-8 bg-gray-50 border border-paa-navy/5 rounded-3xl-2xl mb-6">
                  <h3 className="text-2xl font-serif text-paa-navy mb-2">
                    Awaiting Author Settlements
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    The detailed report is partially complete. The following
                    authors have not yet submitted their post-event inventory
                    counts:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center mb-8">
                    {pendingReportStatus.missingAuthors.map((a: any) => (
                      <span
                        key={a.id}
                        className="px-3 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-full border border-red-200"
                      >
                        {a.name}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={handleNotifySettlement}
                    className="bg-paa-navy text-paa-cream px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-paa-gold hover:text-paa-navy transition-colors no-print rounded-full active:scale-95 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out"
                  >
                    Notify Pending Authors
                  </button>
                </div>
              )}
              {eventReportData &&
              Array.isArray(eventReportData) &&
              eventReportData[0]?.isLegacySummary ? (
                <div className="text-center p-8 bg-gray-50 border border-paa-navy/5 rounded-3xl-2xl">
                  <h3 className="text-2xl font-serif text-paa-navy mb-2">
                    Legacy Event Overview
                  </h3>
                  <p className="text-sm text-gray-500 mb-8">
                    Granular transaction records are not available for this
                    archived event.
                  </p>
                  <div className="flex justify-center gap-12">
                    <div className="bg-white p-6 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out border border-gray-100 rounded-3xl-2xl min-w-[150px]">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                        Total Authors
                      </p>
                      <p className="text-4xl font-black text-paa-navy">
                        {eventReportData[0].authorsParticipated || "NA"}
                      </p>
                    </div>
                    <div className="bg-white p-6 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out border border-gray-100 rounded-3xl-2xl min-w-[150px]">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                        Books Sold
                      </p>
                      <p className="text-4xl font-black text-paa-navy">
                        {eventReportData[0].booksSold || "NA"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : eventReportData && eventReportData.status === "live" ? (
                <div className="space-y-8">
                  {/* OVERALL STATS */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white p-4 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out border border-gray-100 rounded-3xl-2xl">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                        Total Revenue
                      </p>
                      <p className="text-2xl font-black text-green-700">
                        ₹{eventReportData.overallStats.totalRevenue.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-white p-4 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out border border-gray-100 rounded-3xl-2xl">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                        Books Sold
                      </p>
                      <p className="text-2xl font-black text-paa-navy">
                        {eventReportData.overallStats.totalBooksSold}
                      </p>
                    </div>
                    <div className="bg-white p-4 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out border border-gray-100 rounded-3xl-2xl">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                        Books Listed
                      </p>
                      <p className="text-2xl font-black text-paa-navy">
                        {eventReportData.overallStats.totalBooksListed}
                      </p>
                    </div>
                    <div className="bg-white p-4 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out border border-gray-100 rounded-3xl-2xl">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                        Authors Registered
                      </p>
                      <p className="text-2xl font-black text-paa-navy">
                        {eventReportData.overallStats.totalAuthorsRegistered}
                      </p>
                    </div>
                  </div>

                  {/* CATEGORY SALES */}
                  <div>
                    <h3 className="text-lg font-serif text-paa-navy mb-3">
                      Sales by Category
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      {Object.entries(eventReportData.categorySales).map(
                        ([cat, stats]: any) => (
                          <div
                            key={cat}
                            className="bg-[#f8fafc] p-3 border border-gray-200 rounded-3xl-2xl flex justify-between items-center"
                          >
                            <span className="font-bold text-xs text-paa-navy">
                              {cat}
                            </span>
                            <div className="text-right">
                              <p className="text-sm font-bold text-green-700">
                                ₹{stats.revenue.toFixed(2)}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                {stats.sold} sold
                              </p>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  {/* AUTHORS DETAIL */}
                  <div>
                    <h3 className="text-lg font-serif text-paa-navy mb-3">
                      Author Sales Breakdown
                    </h3>
                    <div className="space-y-6">
                      {eventReportData.authors.map((author: any) => (
                        <div
                          key={author.id}
                          className="border border-paa-navy/5 rounded-3xl-2xl overflow-hidden"
                        >
                          <div className="bg-[#f0f4f8] p-3 flex justify-between items-center border-b border-paa-navy/5">
                            <div>
                              <p className="font-bold text-paa-navy flex items-center gap-2">
                                {author.name}
                                {author.optInStatus === "Pending Approval" && (
                                  <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-[10px] rounded-full">
                                    Pending
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                {author.email} • {author.phone}
                              </p>
                            </div>
                            <div className="text-right flex gap-6">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                  Total Sold
                                </p>
                                <p className="font-bold text-paa-navy">
                                  {author.totalSold} / {author.totalListed}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                  Revenue
                                </p>
                                <p className="font-bold text-green-700">
                                  ₹{author.totalRevenue.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <table className="w-full text-left text-xs whitespace-nowrap bg-white">
                            <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                              <tr>
                                <th className="px-3 py-2 !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">
                                  Book Title
                                </th>
                                <th className="px-3 py-2 text-center !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">
                                  Listed
                                </th>
                                <th className="px-3 py-2 text-center !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">
                                  Sold
                                </th>
                                <th className="px-3 py-2 text-center !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">
                                  Available
                                </th>
                                <th className="px-3 py-2 text-right !text-[14px] font-bold uppercase tracking-widest !text-indigo-800 !bg-transparent">
                                  Revenue
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {author.books.map((b: any) => (
                                <tr key={b.id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 font-medium">
                                    {b.title}{" "}
                                    <span className="text-[9px] text-gray-400 block">
                                      {b.category}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {b.listedStock}
                                  </td>
                                  <td className="px-3 py-2 text-center font-bold">
                                    {b.soldStock}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {b.availableStock}
                                  </td>
                                  <td className="px-3 py-2 text-right text-green-700 font-bold">
                                    ₹{b.revenue.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                              {author.books.length === 0 && (
                                <tr>
                                  <td
                                    colSpan={5}
                                    className="px-3 py-4 text-center text-gray-400 italic"
                                  >
                                    No books listed
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : Array.isArray(eventReportData) &&
                eventReportData.length === 0 &&
                !pendingReportStatus ? (
                <p className="text-center text-gray-500 italic">
                  No books were listed for this event.
                </p>
              ) : Array.isArray(eventReportData) &&
                eventReportData.length > 0 ? (
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                    <tr>
                      <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        Author
                      </th>
                      <th className="px-4 py-3 font-bold !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        Book Title
                      </th>
                      <th className="px-4 py-3 font-bold text-center !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        Listed
                      </th>
                      <th className="px-4 py-3 font-bold text-center !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        Sold
                      </th>
                      <th className="px-4 py-3 font-bold text-center !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        Returned
                      </th>
                      <th className="px-4 py-3 font-bold text-right !text-[14px] uppercase tracking-widest !text-indigo-800 !bg-transparent">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {eventReportData.map((row: any) => {
                      const price = row?.book?.mrp || 0;
                      const sold = row?.soldStock || 0;
                      const revenue = price * sold;
                      return (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {row?.author?.name || "N/A"}
                          </td>
                          <td className="px-4 py-3 font-medium text-paa-navy">
                            {row?.book?.title || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row?.listedStock || 0}
                          </td>
                          <td className="px-4 py-3 text-center font-bold">
                            {sold}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-500">
                            {row?.returnedStock || 0}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-green-700">
                            ₹{revenue.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : null}
            </div>
            {Array.isArray(eventReportData) &&
              eventReportData.length > 0 &&
              !eventReportData[0]?.isLegacySummary && (
                <div className="p-4 border-t border-paa-navy/5 bg-gray-50 flex justify-between items-center">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    Total Event Revenue:{" "}
                    <span className="text-paa-navy text-sm">
                      ₹
                      {eventReportData
                        .reduce(
                          (sum, r) =>
                            sum + (r?.book?.mrp || 0) * (r?.soldStock || 0),
                          0,
                        )
                        .toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    Total Author Payouts:{" "}
                    <span className="text-green-700 text-sm">
                      ₹
                      {eventReportData
                        .reduce(
                          (sum, r) =>
                            sum + (r?.book?.mrp || 0) * (r?.soldStock || 0),
                          0,
                        )
                        .toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            {eventReportData && eventReportData.status === "live" && (
              <div className="p-4 border-t border-paa-navy/5 bg-gray-50 flex justify-between items-center">
                <div className="text-xs font-bold uppercase tracking-widest text-green-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Live POS Connection Active
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500">
                  Total Author Payouts:{" "}
                  <span className="text-green-700 text-sm">
                    ₹{eventReportData.overallStats.totalRevenue.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {viewingGalleryImage &&
        (() => {
          const galleryImages = selectedGalleryEvent?.galleryEvent?.images
            ? [...selectedGalleryEvent.galleryEvent.images].sort(
                (a: any, b: any) => {
                  if (a.status === "Pending" && b.status !== "Pending")
                    return -1;
                  if (b.status === "Pending" && a.status !== "Pending")
                    return 1;
                  return (
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                  );
                },
              )
            : [];
          const currentIndex = galleryImages.findIndex(
            (img: any) => `${API}${img.url}` === viewingGalleryImage,
          );

          return (
            <div
              className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
              onClick={() => setViewingGalleryImage(null)}
            >
              <button
                className="absolute top-4 right-4 text-white hover:text-gray-300 z-50 p-2"
                onClick={() => setViewingGalleryImage(null)}
              >
                <X className="w-8 h-8 drop-shadow-md" />
              </button>

              {currentIndex > 0 && (
                <button
                  className="absolute left-4 md:left-10 text-white/70 hover:text-white z-50 p-4 bg-black/30 hover:bg-black/50 rounded-full backdrop-blur-md transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingGalleryImage(
                      `${API}${galleryImages[currentIndex - 1].url}`,
                    );
                  }}
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
              )}

              <img
                loading="lazy"
                src={viewingGalleryImage}
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl transition-transform"
                alt="Gallery Fullscreen"
                onClick={(e) => e.stopPropagation()}
              />

              {currentIndex !== -1 &&
                currentIndex < galleryImages.length - 1 && (
                  <button
                    className="absolute right-4 md:right-10 text-white/70 hover:text-white z-50 p-4 bg-black/30 hover:bg-black/50 rounded-full backdrop-blur-md transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingGalleryImage(
                        `${API}${galleryImages[currentIndex + 1].url}`,
                      );
                    }}
                  >
                    <ChevronRight className="w-8 h-8" />
                  </button>
                )}
            </div>
          );
        })()}

      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title="Create New Form"
      >
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            escapeDeactivates: true,
            clickOutsideDeactivates: true,
          }}
        >
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const target = e.target as any;
              setLoadingAction("createForm");
              const title = target.formTitle.value;
              const type = target.formType.value;
              const description = target.formDescription.value;
              const fieldsJson = target.formFields.value;
              let fields = [];
              try {
                fields = JSON.parse(fieldsJson || "[]");
              } catch (e) {
                alert(
                  "Invalid fields JSON. Please provide a valid JSON array.",
                );
                return;
              }
              try {
                await axios.post(
                  `${API}/api/admin/forms`,
                  { title, type, description, fields },
                  {
                    headers: {
                      Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                  },
                );
                fetchForms();
                setIsFormModalOpen(false);
              } catch (err) {
                alert("Error creating form");
              } finally {
                setLoadingAction(null);
              }
            }}
          >
            <div>
              <label className="block text-xs font-bold text-paa-navy mb-1 uppercase">
                Form Title
              </label>
              <input
                name="formTitle"
                required
                className="w-full p-2 border border-paa-navy/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-paa-navy mb-1 uppercase">
                Category / Type
              </label>
              <select
                name="formType"
                required
                className="w-full p-2 border border-paa-navy/20 bg-white"
              >
                <option value="Literary Events">Literary Events</option>
                <option value="Book Fairs">Book Fairs</option>
                <option value="Flybraries & Libraries">Flybraries & Libraries</option>
                <option value="Book CafÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©">
                  Book CafÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©
                </option>
              </select>
            </div>
            <div>
              <label className="dash-label">Description (Optional)</label>
              <textarea
                name="formDescription"
                className="dash-input"
                rows={2}
              ></textarea>
            </div>
            <div>
              <label className="dash-label">Fields Config (JSON array)</label>
              <textarea
                name="formFields"
                required
                className="dash-input font-mono"
                rows={6}
                placeholder={`[{"label": "Name", "type": "text", "required": true}]`}
              ></textarea>
            </div>
            <button
              type="submit"
              disabled={loadingAction === "createForm"}
              className="dash-btn dash-btn-primary w-full justify-center py-3"
            >
              {loadingAction === "createForm" ? "Creating..." : "Create Form"}
            </button>
          </form>
        </FocusTrap>
      </Modal>

      <Modal
        isOpen={isGalleryModalOpen}
        onClose={() => setIsGalleryModalOpen(false)}
        title="Add Gallery Event"
      >
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            escapeDeactivates: true,
            clickOutsideDeactivates: true,
          }}
        >
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const target = e.target as any;
              const file = target.photo.files[0];
              if (!file) {
                alert("Photo is required");
                return;
              }
              const fd = new FormData();
              setLoadingAction("addGalleryEvent");
              fd.append("photo", file);
              fd.append("location", target.loc.value);
              fd.append("place", target.place.value);
              fd.append("city", target.city.value);
              fd.append("type", target.type.value);
              fd.append("date", target.date.value);
              fd.append("description", target.description.value);
              fd.append("duration", target.duration.value || "1 Day");
              fd.append("authors", target.authors.value || "0");
              fd.append("booksSold", target.booksSold.value || "0");

              try {
                await axios.post(`${API}/api/admin/gallery`, fd, {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                  },
                });
                fetchGallery();
                setIsGalleryModalOpen(false);
              } catch (err) {
                alert("Error adding gallery event");
              } finally {
                setLoadingAction(null);
              }
            }}
          >
            <div className="mb-4 bg-gray-50 p-4 border border-paa-navy/10 rounded-xl">
              <label className="dash-label text-paa-navy font-bold">
                Auto-fill from Past Event (Optional)
              </label>
              <select
                className="dash-input"
                onChange={(e) => {
                  if (!e.target.value) return;
                  const evt = events.find(
                    (ev: any) => ev.id.toString() === e.target.value,
                  );
                  if (evt) {
                    const form = e.target.closest("form");
                    if (form) {
                      if (form.loc) form.loc.value = evt.name || "";
                      if (form.place) form.place.value = evt.location || "";
                      if (form.description)
                        form.description.value =
                          evt.description || evt.name || "";
                      if (form.duration)
                        form.duration.value = evt.duration || "";
                      if (evt.date && form.date) {
                        try {
                          form.date.value = new Date(evt.date)
                            .toISOString()
                            .split("T")[0];
                        } catch (e) {}
                      }
                    }
                  }
                }}
              >
                <option value="">-- Select a Past Event --</option>
                {events
                  .filter((ev: any) => ev.status === "Past")
                  .map((ev: any) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} ({ev.date})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="dash-label">Event Title / Location</label>
              <input name="loc" required className="dash-input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="dash-label">Place</label>
                <input name="place" required className="dash-input" />
              </div>
              <div>
                <label className="dash-label">City</label>
                <input name="city" required className="dash-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="dash-label">Date</label>
                <input
                  type="date"
                  name="date"
                  required
                  className="dash-input"
                />
              </div>
              <div>
                <label className="dash-label">Type</label>
                <select name="type" required className="dash-input">
                  <option value="Literary Event">Literary Event</option>
                  <option value="Book Fair">Book Fair</option>
                  <option value="Corporate Activation">
                    Corporate Activation
                  </option>
                  <option value="Airport Library">Airport Library</option>
                  <option value="Public Library">Public Library</option>
                  <option value="Institutional Library">Institutional Library</option>
                  <option value="Military Library">Military Library</option>
                  <option value="Café Library">Café Library</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="dash-label">Duration</label>
                <input
                  name="duration"
                  placeholder="e.g. 2 Days"
                  className="dash-input"
                />
              </div>
              <div>
                <label className="dash-label">Authors</label>
                <input
                  type="number"
                  name="authors"
                  placeholder="Count"
                  className="dash-input"
                />
              </div>
              <div>
                <label className="dash-label">Books Sold</label>
                <input
                  type="number"
                  name="booksSold"
                  placeholder="Count"
                  className="dash-input"
                />
              </div>
            </div>
            <div>
              <label className="dash-label">Description</label>
              <textarea
                name="description"
                required
                className="dash-input"
                rows={2}
              ></textarea>
            </div>
            <div>
              <label className="dash-label">Photo</label>
              <input
                type="file"
                accept="image/*"
                name="photo"
                required
                className="dash-input"
              />
            </div>
            <button
              type="submit"
              disabled={loadingAction === "addGalleryEvent"}
              className="dash-btn dash-btn-primary w-full justify-center py-3"
            >
              {loadingAction === "addGalleryEvent"
                ? "Adding..."
                : "Add Gallery Event"}
            </button>
          </form>
        </FocusTrap>
      </Modal>

      <Modal
        isOpen={isEditGalleryModalOpen}
        onClose={() => setIsEditGalleryModalOpen(false)}
        title="Edit Gallery Event"
      >
        {editingGalleryEvent && (
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              escapeDeactivates: true,
              clickOutsideDeactivates: true,
            }}
          >
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const target = e.target as any;
                setLoadingAction("editGalleryEvent");
                const fd = new FormData();
                if (target.photo.files[0]) {
                  fd.append("photo", target.photo.files[0]);
                }
                fd.append("location", target.loc.value);
                fd.append("place", target.place.value);
                fd.append("city", target.city.value);
                fd.append("type", target.type.value);
                fd.append("date", target.date.value);
                fd.append("description", target.description.value);
                fd.append("duration", target.duration.value);
                fd.append("authors", target.authors.value);
                fd.append("booksSold", target.booksSold.value);

                try {
                  await axios.put(
                    `${API}/api/admin/gallery/${editingGalleryEvent.id}`,
                    fd,
                    {
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                      },
                    },
                  );
                  toast.success("Gallery event updated!");
                  fetchGallery();
                  setIsEditGalleryModalOpen(false);
                } catch (err) {
                  toast.error("Error updating gallery event");
                } finally {
                  setLoadingAction(null);
                }
              }}
            >
              <div>
                <label className="dash-label">Event Title / Location</label>
                <input
                  name="loc"
                  defaultValue={editingGalleryEvent.location}
                  required
                  className="dash-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="dash-label">Place</label>
                  <input
                    name="place"
                    defaultValue={editingGalleryEvent.place}
                    required
                    className="dash-input"
                  />
                </div>
                <div>
                  <label className="dash-label">City</label>
                  <input
                    name="city"
                    defaultValue={editingGalleryEvent.city}
                    required
                    className="dash-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="dash-label">Date</label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={editingGalleryEvent.date.split("T")[0]}
                    required
                    className="dash-input"
                  />
                </div>
                <div>
                  <label className="dash-label">Type</label>
                  <select
                    name="type"
                    defaultValue={editingGalleryEvent.type}
                    required
                    className="dash-input"
                  >
                    <option value="Literary Event">Literary Event</option>
                    <option value="Book Fair">Book Fair</option>
                    <option value="Corporate Activation">
                      Corporate Activation
                    </option>
                    <option value="Airport Library">Airport Library</option>
                    <option value="Public Library">Public Library</option>
                    <option value="Institutional Library">Institutional Library</option>
                    <option value="Military Library">Military Library</option>
                    <option value="Café Library">Café Library</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="dash-label">Duration</label>
                  <input
                    name="duration"
                    defaultValue={editingGalleryEvent.duration}
                    placeholder="e.g. 2 Days"
                    className="dash-input"
                  />
                </div>
                <div>
                  <label className="dash-label">Authors</label>
                  <input
                    type="number"
                    name="authors"
                    defaultValue={editingGalleryEvent.authors}
                    placeholder="Count"
                    className="dash-input"
                  />
                </div>
                <div>
                  <label className="dash-label">Books Sold</label>
                  <input
                    type="number"
                    name="booksSold"
                    defaultValue={editingGalleryEvent.booksSold}
                    placeholder="Count"
                    className="dash-input"
                  />
                </div>
              </div>
              <div>
                <label className="dash-label">Description</label>
                <textarea
                  name="description"
                  defaultValue={editingGalleryEvent.description}
                  required
                  className="dash-input"
                  rows={2}
                ></textarea>
              </div>
              <div>
                <label className="dash-label">
                  Update Cover Photo (Optional)
                </label>
                <input
                  type="file"
                  name="photo"
                  accept="image/*"
                  className="dash-input"
                />
              </div>
              <button
                type="submit"
                disabled={loadingAction === "editGalleryEvent"}
                className="dash-btn dash-btn-primary w-full justify-center py-3"
              >
                {loadingAction === "editGalleryEvent"
                  ? "Updating..."
                  : "Save Changes"}
              </button>
            </form>
          </FocusTrap>
        )}
      </Modal>

      <Modal
        isOpen={isEditBookModalOpen}
        onClose={() => {
          setIsEditBookModalOpen(false);
          setEditingBook(null);
        }}
        title="Edit Book Details"
      >
        {editingBook && (
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              escapeDeactivates: true,
              clickOutsideDeactivates: true,
            }}
          >
            <form className="space-y-4" onSubmit={handleUpdateBook}>
              <div>
                <label className="dash-label">Title</label>
                <input
                  required
                  type="text"
                  value={editingBook.title || ""}
                  onChange={(e) =>
                    setEditingBook({ ...editingBook, title: e.target.value })
                  }
                  className="dash-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="dash-label">Genre</label>
                  <select
                    value={editingBook.genre || ""}
                    onChange={(e) =>
                      setEditingBook({ ...editingBook, genre: e.target.value })
                    }
                    className="dash-input"
                  >
                    <option value="Fiction">Fiction</option>
                    <option value="Non-Fiction">Non-Fiction</option>
                    <option value="Children's corner">Children's corner</option>
                  </select>
                </div>
                <div>
                  <label className="dash-label">Subgenre</label>
                  <input
                    type="text"
                    value={editingBook.subGenre || ""}
                    onChange={(e) =>
                      setEditingBook({
                        ...editingBook,
                        subGenre: e.target.value,
                      })
                    }
                    className="dash-input"
                    placeholder="e.g. Thriller, Biography"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="dash-label">MRP (Price in ₹)</label>
                  <input
                    required
                    type="number"
                    step="any"
                    value={editingBook.mrp || ""}
                    onChange={(e) =>
                      setEditingBook({ ...editingBook, mrp: e.target.value })
                    }
                    className="dash-input"
                  />
                </div>
                <div>
                  <label className="dash-label">Stock</label>
                  <input
                    required
                    type="number"
                    value={editingBook.stock || ""}
                    onChange={(e) =>
                      setEditingBook({ ...editingBook, stock: e.target.value })
                    }
                    className="dash-input"
                  />
                </div>
              </div>
              <div>
                <label className="dash-label">Synopsis</label>
                <textarea
                  value={editingBook.synopsis || ""}
                  onChange={(e) =>
                    setEditingBook({ ...editingBook, synopsis: e.target.value })
                  }
                  className="dash-input"
                  rows={4}
                ></textarea>
              </div>
              <button
                type="submit"
                disabled={loadingAction === "updateBook"}
                className="dash-btn dash-btn-primary w-full justify-center py-3"
              >
                {loadingAction === "updateBook"
                  ? "Updating..."
                  : "Save Changes"}
              </button>
            </form>
          </FocusTrap>
        )}
      </Modal>

      {/* Reject Author Modal */}
      {rejectAuthorTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-paa-navy/60 p-4 backdrop-blur-sm">
          <div className="bg-white border border-paa-navy/5 shadow-xl w-full max-w-lg">
            <div className="bg-[#d9534f] p-4 font-bold text-xs tracking-widest uppercase flex justify-between items-center border-b border-paa-navy/5 text-white">
              Reject Author: {rejectAuthorTarget.name}
              <button
                type="button"
                onClick={() => setRejectAuthorTarget(null)}
                className="hover:opacity-70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-paa-navy mb-4">
                Select rejection reason(s):
              </p>
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto bg-gray-50 p-3 border border-paa-navy/5">
                {AUTHOR_REJECTION_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className="flex items-start gap-3 cursor-pointer text-sm font-medium text-paa-navy hover:text-paa-gold"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-paa-navy"
                      checked={rejectReasons.includes(reason)}
                      onChange={(e) => {
                        if (e.target.checked)
                          setRejectReasons([...rejectReasons, reason]);
                        else
                          setRejectReasons(
                            rejectReasons.filter((r) => r !== reason),
                          );
                      }}
                    />
                    {reason}
                  </label>
                ))}
              </div>
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-2">
                  Other (specify):
                </label>
                <input
                  type="text"
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder="Enter additional reason..."
                  className="w-full border border-paa-navy/20 p-2 text-sm outline-none focus:border-paa-navy"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setRejectAuthorTarget(null)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-paa-navy font-bold uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectAuthorSubmit}
                  disabled={loadingAction === "rejectAuthor"}
                  className="px-6 py-2 bg-[#d9534f] hover:bg-[#c9302c] text-white text-xs font-bold uppercase tracking-widest shadow transition-colors disabled:opacity-50 rounded-full active:scale-95 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out"
                >
                  {loadingAction === "rejectAuthor"
                    ? "Rejecting..."
                    : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Book Modal */}
      {rejectBookTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-paa-navy/60 p-4 backdrop-blur-sm">
          <div className="bg-white border border-paa-navy/5 shadow-xl w-full max-w-lg">
            <div className="bg-[#d9534f] p-4 font-bold text-xs tracking-widest uppercase flex justify-between items-center border-b border-paa-navy/5 text-white">
              Reject Book: {rejectBookTarget.title}
              <button
                type="button"
                onClick={() => setRejectBookTarget(null)}
                className="hover:opacity-70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-paa-navy mb-4">
                Select rejection reason(s):
              </p>
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto bg-gray-50 p-3 border border-paa-navy/5">
                {BOOK_REJECTION_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className="flex items-start gap-3 cursor-pointer text-sm font-medium text-paa-navy hover:text-paa-gold"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-paa-navy"
                      checked={rejectBookReasons.includes(reason)}
                      onChange={(e) => {
                        if (e.target.checked)
                          setRejectBookReasons([...rejectBookReasons, reason]);
                        else
                          setRejectBookReasons(
                            rejectBookReasons.filter((r) => r !== reason),
                          );
                      }}
                    />
                    {reason}
                  </label>
                ))}
              </div>
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-2">
                  Other (specify):
                </label>
                <input
                  type="text"
                  value={otherBookReason}
                  onChange={(e) => setOtherBookReason(e.target.value)}
                  placeholder="Enter additional reason..."
                  className="w-full border border-paa-navy/20 p-2 text-sm outline-none focus:border-paa-navy"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setRejectBookTarget(null)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-paa-navy font-bold uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectBookSubmit}
                  disabled={
                    loadingAction === `rejectBook_${rejectBookTarget.id}`
                  }
                  className="px-6 py-2 bg-[#d9534f] hover:bg-[#c9302c] text-white text-xs font-bold uppercase tracking-widest shadow transition-colors disabled:opacity-50 rounded-full active:scale-95 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out"
                >
                  {loadingAction === `rejectBook_${rejectBookTarget.id}`
                    ? "Rejecting..."
                    : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Author Modal */}
      {(() => {
        const isFieldEdited = (fieldName: string) => {
          if (!editingAuthor) return false;
          let ed = editingAuthor.extraData;
          if (typeof ed === "string") {
            try {
              ed = JSON.parse(ed);
            } catch (e) {
              ed = {};
            }
          }
          return (
            ed &&
            Array.isArray(ed.editedProfileFields) &&
            ed.editedProfileFields.includes(fieldName)
          );
        };
        const getFieldClass = (
          fieldName: string,
          baseClass: string = "dash-input",
        ) => {
          return isFieldEdited(fieldName)
            ? `${baseClass} !border-orange-400 !bg-orange-50`
            : baseClass;
        };
        const renderOriginalValue = (fieldName: string) => {
          if (!isFieldEdited(fieldName)) return null;
          let ed = editingAuthor.extraData;
          if (typeof ed === "string") {
            try {
              ed = JSON.parse(ed);
            } catch (e) {
              ed = {};
            }
          }
          let orig = ed?.originalProfileData?.[fieldName];
          if (orig === undefined || orig === null) return null;
          if (typeof orig === "object") orig = JSON.stringify(orig);
          return (
            <p className="text-[10px] text-red-500 font-bold mt-1">
              Previous: {String(orig)}
            </p>
          );
        };

        return (
          isEditAuthorModalOpen &&
          editingAuthor && (
            <div
              className="dash-modal-backdrop"
              onClick={(e) =>
                e.target === e.currentTarget && setIsEditAuthorModalOpen(false)
              }
            >
              <div className="dash-modal !max-w-6xl !w-[95vw] h-[90vh] flex flex-col p-0">
                <div className="dash-modal-header flex-none px-6 py-4 border-b border-gray-100 bg-white">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-paa-navy">
                    Edit Author Profile
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditAuthorModalOpen(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/6 text-paa-gray-text hover:text-paa-navy transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="dash-modal-body flex-1 overflow-hidden p-0 flex flex-col md:flex-row bg-white">
                  <div className="w-full md:w-1/2 p-6 overflow-y-auto border-r border-gray-100">
                    <FocusTrap
                      focusTrapOptions={{
                        initialFocus: false,
                        escapeDeactivates: true,
                        clickOutsideDeactivates: true,
                      }}
                    >
                      <form className="space-y-4" onSubmit={handleUpdateAuthor}>
                        <div>
                          <label className="dash-label">Full Name</label>
                          <input
                            required
                            type="text"
                            value={editingAuthor.name || ""}
                            onChange={(e) =>
                              setEditingAuthor({
                                ...editingAuthor,
                                name: e.target.value,
                              })
                            }
                            className={getFieldClass("name")}
                          />{" "}
                          {renderOriginalValue("name")}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="dash-label">Phone</label>
                            <input
                              type="text"
                              value={editingAuthor.phone || ""}
                              onChange={(e) =>
                                setEditingAuthor({
                                  ...editingAuthor,
                                  phone: e.target.value,
                                })
                              }
                              className={getFieldClass("phone")}
                            />{" "}
                            {renderOriginalValue("phone")}
                          </div>
                          <div>
                            <label className="dash-label">WhatsApp</label>
                            <input
                              type="text"
                              value={editingAuthor.whatsapp || ""}
                              onChange={(e) =>
                                setEditingAuthor({
                                  ...editingAuthor,
                                  whatsapp: e.target.value,
                                })
                              }
                              className={getFieldClass("whatsapp")}
                            />{" "}
                            {renderOriginalValue("whatsapp")}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="dash-label">Pen Name</label>
                            <input
                              type="text"
                              value={editingAuthor.penName || ""}
                              onChange={(e) =>
                                setEditingAuthor({
                                  ...editingAuthor,
                                  penName: e.target.value,
                                })
                              }
                              className={getFieldClass("penName")}
                            />{" "}
                            {renderOriginalValue("penName")}
                          </div>
                          <div>
                            <label className="dash-label">
                              Aadhar/Voter ID/DL
                            </label>
                            <input
                              type="text"
                              value={editingAuthor.aadharNumber || ""}
                              onChange={(e) =>
                                setEditingAuthor({
                                  ...editingAuthor,
                                  aadharNumber: e.target.value,
                                })
                              }
                              className={getFieldClass("aadharNumber")}
                            />{" "}
                            {renderOriginalValue("aadharNumber")}
                          </div>
                          <div>
                            <label className="dash-label">City</label>
                            <input
                              type="text"
                              value={editingAuthor.city || ""}
                              onChange={(e) =>
                                setEditingAuthor({
                                  ...editingAuthor,
                                  city: e.target.value,
                                })
                              }
                              className={getFieldClass("city")}
                            />{" "}
                            {renderOriginalValue("city")}
                          </div>
                          <div>
                            <label className="dash-label">State</label>
                            <input
                              type="text"
                              value={editingAuthor.state || ""}
                              onChange={(e) =>
                                setEditingAuthor({
                                  ...editingAuthor,
                                  state: e.target.value,
                                })
                              }
                              className={getFieldClass("state")}
                            />{" "}
                            {renderOriginalValue("state")}
                          </div>
                          <div>
                            <label className="dash-label">Instagram</label>
                            <input
                              type="text"
                              value={editingAuthor.instagram || ""}
                              onChange={(e) =>
                                setEditingAuthor({
                                  ...editingAuthor,
                                  instagram: e.target.value,
                                })
                              }
                              className={getFieldClass("instagram")}
                            />{" "}
                            {renderOriginalValue("instagram")}
                          </div>
                          <div>
                            <label className="dash-label">Facebook</label>
                            <input
                              type="text"
                              value={editingAuthor.facebook || ""}
                              onChange={(e) =>
                                setEditingAuthor({
                                  ...editingAuthor,
                                  facebook: e.target.value,
                                })
                              }
                              className={getFieldClass("facebook")}
                            />{" "}
                            {renderOriginalValue("facebook")}
                          </div>
                        </div>
                        <div>
                          <label className="dash-label">Address</label>
                          <textarea
                            value={editingAuthor.address || ""}
                            onChange={(e) =>
                              setEditingAuthor({
                                ...editingAuthor,
                                address: e.target.value,
                              })
                            }
                            className={getFieldClass("address")}
                            rows={2}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="dash-label">Date of Birth</label>
                            <input
                              type="date"
                              value={editingAuthor.age || ""}
                              onChange={(e) =>
                                setEditingAuthor({
                                  ...editingAuthor,
                                  age: e.target.value,
                                })
                              }
                              className={getFieldClass("age")}
                            />{" "}
                            {renderOriginalValue("age")}
                          </div>
                          <div>
                            <label className="dash-label">Experience</label>
                            <input
                              type="text"
                              value={editingAuthor.experience || ""}
                              onChange={(e) =>
                                setEditingAuthor({
                                  ...editingAuthor,
                                  experience: e.target.value,
                                })
                              }
                              className={getFieldClass("experience")}
                            />{" "}
                            {renderOriginalValue("experience")}
                          </div>
                          <div>
                            <label className="dash-label">Skills</label>
                            <input
                              type="text"
                              value={editingAuthor.skills || ""}
                              onChange={(e) =>
                                setEditingAuthor({
                                  ...editingAuthor,
                                  skills: e.target.value,
                                })
                              }
                              className={getFieldClass("skills")}
                            />{" "}
                            {renderOriginalValue("skills")}
                          </div>
                          <div>
                            <label className="dash-label">Hobbies</label>
                            <input
                              type="text"
                              value={editingAuthor.hobbies || ""}
                              onChange={(e) =>
                                setEditingAuthor({
                                  ...editingAuthor,
                                  hobbies: e.target.value,
                                })
                              }
                              className={getFieldClass("hobbies")}
                            />{" "}
                            {renderOriginalValue("hobbies")}
                          </div>
                          <div>
                            <label className="dash-label">Group Joining Date</label>
                            <input
                              type="date"
                              value={(() => {
                                if (!editingAuthor.groupJoiningDate) return "";
                                try {
                                  const d = new Date(editingAuthor.groupJoiningDate);
                                  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
                                } catch (e) {
                                  return "";
                                }
                              })()}
                              onChange={(e) => {
                                let val = null;
                                if (e.target.value) {
                                  try {
                                    val = new Date(e.target.value).toISOString();
                                  } catch (err) {}
                                }
                                setEditingAuthor({
                                  ...editingAuthor,
                                  groupJoiningDate: val,
                                });
                              }}
                              className={getFieldClass("groupJoiningDate")}
                            />{" "}
                            {renderOriginalValue("groupJoiningDate")}
                          </div>
                        </div>
                        <div>
                          <label className="dash-label">Qualifications</label>
                          {(() => {
                            let qArr = [];
                            try {
                              qArr = JSON.parse(
                                editingAuthor.qualification || "[]",
                              );
                            } catch (e) {}
                            if (!Array.isArray(qArr))
                              qArr = [
                                { qualification: editingAuthor.qualification },
                              ];

                            return qArr.map((q: any, i: number) => (
                              <div
                                key={i}
                                className="grid grid-cols-3 gap-2 mb-2 bg-gray-50 p-2 rounded border border-gray-100 relative group"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newQ = qArr.filter(
                                      (_, idx) => idx !== i,
                                    );
                                    setEditingAuthor({
                                      ...editingAuthor,
                                      qualification: JSON.stringify(newQ),
                                    });
                                  }}
                                  className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full border border-red-200 w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                                <div>
                                  <span className="text-[10px] uppercase text-gray-500 font-bold block mb-1">
                                    Degree Level
                                  </span>
                                  <select
                                    value={q.level || ""}
                                    onChange={(e) => {
                                      const newQ = [...qArr];
                                      newQ[i].level = e.target.value;
                                      setEditingAuthor({
                                        ...editingAuthor,
                                        qualification: JSON.stringify(newQ),
                                      });
                                    }}
                                    className={getFieldClass(
                                      "qualification",
                                      "dash-input w-full text-xs",
                                    )}
                                  >
                                    <option value="">Select Degree Level</option>
                                    <option value="Graduation">Graduation</option>
                                    <option value="Post-Graduation">Post-Graduation</option>
                                    <option value="Ph.D">Ph.D</option>
                                    <option value="Diploma">Diploma</option>
                                    <option value="Other">Other</option>
                                  </select>
                                  <span className="text-[10px] uppercase text-gray-500 font-bold block mt-2 mb-1">
                                    Degree
                                  </span>
                                  <input
                                    type="text"
                                    value={q.qualification || ""}
                                    onChange={(e) => {
                                      const newQ = [...qArr];
                                      newQ[i].qualification = e.target.value;
                                      setEditingAuthor({
                                        ...editingAuthor,
                                        qualification: JSON.stringify(newQ),
                                      });
                                    }}
                                    className={getFieldClass(
                                      "qualification",
                                      "dash-input w-full text-xs",
                                    )}
                                  />
                                  {renderOriginalValue("qualification")}
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase text-gray-500 font-bold block mb-1">
                                    Mode
                                  </span>
                                  <select
                                    value={q.mode || ""}
                                    onChange={(e) => {
                                      const newQ = [...qArr];
                                      newQ[i].mode = e.target.value;
                                      setEditingAuthor({
                                        ...editingAuthor,
                                        qualification: JSON.stringify(newQ),
                                      });
                                    }}
                                    className={getFieldClass(
                                      "qualification",
                                      "dash-input w-full text-xs",
                                    )}
                                  >
                                    <option value="">Select Mode</option>
                                    <option value="Full-time">Full-time</option>
                                    <option value="Part-time">Part-time</option>
                                    <option value="Correspondence">Correspondence</option>
                                    <option value="Online">Online</option>
                                    <option value="Distance">Distance</option>
                                  </select>
                                  <span className="text-[10px] uppercase text-gray-500 font-bold block mb-1">
                                    Institution
                                  </span>
                                  <input
                                    type="text"
                                    value={q.institution || ""}
                                    onChange={(e) => {
                                      const newQ = [...qArr];
                                      newQ[i].institution = e.target.value;
                                      setEditingAuthor({
                                        ...editingAuthor,
                                        qualification: JSON.stringify(newQ),
                                      });
                                    }}
                                    className={getFieldClass(
                                      "qualification",
                                      "dash-input w-full text-xs",
                                    )}
                                  />{" "}
                                  {renderOriginalValue("qualification")}
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase text-gray-500 font-bold block mb-1">
                                    Subject
                                  </span>
                                  <input
                                    type="text"
                                    value={q.subject || ""}
                                    onChange={(e) => {
                                      const newQ = [...qArr];
                                      newQ[i].subject = e.target.value;
                                      setEditingAuthor({
                                        ...editingAuthor,
                                        qualification: JSON.stringify(newQ),
                                      });
                                    }}
                                    className={getFieldClass(
                                      "qualification",
                                      "dash-input w-full text-xs",
                                    )}
                                  />{" "}
                                  {renderOriginalValue("qualification")}
                                </div>
                              </div>
                            ));
                          })()}
                          <button
                            type="button"
                            onClick={() => {
                              let qArr = [];
                              try {
                                qArr = JSON.parse(
                                  editingAuthor.qualification || "[]",
                                );
                              } catch (e) {}
                              if (!Array.isArray(qArr)) qArr = [];
                              qArr.push({
                                id: Date.now(),
                                qualification: "",
                                institution: "",
                                subject: "",
                                mode: "",
                              });
                              setEditingAuthor({
                                ...editingAuthor,
                                qualification: JSON.stringify(qArr),
                              });
                            }}
                            className="text-[10px] font-bold text-paa-navy mt-1 uppercase tracking-widest hover:text-paa-gold"
                          >
                            + Add Qualification
                          </button>
                        </div>
                        <div>
                          <label className="dash-label">
                            Why Joining? (If traditionally published)
                          </label>
                          <textarea
                            value={editingAuthor.whyJoining || ""}
                            onChange={(e) =>
                              setEditingAuthor({
                                ...editingAuthor,
                                whyJoining: e.target.value,
                              })
                            }
                            className="dash-input"
                            rows={2}
                          />
                        </div>
                        <div>
                          <label className="dash-label">Author Bio</label>
                          <textarea
                            required
                            value={editingAuthor.bio || ""}
                            onChange={(e) =>
                              setEditingAuthor({
                                ...editingAuthor,
                                bio: e.target.value,
                              })
                            }
                            className={getFieldClass("bio")}
                            rows={5}
                          />{" "}
                          {renderOriginalValue("bio")}
                        </div>
                      </form>
                    </FocusTrap>
                  </div>
                  <div className="w-full md:w-1/2 p-6 overflow-y-auto bg-gray-50">
                    <h4 className="text-lg font-serif font-bold text-paa-navy mb-4 border-l-4 border-paa-navy pl-2">
                      Submitted Books Details
                    </h4>
                    {!editingAuthor.books ||
                    editingAuthor.books.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">
                        No books registered by this author.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {editingAuthor.books.map((b: any, bIdx: number) => {
                          const updateBookField = (
                            field: string,
                            value: any,
                          ) => {
                            const newBooks = [...editingAuthor.books];
                            newBooks[bIdx] = {
                              ...newBooks[bIdx],
                              [field]: value,
                            };
                            setEditingAuthor({
                              ...editingAuthor,
                              books: newBooks,
                            });
                          };
                          return (
                            <div
                              key={b.id || bIdx}
                              className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4"
                            >
                              <div className="flex gap-4">
                                {b.coverUrl && (
                                  <img
                                    loading="lazy"
                                    src={
                                      (import.meta.env.VITE_API_URL || "http://localhost:3001") + 
                                      b.coverUrl + `?t=${lastFetchedBooks}`
                                    }
                                    className="w-16 h-24 object-cover border border-gray-200"
                                    alt="Cover"
                                  />
                                )}
                                <div className="flex-1 space-y-2">
                                  <div>
                                    <label className="text-[10px] uppercase text-gray-400 font-bold block mb-1">
                                      Title
                                    </label>
                                    <input
                                      className="dash-input py-1 text-sm w-full"
                                      value={b.title || ""}
                                      onChange={(e) =>
                                        updateBookField("title", e.target.value)
                                      }
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] uppercase text-gray-400 font-bold block mb-1">
                                      Subtitle
                                    </label>
                                    <input
                                      className="dash-input py-1 text-sm w-full"
                                      value={b.subtitle || ""}
                                      onChange={(e) =>
                                        updateBookField(
                                          "subtitle",
                                          e.target.value,
                                        )
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-y-3 gap-x-4 mt-1">
                                <div>
                                  <label className="text-[10px] uppercase text-gray-400 font-bold block mb-1">
                                    Genre
                                  </label>
                                  <select
                                    className="dash-input py-1 text-xs w-full"
                                    value={b.genre || ""}
                                    onChange={(e) =>
                                      updateBookField("genre", e.target.value)
                                    }
                                  >
                                    <option value="">Select Genre</option>
                                    <option value="Non-Fiction">
                                      Non-Fiction
                                    </option>
                                    <option value="Fiction">Fiction</option>
                                    <option value="Poetry">Poetry</option>
                                    <option value="Children's">
                                      Children's
                                    </option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase text-gray-400 font-bold block mb-1">
                                    Sub Genre
                                  </label>
                                  <input
                                    className="dash-input py-1 text-xs w-full"
                                    value={b.subGenre || ""}
                                    onChange={(e) =>
                                      updateBookField(
                                        "subGenre",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase text-gray-400 font-bold block mb-1">
                                    MRP
                                  </label>
                                  <input
                                    type="number"
                                    className="dash-input py-1 text-xs w-full"
                                    value={b.mrp || ""}
                                    onChange={(e) =>
                                      updateBookField("mrp", e.target.value)
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase text-gray-400 font-bold block mb-1">
                                    Language
                                  </label>
                                  <select
                                    className="dash-input py-1 text-xs w-full"
                                    value={b.language || ""}
                                    onChange={(e) =>
                                      updateBookField(
                                        "language",
                                        e.target.value,
                                      )
                                    }
                                  >
                                    <option value="">Select Language</option>
                                    <option value="ENG">ENG</option>
                                    <option value="MAR">MAR</option>
                                    <option value="HIN">HIN</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase text-gray-400 font-bold block mb-1">
                                    Format
                                  </label>
                                  <select
                                    className="dash-input py-1 text-xs w-full"
                                    value={b.format || ""}
                                    onChange={(e) =>
                                      updateBookField("format", e.target.value)
                                    }
                                  >
                                    <option value="">Select Format</option>
                                    <option value="Paperback">Paperback</option>
                                    <option value="Hardcover">Hardcover</option>
                                    <option value="Ebook">Ebook</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase text-gray-400 font-bold block mb-1">
                                    Print Format
                                  </label>
                                  <select
                                    className="dash-input py-1 text-xs w-full"
                                    value={b.printFormat || ""}
                                    onChange={(e) =>
                                      updateBookField(
                                        "printFormat",
                                        e.target.value,
                                      )
                                    }
                                  >
                                    <option value="">
                                      Select Print Format
                                    </option>
                                    <option value="Black & White">
                                      Black & White
                                    </option>
                                    <option value="Colored">Colored</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase text-gray-400 font-bold block mb-1">
                                    Pages
                                  </label>
                                  <input
                                    type="number"
                                    className="dash-input py-1 text-xs w-full"
                                    value={b.pages || ""}
                                    onChange={(e) =>
                                      updateBookField("pages", e.target.value)
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase text-gray-400 font-bold block mb-1">
                                    Publisher
                                  </label>
                                  <input
                                    className="dash-input py-1 text-xs w-full"
                                    value={b.publisher || ""}
                                    onChange={(e) =>
                                      updateBookField(
                                        "publisher",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase text-gray-400 font-bold block mb-1">
                                    ISBN
                                  </label>
                                  <input
                                    className="dash-input py-1 text-xs w-full"
                                    value={b.isbn || ""}
                                    onChange={(e) =>
                                      updateBookField("isbn", e.target.value)
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase text-gray-400 font-bold block mb-1">
                                    Pub Date
                                  </label>
                                  <input
                                    type="date"
                                    className="dash-input py-1 text-xs w-full"
                                    value={b.publicationDate || ""}
                                    onChange={(e) =>
                                      updateBookField(
                                        "publicationDate",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase text-gray-400 font-bold block mb-1">
                                    Initial Stock
                                  </label>
                                  <input
                                    type="number"
                                    className="dash-input py-1 text-xs w-full"
                                    value={b.stock || ""}
                                    onChange={(e) =>
                                      updateBookField("stock", e.target.value)
                                    }
                                  />
                                </div>
                              </div>
                              <div className="mt-1">
                                <label className="text-[10px] uppercase text-gray-400 font-bold block mb-1">
                                  Synopsis
                                </label>
                                <textarea
                                  className="dash-input py-1 text-xs w-full"
                                  rows={3}
                                  value={b.synopsis || ""}
                                  onChange={(e) =>
                                    updateBookField("synopsis", e.target.value)
                                  }
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-none px-6 py-4 border-t border-gray-200 bg-white rounded-b-2xl flex items-center justify-between gap-4">
                  <p className="text-xs text-gray-400">
                    Changes apply to both author profile and book details
                  </p>
                  <div className="flex gap-2">
                    {(() => {
                      let ed = editingAuthor.extraData;
                      if (typeof ed === "string") {
                        try {
                          ed = JSON.parse(ed);
                        } catch (e) {
                          ed = {};
                        }
                      }
                      if (ed?.hasPendingEdits) {
                        return (
                          <button
                            type="button"
                            onClick={() => handleRejectEdits()}
                            disabled={loadingAction === "rejectEdits"}
                            className="dash-btn px-8 py-2.5 flex-shrink-0 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-bold uppercase tracking-widest rounded-full text-[10px]"
                          >
                            {loadingAction === "rejectEdits"
                              ? "Rejecting..."
                              : "Reject Edits"}
                          </button>
                        );
                      }
                      return null;
                    })()}
                    <button
                      type="button"
                      onClick={() => handleUpdateAuthor()}
                      disabled={loadingAction === "updateAuthor"}
                      className="dash-btn dash-btn-primary px-8 py-2.5 flex-shrink-0"
                    >
                      {loadingAction === "updateAuthor"
                        ? "Updating..."
                        : "Save All Changes"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        );
      })()}
    </div>
  );
}

const HelpdeskTab = ({ refreshTrigger }: any) => {
  const [queries, setQueries] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<
    "All" | "Pending" | "Answered" | "Resolved" | "Message" | "Event Request"
  >("All");
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [isReplying, setIsReplying] = useState<{ [key: string]: boolean }>({});
  const [expandedQueryId, setExpandedQueryId] = useState<
    number | string | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchQueries = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/queries`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      const mappedQueries = res.data
        .map((q: any) => ({
          ...q,
          itemType:
            q.message?.startsWith("[EVENT REQUEST]") ||
            q.subject === "Event Organization Request"
              ? "Event Request"
              : q.subject?.startsWith("Contact Form")
                ? "Message"
                : "Query",
        }))
        .filter((q: any) => q.itemType !== "Event Request");
      setQueries(mappedQueries);
    } catch (e) {
      toast.error("Failed to load queries");
    }
  };

  useEffect(() => {
    fetchQueries();
  }, []);

  const [broadcastTarget, setBroadcastTarget] = useState("ALL");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) return;
    setIsBroadcasting(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/notifications`,
        { message: broadcastMessage, target: broadcastTarget },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      toast.success("Broadcast notification sent!");
      setBroadcastMessage("");
    } catch (e) {
      toast.error("Failed to send broadcast");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const countWords = (text: string) => text ? text.trim().split(/\s+/).filter(Boolean).length : 0;

  const handleReply = async (id: string | number) => {
    if (!replyText[id]) return;
    const wordCount = countWords(replyText[id]);
    if (wordCount > 100) {
      toast.error(`Reply message cannot exceed 100 words per message (Current: ${wordCount} words).`);
      return;
    }
    setIsReplying({ ...isReplying, [id]: true });
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/queries/${id}/reply`,
        { reply: replyText[id] },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      toast.success("Reply sent successfully!");
      setReplyText({ ...replyText, [id]: "" });
      fetchQueries();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to send reply");
    } finally {
      setIsReplying({ ...isReplying, [id]: false });
    }
  };

  const handleResolve = async (id: string | number) => {
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/queries/${id}/resolve`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      toast.success("Query marked as resolved!");
      fetchQueries();
    } catch (err) {
      toast.error("Failed to resolve query");
    }
  };

  const handleDelete = async (id: string | number) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this query? This action cannot be undone.",
      )
    )
      return;
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/queries/${id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      toast.success("Query deleted successfully");
      fetchQueries();
    } catch (err) {
      toast.error("Failed to delete query");
    }
  };

  const filteredQueries = queries.filter((q) => {
    const matchesFilter =
      filterType === "All" ||
      (filterType === "Message" && q.itemType === "Message") ||
      (filterType === "Event Request" && q.itemType === "Event Request") ||
      (filterType === "Pending" &&
        q.itemType === "Query" &&
        q.status === "Pending") ||
      (filterType === "Answered" &&
        q.itemType === "Query" &&
        q.status === "Answered") ||
      (filterType === "Resolved" &&
        q.itemType === "Query" &&
        q.status === "Resolved");

    if (!matchesFilter) return false;

    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase();
      return (
        q.subject?.toLowerCase().includes(lowerQ) ||
        q.author?.name?.toLowerCase().includes(lowerQ) ||
        q.user?.name?.toLowerCase().includes(lowerQ) ||
        q.author?.email?.toLowerCase().includes(lowerQ) ||
        q.user?.email?.toLowerCase().includes(lowerQ)
      );
    }

    return true;
  });

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 border-b border-paa-navy/5 pb-4 gap-4 px-6 sm:px-0">
        <div className="shrink-0">
          <h3 className="text-xl font-serif font-medium text-paa-navy mb-1 flex items-center gap-2">
            <Users className="w-5 h-5" /> Messages / Queries
          </h3>
          <p className="text-paa-gray-text text-sm hidden lg:block">
            Manage author queries and contact inquiries.
          </p>
        </div>
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 w-full lg:w-auto min-w-0 flex-1 justify-start px-6 sm:px-0">
          <div className="relative w-full lg:max-w-xs shrink">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Subject, Name, Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="dash-input w-full !pl-10 rounded-2xl bg-white border-gray-200 focus:border-paa-navy"
            />
          </div>
          <div className="flex flex-wrap bg-gray-100 rounded-2xl p-1 w-full lg:w-auto gap-1">
            {[
              {
                id: "All",
                label: "All",
                color: "bg-gray-800 text-white",
                count: queries.length,
              },
              {
                id: "Pending",
                label: "Unopened",
                color: "bg-orange-100 text-orange-800",
                count: queries.filter(
                  (q) => q.itemType === "Query" && q.status === "Pending",
                ).length,
              },
              {
                id: "Answered",
                label: "Opened",
                color: "bg-[#ebd8c0] text-blue-800",
                count: queries.filter(
                  (q) => q.itemType === "Query" && q.status === "Answered",
                ).length,
              },
              {
                id: "Resolved",
                label: "Closed",
                color: "bg-green-100 text-green-800",
                count: queries.filter(
                  (q) => q.itemType === "Query" && q.status === "Resolved",
                ).length,
              },
              {
                id: "Message",
                label: "Messages",
                color: "bg-gray-800 text-white",
                count: queries.filter((q) => q.itemType === "Message").length,
              },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilterType(t.id as any)}
                className={`px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-all rounded-xl whitespace-nowrap flex-1 sm:flex-none text-center flex items-center justify-center gap-1.5 ${filterType === t.id ? `${t.color} shadow-sm` : "text-gray-500 hover:text-paa-navy"}`}
              >
                {t.label}
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[9px] min-w-[1.25rem] text-center leading-none ${filterType === t.id ? "bg-white/30 text-current" : "bg-gray-200 text-gray-600"}`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchQueries()}
            className="shrink-0 p-2 border border-paa-navy/20 bg-gray-50 hover:bg-gray-100 text-paa-navy shadow-premium hover:shadow-premium-hover transition-all duration-300 ease-out rounded-full active:scale-95 hover:-translate-y-0.5 hidden lg:block"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto w-full pb-4">
        <div className="space-y-4 min-w-[700px]">
          {filteredQueries.length === 0 ? (
            <p className="text-sm text-gray-500 italic text-center py-8">
              No messages or queries found.
            </p>
          ) : (
            filteredQueries.map((q) => (
              <div
                key={q.id}
                className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden transition-all duration-200 group"
              >
                {/* Row Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() =>
                    setExpandedQueryId(expandedQueryId === q.id ? null : q.id)
                  }
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className={`w-1 h-10 rounded-full ${q.itemType === "Event Request" ? "bg-[#d4a017]" : q.itemType === "Message" ? "bg-blue-500" : q.status === "Resolved" ? "bg-green-500" : q.status === "Pending" ? "bg-orange-500" : "bg-blue-500"}`}
                    ></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${q.itemType === "Event Request" ? "bg-[#fffdf5] text-[#d4a017] border border-[#d4a017]" : q.itemType === "Message" ? "bg-[#ebd8c0] text-blue-800" : q.status === "Resolved" ? "bg-green-100 text-green-800" : q.status === "Pending" ? "bg-orange-100 text-orange-800" : "bg-[#ebd8c0] text-blue-800"}`}
                        >
                          {q.itemType}{" "}
                          {q.itemType === "Query"
                            ? `#TKT-${q.id.toString().padStart(4, "0")}`
                            : ""}
                        </span>
                        <h4 className="font-bold text-paa-navy text-sm line-clamp-1">
                          {q.subject}
                        </h4>
                      </div>
                      {q.itemType !== "Message" &&
                        q.itemType !== "Event Request" && (
                          <p className="text-[10px] text-gray-500">
                            From:{" "}
                            <span className="font-bold">
                              {q.author?.name || q.user?.name || "Unknown"}
                            </span>{" "}
                            ({q.author?.email || q.user?.email || "N/A"})
                          </p>
                        )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {q.status !== "Resolved" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolve(q.id);
                        }}
                        className="px-3 py-1 border border-green-200 text-green-700 bg-white hover:bg-green-50 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 transition-colors shadow-sm"
                        title="Mark as Resolved"
                      >
                        <CheckCircle2 size={12} /> Resolve
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(q.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete Query"
                    >
                      <Trash2 size={16} />
                    </button>
                    {q.itemType !== "Message" &&
                      q.itemType !== "Event Request" && (
                        <span
                          className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${q.status === "Resolved" ? "bg-green-100 text-green-800" : q.status === "Pending" ? "bg-orange-100 text-orange-800" : "bg-[#ebd8c0] text-blue-800"}`}
                        >
                          {q.status === "Resolved"
                            ? "Closed"
                            : q.status === "Pending"
                              ? "New"
                              : "Opened"}
                        </span>
                      )}
                    <div className="text-gray-400">
                      <ChevronDown
                        size={20}
                        className={`transform transition-transform duration-300 ${expandedQueryId === q.id ? "rotate-180" : ""}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Expandable Content */}
                {expandedQueryId === q.id && (
                  <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col gap-4">
                    <div className="flex-1">
                      {q.itemType === "Query" ? (
                        <QueryThreadDisplay query={q} currentUserType="Admin" />
                      ) : (
                        <div className="bg-white p-4 rounded-lg border border-gray-100 text-sm text-gray-700 whitespace-pre-wrap mb-4 shadow-sm">
                          {q.message}
                        </div>
                      )}

                      {q.itemType === "Message" && (
                        <p className="text-[10px] text-gray-500 italic mt-2">
                          Reply to this inquiry directly via email to{" "}
                          {q.author?.email || q.user?.email}.
                        </p>
                      )}
                    </div>

                    {q.itemType === "Query" && q.status !== "Resolved" && (
                      <div className="shrink-0 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 bg-white rounded-full border border-gray-200 px-4 py-2 shadow-sm focus-within:border-paa-navy focus-within:ring-1 focus-within:ring-paa-navy/20 transition-all">
                          <input
                            type="text"
                            placeholder="Type reply..."
                            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-400"
                            value={replyText[q.id] || ""}
                            onChange={(e) =>
                              setReplyText({
                                ...replyText,
                                [q.id]: e.target.value,
                              })
                            }
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                replyText[q.id]?.trim() &&
                                !isReplying[q.id]
                              ) {
                                handleReply(q.id);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleReply(q.id)}
                            disabled={
                              isReplying[q.id] || !replyText[q.id]?.trim()
                            }
                            className="p-2 bg-paa-navy text-white rounded-full hover:bg-paa-gold transition-colors disabled:opacity-50 disabled:hover:bg-paa-navy flex shrink-0 items-center justify-center"
                            title="Send Reply"
                          >
                            <Send
                              size={16}
                              className={isReplying[q.id] ? "opacity-50" : ""}
                            />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const parseEventMessage = (messageText: string) => {
  const info = {
    organisation: "N/A",
    proposer: "N/A",
    designation: "N/A",
    type: "N/A",
    category: "N/A",
    audience: "N/A",
    proposedDate: "N/A",
    proposedTime: "N/A",
    location: "N/A",
    phone: "N/A",
    description: "",
  };

  if (!messageText) return info;

  const orgMatch = messageText.match(/Organisation:\s*(.*)/i);
  const propMatch = messageText.match(/Proposer:\s*(.*)/i);
  const desMatch = messageText.match(/Designation:\s*(.*)/i);
  const actMatch = messageText.match(/Event Activities:\s*(.*)/i);
  const fmtMatch = messageText.match(/Format:\s*(.*)/i);
  const typeMatch = messageText.match(/Type:\s*(.*)/i);
  const catMatch = messageText.match(/Category:\s*(.*)/i);
  const audienceMatch = messageText.match(/Audience:\s*(.*)/i);
  const dateMatch = messageText.match(/Date:\s*(.*)/i);
  const timeMatch = messageText.match(/Time:\s*(.*)/i);
  const locMatch = messageText.match(/Location:\s*(.*)/i);
  const phoneMatch = messageText.match(/Phone:\s*(.*)/i);

  if (orgMatch) info.organisation = orgMatch[1].trim();
  if (propMatch) info.proposer = propMatch[1].trim();
  if (desMatch) info.designation = desMatch[1].trim();

  if (actMatch) {
    info.type = actMatch[1].trim();
  } else if (fmtMatch) {
    info.type = fmtMatch[1].trim();
  } else if (typeMatch) {
    info.type = typeMatch[1].trim();
  }

  if (catMatch) info.category = catMatch[1].trim();
  if (audienceMatch) info.audience = audienceMatch[1].trim();
  if (dateMatch) info.proposedDate = dateMatch[1].trim();
  if (timeMatch) info.proposedTime = timeMatch[1].trim();
  if (locMatch) info.location = locMatch[1].trim();
  if (phoneMatch) info.phone = phoneMatch[1].trim();

  const descIdx = messageText.indexOf("Description:");
  if (descIdx !== -1) {
    info.description = messageText
      .substring(descIdx + 12)
      .replace(/\[STATUS:\s*\w+\]/g, "")
      .trim();
  } else {
    info.description = messageText.replace(/\[STATUS:\s*\w+\]/g, "").trim();
  }

  return info;
};

const EventRequestsTab = ({ refreshTrigger }: any) => {
  const [queries, setQueries] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchQueries = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/queries`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      const mappedQueries = res.data
        .map((q: any) => {
          let status = "Pending";
          if (q.message?.includes("[STATUS: Accepted]")) {
            status = "Accepted";
          } else if (q.message?.includes("[STATUS: Rejected]")) {
            status = "Rejected";
          }
          const parsed = parseEventMessage(q.message || "");
          return {
            ...q,
            status,
            parsed,
            itemType:
              q.message?.startsWith("[EVENT REQUEST]") ||
              q.subject === "Event Organization Request"
                ? "Event Request"
                : q.subject?.startsWith("Contact Form")
                  ? "Message"
                  : "Query",
          };
        })
        .filter((q: any) => q.itemType === "Event Request");
      setQueries(mappedQueries);
    } catch (e) {
      toast.error("Failed to load event requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueries();
  }, [refreshTrigger]);

  const handleAccept = async (id: string | number) => {
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/event-requests/${id}/accept`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      toast.success("Event request accepted!");
      fetchQueries();
    } catch (err) {
      toast.error("Failed to accept request");
    }
  };

  const handleReject = async (id: string | number) => {
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/event-requests/${id}/reject`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      toast.success("Event request rejected!");
      fetchQueries();
    } catch (err) {
      toast.error("Failed to reject request");
    }
  };

  const handleDelete = async (id: string | number) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this event request? This action cannot be undone.",
      )
    )
      return;
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/queries/${id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      toast.success("Event request deleted successfully");
      fetchQueries();
    } catch (err) {
      toast.error("Failed to delete request");
    }
  };

  const filteredQueries = queries.filter((q) => {
    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase();
      return (
        q.subject?.toLowerCase().includes(lowerQ) ||
        q.message?.toLowerCase().includes(lowerQ) ||
        q.author?.name?.toLowerCase().includes(lowerQ) ||
        q.user?.name?.toLowerCase().includes(lowerQ) ||
        q.author?.email?.toLowerCase().includes(lowerQ) ||
        q.user?.email?.toLowerCase().includes(lowerQ) ||
        q.parsed?.type?.toLowerCase().includes(lowerQ) ||
        q.parsed?.location?.toLowerCase().includes(lowerQ)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 w-full animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 border-b border-paa-navy/5 pb-4 gap-4">
        <div>
          <h3 className="text-xl font-serif font-medium text-paa-navy mb-1 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-paa-gold" /> Organize Event
          </h3>
          <p className="text-paa-gray-text text-sm">
            Manage and review incoming organizer event requests.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <input
            type="text"
            placeholder="Search event type, organizer, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-3xl-2xl outline-none focus:border-paa-navy w-full sm:w-64"
          />
          <button
            onClick={() => fetchQueries()}
            className="shrink-0 p-2 border border-paa-navy/20 bg-gray-50 hover:bg-gray-100 rounded-3xl-2xl text-paa-navy transition-colors shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-500 ease-out rounded-full active:scale-95 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-5 rounded-2xl shadow-md border border-blue-600/20 flex items-center justify-between text-white hover:scale-[1.02] transition-all duration-300">
          <div>
            <p className="text-xs text-blue-100 uppercase font-bold tracking-wider opacity-90">
              Total Requests
            </p>
            <h4 className="text-3xl font-black mt-1 tracking-tight">
              {queries.length}
            </h4>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-sm shadow-inner">
            <CalendarIcon size={22} />
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-5 rounded-2xl shadow-md border border-amber-600/20 flex items-center justify-between text-white hover:scale-[1.02] transition-all duration-300">
          <div>
            <p className="text-xs text-amber-100 uppercase font-bold tracking-wider opacity-90">
              Pending
            </p>
            <h4 className="text-3xl font-black mt-1 tracking-tight">
              {queries.filter((q) => q.status === "Pending").length}
            </h4>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-sm shadow-inner">
            <Clock size={22} />
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-5 rounded-2xl shadow-md border border-emerald-600/20 flex items-center justify-between text-white hover:scale-[1.02] transition-all duration-300">
          <div>
            <p className="text-xs text-emerald-100 uppercase font-bold tracking-wider opacity-90">
              Accepted
            </p>
            <h4 className="text-3xl font-black mt-1 tracking-tight">
              {queries.filter((q) => q.status === "Accepted").length}
            </h4>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-sm shadow-inner">
            <CheckCircle2 size={22} />
          </div>
        </div>
        <div className="bg-gradient-to-br from-rose-500 to-red-600 p-5 rounded-2xl shadow-md border border-rose-600/20 flex items-center justify-between text-white hover:scale-[1.02] transition-all duration-300">
          <div>
            <p className="text-xs text-rose-100 uppercase font-bold tracking-wider opacity-90">
              Rejected
            </p>
            <h4 className="text-3xl font-black mt-1 tracking-tight">
              {queries.filter((q) => q.status === "Rejected").length}
            </h4>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-sm shadow-inner">
            <X size={22} />
          </div>
        </div>
      </div>

      {/* Tabular Layout */}
      <div className="w-full overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-[#b44d28] text-white text-xs uppercase tracking-wider font-bold">
              <th className="px-4 py-3 border-b border-white/10 w-16 text-center">
                S.No
              </th>
              <th className="px-4 py-3 border-b border-white/10">
                Date Received
              </th>
              <th className="px-4 py-3 border-b border-white/10">Organizer</th>
              <th className="px-4 py-3 border-b border-white/10">
                Event Activities
              </th>
              <th className="px-4 py-3 border-b border-white/10">Location</th>
              <th className="px-4 py-3 border-b border-white/10">Status</th>
              <th className="px-4 py-3 border-b border-white/10 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-gray-500 italic"
                >
                  Loading event requests...
                </td>
              </tr>
            ) : filteredQueries.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-gray-500 italic"
                >
                  No event requests found.
                </td>
              </tr>
            ) : (
              filteredQueries.map((q, idx) => (
                <tr
                  key={q.id}
                  className={
                    idx % 2 === 0
                      ? "bg-white hover:bg-gray-100 transition-all duration-200"
                      : "bg-[#ebd8c0] hover:bg-[#dfccb2] transition-all duration-200"
                  }
                >
                  <td className="px-4 py-3.5 border-b border-gray-100 text-center font-bold text-gray-500 align-middle">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3.5 border-b border-gray-100 text-gray-600 align-middle">
                    {new Date(q.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3.5 border-b border-gray-100 align-middle">
                    <div className="font-semibold text-paa-navy">
                      {q.author?.name || q.name || "N/A"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {q.author?.email || q.email || "N/A"}
                    </div>
                    {q.parsed?.phone && (
                      <div className="text-xs text-gray-400">
                        {q.parsed.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 border-b border-gray-100 text-gray-700 font-semibold align-middle">
                    {q.parsed?.type || "N/A"}
                  </td>
                  <td className="px-4 py-3.5 border-b border-gray-100 text-gray-600 align-middle">
                    {q.parsed?.location || "N/A"}
                  </td>
                  <td className="px-4 py-3.5 border-b border-gray-100 align-middle">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
                        q.status === "Accepted"
                          ? "bg-green-100 text-green-800 border border-green-200"
                          : q.status === "Rejected"
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : "bg-orange-100 text-orange-800 border border-orange-200"
                      }`}
                    >
                      {q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 border-b border-gray-100 align-middle text-right">
                    <div className="inline-flex items-center gap-2 justify-end w-full">
                      <button
                        onClick={() => setSelectedRequest(q)}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                        title="View Details"
                      >
                        <Eye size={12} /> Details
                      </button>

                      {q.status === "Pending" && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAccept(q.id);
                            }}
                            className="px-2.5 py-1 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-all hover:bg-green-100"
                            title="Accept Request"
                          >
                            <CheckCircle2 size={12} /> Accept
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReject(q.id);
                            }}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-all hover:bg-red-100"
                            title="Reject Request"
                          >
                            <X size={12} /> Reject
                          </button>
                        </>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(q.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                        title="Delete Request"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4 relative">
            <button
              onClick={() => setSelectedRequest(null)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-serif font-bold text-paa-navy border-b pb-2 flex items-center gap-2">
              <CalendarIcon className="text-paa-gold" size={20} /> Event Request
              Details
            </h3>

            {/* HIGHLIGHTED CONTACT DETAILS CARD */}
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-amber-50 p-4 rounded-xl border border-blue-200/80 shadow-sm flex flex-col gap-2.5 my-1">
              <div className="flex items-center justify-between border-b border-blue-200/60 pb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <Phone size={14} className="text-blue-600" /> Highlighted Contact Details
                </span>
                <span className="text-[10px] font-bold uppercase bg-blue-600 text-white px-2 py-0.5 rounded-full">
                  Primary Organizer
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="bg-white/90 p-2.5 rounded-lg border border-blue-100 shadow-2xs">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Contact Person</p>
                  <p className="font-extrabold text-gray-900 text-sm mt-0.5">
                    {selectedRequest.author?.name || selectedRequest.name || "N/A"}
                  </p>
                </div>
                <div className="bg-white/90 p-2.5 rounded-lg border border-blue-100 shadow-2xs">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Contact Phone</p>
                  <a
                    href={`tel:${selectedRequest.parsed?.phone || selectedRequest.phone}`}
                    className="font-extrabold text-blue-700 hover:underline text-sm flex items-center gap-1.5 mt-0.5"
                  >
                    <Phone size={13} className="shrink-0 text-blue-600" />
                    <span>{selectedRequest.parsed?.phone || selectedRequest.phone || "N/A"}</span>
                  </a>
                </div>
                <div className="bg-white/90 p-2.5 rounded-lg border border-blue-100 shadow-2xs">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Contact Email</p>
                  <a
                    href={`mailto:${selectedRequest.author?.email || selectedRequest.email}`}
                    className="font-extrabold text-blue-700 hover:underline text-sm flex items-center gap-1.5 mt-0.5 truncate"
                    title={selectedRequest.author?.email || selectedRequest.email}
                  >
                    <Mail size={13} className="shrink-0 text-blue-600" />
                    <span className="truncate">{selectedRequest.author?.email || selectedRequest.email || "N/A"}</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mt-1">
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold">
                  Proposer Name
                </p>
                <p className="font-semibold text-gray-800">
                  {selectedRequest.parsed?.proposer || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold">
                  Organisation Name
                </p>
                <p className="font-semibold text-gray-800">
                  {selectedRequest.parsed?.organisation || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold">
                  Designation
                </p>
                <p className="font-semibold text-gray-800">
                  {selectedRequest.parsed?.designation || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold">
                  Category
                </p>
                <p className="font-semibold text-gray-800">
                  {selectedRequest.parsed?.category || "N/A"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-400 uppercase font-bold">
                  Event Activities
                </p>
                <p className="font-semibold text-gray-800">
                  {selectedRequest.parsed?.type || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold">
                  Proposed Date / Time
                </p>
                <p className="font-semibold text-gray-800">
                  {selectedRequest.parsed?.proposedDate || "N/A"} at{" "}
                  {selectedRequest.parsed?.proposedTime || "N/A"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-400 uppercase font-bold">
                  Location
                </p>
                <p className="font-semibold text-gray-800">
                  {selectedRequest.parsed?.location || "N/A"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-400 uppercase font-bold">
                  Audience details
                </p>
                <p className="font-semibold text-gray-800">
                  {selectedRequest.parsed?.audience || "N/A"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-400 uppercase font-bold">
                  Event Description
                </p>
                <div className="bg-gray-50 p-3 rounded-lg border text-gray-700 mt-1 whitespace-pre-wrap">
                  {selectedRequest.parsed?.description ||
                    "No description provided."}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-4 border-t pt-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 uppercase font-bold">
                  Status:
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    selectedRequest.status === "Accepted"
                      ? "bg-green-100 text-green-800 border border-green-200"
                      : selectedRequest.status === "Rejected"
                        ? "bg-red-100 text-red-800 border border-red-200"
                        : "bg-orange-100 text-orange-800 border border-orange-200"
                  }`}
                >
                  {selectedRequest.status}
                </span>
              </div>
              <div className="flex gap-2">
                {selectedRequest.status === "Pending" && (
                  <>
                    <button
                      onClick={() => {
                        handleAccept(selectedRequest.id);
                        setSelectedRequest(null);
                      }}
                      className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
                    >
                      <CheckCircle2 size={14} /> Accept
                    </button>
                    <button
                      onClick={() => {
                        handleReject(selectedRequest.id);
                        setSelectedRequest(null);
                      }}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
                    >
                      <X size={14} /> Reject
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationsDashboardPage;
