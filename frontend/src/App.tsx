import { useRef, useState, useEffect, useCallback, type KeyboardEvent } from "react";
import GreetingCardModal, { type CardContext } from "./GreetingCardModal";
import MemoryBoxModal from "./MemoryBoxModal";
import MemoryBoxViewer from "./MemoryBoxViewer";
import MyMemoryBoxesModal from "./MyMemoryBoxesModal";
import AuthModal from "./AuthModal";
import UserHistoryModal from "./UserHistoryModal";
import UserFavoritesModal from "./UserFavoritesModal";
import AdminDashboard from "./AdminDashboard";
import type { Product, User, SearchHistoryItem, FavoriteItem } from "./types";
import { API_URL } from "./config";
import "./App.css";

interface RecommendResponse {
  success: boolean;
  message?: string;
  historyId?: number;

  ai?: {
    summary: string;
    items?: string[];
    keywords: string[];
    searchQueries: string[];
  };

  total: number;
  products: Product[];

  refreshAvailable?: boolean;
}

function App() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [relationship, setRelationship] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [occasion, setOccasion] = useState("");
  const [budget, setBudget] = useState("");

  const [interests, setInterests] = useState<string[]>([]);

  const [aiSummary, setAiSummary] = useState("");
  const [aiItems, setAiItems] = useState<string[]>([]);
  const [aiKeywords, setAiKeywords] = useState<string[]>([]);

  // State cho Greeting Card Modal
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [cardContext, setCardContext] = useState<CardContext>({});

  // State cho Memory Box (Hộp Quà Kỷ Niệm Ảo & Đếm Ngược)
  const [memoryBoxModalOpen, setMemoryBoxModalOpen] = useState(false);
  const [selectedProductForBox, setSelectedProductForBox] = useState<Product | null>(null);
  const [myMemoryBoxesOpen, setMyMemoryBoxesOpen] = useState(false);
  const [viewerShareCode, setViewerShareCode] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("box");
    } catch {
      return null;
    }
  });

  const handleOpenMemoryBoxModal = (selectedProduct?: Product) => {
    setSelectedProductForBox(selectedProduct || null);
    setMemoryBoxModalOpen(true);
  };

  // =====================================================
  // AUTHENTICATION & USER STATE
  // =====================================================
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("giftfinder_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("giftfinder_token");
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "register">("login");
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [favoritesModalOpen, setFavoritesModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"store" | "admin">("store");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [lastHistoryId, setLastHistoryId] = useState<number | null>(null);
  const [favoriteNames, setFavoriteNames] = useState<Set<string>>(new Set());

  // Lấy danh sách quà yêu thích của người dùng nếu đã đăng nhập
  const fetchFavorites = useCallback(async () => {
    if (!token) {
      setFavoriteNames(new Set());
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/user/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.favorites)) {
        setFavoriteNames(
          new Set(data.favorites.map((f: FavoriteItem) => f.product_name))
        );
      }
    } catch (err) {
      console.error("fetchFavorites error:", err);
    }
  }, [token, API_URL]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleAuthSuccess = (newUser: User, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem("giftfinder_token");
    localStorage.removeItem("giftfinder_user");
    setUser(null);
    setToken(null);
    setViewMode("store");
    setFavoriteNames(new Set());
  };

  // Lưu hoặc xóa quà yêu thích
  const toggleFavorite = async (product: Product) => {
    if (!user || !token) {
      setAuthModalTab("login");
      setAuthModalOpen(true);
      return;
    }

    const isFav = favoriteNames.has(product.name);
    if (isFav) {
      try {
        const res = await fetch(`${API_URL}/api/user/favorites`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.favorites)) {
          const found = data.favorites.find(
            (f: FavoriteItem) => f.product_name === product.name
          );
          if (found) {
            await fetch(`${API_URL}/api/user/favorites/${found.id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        }
      } catch (e) {
        console.error(e);
      }
      setFavoriteNames((prev) => {
        const next = new Set(prev);
        next.delete(product.name);
        return next;
      });
    } else {
      try {
        await fetch(`${API_URL}/api/user/favorites`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            product_name: product.name,
            product_price: product.price,
            product_image: product.image,
            product_url: product.url,
            platform: product.platform || product.source || "lazada",
            score: product.score || 0,
          }),
        });
        setFavoriteNames((prev) => new Set(prev).add(product.name));
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Ghi nhận lượt click vào sản phẩm để thống kê cho trang Admin
  const trackProductClick = (productName: string) => {
    if (!productName) return;
    fetch(`${API_URL}/api/products/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productName }),
    }).catch(() => {});
  };

  // Tìm lại từ lịch sử
  const handleRerunSearch = (item: SearchHistoryItem) => {
    setSearch(item.query_text || "");
    setRelationship(item.relationship || "");
    setGender(item.gender || "");
    setAge(item.age_range || "");
    setOccasion(item.occasion || "");
    setBudget(item.budget || "");
    const loadedInterests = Array.isArray(item.interests) ? item.interests : [];
    setInterests(loadedInterests);

    window.scrollTo({ top: 350, behavior: "smooth" });
    recommendGifts(
      item.query_text || "",
      item.relationship || "",
      item.gender || "",
      item.age_range || "",
      item.occasion || "",
      item.budget || "",
      loadedInterests
    );
  };

  const handleOpenCardModal = (selectedProduct?: Product) => {
    setCardContext({
      occasion:
        occasion || (search.toLowerCase().includes("sinh nhật") ? "Sinh nhật" : ""),
      relationship: relationship || "",
      gender: gender || "",
      age: age || "",
      interests: interests,
      description: search,
      giftName: selectedProduct ? selectedProduct.name : "",
      giftPrice: selectedProduct ? selectedProduct.price : null,
      giftImage: selectedProduct ? selectedProduct.image : null,
    });
    setCardModalOpen(true);
  };

  // Dùng để tránh request refresh cũ ghi đè kết quả tìm kiếm mới
  const requestIdRef = useRef(0);

  // =====================================================
  // AI RECOMMENDATION
  // =====================================================

  const recommendGifts = async (
    description: string,
    customRelationship = relationship,
    customGender = gender,
    customAge = age,
    customOccasion = occasion,
    customBudget = budget,
    customInterests = interests,
  ) => {
    const value = description.trim();

    if (
      !value &&
      !customRelationship &&
      !customOccasion &&
      customInterests.length === 0
    ) {
      return;
    }

    // Tạo ID cho lần tìm kiếm hiện tại
    const currentRequestId = ++requestIdRef.current;

    setLoading(true);
    setRefreshing(false);
    setError("");
    setSearched(true);

    setProducts([]);
    setAiSummary("");
    setAiItems([]);
    setAiKeywords([]);

    const requestBody = {
      description: value,
      relationship: customRelationship || "",
      gender: customGender || "",
      age: customAge || "",
      occasion: customOccasion || "",
      budget: customBudget || "",
      interests: customInterests,
    };

    try {
      // =================================================
      // BƯỚC 1: CACHE (GỢI Ý TỨC THÌ TỪ CSDL)
      // =================================================

      const requestHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        requestHeaders["Authorization"] = `Bearer ${token}`;
      }

      const cacheResponse = await fetch(`${API_URL}/api/recommend`, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({
          ...requestBody,
          mode: "cache",
        }),
      });

      const cacheData: RecommendResponse = await cacheResponse
        .json()
        .catch(() => ({
          success: false,
          message: "Backend trả về dữ liệu không hợp lệ.",
          total: 0,
          products: [],
        }));

      // Nếu đây không còn là request mới nhất thì dừng
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      if (!cacheResponse.ok) {
        throw new Error(
          cacheData.message || "Không thể kết nối đến AI backend.",
        );
      }

      if (!cacheData.success) {
        throw new Error(
          cacheData.message || "Không thể lấy dữ liệu từ backend.",
        );
      }

      if (cacheData.historyId) {
        setLastHistoryId(cacheData.historyId);
      }

      // =================================================
      // HIỂN THỊ CACHE NGAY
      // =================================================

      setAiSummary(cacheData.ai?.summary || "");
      setAiItems(cacheData.ai?.items || []);
      setAiKeywords(cacheData.ai?.keywords || []);

      const cachedProducts = Array.isArray(cacheData.products)
        ? cacheData.products
        : [];

      setProducts(cachedProducts);

      // Cache đã lấy xong - đẩy ngay lên giao diện
      setLoading(false);

      // =================================================
      // BƯỚC 2: REFRESH (LUỒNG LAZADA CÀO & XẾP HẠNG LẠI)
      // =================================================

      setRefreshing(true);

      try {
        const refreshResponse = await fetch(`${API_URL}/api/recommend`, {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify({
            ...requestBody,
            mode: "refresh",
            ai: cacheData.ai || undefined,
            searchQueries: cacheData.ai?.searchQueries || undefined,
            historyId: cacheData.historyId || lastHistoryId || undefined,
          }),
        });

        const refreshData: RecommendResponse = await refreshResponse
          .json()
          .catch(() => ({
            success: false,
            message: "Backend trả về dữ liệu không hợp lệ.",
            total: 0,
            products: [],
          }));

        // Request cũ không được phép cập nhật giao diện
        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        if (!refreshResponse.ok) {
          throw new Error(refreshData.message || "Không thể làm mới sản phẩm.");
        }

        if (!refreshData.success) {
          throw new Error(refreshData.message || "Không thể làm mới sản phẩm.");
        }

        // =================================================
        // CẬP NHẬT AI
        // =================================================

        setAiSummary(refreshData.ai?.summary || cacheData.ai?.summary || "");

        setAiItems(refreshData.ai?.items || cacheData.ai?.items || []);

        setAiKeywords(refreshData.ai?.keywords || cacheData.ai?.keywords || []);

        // =================================================
        // CẬP NHẬT PRODUCTS (ĐÃ XẾP HẠNG LẠI TỪ LAZADA)
        // =================================================

        if (
          Array.isArray(refreshData.products) &&
          refreshData.products.length > 0
        ) {
          setProducts(refreshData.products);
        }
      } catch (refreshError) {
        console.error("Refresh Recommendation Error:", refreshError);

        // QUAN TRỌNG:
        // Không xóa products cache nếu refresh lỗi.
        // Người dùng vẫn nhìn thấy kết quả cũ.

        if (currentRequestId === requestIdRef.current) {
          console.warn("Refresh thất bại, giữ nguyên sản phẩm cache.");
        }
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setRefreshing(false);
        }
      }
    } catch (err) {
      console.error("Recommendation Error:", err);

      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      setProducts([]);
      setAiSummary("");
      setAiKeywords([]);

      setError(
        err instanceof Error
          ? err.message
          : "Không thể kết nối đến AI backend. Hãy kiểm tra Node.js backend đang chạy.",
      );

      setLoading(false);
      setRefreshing(false);
    }
  };

  // =====================================================
  // MAIN SEARCH
  // =====================================================

  const handleSearch = () => {
    if (!search.trim()) {
      return;
    }

    recommendGifts(search);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  // =====================================================
  // QUICK SEARCH
  // =====================================================

  const quickSearch = (keyword: string) => {
    setSearch(keyword);

    recommendGifts(keyword, "", "", "", "", "", []);
  };

  // =====================================================
  // INTEREST
  // =====================================================

  const toggleInterest = (interest: string) => {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  };

  // =====================================================
  // APPLY ADVANCED SEARCH
  // =====================================================

  const handleApplyFilter = () => {
    const keyword = [relationship, gender, age, occasion, budget, ...interests]
      .filter(Boolean)
      .join(", ");

    if (!keyword) {
      return;
    }

    setSearch(keyword);

    recommendGifts(
      keyword,
      relationship,
      gender,
      age,
      occasion,
      budget,
      interests,
    );
  };

  // =====================================================
  // FORMAT PRICE
  // =====================================================

  const formatPrice = (price: number | null, currency: string | null) => {
    if (price === null || price === undefined || price <= 0) {
      return "Liên hệ";
    }

    if (currency === "USD") {
      return `$${price.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })}`;
    }

    return `${Math.round(price).toLocaleString("vi-VN")} ₫`;
  };

  // =====================================================
  // PRODUCT SOURCE
  // =====================================================

  const getProductSource = (product: Product) => {
    const source = product.source || product.platform || "";

    if (!source) {
      return "";
    }

    return source;
  };

  // =====================================================
  // RENDER
  // =====================================================

  if (viewerShareCode) {
    return (
      <MemoryBoxViewer
        shareCode={viewerShareCode}
        onClose={() => {
          setViewerShareCode(null);
          window.history.replaceState({}, "", window.location.pathname);
        }}
        onCreateNew={() => {
          setViewerShareCode(null);
          window.history.replaceState({}, "", window.location.pathname);
          setSelectedProductForBox(null);
          setMemoryBoxModalOpen(true);
        }}
      />
    );
  }

  if (viewMode === "admin" && user && user.role === "admin") {
    return (
      <AdminDashboard
        user={user}
        token={token}
        apiUrl={API_URL}
        onBackToStore={() => setViewMode("store")}
      />
    );
  }

  return (
    <div className="app">
      {/* ================= HEADER ================= */}

      <header className="header">
        <div className="container header-container">
          <div className="logo">
            <div className="logo-icon">🎁</div>

            <div className="logo-text">
              <span>Gift</span>Finder
            </div>
          </div>

          <nav className="navbar">
            <a className="nav-link active" href="#">
              Trang chủ
            </a>

            <a className="nav-link" href="#results">
              Khám phá
            </a>

            <a className="nav-link" href="#features">
              Tính năng
            </a>
          </nav>

          <div className="header-actions">
            <button
              className="memory-box-header-btn"
              onClick={() => handleOpenMemoryBoxModal()}
              title="Tạo Hộp Quà Kỷ Niệm Ảo 3D, đếm ngược ngày kỷ niệm & xuất Story 9:16 có mã QR"
            >
              🎁 Hộp Kỷ Niệm <span className="nav-badge-new">MỚI</span>
            </button>

            <button
              className="create-card-header-btn"
              onClick={() => handleOpenCardModal()}
              title="Tạo thiệp chúc mừng với phông nền có sẵn & lời chúc AI"
            >
              💌 Tạo thiệp chúc
            </button>

            <button
              className="favorites-header-btn"
              onClick={() => {
                if (!user) {
                  setAuthModalTab("login");
                  setAuthModalOpen(true);
                } else {
                  setFavoritesModalOpen(true);
                }
              }}
              title="Xem danh sách quà yêu thích đã lưu & gợi ý đòi quà người yêu"
            >
              ❤️ Quà đã lưu {user && favoriteNames.size > 0 ? `(${favoriteNames.size})` : ""}
            </button>

            <button
              className="icon-button"
              onClick={() => {
                document.getElementById("searchInput")?.focus();
              }}
            >
              🔍
            </button>

            {/* Nút vào trang Admin nếu là Admin */}
            {user && user.role === "admin" && (
              <button
                className="admin-header-badge-btn"
                onClick={() => setViewMode("admin")}
                title="Vào trang quản trị hệ thống GiftAI"
              >
                👑 Quản trị
              </button>
            )}

            {/* Menu người dùng hoặc nút Đăng nhập / Đăng ký */}
            {user ? (
              <div className="user-menu-wrapper">
                <button
                  className="user-profile-btn"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                >
                  <div className="user-avatar-small">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <span className="user-name-small">{user.full_name}</span>
                  <span style={{ fontSize: "10px", color: "#64748b" }}>▼</span>
                </button>

                {userDropdownOpen && (
                  <div className="user-menu-dropdown">
                    <div className="user-menu-info">
                      <div className="user-menu-name">{user.full_name}</div>
                      <div className="user-menu-email">{user.email}</div>
                      <span className={`user-menu-role ${user.role}`}>
                        {user.role === "admin" ? "👑 Quản trị viên" : "👤 Thành viên"}
                      </span>
                    </div>

                    <button
                      className="user-menu-item"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setHistoryModalOpen(true);
                      }}
                    >
                      📜 Lịch sử gợi ý quà
                    </button>

                    <button
                      className="user-menu-item"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setMyMemoryBoxesOpen(true);
                      }}
                    >
                      🎁 Hộp quà kỷ niệm của tôi
                    </button>

                    <button
                      className="user-menu-item"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setFavoritesModalOpen(true);
                      }}
                    >
                      ❤️ Quà đã lưu
                    </button>

                    {user.role === "admin" && (
                      <button
                        className="user-menu-item admin-link"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          setViewMode("admin");
                        }}
                      >
                        👑 Trang Quản Trị
                      </button>
                    )}

                    <button
                      className="user-menu-item logout"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleLogout();
                      }}
                    >
                      🚪 Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="auth-header-actions">
                <button
                  className="auth-login-btn"
                  onClick={() => {
                    setAuthModalTab("login");
                    setAuthModalOpen(true);
                  }}
                >
                  Đăng nhập
                </button>
                <button
                  className="auth-register-btn"
                  onClick={() => {
                    setAuthModalTab("register");
                    setAuthModalOpen(true);
                  }}
                >
                  Đăng ký
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ================= HERO ================= */}

      <section className="hero">
        <div className="hero-background"></div>

        <div className="container hero-container">
          <div className="hero-content">
            <div className="hero-badge">✨ Tìm kiếm quà tặng thông minh</div>

            <h1>
              Tìm món quà
              <span> phù hợp nhất</span>
            </h1>

            <p className="hero-description">
              Mô tả người bạn muốn tặng, chúng tôi sẽ giúp bạn tìm những món quà
              phù hợp với sở thích, dịp tặng và ngân sách.
            </p>

            {/* ================= SEARCH ================= */}

            <div className="search-wrapper">
              <div className="search-box">
                <span className="search-icon">🔍</span>

                <input
                  id="searchInput"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ví dụ: Quà sinh nhật cho bạn gái thích mèo..."
                />

                {search && (
                  <button
                    className="clear-button"
                    onClick={() => {
                      setSearch("");
                    }}
                  >
                    ✕
                  </button>
                )}

                <button
                  className="search-button"
                  onClick={handleSearch}
                  disabled={loading}
                >
                  {loading ? "..." : "→"}
                </button>
              </div>
            </div>

            {/* ================= QUICK SEARCH ================= */}

            <div className="quick-search">
              <span className="quick-title">Tìm nhanh:</span>

              <button
                className="quick-chip"
                onClick={() => quickSearch("quà cho bạn gái nhân dịp 20/10")}
              >
                💐 Bạn gái 20/10
              </button>

              <button
                className="quick-chip"
                onClick={() => quickSearch("quà sinh nhật cho người yêu")}
              >
                💕 Người yêu
              </button>

              <button
                className="quick-chip"
                onClick={() => quickSearch("quà sinh nhật bạn trai thiết thực")}
              >
                🎂 Bạn trai
              </button>

              <button
                className="quick-chip"
                onClick={() => quickSearch("quà tặng mẹ nhân dịp 20/10 ý nghĩa")}
              >
                🌸 Tặng Mẹ
              </button>

              <button
                className="quick-chip"
                onClick={() => quickSearch("quà tặng người yêu dưới 500k")}
              >
                💰 Dưới 500K
              </button>

              <button
                className="quick-chip"
                onClick={() => quickSearch("quà halloween độc lạ")}
              >
                🎃 Halloween
              </button>
            </div>

            {/* ================= GREETING CARD QUICK CTA ================= */}

            <div className="hero-cta-group">
              <button
                className="hero-card-cta-btn"
                onClick={() => handleOpenCardModal()}
              >
                💌 Tạo thiệp chúc mừng AI với phông nền có sẵn
              </button>
            </div>

            {/* ================= ADVANCED ================= */}

            <button
              className={`advanced-search ${advancedOpen ? "active" : ""}`}
              onClick={() => setAdvancedOpen(!advancedOpen)}
            >
              ⚙ Tìm kiếm nâng cao
              <span>{advancedOpen ? "⌃" : "⌄"}</span>
            </button>

            {advancedOpen && (
              <div className="advanced-panel">
                <div className="filter-grid">
                  {/* RELATIONSHIP */}

                  <div className="form-group">
                    <label>Quan hệ</label>

                    <select
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                    >
                      <option value="">Chọn quan hệ</option>

                      <option>Bạn gái</option>

                      <option>Bạn trai</option>

                      <option>Người yêu</option>

                      <option>Vợ / Chồng</option>

                      <option>Bố / Mẹ</option>

                      <option>Bạn bè</option>

                      <option>Anh / Chị / Em</option>

                      <option>Đồng nghiệp / Sếp</option>

                      <option>Thầy / Cô giáo</option>
                    </select>
                  </div>

                  {/* GENDER */}

                  <div className="form-group">
                    <label>Giới tính</label>

                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <option value="">Không xác định</option>

                      <option>Nam</option>

                      <option>Nữ</option>

                      <option>Khác</option>
                    </select>
                  </div>

                  {/* AGE */}

                  <div className="form-group">
                    <label>Độ tuổi</label>

                    <select
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    >
                      <option value="">Chọn độ tuổi</option>

                      <option>Dưới 18</option>

                      <option>18 - 25</option>

                      <option>26 - 35</option>

                      <option>36 - 50</option>

                      <option>Trên 50</option>
                    </select>
                  </div>

                  {/* OCCASION */}

                  <div className="form-group">
                    <label>Dịp tặng</label>

                    <select
                      value={occasion}
                      onChange={(e) => setOccasion(e.target.value)}
                    >
                      <option value="">Chọn dịp</option>

                      <option>Ngày Phụ nữ 20/10</option>

                      <option>Quốc tế Phụ nữ 8/3</option>

                      <option>Sinh nhật</option>

                      <option>Valentine 14/2</option>

                      <option>Kỷ niệm</option>

                      <option>Ngày Nhà giáo 20/11</option>

                      <option>Giáng sinh</option>

                      <option>Halloween</option>

                      <option>Tốt nghiệp</option>

                      <option>Tân gia</option>

                      <option>Tết / Năm mới</option>
                    </select>
                  </div>

                  {/* BUDGET */}

                  <div className="form-group">
                    <label>Ngân sách</label>

                    <select
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                    >
                      <option value="">Không giới hạn</option>

                      <option>Dưới 100.000đ</option>

                      <option>100.000đ - 300.000đ</option>

                      <option>300.000đ - 500.000đ</option>

                      <option>500.000đ - 1.000.000đ</option>

                      <option>Trên 1.000.000đ</option>
                    </select>
                  </div>
                </div>

                {/* INTEREST */}

                <div className="interest-section">
                  <label>Sở thích</label>

                  <div className="interest-list">
                    {[
                      "🎮 Gaming",
                      "📚 Sách",
                      "🎵 Âm nhạc",
                      "💄 Làm đẹp",
                      "👗 Thời trang",
                      "⚽ Thể thao",
                      "📷 Công nghệ",
                      "☕ Cafe",
                    ].map((interest) => (
                      <button
                        key={interest}
                        className={`interest-chip ${
                          interests.includes(interest) ? "active" : ""
                        }`}
                        onClick={() => toggleInterest(interest)}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>

                {/* APPLY */}

                <button
                  className="apply-filter"
                  onClick={handleApplyFilter}
                  disabled={loading}
                >
                  🔍 Tìm kiếm
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================= RESULTS ================= */}

      {searched && (
        <section className="results" id="results">
          <div className="container">
            <div className="section-heading">
              <span className="section-label">AI RECOMMENDATION</span>

              <h2>Quà tặng được AI đề xuất</h2>

              <p>
                {loading
                  ? "AI đang phân tích nhu cầu và tìm gợi ý ngay từ cơ sở dữ liệu..."
                  : refreshing
                    ? `Đang hiển thị gợi ý từ CSDL & cào sản phẩm mới từ Lazada để xếp hạng lại cho "${search}"...`
                    : products.length > 0
                      ? `${products.length} sản phẩm phù hợp nhất cho "${search}"`
                      : "Không tìm thấy sản phẩm phù hợp."}
              </p>
            </div>

            {/* ================= AI SUMMARY ================= */}

            {!loading && !error && aiSummary && (
              <div
                className="advanced-panel"
                style={{
                  maxWidth: "850px",
                  margin: "30px auto 0",
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                  }}
                >
                  🤖 AI Recommendation
                </h3>

                <p
                  style={{
                    color: "#666",
                    lineHeight: 1.7,
                  }}
                >
                  {aiSummary}
                </p>

                {/* ATOMIC ITEMS */}
                {aiItems.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "12px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#e03131",
                      }}
                    >
                      🎯 Món đồ tìm kiếm:
                    </span>

                    {aiItems.map((item, index) => (
                      <span
                        key={index}
                        className="quick-chip"
                        style={{
                          background: "rgba(255, 79, 112, 0.1)",
                          color: "#ff4f70",
                          borderColor: "rgba(255, 79, 112, 0.3)",
                          fontWeight: 500,
                        }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}

                {/* KEYWORDS */}
                {aiKeywords.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#666",
                      }}
                    >
                      ✨ Đặc điểm:
                    </span>

                    {aiKeywords.map((keyword, index) => (
                      <span key={index} className="quick-chip">
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ================= LOADING ================= */}

            {loading && (
              <div className="loading">
                <div className="spinner"></div>

                <p>AI đang phân tích và tìm sản phẩm...</p>

                <small>Đang tìm kiếm trên các sàn thương mại điện tử</small>
              </div>
            )}

            {/* ================= REFRESHING ================= */}

            {refreshing && !loading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  margin: "24px auto",
                  padding: "12px 24px",
                  maxWidth: "750px",
                  borderRadius: "12px",
                  background:
                    "linear-gradient(135deg, rgba(255, 79, 112, 0.08), rgba(255, 154, 60, 0.08))",
                  border: "1px solid rgba(255, 79, 112, 0.3)",
                  color: "#d6336c",
                  fontSize: "14px",
                  fontWeight: 500,
                  boxShadow: "0 2px 10px rgba(255, 79, 112, 0.06)",
                }}
              >
                <div
                  className="spinner"
                  style={{
                    width: "18px",
                    height: "18px",
                    borderWidth: "2px",
                    borderColor: "rgba(214, 51, 108, 0.2)",
                    borderTopColor: "#d6336c",
                    margin: 0,
                  }}
                ></div>
                <span>
                  ⚡ Đã có gợi ý tức thì từ kho dữ liệu! Luồng Lazada đang cào
                  thêm sản phẩm mới và AI sẽ xếp hạng lại phù hợp nhất với
                  bạn...
                </span>
              </div>
            )}

            {/* ================= ERROR ================= */}

            {error && <div className="error-box">⚠️ {error}</div>}

            {/* ================= GUEST NOTICE BANNER ================= */}

            {!loading && !user && products.length > 0 && (
              <div className="guest-search-banner">
                <div className="guest-banner-left">
                  <span className="guest-banner-icon">💡</span>
                  <div className="guest-banner-text">
                    Bạn đang tìm kiếm dưới dạng <strong>Khách vãng lai</strong>. Hãy{" "}
                    <strong>Đăng nhập</strong> hoặc <strong>Đăng ký</strong> để tự động
                    lưu lại các gợi ý quà tặng này vào tài khoản của bạn!
                  </div>
                </div>
                <button
                  className="guest-banner-login-btn"
                  onClick={() => {
                    setAuthModalTab("login");
                    setAuthModalOpen(true);
                  }}
                >
                  Đăng nhập để lưu
                </button>
              </div>
            )}

            {/* ================= GREETING CARD PROMO BANNER ================= */}

            {!loading && !error && products.length > 0 && (
              <div className="card-banner-promo">
                <div className="card-banner-content">
                  <div className="card-banner-icon">💌</div>
                  <div className="card-banner-text">
                    <h4>Tạo thiệp chúc mừng ý nghĩa cùng món quà</h4>
                    <p>
                      AI viết lời chúc cảm xúc phù hợp với người nhận & món quà, nhiều phông nền có sẵn, tùy chỉnh tự do và tải ảnh HD miễn phí!
                    </p>
                  </div>
                </div>
                <button
                  className="card-banner-btn"
                  onClick={() => handleOpenCardModal()}
                >
                  Tạo thiệp chúc ngay →
                </button>
              </div>
            )}

            {/* ================= PRODUCTS ================= */}

            {!loading && !error && products.length > 0 && (
              <div className="product-grid">
                {products.map((product) => (
                  <div className="product-card" key={product.id}>
                    {/* IMAGE */}

                    <div className="product-image" style={{ position: "relative" }}>
                      {/* NÚT LƯU QUÀ YÊU THÍCH */}
                      <button
                        className={`product-card-fav-btn ${
                          favoriteNames.has(product.name) ? "favorited" : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(product);
                        }}
                        title={
                          favoriteNames.has(product.name)
                            ? "Bỏ lưu quà này"
                            : "Lưu vào quà yêu thích"
                        }
                      >
                        {favoriteNames.has(product.name) ? "❤️" : "🤍"}
                      </button>

                      {product.image && !product.image.startsWith("data:") ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(event) => {
                            const target = event.currentTarget;
                            // Thử tải qua proxy nếu ảnh gốc bị chặn hotlink
                            if (
                              !target.dataset.proxied &&
                              product.image &&
                              product.image.startsWith("http")
                            ) {
                              target.dataset.proxied = "true";
                              target.src = `${API_URL}/api/image-proxy?url=${encodeURIComponent(product.image)}`;
                            } else {
                              target.style.display = "none";
                              const parent = target.parentElement;
                              if (parent && !parent.querySelector(".no-image")) {
                                const placeholder = document.createElement("div");
                                placeholder.className = "no-image";
                                placeholder.innerHTML = "🎁";
                                parent.appendChild(placeholder);
                              }
                            }
                          }}
                        />
                      ) : (
                        <div className="no-image">🎁</div>
                      )}
                    </div>

                    {/* INFO */}

                    <div className="product-info">
                      {/* SOURCE */}

                      {getProductSource(product) && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#888",
                            marginBottom: "7px",
                          }}
                        >
                          🛒 {getProductSource(product)}
                        </div>
                      )}

                      <h3>{product.name}</h3>

                      {/* AI SCORE */}

                      {typeof product.score === "number" && (
                        <div
                          style={{
                            marginBottom: "10px",
                            fontSize: "14px",
                            fontWeight: 700,
                            color: "#ff4f70",
                          }}
                        >
                          🤖 AI Score: {product.score}
                          /100
                        </div>
                      )}

                      {/* PRICE */}

                      <div className="product-price">
                        {formatPrice(product.price, product.currency)}
                      </div>

                      {/* CATEGORY */}

                      {product.category && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#888",
                            marginBottom: "8px",
                          }}
                        >
                          📦 {product.category}
                        </div>
                      )}

                      {/* AI REASON */}

                      {product.reason && (
                        <p
                          style={{
                            color: "#777",
                            fontSize: "13px",
                            lineHeight: 1.5,
                            margin: "0 0 15px",
                          }}
                        >
                          💡 {product.reason}
                        </p>
                      )}

                      {/* PRODUCT ACTIONS */}

                      <div className="product-actions-group">
                        {product.url && (
                          <a
                            href={product.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="product-button"
                            onClick={() => trackProductClick(product.name)}
                          >
                            Xem sản phẩm →
                          </a>
                        )}

                        <button
                          className="card-gift-action-btn"
                          onClick={() => handleOpenCardModal(product)}
                          title="Tạo thiệp chúc mừng đính kèm món quà này"
                        >
                          💌 Tạo thiệp cùng món quà này
                        </button>

                        <button
                          className="card-memory-box-btn"
                          onClick={() => handleOpenMemoryBoxModal(product)}
                          title="Đóng gói món quà này vào Hộp Quà Kỷ Niệm Ảo 3D & chia sẻ MXH"
                        >
                          🎁 Đóng gói Hộp Kỷ Niệm (Mới)
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ================= EMPTY ================= */}

            {!loading && !error && products.length === 0 && (
              <div className="empty-result">
                Không tìm thấy sản phẩm phù hợp.
                <br />
                <small
                  style={{
                    display: "block",
                    marginTop: "8px",
                    color: "#888",
                  }}
                >
                  Hãy thử mô tả cụ thể hơn hoặc thay đổi bộ lọc.
                </small>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ================= FEATURES ================= */}

      <section className="features" id="features">
        <div className="container">
          <div className="section-heading">
            <span className="section-label">GIFT FINDER</span>

            <h2>Tìm kiếm dễ dàng hơn</h2>

            <p>
              Chỉ cần cho chúng tôi biết một chút thông tin, việc tìm quà sẽ trở
              nên đơn giản hơn.
            </p>
          </div>

          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">🔍</div>

              <h3>Tìm kiếm tự nhiên</h3>

              <p>Mô tả món quà bạn đang tìm bằng ngôn ngữ tự nhiên.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">⚙</div>

              <h3>Bộ lọc linh hoạt</h3>

              <p>Lọc theo sở thích, dịp, độ tuổi và ngân sách.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🤖</div>

              <h3>AI Recommendation</h3>

              <p>
                AI phân tích nhu cầu và đề xuất những món quà phù hợp nhất từ
                nhiều nguồn sản phẩm.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}

      <footer className="footer">
        <div className="container footer-container">
          <div className="footer-brand">
            <div className="logo">
              <div className="logo-icon">🎁</div>

              <div className="logo-text">
                <span>Gift</span>Finder
              </div>
            </div>

            <p>Tìm món quà phù hợp cho những người bạn yêu thương.</p>
          </div>

          <div className="footer-copy">© 2026 GiftFinder</div>
        </div>
      </footer>

      {/* ================= GREETING CARD MODAL ================= */}

      <GreetingCardModal
        isOpen={cardModalOpen}
        onClose={() => setCardModalOpen(false)}
        initialContext={cardContext}
      />

      {/* ================= AUTH MODAL (ĐĂNG NHẬP / ĐĂNG KÝ) ================= */}

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authModalTab}
        onAuthSuccess={handleAuthSuccess}
        apiUrl={API_URL}
      />

      {/* ================= USER HISTORY MODAL (LỊCH SỬ GỢI Ý QUÀ) ================= */}

      <UserHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        token={token}
        apiUrl={API_URL}
        onRerunSearch={handleRerunSearch}
      />

      {/* ================= USER FAVORITES MODAL (QUÀ YÊU THÍCH) ================= */}

      <UserFavoritesModal
        isOpen={favoritesModalOpen}
        onClose={() => setFavoritesModalOpen(false)}
        token={token}
        apiUrl={API_URL}
      />

      {/* ================= MEMORY BOX MODAL (HỘP QUÀ KỶ NIỆM ẢO 3D & CHIA SẺ MXH) ================= */}

      <MemoryBoxModal
        isOpen={memoryBoxModalOpen}
        onClose={() => setMemoryBoxModalOpen(false)}
        initialProduct={selectedProductForBox}
        initialOccasion={occasion}
        initialRelationship={relationship}
        token={token}
        onOpenViewer={(code) => {
          setMemoryBoxModalOpen(false);
          setViewerShareCode(code);
        }}
      />

      {/* ================= MY MEMORY BOXES MODAL (QUẢN LÝ HỘP QUÀ CỦA TÔI) ================= */}

      <MyMemoryBoxesModal
        isOpen={myMemoryBoxesOpen}
        onClose={() => setMyMemoryBoxesOpen(false)}
        token={token}
        onOpenViewer={(code) => {
          setMyMemoryBoxesOpen(false);
          setViewerShareCode(code);
        }}
        onCreateNew={() => {
          setSelectedProductForBox(null);
          setMemoryBoxModalOpen(true);
        }}
      />
    </div>
  );
}

export default App;
