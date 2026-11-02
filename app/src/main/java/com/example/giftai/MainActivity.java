package com.example.giftai;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    // =========================================================================
    // CẤU HÌNH ĐỊA CHỈ TRUY CẬP (APP URL)
    // =========================================================================
    // - Khi chạy trên máy ảo Android kết nối server trên máy tính:
    //   Máy ảo coi máy tính host là IP 10.0.2.2 (VD: "http://10.0.2.2:5173")
    // - Khi bạn đã deploy lên Vercel: điền link Vercel vào đây (VD: "https://giftai.vercel.app")
    // =========================================================================
    public static final String APP_URL = "http://10.0.2.2:5173";

    private WebView webView;
    private ProgressBar progressBar;
    private LinearLayout errorLayout;
    private Button retryBtn;

    private long lastBackPressTime = 0;
    private ValueCallback<Uri[]> fileUploadCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        initViews();
        setupWebView();
        setupBackNavigation();

        // Tải trang web chính
        loadApp();
    }

    private void initViews() {
        webView = findViewById(R.id.webView);
        progressBar = findViewById(R.id.progressBar);
        errorLayout = findViewById(R.id.errorLayout);
        retryBtn = findViewById(R.id.retryBtn);

        retryBtn.setOnClickListener(v -> {
            errorLayout.setVisibility(View.GONE);
            webView.setVisibility(View.VISIBLE);
            webView.reload();
        });
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = webView.getSettings();

        // Kích hoạt JavaScript & Lưu trữ dữ liệu LocalStorage (bắt buộc cho React)
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);

        // Hỗ trợ hiển thị giao diện Web Responsive trên mobile
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);

        // Cho phép truy cập file & mixed content (HTTP/HTTPS)
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // Tối ưu bộ nhớ cache
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Đặt User-Agent để web nhận diện là app Android
        String defaultUA = settings.getUserAgentString();
        settings.setUserAgentString(defaultUA + " GiftAI-Android-App/1.0");

        // Xử lý mở link & bắt lỗi trang
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();

                // Nếu là link nội bộ app (10.0.2.2, localhost hoặc domain web của bạn)
                if (url.contains("10.0.2.2") || url.contains("localhost") || url.contains("vercel.app") || url.startsWith("file://")) {
                    return false; // Mở tiếp tục trong WebView
                }

                // Nếu là link sàn thương mại điện tử (Lazada, Shopee) hoặc MXH (Facebook, Zalo) -> Mở bằng trình duyệt ngoài
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                } catch (Exception e) {
                    return false;
                }
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                progressBar.setVisibility(View.VISIBLE);
                errorLayout.setVisibility(View.GONE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                progressBar.setVisibility(View.GONE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame()) {
                    String failedUrl = request.getUrl().toString();
                    // Nếu kết nối tới dev server 10.0.2.2 thất bại, tự động chuyển sang bản web tích hợp sẵn trong App
                    if (failedUrl.contains("10.0.2.2") && !failedUrl.startsWith("file://")) {
                        view.loadUrl("file:///android_asset/www/index.html");
                        return;
                    }
                    progressBar.setVisibility(View.GONE);
                    webView.setVisibility(View.GONE);
                    errorLayout.setVisibility(View.VISIBLE);
                }
            }
        });

        // Xử lý thanh tiến trình tải trang & hộp thoại JavaScript (Alert, Confirm)
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
                if (newProgress == 100) {
                    progressBar.setVisibility(View.GONE);
                } else {
                    progressBar.setVisibility(View.VISIBLE);
                }
            }

            @Override
            public boolean onJsAlert(WebView view, String url, String message, android.webkit.JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                        .setTitle("Thông báo")
                        .setMessage(message)
                        .setPositiveButton("OK", (dialog, which) -> result.confirm())
                        .setCancelable(false)
                        .show();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, android.webkit.JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                        .setTitle("Xác nhận")
                        .setMessage(message)
                        .setPositiveButton("Đồng ý", (dialog, which) -> result.confirm())
                        .setNegativeButton("Hủy", (dialog, which) -> result.cancel())
                        .setCancelable(false)
                        .show();
                return true;
            }
        });
    }

    private void setupBackNavigation() {
        // Xử lý nút Back của điện thoại Android
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    // Nhấn 2 lần trong vòng 2 giây để thoát app
                    if (System.currentTimeMillis() - lastBackPressTime < 2000) {
                        setEnabled(false);
                        getOnBackPressedDispatcher().onBackPressed();
                    } else {
                        lastBackPressTime = System.currentTimeMillis();
                        Toast.makeText(MainActivity.this, "Nhấn lần nữa để thoát ứng dụng", Toast.LENGTH_SHORT).show();
                    }
                }
            }
        });
    }

    private void loadApp() {
        errorLayout.setVisibility(View.GONE);
        webView.setVisibility(View.VISIBLE);
        webView.loadUrl(APP_URL);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) webView.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
