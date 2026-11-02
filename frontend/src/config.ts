const getAutoApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Khi chạy localhost dev trên máy tính
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  ) {
    return "http://localhost:5000";
  }
  // Khi chạy trên máy ảo Android trỏ về localhost của máy tính dev
  if (
    typeof window !== "undefined" &&
    window.location.hostname === "10.0.2.2"
  ) {
    return "http://10.0.2.2:5000";
  }
  // Mặc định cho Production (Vercel & App Android chạy online 24/7 không cần bật máy tính)
  return "https://giftai-964g.onrender.com";
};

export const API_URL = getAutoApiUrl();
