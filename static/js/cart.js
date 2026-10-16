// Đóng gói các hàm của giỏ hàng để không làm rò rỉ biến ra phạm vi toàn trang.
(() => {
  const storageKey = "nexus_cart";
  const money = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

  // Đọc giỏ từ localStorage, kiểm tra dữ liệu và bỏ các mặt hàng không hợp lệ.
  function readCart() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {};

      const cart = {};
      Object.entries(saved).forEach(([id, item]) => {
        const variantId = Number(id);
        const quantity = Number(item?.quantity);
        if (!Number.isSafeInteger(variantId) || variantId < 1 || !Number.isSafeInteger(quantity) || quantity < 1) {
          return;
        }
        const stock = Number(item.stock);
        const price = Number(item.price);
        cart[id] = {
          ...item,
          variant_id: variantId,
          quantity,
          stock: Number.isSafeInteger(stock) && stock >= 0 ? stock : 0,
          price: Number.isFinite(price) && price >= 0 ? price : 0,
        };
      });
      return cart;
    } catch (_error) {
      return {};
    }
  }

  // Lưu giỏ vào localStorage rồi cập nhật số lượng trên header và phần thanh toán.
  function persistCart(cart) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
      updateCartCount();
      renderCheckout();
      return true;
    } catch (_error) {
      return false;
    }
  }

  // Lưu giỏ và vẽ lại nội dung trang giỏ hàng.
  function saveCart(cart) {
    if (!persistCart(cart)) return false;
    renderCartPage();
    return true;
  }

  // Định dạng một số tiền theo cách hiển thị tiền Việt Nam.
  function formatPrice(value) {
    return `${money.format(Number(value) || 0)} ₫`;
  }

  // Chỉ chấp nhận đường dẫn nội bộ tới trang sản phẩm.
  function productUrl(value) {
    try {
      const url = new URL(value || "/products/", window.location.origin);
      if (url.origin === window.location.origin && url.pathname.startsWith("/products/")) {
        return url.href;
      }
    } catch (_error) {
      // Use the collection page for an invalid URL saved in the browser.
    }
    return "/products/";
  }

  // Trả về các mặt hàng đang có trong giỏ dưới dạng danh sách.
  function cartItems() {
    return Object.values(readCart());
  }

  // Tính và hiển thị tạm tính cùng tổng tiền trên trang giỏ hàng.
  function updateCartSummary(items) {
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );
    const text = formatPrice(subtotal);
    ["subtotal", "totalPrice"].forEach((id) => {
      const target = document.getElementById(id);
      if (target) target.textContent = text;
    });
  }

  // Cập nhật huy hiệu số lượng sản phẩm trên biểu tượng giỏ hàng.
  function updateCartCount() {
    const badge = document.getElementById("header-cart-count");
    if (!badge) return;
    const count = cartItems().reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    badge.textContent = String(count);
    badge.style.display = count > 0 ? "flex" : "none";
  }

  // Tạo phần tử HTML và gán lớp hoặc nội dung chữ nếu được cung cấp.
  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  // Vẽ các mặt hàng, số lượng, thành tiền và trạng thái giỏ hàng trên trang.
  function renderCartPage() {
    const table = document.getElementById("cartItems");
    const body = table?.querySelector("tbody");
    if (!body) return;

    const items = cartItems();
    const empty = document.getElementById("cart-empty");
    const content = document.getElementById("cart-content");
    const lead = document.getElementById("cart-lead");
    if (empty) {
      empty.hidden = items.length > 0;
      empty.style.display = items.length > 0 ? "none" : "";
    }
    if (content) {
      content.hidden = items.length === 0;
      content.style.display = items.length > 0 ? "grid" : "none";
    }
    if (lead) {
      lead.hidden = items.length === 0;
      lead.style.display = items.length > 0 ? "block" : "none";
    }
    body.replaceChildren();

    // Tạo một dòng bảng cho từng mặt hàng trong giỏ.
    items.forEach((item) => {
      const id = String(item.variant_id);
      const quantity = Number(item.quantity);
      const price = Number(item.price) || 0;
      const stock = Number(item.stock) || 0;
      const lineTotal = price * quantity;
      const row = makeElement("tr");
      const productCell = makeElement("td");
      const product = makeElement("div", "cart-product");
      const href = productUrl(item.url);
      const imageLink = makeElement("a", "cart-product-image");
      imageLink.href = href;
      if (item.image) {
        try {
          const imageUrl = new URL(item.image, window.location.origin);
          if (imageUrl.origin === window.location.origin) {
            const image = makeElement("img");
            image.src = imageUrl.href;
            image.alt = String(item.name || "Sản phẩm Nexus");
            imageLink.append(image);
          }
        } catch (_error) {
          // Bỏ qua URL hình ảnh không hợp lệ được lưu trong trình duyệt.
        }
      }
      if (!imageLink.childElementCount) imageLink.append(makeElement("span", "", "NEXUS"));

      const info = makeElement("div");
      const nameLink = makeElement("a", "cart-product-name", String(item.name || "Sản phẩm"));
      nameLink.href = href;
      info.append(nameLink);
      info.append(makeElement("div", "cart-product-meta", `${item.size || ""} · ${item.color || ""}`));
      product.append(imageLink, info);
      productCell.append(product);

      const priceCell = makeElement("td", "", formatPrice(price));
      const quantityCell = makeElement("td");
      const quantityControl = makeElement("div", "cart-quantity-control");
      quantityControl.dataset.variantId = id;

      const input = makeElement("input");
      input.type = "number";
      input.min = "1";
      input.max = String(Math.max(stock, 1));
      input.value = String(quantity);
      input.setAttribute("aria-label", `Số lượng ${item.name || "sản phẩm"}`);

      quantityControl.append(input);
      quantityCell.append(quantityControl);

      const totalCell = makeElement("td", "cart-line-total", formatPrice(lineTotal));
      const removeCell = makeElement("td");
      const remove = makeElement("button", "btn btn-outline cart-remove", "Xóa");
      remove.type = "button";
      remove.dataset.action = "remove";
      remove.dataset.variantId = id;
      removeCell.append(remove);
      row.append(productCell, priceCell, quantityCell, totalCell, removeCell);
      body.append(row);

      if (stock < quantity) {
        const warning = makeElement("div", "cart-stock-alert", `Trong kho hiện còn ${stock}.`);
        warning.setAttribute("role", "alert");
        info.append(warning);
      }
    });

    updateCartSummary(items);
  }

  // Vẽ danh sách sản phẩm và tổng tiền trong phần tóm tắt thanh toán.
  function renderCheckout() {
    const container = document.getElementById("checkoutItems");
    if (!container) return;

    const items = cartItems();
    const empty = document.getElementById("checkoutEmpty");
    const submit = document.getElementById("submitCheckout");
    if (empty) {
      empty.hidden = items.length > 0;
      empty.style.display = items.length > 0 ? "none" : "block";
    }
    if (submit) submit.disabled = items.length === 0;
    container.replaceChildren();

    let subtotal = 0;
    // Thêm tên, lựa chọn và thành tiền của từng sản phẩm vào bảng tóm tắt.
    items.forEach((item) => {
      const quantity = Number(item.quantity);
      const lineTotal = (Number(item.price) || 0) * quantity;
      subtotal += lineTotal;
      const row = makeElement("div", "checkout-item");
      const description = makeElement("span", "", `${item.name || "Sản phẩm"}`);
      description.append(
        makeElement("br"),
        makeElement("small", "", `${item.size || ""} · ${item.color || ""} × ${quantity}`)
      );
      row.append(description, makeElement("strong", "", formatPrice(lineTotal)));
      container.append(row);
    });

    ["checkoutSubtotal", "checkoutTotal"].forEach((id) => {
      const target = document.getElementById(id);
      if (target) target.textContent = formatPrice(subtotal);
    });
  }

  // Hiển thị thông báo kết quả ngay bên dưới biểu mẫu chọn sản phẩm.
  function showProductFeedback(form, text) {
    let feedback = form.querySelector("[data-cart-feedback]");
    if (!feedback) {
      feedback = makeElement("p", "variant-status");
      feedback.dataset.cartFeedback = "true";
      feedback.setAttribute("role", "status");
      feedback.setAttribute("aria-live", "polite");
      form.append(feedback);
    }
    feedback.textContent = text;
  }

  // Gắn xử lý thêm biến thể sản phẩm vào giỏ từ trang chi tiết sản phẩm.
  function connectProductForm() {
    const form = document.getElementById("product-selection-form");
    if (!form) return;

    // Kiểm tra lựa chọn, tồn kho và lưu sản phẩm khi biểu mẫu được gửi.
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const selected = form.querySelector("#variant-select")?.selectedOptions[0];
      const quantity = Number(form.querySelector('[name="quantity"]')?.value || 1);
      if (!selected?.value) {
        showProductFeedback(form, "Vui lòng chọn size và màu.");
        return;
      }

      const stock = Number(selected.dataset.stock || 0);
      const cart = readCart();
      const id = String(selected.value);
      const newQuantity = Number(cart[id]?.quantity || 0) + quantity;
      if (!Number.isInteger(quantity) || quantity < 1 || newQuantity > stock) {
        showProductFeedback(form, `Số lượng không hợp lệ. Trong kho còn ${stock}.`);
        return;
      }

      const name = document.querySelector(".detail-title")?.textContent.trim() || "Sản phẩm";
      const priceText = document.querySelector(".detail-price")?.textContent || "0";
      const price = Number(priceText.replace(/[^\d]/g, "")) || 0;
      const image = document.querySelector(".gallery-main img")?.getAttribute("src") || "";
      cart[id] = {
        variant_id: Number(id),
        name,
        size: selected.dataset.size || "",
        color: selected.dataset.color || "",
        price,
        stock,
        image,
        url: window.location.pathname,
        quantity: newQuantity,
      };

      if (!saveCart(cart)) {
        showProductFeedback(form, "Không thể lưu giỏ hàng trong trình duyệt.");
        return;
      }
      showProductFeedback(form, "Đã thêm sản phẩm vào giỏ hàng.");
    });
  }

  // Gắn xử lý đổi số lượng và xóa sản phẩm trên trang giỏ hàng.
  function connectCartControls() {
    const container = document.querySelector("#cartItems tbody");
    if (!container) return;

    // Lưu số lượng mới rồi cập nhật thành tiền mà không vẽ lại dòng đang nhập.
    function updateQuantity(control) {
      const cart = readCart();
      const item = cart[control.dataset.variantId];
      if (!item) return false;

      const input = control.querySelector('input[type="number"]');
      const requested = Number(input?.value);
      if (!Number.isInteger(requested) || requested < 1) return false;

      item.quantity = Math.min(requested, Math.max(item.stock, 1));
      if (!persistCart(cart)) return false;

      input.value = String(item.quantity);
      const row = control.closest("tr");
      const lineTotal = row?.querySelector(".cart-line-total");
      if (lineTotal) lineTotal.textContent = formatPrice(item.price * item.quantity);
      updateCartSummary(Object.values(cart));
      return true;
    }

    // Cập nhật giá ngay khi người dùng nhập một số lượng hợp lệ.
    container.addEventListener("input", (event) => {
      const input = event.target.closest('.cart-quantity-control input[type="number"]');
      if (input) updateQuantity(input.closest(".cart-quantity-control"));
    });

    // Khôi phục giá trị đã lưu nếu người dùng để số lượng trống hoặc sai.
    container.addEventListener("change", (event) => {
      const input = event.target.closest('.cart-quantity-control input[type="number"]');
      if (input && !updateQuantity(input.closest(".cart-quantity-control"))) renderCartPage();
    });

    // Xóa mặt hàng được chọn khỏi giỏ và cập nhật lại trang.
    container.addEventListener("click", (event) => {
      const button = event.target.closest('button[data-action="remove"]');
      if (!button) return;
      const id = button.dataset.variantId;
      const cart = readCart();
      delete cart[id];
      saveCart(cart);
    });
  }

  // Gắn xử lý gửi thông tin người nhận và tạo đơn hàng từ trang thanh toán.
  function connectCheckoutForm() {
    const form = document.getElementById("checkoutForm");
    if (!form) return;

    // Tìm hoặc tạo vùng thông báo trạng thái gửi đơn hàng.
    function feedbackElement() {
      let feedback = document.getElementById("checkoutFeedback");
      if (!feedback) {
        feedback = makeElement("p", "checkout-note");
        feedback.id = "checkoutFeedback";
        feedback.setAttribute("role", "status");
        feedback.setAttribute("aria-live", "polite");
        form.querySelector(".checkout-note")?.before(feedback);
      }
      return feedback;
    }

    // Gửi dữ liệu đơn tới máy chủ và chuyển trang khi tạo đơn thành công.
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const items = cartItems();
      const submit = document.getElementById("submitCheckout");
      if (!items.length) {
        feedbackElement().textContent = "Giỏ hàng đang trống.";
        return;
      }

      const payload = Object.fromEntries(new FormData(form).entries());
      payload.items = items.map(({ variant_id, quantity }) => ({ variant_id, quantity }));
      if (submit) submit.disabled = true;
      feedbackElement().textContent = "Đang tạo đơn hàng…";

      try {
        const response = await fetch(form.action, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "X-CSRFToken": payload.csrfmiddlewaretoken,
          },
          body: JSON.stringify(payload),
        });

        if (response.redirected) {
          window.location.assign(response.url);
          return;
        }
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.status !== "success") {
          throw new Error(result.message || "Không thể tạo đơn hàng. Vui lòng thử lại.");
        }

        saveCart({});
        window.location.assign(result.redirect_url);
      } catch (error) {
        feedbackElement().textContent = error.message;
      } finally {
        if (submit) submit.disabled = cartItems().length === 0;
      }
    });
  }

  updateCartCount();
  renderCartPage();
  renderCheckout();
  connectProductForm();
  connectCartControls();
  connectCheckoutForm();
  // Đồng bộ số lượng và nội dung nếu giỏ bị thay đổi ở một tab khác.
  window.addEventListener("storage", () => {
    updateCartCount();
    renderCartPage();
    renderCheckout();
  });
})();
