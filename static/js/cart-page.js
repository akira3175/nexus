function formatVnd(value) {
  const amount = Math.round(Number(value) || 0);
  return `${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} ₫`;
}

function persistQuantity(form) {
  const body = new FormData(form);
  return fetch(form.action, {
    method: "POST",
    body,
    headers: { "X-Requested-With": "XMLHttpRequest" },
    credentials: "same-origin",
  }).then((response) => {
    if (!response.ok) window.location.reload();
  });
}

function updateTotals() {
  const rows = Array.from(document.querySelectorAll(".cart-row"));
  let subtotal = 0;
  rows.forEach((row) => {
    const unit = Number(row.dataset.unitPrice || 0);
    const quantity = Number(row.querySelector('input[name="quantity"]')?.value || 0);
    const line = unit * quantity;
    subtotal += line;
    const lineEl = row.querySelector(".cart-line-total");
    if (lineEl) lineEl.textContent = formatVnd(line);
  });
  const shipping = Number(document.querySelector(".summary-card")?.dataset.shippingFee || 0);
  const subtotalEl = document.querySelector("[data-cart-subtotal]");
  const totalEl = document.querySelector("[data-cart-total]");
  if (subtotalEl) subtotalEl.textContent = formatVnd(subtotal);
  if (totalEl) totalEl.textContent = formatVnd(subtotal + shipping);

  const badge = document.getElementById("header-cart-count");
  if (badge) {
    const count = rows.reduce((sum, row) => {
      return sum + Number(row.querySelector('input[name="quantity"]')?.value || 0);
    }, 0);
    badge.textContent = String(count);
    badge.style.display = count ? "" : "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".cart-qty-form").forEach((form) => {
    const input = form.querySelector('input[name="quantity"]');
    if (!input) return;
    const min = Number(input.min || 1);
    const max = Number(input.max || 1);

    function apply(next) {
      const quantity = Math.min(max, Math.max(min, next));
      if (String(quantity) === input.value) return;
      input.value = String(quantity);
      updateTotals();
      persistQuantity(form);
    }

    form.querySelectorAll("[data-step]").forEach((button) => {
      button.addEventListener("click", () => {
        apply(Number(input.value || min) + Number(button.dataset.step));
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      apply(Number(input.value || min));
    });
    input.addEventListener("change", () => apply(Number(input.value || min)));
  });
});
