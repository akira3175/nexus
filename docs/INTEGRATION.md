# Quy ước tích hợp Django Nexus

Đây là hợp đồng triển khai đề xuất cho nhóm. Ngoại trừ `core:home` và các block base đã có, các API/route/context bên dưới chưa được cài đặt. Không chép `{% url ... %}` vào trang đang chạy trước khi route tương ứng tồn tại.

Form đầu vào, cách bind POST, `cleaned_data`, hiển thị lỗi và test được hướng dẫn trong [FORM_VALIDATION.md](FORM_VALIDATION.md). Validation ở form không thay thế kiểm tra quyền, transaction và constraint database bên dưới.

## 1. Thư mục và nguồn giao diện

```text
core/templates/core/home.html
products/templates/products/list.html
products/templates/products/detail.html
accounts/templates/accounts/login.html
accounts/templates/accounts/register.html
accounts/templates/accounts/profile.html
cart/templates/cart/detail.html
orders/templates/orders/checkout.html
orders/templates/orders/list.html
orders/templates/orders/invoice.html
templates/base.html
templates/includes/header.html
templates/includes/footer.html
templates/includes/messages.html
static/css/styles.css
static/css/boutique.css
static/css/products.css       # chỉ tạo khi cần CSS riêng
static/js/products.js         # JS tương tác của Django, không phải catalog UI2
static/assets/images/
static/assets/fonts/
```

Owner module tạo app bằng `startapp`, thêm vào `INSTALLED_APPS` và include URL trong cùng PR. Template đặt trong namespace app để không trùng tên.

UI2 chỉ dùng đối chiếu HTML/CSS. Django template render dữ liệu database; không nạp `UI2/products.js`, `auth.js`, `checkout.js`, `invoice.js` để làm nguồn dữ liệu hoặc xác thực. Khi tái sử dụng JS từ `app.js`, chỉ lấy tương tác cần thiết, tránh ghi đè HTML đã render hoặc tính tiền bằng dữ liệu giả.

## 2. Template và static

```django
{% extends "base.html" %}
{% load static %}

{% block title %}Bộ sưu tập | Nexus{% endblock %}
{% block body_class %}home-page collection-page content-page{% endblock %}

{% block extra_css %}
  {# Chỉ thêm link khi đã có CSS riêng của trang #}
{% endblock %}

{% block content %}
  {# Nội dung riêng, không lặp lại main/header/footer #}
{% endblock %}

{% block extra_js %}
  {# Chỉ thêm script khi đã có JS riêng của trang #}
{% endblock %}
```

- `{% extends %}` đứng đầu template con. Mỗi file dùng `{% static %}` phải tự `{% load static %}`, kể cả include.
- CSS chung do base nạp; CSS riêng nạp sau qua `extra_css`, JS riêng qua `extra_js` với `defer` khi thích hợp.
- Giữ class body từ trang UI2 tương ứng: home dùng `home-page`, danh sách dùng `home-page collection-page content-page`; trang chi tiết/giỏ/checkout/hóa đơn giữ các class tương ứng trong prototype, đặc biệt `menswear-page`.
- Ảnh cố định: `<img src="{% static 'assets/images/menswear/navy-suit.png' %}" alt="Bộ suit navy">`.
- Trong CSS ở `static/css/`, ảnh/font cố định dùng `../assets/...`; Django không xử lý `{% static %}` trong file CSS tĩnh.
- Ảnh sản phẩm do admin tải lên thuộc media: dự kiến `Product.image` là ImageField, render `product.image.url` khi có ảnh và có ảnh dự phòng khi trống. Owner products bổ sung Pillow vào requirements, `MEDIA_ROOT`/`MEDIA_URL` và phục vụ media khi phát triển; cấu hình này chưa có sẵn. Không lưu ảnh upload vào static.
- Header/footer dùng URL có namespace; menu active lấy từ route hiện tại, không đặt Trang chủ active cố định trên mọi trang.
- Chủ dự án triển khai include messages trong base. Các module dùng Django messages và lỗi form, không tự chèn một khung thông báo khác vào từng trang.

## 3. URL đề xuất

| Module | URL name | Đường dẫn | Method / dữ liệu |
|---|---|---|---|
| core | `core:home` | `/` | GET — đã có |
| core | `core:about` | `/about/` | GET — mở rộng sau |
| core | `core:contact` | `/contact/` | GET — mở rộng sau |
| products | `products:list` | `/products/` | GET |
| products | `products:detail` | `/products/<slug:slug>/` | GET |
| accounts | `accounts:login` | `/accounts/login/` | GET, POST |
| accounts | `accounts:register` | `/accounts/register/` | GET, POST |
| accounts | `accounts:logout` | `/accounts/logout/` | POST |
| accounts | `accounts:profile` | `/accounts/profile/` | GET, POST, đăng nhập |
| cart | `cart:detail` | `/cart/` | GET |
| cart | `cart:add` | `/cart/add/` | POST: `variant_id`, `quantity` |
| cart | `cart:update` | `/cart/update/<int:variant_id>/` | POST: `quantity` |
| cart | `cart:remove` | `/cart/remove/<int:variant_id>/` | POST |
| orders | `orders:checkout` | `/orders/checkout/` | GET, POST, đăng nhập |
| orders | `orders:list` | `/orders/` | GET, đăng nhập |
| orders | `orders:invoice` | `/orders/<int:pk>/invoice/` | GET, đăng nhập và sở hữu đơn |

Ví dụ khi products đã được ghép:

