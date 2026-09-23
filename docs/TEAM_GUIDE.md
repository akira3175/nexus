# Hướng dẫn làm việc nhóm Nexus

## 1. Phạm vi và trạng thái

Nexus là website thời trang nam dùng Django templates và MySQL. Mục tiêu bản đầu: xem sản phẩm, chọn size/màu, đăng ký/đăng nhập, giỏ hàng, đặt hàng COD và xem hóa đơn.

Tại thời điểm lập tài liệu:

- Đã có `core`, URL `core:home`, template home và khung dùng chung.
- `base.html` có các block `title`, `body_class`, `content`, `extra_css`, `extra_js`.
- Template/static đã được cấu hình; ảnh và font có trong `static/assets/`.
- Chưa có app `products`, `accounts`, `cart`, `orders`; model nghiệp vụ trong [ERD](ERD.md) là thiết kế đề xuất.
- Một số link trong home/header/footer vẫn là `.html` hoặc `#`, cần nối route khi module tương ứng được ghép.
- `templates/includes/messages.html` và các template lỗi còn trống; chưa có test nghiệp vụ.

## 2. Phân công theo module

Điền tên thành viên vào bảng khi nhận việc. Mỗi người phụ trách cả model, form, view, URL, template và test cho phần mình.

Các form theo [hướng dẫn Django Form Validation](FORM_VALIDATION.md): owner module viết `forms.py`, hiển thị lỗi trên giao diện và kiểm tra dữ liệu ở backend trước khi thực hiện nghiệp vụ.

| Người phụ trách | Phạm vi | Bàn giao |
|---|---|---|
| Chủ dự án — home/base | `core`, `templates/base.html`, `templates/includes/`, CSS chung | Home, header/footer, thông báo, tích hợp URL và kiểm tra giao diện chung |
| Thành viên sản phẩm | `products` | Category, Product, ProductVariant, admin, danh sách/chi tiết, tìm kiếm/lọc/sắp xếp, chọn biến thể |
| Thành viên tài khoản | `accounts` | Đăng ký, đăng nhập/đăng xuất, hồ sơ, kiểm tra dữ liệu và thống nhất User |
| Thành viên giao dịch | `cart`, `orders` | Giỏ hàng session, checkout, lưu đơn/trừ kho, danh sách đơn và hóa đơn thuộc người dùng |

Không đưa mọi model vào `core/models.py`. `core` giữ các trang chung; Django admin dùng quản lý nội bộ, chưa cần xây dashboard riêng.

Người phụ trách module gửi phần thay đổi cần thiết trong `config/settings.py`, `config/urls.py`, dependencies và context processor cùng PR. Chủ dự án rà soát khi ghép để tránh hai nhánh ghi đè cấu hình chung.

## 3. Các quyết định phải chốt trước model nghiệp vụ

### User — cần thống nhất trước khi ghép accounts/orders

Hiện cấu hình dùng User mặc định và migration auth đã được áp dụng. ERD yêu cầu email duy nhất, họ tên, số điện thoại; User mặc định không tự đáp ứng tất cả yêu cầu này.

- Phương án ít thay đổi: giữ User mặc định, bổ sung Profile cho trường riêng. Nếu vẫn yêu cầu email duy nhất, nhóm phải thống nhất cách bảo đảm ràng buộc đó; kiểm tra trong form đơn thuần chưa bảo đảm khi có hai yêu cầu đồng thời.
- Phương án custom User: kế thừa AbstractUser, bổ sung trường và email duy nhất. Phải lập kế hoạch chuyển schema/dữ liệu trước vì database hiện đã migrate; không tự xóa database hoặc đổi `AUTH_USER_MODEL` rồi chạy tiếp.

Accounts và chủ dự án chốt phương án, cập nhật ERD tương ứng rồi mới ghép model phụ thuộc. Trong khóa ngoại dùng `settings.AUTH_USER_MODEL`; lúc truy vấn User dùng `get_user_model()`.

### Các quy ước còn lại

Lấy [INTEGRATION.md](INTEGRATION.md) làm bản đề xuất chung: namespace, URL, session giỏ hàng, context template và giá/tồn kho. Khi nhóm đồng ý thay tên, cập nhật tài liệu và các nơi gọi trong cùng PR.

## 4. Thứ tự triển khai

1. Mỗi thành viên clone repo chung, làm theo [README](../README.md), tự cấu hình `.env` và database local.
2. Chốt User, model sản phẩm/biến thể và các tên URL; người sản phẩm ghép model/migration sớm.
3. Làm song song: home/base; tài khoản; danh sách/chi tiết sản phẩm; giao diện giỏ hàng/checkout theo dữ liệu đã thống nhất.
4. Sau khi products có model: nối giỏ hàng với biến thể thật. Sau khi accounts có đăng nhập: nối checkout với người dùng thật.
5. Ghép luồng hoàn chỉnh: home → danh sách → chi tiết/chọn size → thêm giỏ → đăng nhập → checkout → hóa đơn.

Không cần đợi toàn bộ giao diện sản phẩm xong mới bàn giao model. Không tự tạo bản sao Product/User trong module khác để né phụ thuộc.

## 5. Git và migration

Ví dụ dưới giả định nhánh chung tên `main`; thay bằng tên nhánh thực tế của nhóm nếu khác.

```powershell
git switch main
git pull --ff-only origin main
git switch -c feature/products
```

Các nhánh gợi ý: `feature/home-base`, `feature/products`, `feature/accounts`, `feature/cart-orders`.

- Commit migration cùng model. Không sửa/xóa migration đã chia sẻ chỉ để hết lỗi trên máy mình.
- Khi hai nhánh có migration xung đột, chủ module rà dependency và phối hợp xử lý; không reset database của thành viên khác.
- Không commit file CSS chung chỉ vì formatter thay đổi toàn bộ file. CSS riêng đặt theo namespace module.
- Mở PR vào nhánh chung, mô tả thay đổi, migration/dependency mới và cách kiểm tra. Không đẩy thẳng code chưa kiểm tra vào nhánh chung.
- Sau khi pull: cài lại requirements nếu đổi, chạy `migrate`, rồi `check` và test liên quan.

## 6. Tiêu chí bàn giao

```powershell
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate
python manage.py test
```

Lệnh test báo `0 tests` không có nghĩa nghiệp vụ đã được kiểm chứng. Test có database cần tài khoản MySQL được phép tạo/xóa database test riêng; không đổi test sang database đang dùng để né lỗi quyền.

Mỗi PR cần kiểm tra:

- URL trực tiếp và link từ header/footer hoạt động, không còn link `.html` của prototype trong phần đã bàn giao.
- Template kế thừa base, ảnh/CSS không 404; kiểm tra desktop và điện thoại.
- Có trạng thái rỗng, dữ liệu sai, sản phẩm không tồn tại/hết hàng khi liên quan.
- Form hiển thị lỗi cụ thể; thao tác thay đổi dữ liệu dùng POST và CSRF.
- Không sửa giá/tổng tiền từ client; người dùng không xem được đơn người khác.
- Có dữ liệu demo dùng chung: sản phẩm đủ size/màu, một biến thể hết hàng. Owner products bàn giao fixture hoặc command tạo dữ liệu có thể chạy lại, không chia sẻ tài khoản thật.

Chủ dự án không cần viết thay module của các thành viên; chỉ kiểm tra các điểm nối và bố cục chung.
