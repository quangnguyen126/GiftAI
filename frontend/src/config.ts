const getAutoApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Tự động nhận diện khi chạy trên máy ảo Android (10.0.2.2 là máy tính host)
  if (typeof window !== "undefined" && window.location.hostname === "10.0.2.2") {
    return "http://10.0.2.2:5000";
  }
  return "http://localhost:5000";
};

export const API_URL = getAutoApiUrl();