```django
<a href="{% url 'products:detail' slug=product.slug %}">{{ product.name }}</a>
<form method="post" action="{% url 'cart:add' %}">
  {% csrf_token %}
  <input type="hidden" name="variant_id" value="{{ variant.id }}">
  <input type="number" name="quantity" value="1" min="1">
  <button type="submit">Thêm vào giỏ</button>
</form>
```

Trong trang chi tiết, `variant` phải là lựa chọn size/màu của khách, không chọn ngầm biến thể đầu tiên. Backend vẫn kiểm tra mọi trường gửi lên.

Danh sách dùng query GET `q`, `category` (slug), `sort`: `featured`, `price-asc`, `price-desc`. `featured` ở bản đơn giản là thứ tự mặc định `-created_at, -id`, không đòi thêm trường đánh dấu. Các giá trị sort phải qua danh sách cho phép.

## 4. Model và dữ liệu giữa module

Model/quan hệ theo [ERD](ERD.md):

- `products`: Category, Product, ProductVariant.
- `accounts`: tài khoản/hồ sơ theo quyết định User trong [TEAM_GUIDE](TEAM_GUIDE.md).
- `orders`: Order, OrderItem; OrderItem trỏ ProductVariant, không trỏ trực tiếp Product.
- `cart`: session, không cần model giỏ hàng trong bản đầu.

Giá dùng Decimal ở backend; không dùng float để tính tiền. Size là chuỗi (`M`, `48`); stock thuộc biến thể. Giá và ảnh dùng chung từ Product.

### Giỏ hàng

Session key đề xuất: `cart`, dữ liệu dạng:

```json
{"12": 2, "18": 1}
```

Key là ID biến thể dạng chuỗi; value là số lượng nguyên dương. Không lưu tên, đơn giá hoặc tổng tiền làm nguồn tin cậy trong session. Khi sửa dictionary, gán lại `request.session['cart']` hoặc đánh dấu session đã thay đổi.

- Khách chưa đăng nhập vẫn thêm giỏ; checkout yêu cầu đăng nhập. Đăng nhập thành công giữ giỏ trong session; kiểm tra cả luồng này khi bàn giao accounts.
- Thêm giỏ cộng số lượng; cập nhật giỏ thay số lượng; xóa dùng route riêng.
- Không đặt số lượng lớn hơn stock hoặc dùng biến thể/sản phẩm ngừng bán. Khi đọc giỏ, xử lý ID không còn hợp lệ và thông báo cho khách.
- Chủ module cart cung cấp hàm đọc giỏ dùng chung cho view giỏ và checkout. Checkout kiểm tra lại dữ liệu/tồn kho vì có thể thay đổi sau khi xem giỏ.
- Đề xuất context processor chỉ cung cấp `cart_count` = tổng số lượng để header dùng thống nhất. Chưa có context processor này; owner cart triển khai và đăng ký khi ghép.
- Thêm giỏ thành công: redirect về trang sản phẩm và Django message; không mở drawer. Không dùng redirect đích tùy ý do client cung cấp.

### Context template đề xuất

| Trang | Biến chính |
|---|---|
| Danh sách | `products`, `categories`, `q`, `selected_category`, `sort` |
| Chi tiết | `product`, `variants`, `related_products` |
| Giỏ hàng | `cart_items`, `subtotal`, `shipping_fee`, `total` |
| Checkout | Các biến giỏ hàng và `form` |
| Hóa đơn | `order`, `order_items` — chỉ đơn của người đang đăng nhập |

Mỗi phần tử `cart_items`: `variant`, `product`, `quantity`, `unit_price`, `line_total`. Backend tính `line_total`; không nhân tiền trong JS làm nguồn lưu đơn.

### Đặt hàng

- POST checkout nhận người nhận, điện thoại, địa chỉ, ghi chú; bản đầu chỉ COD. Phí vận chuyển do backend quyết định, có thể bằng 0; không lấy tổng tiền từ hidden input.
- Đọc ProductVariant và Product từ database, kiểm tra is_active/stock, dùng giá hiện tại.
- Tạo Order, OrderItem và trừ kho trong transaction; khóa hàng tồn kho phù hợp để hai đơn không cùng mua vượt tồn. Khóa các biến thể theo thứ tự ID thống nhất.
- OrderItem giữ bản sao tên, size, màu, đơn giá. Tính tổng từ các dòng đơn cộng phí vận chuyển.
- Chỉ xóa giỏ sau khi tạo đơn thành công; xử lý submit lặp để không tạo/trừ kho hai lần cho cùng lần checkout.
- Đơn mới `pending`; chuyển trạng thái theo quy tắc chung. Hủy đơn hợp lệ hoàn kho một lần, không cho hủy lặp hoặc tự hủy đơn đã hoàn tất.
- Hóa đơn đọc dữ liệu đơn đã lưu; truy vấn kèm chủ sở hữu, không chỉ truy vấn theo ID. Không tạo lại số tiền từ catalog hiện tại.

## 5. Những điểm cần kiểm tra khi ghép

Products → Cart: biến thể được chọn đúng, hết hàng bị từ chối, khác size là hai dòng.

Accounts → Orders: chuyển tới đăng nhập khi chưa có session xác thực, giữ giỏ sau đăng nhập, không xem đơn người khác.

Cart → Orders: giá/stock được kiểm tra lại, không tin dữ liệu tiền từ trình duyệt, tạo đơn thành công mới xóa giỏ, submit lặp không trừ kho lặp.

Home/Base → các module: URL có namespace, body class đúng, không CSS/ảnh 404, thông báo nhìn thấy, không icon login chèn trùng bằng JS.
