/* ==========================================================================
   NEXUS HAUTE HORLOGERIE - CHECKOUT LOGIC (checkout.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initCheckout();
});

function initCheckout() {
  const cart = getStoredCart();
  const entries = Object.entries(cart);
  const checkoutItemsList = document.getElementById('checkout-items-list');
  const subtotalElem = document.getElementById('checkout-subtotal');
  const discountElem = document.getElementById('checkout-discount');
  const totalElem = document.getElementById('checkout-total');
  const form = document.getElementById('checkout-form');
  const emptyView = document.getElementById('checkout-empty-view');
  const contentView = document.getElementById('checkout-content-view');

  if (entries.length === 0) {
    if (emptyView) emptyView.style.display = 'block';
    if (contentView) contentView.style.display = 'none';
    return;
  }

  if (emptyView) emptyView.style.display = 'none';
  if (contentView) contentView.style.display = 'grid';

  let subtotal = 0;
  const orderItems = [];

  entries.forEach(([id, qty]) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;

    const rowTotal = prod.price * qty;
    subtotal += rowTotal;
    orderItems.push({
      id: prod.id,
      name: prod.name,
      price: prod.price,
      quantity: qty,
      image: prod.image,
      total: rowTotal
    });
  });

  const discountRate = 0;
  const discountAmount = subtotal * discountRate;
  const finalTotal = subtotal - discountAmount;

  if (checkoutItemsList) {
    checkoutItemsList.innerHTML = orderItems.map(item => `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border-subtle);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${item.image}" alt="${item.name}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; background: #000;">
          <div>
            <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${item.name}</div>
            <div style="font-size: 12px; color: var(--text-muted);">Số lượng: ${item.quantity} × ${formatVND(item.price)}</div>
          </div>
        </div>
        <div style="font-weight: 600; color: var(--gold-400); font-size: 13px;">${formatVND(item.total)}</div>
      </div>
    `).join('');
  }

  if (subtotalElem) subtotalElem.textContent = formatVND(subtotal);
  if (discountElem) discountElem.textContent = `- ${formatVND(discountAmount)}`;
  if (totalElem) totalElem.textContent = formatVND(finalTotal);

  // Payment method selection & VietQR toggle
  const paymentRadios = document.querySelectorAll('input[name="paymentMethod"]');
  const qrBox = document.getElementById('vietqr-preview-box');
  const qrAmountElem = document.getElementById('vietqr-amount');
  const qrCodeImg = document.getElementById('vietqr-code-img');

  paymentRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.payment-card').forEach(c => c.classList.remove('active'));
      radio.closest('.radio-card').classList.add('active');

      if (radio.value === 'bank_transfer') {
        if (qrBox) qrBox.classList.add('active');
        if (qrAmountElem) qrAmountElem.textContent = formatVND(finalTotal);
        // Tạo link VietQR chuẩn động
        const orderTempId = 'NX' + Math.floor(100000 + Math.random() * 900000);
        if (qrCodeImg) {
          qrCodeImg.src = `https://img.vietqr.io/image/MB-0987654321-compact2.png?amount=${finalTotal}&addInfo=${orderTempId}&accountName=NEXUS%20MENSWEAR`;
        }
      } else {
        if (qrBox) qrBox.classList.remove('active');
      }
    });
  });

  // Submit order
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('customer-name').value.trim();
      const phone = document.getElementById('customer-phone').value.trim();
      const email = document.getElementById('customer-email').value.trim();
      const city = document.getElementById('customer-city').value.trim();
      const address = document.getElementById('customer-address').value.trim();
      const note = document.getElementById('customer-note').value.trim();
      const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
      const shippingMethod = document.querySelector('input[name="shippingMethod"]:checked').value;

      if (!name || !address || phone.length < 9) {
        alert('Quý khách vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ giao hàng.');
        return;
      }

      const orderId = 'NX-' + Date.now().toString().slice(-6);
      const newOrder = {
        id: orderId,
        date: new Date().toISOString(),
        customer: { name, phone, email, city, address, note },
        items: orderItems,
        subtotal,
        discount: discountAmount,
        total: finalTotal,
        paymentMethod: paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : (paymentMethod === 'bank_transfer' ? 'Chuyển khoản VietQR tức thì' : 'Trả góp tín dụng 0%'),
        shippingMethod: shippingMethod === 'express' ? 'Giao nhanh (mẫu)' : 'Giao tiêu chuẩn (mẫu)'
      };

      try {
        sessionStorage.setItem('nexus_luxury_order', JSON.stringify(newOrder));
        // Xóa giỏ hàng
        localStorage.removeItem('nexus_luxury_cart');
        // Chuyển sang hóa đơn
        window.location.href = 'invoice.html';
      } catch (err) {
        alert('Có lỗi xảy ra khi lưu thông tin đơn hàng. Quý khách vui lòng thử lại.');
      }
    });
  }
}
