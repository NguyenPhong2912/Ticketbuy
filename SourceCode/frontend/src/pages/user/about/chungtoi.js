

document.addEventListener("DOMContentLoaded", () => {

  
  const fadeElements = document.querySelectorAll(".contact-section, .contact-info, .contact-map");

  function handleScrollFade() {
    fadeElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight - 100) {
        el.classList.add("show");
      }
    });
  }

  window.addEventListener("scroll", handleScrollFade);
  handleScrollFade();


  
  const scrollBtn = document.createElement("button");
  scrollBtn.innerText = "↑";
  scrollBtn.className = "scroll-top-btn";
  document.body.appendChild(scrollBtn);

  scrollBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
      scrollBtn.classList.add("show");
    } else {
      scrollBtn.classList.remove("show");
    }
  });


  
  const mapFrame = document.querySelector("iframe");

  mapFrame.addEventListener("error", () => {
    alert("Không thể tải bản đồ. Vui lòng kiểm tra kết nối mạng.");
  });

 
  console.log("Trang Liên hệ GreenBus đã được tải hoàn tất");
});
