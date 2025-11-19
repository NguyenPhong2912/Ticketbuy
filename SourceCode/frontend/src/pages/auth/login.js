const resolveApiBaseUrl = () => {
  const { origin, pathname } = window.location;
  const [projectRoot] = pathname.split("/frontend/");
  return `${origin}${projectRoot}/backend/public`;
};

const API_BASE_URL = resolveApiBaseUrl();

document.addEventListener("DOMContentLoaded", () => {
  const formToggle = document.getElementById("formToggle");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const notificationStack = document.getElementById("notificationStack");
  const forgotPasswordLink = document.getElementById("forgotPasswordLink");
  const forgotPasswordModal = document.getElementById("forgotPasswordModal");
  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  const closeForgotModal = document.getElementById("closeForgotModal");
  const cancelForgotBtn = document.getElementById("cancelForgotBtn");

  // Helper: Show notification using Notifications component
  const showNotification = (message, type = "success", timeout = 3000) => {
    // Remove existing notifications
    const existing = notificationStack.querySelectorAll('.notification-card');
    existing.forEach(n => n.remove());

    const notification = document.createElement("div");
    notification.className = `notification-card ${type === "error" ? "error-card" : type === "info" ? "info-card" : ""}`;
    
    // Determine icon based on type
    let iconSvg = '';
    if (type === "success") {
      iconSvg = `<svg width="48" viewBox="0 -960 960 960" height="48" xmlns="http://www.w3.org/2000/svg"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" fill="currentColor"/></svg>`;
    } else if (type === "error") {
      iconSvg = `<svg width="48" viewBox="0 -960 960 960" height="48" xmlns="http://www.w3.org/2000/svg"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" fill="currentColor"/></svg>`;
    } else {
      iconSvg = `<svg width="48" viewBox="0 -960 960 960" height="48" xmlns="http://www.w3.org/2000/svg"><path d="M480-280q17 0 28.5-11.5T520-320v-160q0-17-11.5-28.5T480-520q-17 0-28.5 11.5T440-480v160q0 17 11.5 28.5T480-280Zm0-280q17 0 28.5-11.5T520-600q0-17-11.5-28.5T480-640q-17 0-28.5 11.5T440-600q0 17 11.5 28.5T480-560Zm0 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-157q-54 54-127 85.5T480-40Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" fill="currentColor"/></svg>`;
    }

    notification.innerHTML = `
      <div class="card-content">
        <div class="card-top">
          <span class="card-title">${type === "success" ? "Thành công" : type === "error" ? "Lỗi" : "Thông báo"}</span>
        </div>
        <div class="card-bottom">
          <p>${message}</p>
        </div>
      </div>
      <div class="card-image">
        ${iconSvg}
      </div>
    `;

    notificationStack.appendChild(notification);

    // Trigger animation
    requestAnimationFrame(() => {
      notification.style.opacity = "1";
      notification.style.transform = "translateY(0) scale(1)";
    });

    // Auto remove after timeout
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transform = "translateY(-20px) scale(0.95)";
      setTimeout(() => notification.remove(), 400);
    }, timeout);
  };

  // Keep showToast for backward compatibility, but use showNotification
  const showToast = (message, type = "info", timeout = 2600) => {
    showNotification(message, type === "error" ? "error" : type === "success" ? "success" : "info", timeout);
  };

  // Toggle form between login and register
  if (formToggle) {
    formToggle.addEventListener("change", (e) => {
      // The flip animation is handled by CSS
      // We just need to ensure forms are properly set up
      if (e.target.checked) {
        // Register mode
        console.log("Switched to register");
      } else {
        // Login mode
        console.log("Switched to login");
      }
    });
  }

  // Note: Password visibility toggle is not needed for flip-card forms
  // as they use standard password inputs without toggle buttons

  // Login flow - call backend API
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const identifier = document.getElementById("loginIdentifier").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    const remember = document.getElementById("rememberMe").checked;

    if (identifier.length < 4) {
      showToast("Vui lòng nhập email hoặc số điện thoại hợp lệ.", "error");
      return;
    }

    if (password.length < 4) {
      showToast("Mật khẩu phải có ít nhất 4 ký tự.", "error");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier,
          password,
          remember,
        }),
      });

      // Check content type before parsing JSON
      const contentType = response.headers.get('Content-Type') || '';
      let payload;
      
      if (contentType.includes('application/json')) {
        payload = await response.json();
      } else {
        // If not JSON, get text response (likely an error page)
        const text = await response.text();
        console.error('API returned non-JSON response:', text.substring(0, 200));
        throw new Error('Lỗi kết nối đến server. Vui lòng kiểm tra lại đường dẫn API.');
      }

      if (!response.ok) {
        throw new Error(payload.message || "Đăng nhập thất bại. Thử lại nhé!");
      }

      const { token, user } = payload.data ?? {};

      if (!token || !user) {
        throw new Error("Hệ thống không trả về thông tin đăng nhập hợp lệ.");
      }

      try {
        localStorage.setItem("authToken", token);
        localStorage.setItem("currentUser", JSON.stringify(user));
      } catch (storageError) {
        console.warn("Không thể lưu thông tin đăng nhập vào localStorage.", storageError);
      }

      const redirect =
        user.role === "admin"
          ? "../admin/dashboard/dashboard.html"
          : "../user/home page/index.html";

      showToast(`Đăng nhập thành công! Xin chào ${user.name || "bạn"}!`, "success");

      setTimeout(() => {
        // Sử dụng replace để tránh cache và đảm bảo load lại tất cả resources
        const redirectUrl = redirect + (redirect.includes('?') ? '&' : '?') + '_t=' + Date.now();
        window.location.replace(redirectUrl);
      }, 800);
    } catch (error) {
      console.error(error);
      showToast(error.message, "error");
    }
  });

  // Registration flow - call backend API
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fullName = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const phone = document.getElementById("registerPhone").value.trim();
    const password = document.getElementById("registerPassword").value.trim();

    if (fullName.length < 3) {
      showToast("Tên quá ngắn. Vui lòng kiểm tra lại.", "error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast("Email chưa đúng định dạng.", "error");
      return;
    }

    if (phone.replace(/\D/g, "").length < 9) {
      showToast("Số điện thoại cần tối thiểu 9 chữ số.", "error");
      return;
    }

    if (password.length < 6) {
      showToast("Mật khẩu cần ít nhất 6 ký tự.", "error");
      return;
    }

    const payload = {
      name: fullName,
      email,
      phone,
      password,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Không thể tạo tài khoản.");
      }

      showToast("Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.", "success");
      registerForm.reset();
      // Switch back to login form
      if (formToggle) {
        formToggle.checked = false;
      }
    } catch (error) {
      console.error(error);
      showToast(error.message, "error");
    }
  });

  // Forgot Password Modal handlers
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", (e) => {
      e.preventDefault();
      if (forgotPasswordModal) {
        forgotPasswordModal.style.display = "flex";
      }
    });
  }

  const closeModal = () => {
    if (forgotPasswordModal) {
      forgotPasswordModal.style.display = "none";
      if (forgotPasswordForm) {
        forgotPasswordForm.reset();
      }
    }
  };

  if (closeForgotModal) {
    closeForgotModal.addEventListener("click", closeModal);
  }

  if (cancelForgotBtn) {
    cancelForgotBtn.addEventListener("click", closeModal);
  }

  // Close modal when clicking outside
  if (forgotPasswordModal) {
    forgotPasswordModal.addEventListener("click", (e) => {
      if (e.target === forgotPasswordModal) {
        closeModal();
      }
    });
  }

  // Forgot Password Form submission
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const emailInput = document.getElementById("forgotEmail");
      if (!emailInput) return;

      const email = emailInput.value.trim();

      if (!email) {
        showToast("Vui lòng nhập email.", "error");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showToast("Email không hợp lệ.", "error");
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Không thể reset mật khẩu.");
        }

        showToast(data.message || "Mật khẩu đã được reset thành công!", "success");
        closeModal();
      } catch (error) {
        console.error(error);
        showToast(error.message, "error");
      }
    });
  }
});

