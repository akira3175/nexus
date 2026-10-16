document.addEventListener("DOMContentLoaded", () => {
  const variantSelect = document.getElementById("variant-select");
  const quantityInput = document.getElementById("detail-quantity");
  const minusButton = document.getElementById("detail-qty-minus");
  const plusButton = document.getElementById("detail-qty-plus");
  const status = document.getElementById("variant-status");
  const addButton = document.getElementById("detail-add-to-cart");

  function updateQuantityControls() {
    const selected = variantSelect?.selectedOptions[0];
    const stock = Number(selected?.dataset.stock || 0);
    const hasVariant = Boolean(selected?.value) && stock > 0;

    if (!quantityInput || !minusButton || !plusButton) return;
    quantityInput.disabled = !hasVariant;
    minusButton.disabled = !hasVariant;
    plusButton.disabled = !hasVariant;
    if (addButton) addButton.disabled = !hasVariant;

    if (!hasVariant) {
      quantityInput.value = "1";
      quantityInput.max = "1";
      if (status && variantSelect?.options.length > 1) status.textContent = "Vui lòng chọn size và màu.";
      return;
    }

    quantityInput.max = String(stock);
    quantityInput.value = String(Math.min(Math.max(Number(quantityInput.value) || 1, 1), stock));
    if (status) status.textContent = `Biến thể này còn ${stock} sản phẩm.`;
  }

  variantSelect?.addEventListener("change", updateQuantityControls);
  updateQuantityControls();
  minusButton?.addEventListener("click", () => {
    quantityInput.value = String(Math.max(1, Number(quantityInput.value) - 1));
  });
  plusButton?.addEventListener("click", () => {
    quantityInput.value = String(Math.min(Number(quantityInput.max), Number(quantityInput.value) + 1));
  });
  quantityInput?.addEventListener("change", updateQuantityControls);

  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  function activateTab(tab) {
    tabs.forEach((candidate) => {
      const isActive = candidate === tab;
      candidate.classList.toggle("active", isActive);
      candidate.setAttribute("aria-selected", String(isActive));
      const panel = document.getElementById(candidate.getAttribute("aria-controls"));
      if (panel) {
        panel.hidden = !isActive;
        panel.classList.toggle("active", isActive);
      }
    });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let targetIndex = index;
      if (event.key === "ArrowRight") targetIndex = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") targetIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") targetIndex = 0;
      if (event.key === "End") targetIndex = tabs.length - 1;
      tabs[targetIndex].focus();
      activateTab(tabs[targetIndex]);
    });
  });
});
