import { useState, useEffect, useCallback } from "react";
import type {
  User,
  TopGiftItem,
  AdminOverviewStats,
  AdminChartDay,
  AdminAnalyticsData,
  AdminSearchLog,
} from "./types";
import { API_URL } from "./config";
import "./AdminDashboard.css";

interface AdminDashboardProps {
  user: User;
  token: string | null;
  apiUrl?: string;
  onBackToStore: () => void;
}

export default function AdminDashboard({
  user,
  token,
  apiUrl = API_URL,
  onBackToStore,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    "top-gifts" | "analytics" | "searches" | "users"
  >("top-gifts");
  const [period, setPeriod] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Data states
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [chartData, setChartData] = useState<AdminChartDay[]>([]);
  const [topGifts, setTopGifts] = useState<TopGiftItem[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
  const [searches, setSearches] = useState<AdminSearchLog[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);

  const fetchOverview = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/admin/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setChartData(data.chartData || []);
      }
    } catch (e) {
      console.error("Overview error:", e);
    }
  }, [token, apiUrl]);

  const fetchTopGifts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/admin/top-gifts?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setTopGifts(data.gifts || []);
      }
    } catch (e) {
      console.error("Top gifts error:", e);
    }
  }, [token, apiUrl, period]);

  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (e) {
      console.error("Analytics error:", e);
    }
  }, [token, apiUrl]);

  const fetchSearches = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/admin/searches?limit=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSearches(data.searches || []);
      }
    } catch (e) {
      console.error("Searches error:", e);
    }
  }, [token, apiUrl]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setUsersList(data.users || []);
      }
    } catch (e) {
      console.error("Users error:", e);
    }
  }, [token, apiUrl]);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchOverview(),
      fetchTopGifts(),
      fetchAnalytics(),
      fetchSearches(),
      fetchUsers(),
    ]);
    setLoading(false);
  }, [fetchOverview, fetchTopGifts, fetchAnalytics, fetchSearches, fetchUsers]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Khi thay đổi period lọc Top gifts
  useEffect(() => {
    fetchTopGifts();
  }, [period, fetchTopGifts]);

  // Hành động đổi role user
  const handleToggleRole = async (targetUser: User) => {
    if (!token) return;
    const newRole = targetUser.role === "admin" ? "user" : "admin";
    if (
      !window.confirm(
        `Bạn có chắc muốn chuyển quyền của "${targetUser.full_name}" thành ${newRole.toUpperCase()}?`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/admin/users/${targetUser.id}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        setUsersList((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
        );
      } else {
        alert(data.message || "Không thể cập nhật quyền.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Hành động xóa user
  const handleDeleteUser = async (targetId: number) => {
    if (!token) return;
    if (!window.confirm("Bạn có chắc chắn muốn xóa người dùng này?")) return;
    try {
      const res = await fetch(`${apiUrl}/api/admin/users/${targetId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setUsersList((prev) => prev.filter((u) => u.id !== targetId));
      } else {
        alert(data.message || "Không thể xóa người dùng.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "Chưa có giá";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // Max value cho biểu đồ ngày
  const maxDayCount = Math.max(...chartData.map((d) => d.total), 5);

  return (
    <div className="admin-page">
      {/* Top Navbar */}
      <header className="admin-navbar">
        <div className="admin-navbar-inner">
          <div className="admin-nav-left">
            <div className="admin-logo-badge">👑</div>
            <div>
              <h1 className="admin-nav-title">Trung Tâm Quản Trị GiftAI</h1>
              <div className="admin-nav-subtitle">
                <span>Quản trị viên: {user.full_name}</span>
                <span>•</span>
                <span className="admin-badge-live">
                  <span className="admin-badge-live-dot"></span>
                  Hệ thống trực tuyến
                </span>
              </div>
            </div>
          </div>

          <div className="admin-nav-right">
            <button className="admin-refresh-btn" onClick={loadAllData} title="Làm mới số liệu">
              🔄 Tải lại
            </button>
            <button className="admin-back-btn" onClick={onBackToStore}>
              🏪 Quay lại trang quà tặng
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="admin-main">
        {/* Metric Overview Cards */}
        {stats && (
          <div className="admin-metrics-grid">
            {/* Thẻ 1: Tổng lượt tìm kiếm */}
            <div className="admin-metric-card">
              <div className="admin-metric-top">
                <div className="admin-metric-icon pink">🔍</div>
                <span className="admin-metric-badge">
                  Hôm nay: +{stats.todaySearches}
                </span>
              </div>
              <span className="admin-metric-label">Tổng lượt tìm kiếm quà</span>
              <span className="admin-metric-value">
                {stats.totalSearches.toLocaleString("vi-VN")}
              </span>
              <div className="admin-metric-footer">
                <span>7 ngày qua: <strong>{stats.weekSearches}</strong> lượt</span>
              </div>
            </div>

            {/* Thẻ 2: Quà trong kho dữ liệu */}
            <div className="admin-metric-card">
              <div className="admin-metric-top">
                <div className="admin-metric-icon purple">🎁</div>
                <span className="admin-metric-badge">Cào từ Lazada</span>
              </div>
              <span className="admin-metric-label">Sản phẩm quà trong CSDL</span>
              <span className="admin-metric-value">
                {stats.totalProducts.toLocaleString("vi-VN")}
              </span>
              <div className="admin-metric-footer">
                <span>Bộ nhớ đệm MySQL cache sẵn sàng</span>
              </div>
            </div>

            {/* Thẻ 3: Người dùng hệ thống */}
            <div className="admin-metric-card">
              <div className="admin-metric-top">
                <div className="admin-metric-icon blue">👥</div>
                <span className="admin-metric-badge">
                  Mới tuần này: +{stats.newUsersWeek}
                </span>
              </div>
              <span className="admin-metric-label">Người dùng đã đăng ký</span>
              <span className="admin-metric-value">
                {stats.totalUsers.toLocaleString("vi-VN")}
              </span>
              <div className="admin-metric-footer">
                <span>Khách vãng lai: {stats.guestSearches} lượt tìm</span>
              </div>
            </div>

            {/* Thẻ 4: Gợi ý và Tương tác */}
            <div className="admin-metric-card">
              <div className="admin-metric-top">
                <div className="admin-metric-icon emerald">📈</div>
                <span className="admin-metric-badge">
                  {stats.totalClicks} lượt clicks
                </span>
              </div>
              <span className="admin-metric-label">Lượt gợi ý quà AI đưa ra</span>
              <span className="admin-metric-value">
                {stats.totalImpressions.toLocaleString("vi-VN")}
              </span>
              <div className="admin-metric-footer">
                <span>
                  CTR quan tâm:{" "}
                  {stats.totalImpressions > 0
                    ? ((stats.totalClicks / stats.totalImpressions) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="admin-tabs-nav">
          <div className="admin-tabs-list">
            <button
              className={`admin-tab-item ${activeTab === "top-gifts" ? "active" : ""}`}
              onClick={() => setActiveTab("top-gifts")}
            >
              🏆 Quà được tìm nhiều nhất
            </button>
            <button
              className={`admin-tab-item ${activeTab === "analytics" ? "active" : ""}`}
              onClick={() => setActiveTab("analytics")}
            >
              📊 Xu hướng & Thống kê
            </button>
            <button
              className={`admin-tab-item ${activeTab === "searches" ? "active" : ""}`}
              onClick={() => setActiveTab("searches")}
            >
              ⚡ Nhật ký tìm kiếm ({searches.length})
            </button>
            <button
              className={`admin-tab-item ${activeTab === "users" ? "active" : ""}`}
              onClick={() => setActiveTab("users")}
            >
              👥 Quản lý người dùng ({usersList.length})
            </button>
          </div>

          {activeTab === "top-gifts" && (
            <div className="admin-tab-filter">
              <span className="admin-filter-label">Thời gian:</span>
              <select
                className="admin-filter-select"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="all">Tất cả thời gian</option>
                <option value="today">Hôm nay</option>
                <option value="7d">7 ngày qua</option>
                <option value="30d">30 ngày qua</option>
              </select>
            </div>
          )}
        </div>

        {/* TAB 1: TOP QUÀ ĐƯỢC TÌM & GỢI Ý NHIỀU NHẤT */}
        {activeTab === "top-gifts" && (
          <div className="admin-section-card">
            <div className="admin-section-header">
              <div>
                <h3 className="admin-section-title">
                  <span>🏆 Bảng xếp hạng món quà được gợi ý & quan tâm nhiều nhất</span>
                </h3>
                <p className="admin-section-desc">
                  Thống kê tần suất AI đưa các món quà này vào danh sách gợi ý cho người dùng,
                  kèm lượt nhấp xem chi tiết và điểm phù hợp.
                </p>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: "60px", textAlign: "center" }}>Hạng</th>
                    <th>Tên món quà & Nền tảng</th>
                    <th>Giá tham khảo</th>
                    <th style={{ textAlign: "center" }}>Số lần được tìm/gợi ý</th>
                    <th style={{ textAlign: "center" }}>Lượt clicks</th>
                    <th style={{ textAlign: "center" }}>Điểm AI match</th>
                    <th style={{ textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "40px" }}>
                        ⏳ Đang tải bảng xếp hạng quà tặng...
                      </td>
                    </tr>
                  ) : topGifts.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "40px" }}>
                        Chưa có dữ liệu thống kê quà tặng trong khoảng thời gian này.
                      </td>
                    </tr>
                  ) : (
                    topGifts.map((item, index) => {
                      const rank = index + 1;
                      return (
                        <tr key={index}>
                          <td style={{ textAlign: "center" }}>
                            <div
                              className={`rank-badge ${
                                rank === 1
                                  ? "rank-1"
                                  : rank === 2
                                  ? "rank-2"
                                  : rank === 3
                                  ? "rank-3"
                                  : "rank-other"
                              }`}
                            >
                              {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}
                            </div>
                          </td>
                          <td>
                            <div className="top-gift-item">
                              <img
                                src={
                                  item.image
                                    ? `${apiUrl}/api/image-proxy?url=${encodeURIComponent(item.image)}`
                                    : "https://via.placeholder.com/150?text=Gift"
                                }
                                alt={item.product_name}
                                className="top-gift-thumb"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    "https://via.placeholder.com/150?text=Gift";
                                }}
                              />
                              <div>
                                <div className="top-gift-name" title={item.product_name}>
                                  {item.product_name}
                                </div>
                                <span className="top-gift-platform">
                                  {item.platform || "Lazada"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <strong style={{ color: "#ff4f70" }}>
                              {formatPrice(item.price)}
                            </strong>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className="gift-count-pill">
                              🔥 {item.search_count} lần
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span style={{ fontWeight: 600, color: "#475569" }}>
                              👆 {item.clicks || 0}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className="gift-score-badge">
                              ⭐ {item.avg_score || 90}/100
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="gift-view-btn"
                              >
                                Xem trên sàn ↗
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: XU HƯỚNG & PHÂN TÍCH */}
        {activeTab === "analytics" && (
          <div>
            {/* Biểu đồ xu hướng tìm kiếm theo ngày */}
            <div className="admin-section-card admin-chart-card">
              <div className="admin-section-header" style={{ padding: "0 0 16px" }}>
                <div>
                  <h3 className="admin-section-title">
                    <span>📈 Xu hướng tìm kiếm quà tặng (14 ngày gần nhất)</span>
                  </h3>
                  <p className="admin-section-desc">
                    Số lượng lượt tìm kiếm mỗi ngày phân loại theo Người dùng đăng nhập và Khách vãng lai
                  </p>
                </div>
              </div>

              <div className="admin-chart-bars">
                {chartData.map((day, idx) => {
                  const userHeight = (day.user_count / maxDayCount) * 100;
                  const guestHeight = (day.guest_count / maxDayCount) * 100;

                  return (
                    <div key={idx} className="chart-bar-col">
                      <div className="chart-bar-tooltip">
                        {day.displayDate}: {day.total} lượt (User: {day.user_count}, Khách: {day.guest_count})
                      </div>
                      <div className="chart-bar-fill-wrap">
                        <div
                          className="chart-bar-user"
                          style={{ height: `${userHeight}%` }}
                          title={`User: ${day.user_count}`}
                        ></div>
                        <div
                          className="chart-bar-guest"
                          style={{ height: `${guestHeight}%` }}
                          title={`Khách: ${day.guest_count}`}
                        ></div>
                      </div>
                      <span className="chart-bar-date">{day.displayDate}</span>
                    </div>
                  );
                })}
              </div>

              <div className="chart-legend">
                <div className="legend-item">
                  <div className="legend-color-box" style={{ background: "#ff4f70" }}></div>
                  <span>Người dùng đã đăng ký ({stats?.userSearches || 0})</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color-box" style={{ background: "#a5b4fc" }}></div>
                  <span>Khách vãng lai ({stats?.guestSearches || 0})</span>
                </div>
              </div>
            </div>

            {/* Phân bố các tiêu chí */}
            {analytics && (
              <div className="admin-analytics-grid">
                {/* 1. Dịp tặng quà */}
                <div className="admin-section-card" style={{ marginBottom: 0 }}>
                  <div className="admin-section-header">
                    <h3 className="admin-section-title">🎉 Phân bố Dịp tặng quà</h3>
                  </div>
                  <div className="breakdown-list">
                    {analytics.topOccasions.length === 0 ? (
                      <div style={{ color: "#64748b", textAlign: "center" }}>
                        Chưa có dữ liệu
                      </div>
                    ) : (
                      analytics.topOccasions.map((occ, idx) => {
                        const total = stats?.totalSearches || 1;
                        const pct = Math.round((occ.count / total) * 100);
                        return (
                          <div key={idx} className="breakdown-row">
                            <div className="breakdown-info">
                              <span>{occ.occasion}</span>
                              <span className="breakdown-count">
                                {occ.count} lượt ({pct}%)
                              </span>
                            </div>
                            <div className="breakdown-bar-bg">
                              <div
                                className="breakdown-bar-fill"
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 2. Đối tượng nhận quà */}
                <div className="admin-section-card" style={{ marginBottom: 0 }}>
                  <div className="admin-section-header">
                    <h3 className="admin-section-title">👥 Đối tượng nhận quà phổ biến</h3>
                  </div>
                  <div className="breakdown-list">
                    {analytics.topRelationships.length === 0 ? (
                      <div style={{ color: "#64748b", textAlign: "center" }}>
                        Chưa có dữ liệu
                      </div>
                    ) : (
                      analytics.topRelationships.map((rel, idx) => {
                        const total = stats?.totalSearches || 1;
                        const pct = Math.round((rel.count / total) * 100);
                        return (
                          <div key={idx} className="breakdown-row">
                            <div className="breakdown-info">
                              <span>{rel.relationship}</span>
                              <span className="breakdown-count">
                                {rel.count} lượt ({pct}%)
                              </span>
                            </div>
                            <div className="breakdown-bar-bg">
                              <div
                                className="breakdown-bar-fill purple"
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 3. Phân khúc ngân sách */}
                <div className="admin-section-card" style={{ marginBottom: 0 }}>
                  <div className="admin-section-header">
                    <h3 className="admin-section-title">💰 Phân khúc ngân sách tìm kiếm</h3>
                  </div>
                  <div className="breakdown-list">
                    {analytics.topBudgets.length === 0 ? (
                      <div style={{ color: "#64748b", textAlign: "center" }}>
                        Chưa có dữ liệu
                      </div>
                    ) : (
                      analytics.topBudgets.map((bud, idx) => {
                        const total = stats?.totalSearches || 1;
                        const pct = Math.round((bud.count / total) * 100);
                        return (
                          <div key={idx} className="breakdown-row">
                            <div className="breakdown-info">
                              <span>{bud.budget}</span>
                              <span className="breakdown-count">
                                {bud.count} lượt ({pct}%)
                              </span>
                            </div>
                            <div className="breakdown-bar-bg">
                              <div
                                className="breakdown-bar-fill blue"
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: NHẬT KÝ TÌM KIẾM THỜI GIAN THỰC */}
        {activeTab === "searches" && (
          <div className="admin-section-card">
            <div className="admin-section-header">
              <div>
                <h3 className="admin-section-title">
                  <span>⚡ Nhật ký tìm kiếm quà thời gian thực</span>
                </h3>
                <p className="admin-section-desc">
                  Theo dõi trực tiếp những gì người dùng và khách đang tìm kiếm trên hệ thống
                </p>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Người tìm</th>
                    <th>Nhu cầu & Mô tả tìm kiếm</th>
                    <th>Dịp & Đối tượng</th>
                    <th>Gợi ý AI & Sản phẩm</th>
                  </tr>
                </thead>
                <tbody>
                  {searches.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "40px" }}>
                        Chưa có dữ liệu tìm kiếm nào.
                      </td>
                    </tr>
                  ) : (
                    searches.map((item) => (
                      <tr key={item.id}>
                        <td style={{ whiteSpace: "nowrap", color: "#64748b" }}>
                          {formatDate(item.created_at)}
                        </td>
                        <td>
                          <div className="search-user-badge">
                            <div
                              className={`user-avatar-circle ${
                                item.user_id ? "admin" : ""
                              }`}
                            >
                              {item.user_id ? "👤" : "🌐"}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: "#0f172a" }}>
                                {item.user_name}
                              </div>
                              {item.user_email && (
                                <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                                  {item.user_email}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ maxWidth: "340px" }}>
                          <strong style={{ color: "#1e293b" }}>
                            {item.query_text || "(Không có mô tả chi tiết)"}
                          </strong>
                          {item.budget && (
                            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                              Ngân sách: <strong>{item.budget}</strong>
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                            {item.occasion && (
                              <span
                                style={{
                                  background: "#fff0f3",
                                  color: "#ff4f70",
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                }}
                              >
                                {item.occasion}
                              </span>
                            )}
                            {item.relationship && (
                              <span
                                style={{
                                  background: "#f1f5f9",
                                  color: "#475569",
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                }}
                              >
                                {item.relationship}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div>
                            <span style={{ fontSize: "12.5px", color: "#059669", fontWeight: 700 }}>
                              ✅ Gợi ý {item.total_products} sản phẩm
                            </span>
                            {item.previewProducts && item.previewProducts.length > 0 && (
                              <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                                {item.previewProducts.map((p, pIdx) => (
                                  <img
                                    key={pIdx}
                                    src={
                                      p.image
                                        ? `${apiUrl}/api/image-proxy?url=${encodeURIComponent(p.image)}`
                                        : "https://via.placeholder.com/60?text=Gift"
                                    }
                                    alt={p.name}
                                    title={p.name}
                                    style={{
                                      width: "36px",
                                      height: "36px",
                                      borderRadius: "6px",
                                      objectFit: "cover",
                                      border: "1px solid #e2e8f0",
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: QUẢN LÝ NGƯỜI DÙNG */}
        {activeTab === "users" && (
          <div className="admin-section-card">
            <div className="admin-section-header">
              <div>
                <h3 className="admin-section-title">
                  <span>👥 Danh sách người dùng & Phân quyền</span>
                </h3>
                <p className="admin-section-desc">
                  Quản lý tài khoản, xem số lượt tìm kiếm và thay đổi vai trò Admin / User
                </p>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Họ và tên</th>
                    <th>Email</th>
                    <th>Vai trò</th>
                    <th style={{ textAlign: "center" }}>Số lần tìm quà</th>
                    <th>Ngày tham gia</th>
                    <th style={{ textAlign: "right" }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => {
                    const isSelf = u.id === user.id;
                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div className={`user-avatar-circle ${u.role === "admin" ? "admin" : ""}`}>
                              {u.full_name ? u.full_name.charAt(0).toUpperCase() : "U"}
                            </div>
                            <strong style={{ color: "#0f172a" }}>{u.full_name}</strong>
                          </div>
                        </td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`role-badge ${u.role}`}>
                            {u.role === "admin" ? "👑 Quản trị viên" : "👤 Người dùng"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span style={{ fontWeight: 700, color: "#ff4f70" }}>
                            {u.search_count || 0} lần
                          </span>
                        </td>
                        <td style={{ color: "#64748b" }}>
                          {u.created_at ? formatDate(u.created_at) : "Mới tham gia"}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            {!isSelf && (
                              <>
                                <button
                                  className="user-action-btn"
                                  onClick={() => handleToggleRole(u)}
                                  title="Đổi quyền"
                                >
                                  {u.role === "admin" ? "Hạ xuống User" : "👑 Nâng làm Admin"}
                                </button>
                                <button
                                  className="user-action-btn delete"
                                  onClick={() => handleDeleteUser(u.id)}
                                  title="Xóa tài khoản"
                                >
                                  🗑️ Xóa
                                </button>
                              </>
                            )}
                            {isSelf && (
                              <span style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>
                                (Tài khoản hiện tại)
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
