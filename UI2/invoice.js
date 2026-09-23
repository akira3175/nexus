/* ==========================================================================
   NEXUS HAUTE HORLOGERIE - INVOICE & CERTIFICATE LOGIC (invoice.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  renderInvoice();

  const printBtn = document.getElementById('print-invoice-btn');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }
});

function renderInvoice() {
  let order;
  try {
    const raw = sessionStorage.getItem('nexus_luxury_order');
    if (raw) {
      order = JSON.parse(raw);
    }
  } catch (e) {
    console.error(e);
  }

  // Fallback đơn hàng mẫu nếu người dùng truy cập trực tiếp
  if (!order) {
    order = {
      id: 'NX-892145',
      date: new Date().toISOString(),
      customer: {
        name: 'Nguyễn Hoàng Long',
        phone: '0912 345 678',
        email: 'hoanglong@luxuryclub.vn',
        city: 'TP. Hồ Chí Minh',
        address: 'Penthouse 32B, Tòa tháp Bitexco, Q.1',
        note: 'Giao hàng bảo mật trong giờ hành chính, gọi trước 30 phút.'
      },
      items: [
        {
          id: 'atelier',
          name: 'Nexus Atelier Imperial Date',
          price: 18500000,
          quantity: 1,
          total: 18500000,
          image: 'assets/images/atelier.jpg'
        }
      ],
      subtotal: 18500000,
      discount: 0,
      total: 18500000,
      paymentMethod: 'Chuyển khoản ngân hàng tức thì (VietQR)',
      shippingMethod: 'Giao nhanh (mẫu)'
    };
  }

  // Điền dữ liệu vào giao diện
  const orderIdElem = document.getElementById('inv-order-id');
  const dateElem = document.getElementById('inv-date');
  const nameElem = document.getElementById('inv-customer-name');
  const phoneElem = document.getElementById('inv-customer-phone');
  const addressElem = document.getElementById('inv-customer-address');
  const noteElem = document.getElementById('inv-customer-note');
  const paymentElem = document.getElementById('inv-payment-method');
  const shippingElem = document.getElementById('inv-shipping-method');
  const itemsTbody = document.getElementById('inv-items-body');
  const subtotalElem = document.getElementById('inv-subtotal');
  const discountElem = document.getElementById('inv-discount');
  const totalElem = document.getElementById('inv-total');
  const warrantyCodeElem = document.getElementById('inv-warranty-code');

  if (orderIdElem) orderIdElem.textContent = order.id;
  if (dateElem) {
    const d = new Date(order.date);
    dateElem.textContent = `${d.toLocaleDateString('vi-VN')} - ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (nameElem) nameElem.textContent = order.customer.name;
  if (phoneElem) phoneElem.textContent = order.customer.phone;
  if (addressElem) addressElem.textContent = `${order.customer.address}, ${order.customer.city || ''}`;
  if (noteElem) noteElem.textContent = order.customer.note || 'Không có';
  if (paymentElem) paymentElem.textContent = order.paymentMethod;
  if (shippingElem) shippingElem.textContent = order.shippingMethod;

  if (warrantyCodeElem) {
    warrantyCodeElem.textContent = `NEXUS-WTY-${order.id.replace('NX-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  if (itemsTbody) {
    itemsTbody.innerHTML = order.items.map((item, index) => `
      <tr>
        <td style="color: var(--text-muted);">${index + 1}</td>
        <td>
          <div style="font-weight: 600; color: var(--text-primary);">${item.name}</div>
          <div style="font-size: 11px; color: var(--gold-400);">Bảo hành chính hãng 5 năm • Hộp sơn mài & Thẻ NFC</div>
        </td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right; color: var(--text-secondary);">${item.price.toLocaleString('vi-VN')} ₫</td>
        <td style="text-align: right; font-weight: 700; color: var(--gold-400);">${item.total.toLocaleString('vi-VN')} ₫</td>
      </tr>
    `).join('');
  }

  if (subtotalElem) subtotalElem.textContent = order.subtotal.toLocaleString('vi-VN') + ' ₫';
  if (discountElem) discountElem.textContent = `- ${order.discount.toLocaleString('vi-VN')} ₫`;
  if (totalElem) totalElem.textContent = order.total.toLocaleString('vi-VN') + ' ₫';
}
