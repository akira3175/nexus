# Nexus

Website thời trang nam Nexus, xây dựng bằng Django và MySQL: suit, blazer, sơ mi và quần.

## Tài liệu cho nhóm

1. Đọc hướng dẫn cài đặt bên dưới và chạy trang chủ trên máy cá nhân.
2. Đọc [Hướng dẫn làm việc nhóm](docs/TEAM_GUIDE.md) để nhận phạm vi module và quy trình ghép code.
3. Dùng [Quy ước tích hợp](docs/INTEGRATION.md) khi viết URL, template, giỏ hàng và đơn hàng.
4. Đối chiếu [ERD](docs/ERD.md) trước khi tạo model và migration.
5. Áp dụng [Django Form Validation](docs/FORM_VALIDATION.md) cho form, hiển thị lỗi và kiểm tra dữ liệu backend.

Hiện đã có app `core`, trang chủ, base/header/footer và tài nguyên trong `static/`. Các app nghiệp vụ và model trong ERD chưa được triển khai. Các URL ngoài `core:home` trong tài liệu tích hợp là quy ước đề xuất để nhóm triển khai, chưa phải route đang hoạt động.

`UI2/` là giao diện tham chiếu. Bản chạy Django dùng `templates/`, template của từng app và `static/`; không sửa UI2 rồi mặc định Django sẽ thay đổi theo.

## Yêu cầu

- Python 3.10 trở lên
- MySQL Server 8.0 trở lên
- Git

## Cài đặt project

### 1. Lấy source code

```powershell
git clone <repository-url>
cd Nexus
```

Thay `<repository-url>` bằng địa chỉ repository chung do nhóm cung cấp. Chạy `git status` để xác nhận đang ở đúng bản clone; thư mục tải/copy không có `.git` không dùng được quy trình nhánh bên dưới.

### 2. Tạo và kích hoạt môi trường ảo

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Nếu PowerShell chặn script kích hoạt:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

### 3. Cài thư viện

```powershell
python -m pip install -r requirements.txt
```

### 4. Tạo database MySQL

Đăng nhập MySQL:

```powershell
mysql -u root -p
```

Tạo database:

```sql
CREATE DATABASE nexus
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

### 5. Cấu hình biến môi trường

Tạo `.env` từ file mẫu:

```powershell
Copy-Item .env.example .env
```

Tạo Django secret key riêng cho máy local:

```powershell
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Điền thông tin vào `.env`:

```env
DJANGO_SECRET_KEY=secret-key-vua-tao
DJANGO_DEBUG=True

DB_NAME=nexus
DB_USER=root
DB_PASSWORD=mat-khau-mysql
DB_HOST=127.0.0.1
DB_PORT=3306
```

Không commit hoặc gửi file `.env`. Mỗi thành viên tự tạo `.env` trên máy của mình.

### 6. Khởi tạo bảng và chạy project

```powershell
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Truy cập:

- Website: http://127.0.0.1:8000/
- Trang quản trị: http://127.0.0.1:8000/admin/

## Các lệnh thường dùng

```powershell
# Tạo app mới
python manage.py startapp ten_app

# Tạo migration sau khi thay đổi model
python manage.py makemigrations

# Áp dụng migration vào MySQL
python manage.py migrate

# Xem trạng thái migration
python manage.py showmigrations

# Kiểm tra cấu hình Django
python manage.py check

# Chạy test
python manage.py test

# Mở Django shell
python manage.py shell

# Chạy development server
python manage.py runserver
```

## Quy tắc làm việc nhóm

- Commit `.env.example` khi cần bổ sung biến môi trường mới.
- Không commit `.env`, `.venv`, mật khẩu hoặc secret key.
- Commit file migration trong thư mục `migrations/` để các thành viên dùng chung cấu trúc database.
- Sau khi pull code có migration mới, chạy `python manage.py migrate`.
