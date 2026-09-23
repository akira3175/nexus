# Django Form Validation trong Nexus

Tài liệu này hướng dẫn nhóm triển khai validation trong từng app. Ví dụ là mã tham khảo, chưa phải chức năng đã có trong dự án. Không tạo model liên hệ hay thay đổi database trong phạm vi tài liệu này.

## 1. Chọn Form hay ModelForm

| Loại | Khi dùng | Ví dụ |
|---|---|---|
| `forms.Form` | Nhận dữ liệu cho một thao tác, không lưu trực tiếp vào một model | Thêm giỏ, checkout |
| `forms.ModelForm` | Tạo/sửa một bản ghi model | Sửa sản phẩm, hồ sơ |
| Form auth của Django | Xác thực và xử lý mật khẩu | `AuthenticationForm`, `UserCreationForm`, `PasswordChangeForm` |

Đặt form trong `<app>/forms.py`. Owner của module chịu trách nhiệm form, view, hiển thị lỗi và test. ModelForm sản phẩm chỉ cần khi có trang quản lý riêng; Django admin đã có form của nó.

HTML `required`, `min` và JavaScript giúp khách nhập thuận tiện, nhưng có thể bị bỏ qua. Backend luôn gọi `is_valid()` trước khi dùng dữ liệu.

## 2. Luồng xử lý chuẩn

```text
GET → Form chưa bind dữ liệu → Hiển thị trang
POST → Bind request.POST → is_valid()
  Sai → Render lại chính form đó, giữ dữ liệu và hiển thị lỗi
  Đúng → Dùng cleaned_data → Thực hiện nghiệp vụ → Redirect sau thành công
```

- `form.is_valid()` chạy chuyển kiểu, validator và các phương thức clean.
- `form.cleaned_data` chứa dữ liệu đã làm sạch/chuyển kiểu; ví dụ IntegerField trả số nguyên.
- `form.errors` chứa lỗi từng trường. `form.non_field_errors` chứa lỗi chung.
- Không tạo form mới khi POST sai vì sẽ mất dữ liệu và lỗi khách vừa nhập.
- Không dùng `request.POST or None`: một POST rỗng vẫn phải là form đã bind để báo thiếu trường.

## 3. Ví dụ Form thêm giỏ hàng

Ví dụ độc lập này chỉ kiểm tra cấu trúc dữ liệu, không xác nhận biến thể tồn tại hoặc đủ tồn kho.

```python
# cart/forms.py
from django import forms


class AddToCartForm(forms.Form):
    variant_id = forms.IntegerField(
        min_value=1,
        widget=forms.HiddenInput(),
        error_messages={
            "required": "Vui lòng chọn size và màu.",
            "invalid": "Lựa chọn sản phẩm không hợp lệ.",
            "min_value": "Lựa chọn sản phẩm không hợp lệ.",
        },
    )
    quantity = forms.IntegerField(
        label="Số lượng",
        min_value=1,
        widget=forms.NumberInput(attrs={"class": "form-control", "min": 1}),
        error_messages={
            "required": "Vui lòng nhập số lượng.",
            "invalid": "Số lượng phải là số nguyên.",
            "min_value": "Số lượng phải từ 1 trở lên.",
        },
    )
```

ID từ hidden input vẫn có thể bị sửa. Sau validation, tra ProductVariant và Product trong database, kiểm tra `is_active` và số lượng còn lại trước khi thêm giỏ. Có thể dùng ModelChoiceField với queryset đã lọc để kiểm tra ID tồn tại, nhưng vẫn phải kiểm tra tồn kho ở bước nghiệp vụ.

## 4. Kiểm tra riêng một trường và nhiều trường

```python
# orders/forms.py
from django import forms


class CheckoutForm(forms.Form):
    receiver_name = forms.CharField(label="Họ tên", max_length=150)
    phone = forms.CharField(label="Số điện thoại", max_length=20)
    address = forms.CharField(label="Địa chỉ", max_length=500,
                              widget=forms.Textarea(attrs={"rows": 3}))
    note = forms.CharField(label="Ghi chú", max_length=1000, required=False,
                           widget=forms.Textarea(attrs={"rows": 3}))

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            field.widget.attrs["class"] = "form-control"

    def clean_receiver_name(self):
        name = self.cleaned_data["receiver_name"]
        name = " ".join(name.split())
        if len(name) < 2:
            raise forms.ValidationError("Vui lòng nhập tên người nhận từ 2 ký tự.")
        return name
```

`clean_<field>()` phải trả về giá trị sau khi kiểm tra. CharField mặc định bỏ khoảng trắng đầu/cuối; không cần tự viết lại kiểm tra required. Với số điện thoại, thống nhất phạm vi chấp nhận trước khi thêm validator (chỉ số Việt Nam hay cả quốc tế); không tự áp một quy tắc tùy ý giữa các module.

Nếu cần so sánh nhiều trường, dùng `clean()`. Ví dụ cho một form đổi email có hai EmailField là `email` và `email_confirm`:

```python
def clean(self):
    cleaned = super().clean()
    email = cleaned.get("email")
    confirm = cleaned.get("email_confirm")
    if email and confirm and email != confirm:
        self.add_error("email_confirm", "Hai địa chỉ email chưa khớp.")
    return cleaned
```

Dùng `.get()` vì trường sai validation có thể không nằm trong cleaned_data. `add_error("field", ...)` gắn lỗi vào trường; `add_error(None, ...)` gắn lỗi chung. Đừng viết dữ liệu database trong `clean()`.

## 5. Nối form với view

Khung dưới minh họa cách giữ form khi lỗi. `create_order_from_cart` và `CheckoutError` là giao diện nghiệp vụ đề xuất, nhóm phải triển khai trước khi sử dụng; đây không phải hàm sẵn có của Django.

```python
# orders/views.py — ví dụ sau khi đã có service tạo đơn
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render
from django.views.decorators.http import require_http_methods

from .forms import CheckoutForm
from .services import CheckoutError, create_order_from_cart


@login_required
@require_http_methods(["GET", "POST"])
def checkout(request):
    form = CheckoutForm(
        request.POST if request.method == "POST" else None
    )
    if request.method == "POST" and form.is_valid():
        try:
            order = create_order_from_cart(
                user=request.user,
                cart=request.session.get("cart", {}),
                recipient=form.cleaned_data,
            )
        except CheckoutError as error:
            # Service chỉ đưa thông báo nghiệp vụ an toàn vào exception này.
            form.add_error(None, str(error))
        else:
            request.session["cart"] = {}
            messages.success(request, "Đặt hàng thành công.")
            return redirect("orders:invoice", pk=order.pk)

    return render(request, "orders/checkout.html", {"form": form})
```

Service phải tính tiền từ database, kiểm tra/trừ kho và lưu đơn trong transaction, xử lý submit lặp theo [INTEGRATION.md](INTEGRATION.md). View thực tế còn truyền context giỏ hàng cho template. Không bắt mọi Exception rồi báo “dữ liệu sai”; lỗi hệ thống cần được ghi nhận đúng nguyên nhân.

## 6. Hiển thị form mà vẫn giữ giao diện UI2

Không bắt buộc dùng `{{ form.as_p }}`. Giữ wrapper, nhãn và nút của UI2; render từng BoundField để giữ giá trị đã nhập và thuộc tính widget.

```django
<form method="post">
  {% csrf_token %}

  {% if form.non_field_errors %}
    <div role="alert">{{ form.non_field_errors }}</div>
  {% endif %}

  {% for field in form.visible_fields %}
    <div class="form-group">
      <label for="{{ field.id_for_label }}">
        {{ field.label }}{% if field.field.required %} *{% endif %}
      </label>
      {{ field }}
      {% if field.help_text %}
        <div id="{{ field.auto_id }}_helptext">{{ field.help_text }}</div>
      {% endif %}
      {% if field.errors %}
        <div id="{{ field.auto_id }}_error" role="alert">
          {{ field.errors }}
        </div>
      {% endif %}
    </div>
  {% endfor %}

  {% for hidden in form.hidden_fields %}
    {{ hidden }}
    {% if hidden.errors %}<div role="alert">{{ hidden.errors }}</div>{% endif %}
  {% endfor %}

  <button type="submit" class="btn btn-primary">Đặt hàng</button>
</form>
```

Đoạn trên dùng trong template checkout; form khác đổi nút tương ứng. Không bỏ qua lỗi hidden field như `variant_id`, nếu không khách sẽ không hiểu vì sao gửi thất bại. Django messages dùng cho thông báo sau redirect; lỗi form cần đặt ngay cạnh trường và không chỉ thể hiện bằng màu.

Nếu tự viết `<input>` thay vì `{{ field }}`, phải giữ đúng `name`, giá trị bound, label/id, lỗi và các thuộc tính trợ năng; tránh làm vậy khi chỉ cần thêm class vào widget. Không dùng `|safe` để hiển thị nội dung khách nhập.

## 7. ModelForm và upload ảnh

Sau khi có model Product, có thể tạo form quản lý như sau. Các tên trường phải khớp model thực tế.

```python
from django import forms
from .models import Product


class ProductForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = ["category", "name", "slug", "description",
                  "material", "fit", "care_instructions", "price", "image"]
```

- Liệt kê `fields` rõ ràng, không dùng `"__all__"` cho form công khai. Không cho khách gửi `user`, `status`, `total_amount`, `is_staff` để quyết định quyền hoặc dữ liệu hệ thống.
- View tạo/sửa sản phẩm phải kiểm tra quyền quản lý. ModelForm không tự kiểm tra quyền của người gửi.
- Sửa bản ghi: lấy object có quyền truy cập rồi truyền `instance=product`; thiếu instance sẽ tạo bản ghi mới khi save.
- Có upload: `<form method="post" enctype="multipart/form-data">`, bind `ProductForm(request.POST, request.FILES, instance=product)` ở nhánh POST.
- ImageField cần Pillow và cấu hình media như tài liệu tích hợp. Kiểm tra loại file/kích thước theo giới hạn nhóm thống nhất.
- Chỉ `form.save()` sau `is_valid()`. Nếu dùng `save(commit=False)` để gán trường hệ thống, gọi `instance.save()` và `form.save_m2m()` nếu form có quan hệ nhiều–nhiều.

ModelForm chạy validation các trường/model liên quan, nhưng `model.save()` trực tiếp không tự gọi `full_clean()`. Vẫn cần constraint database và validation trong các đường ghi dữ liệu khác.

## 8. Tài khoản và ba lớp kiểm tra

Accounts dùng form auth của Django làm nền, điều chỉnh theo phương án User đã chốt. Không lưu mật khẩu bằng phép gán `user.password = ...`; dùng form đăng ký phù hợp hoặc `set_password()`. UserCreationForm phải cấu hình model đúng nếu dùng custom User.

| Lớp | Trách nhiệm |
|---|---|
| Form | Required, độ dài, kiểu dữ liệu, định dạng, kiểm tra liên trường |
| Nghiệp vụ | Quyền truy cập, giá hiện tại, stock, chuyển trạng thái, transaction |
| Database | Unique, khóa ngoại, constraint số lượng/giá/tồn kho |

Email/slug đã qua kiểm tra unique trong form vẫn có thể bị trùng do hai yêu cầu đồng thời. Constraint database là lớp bảo đảm cuối; xử lý lỗi toàn vẹn đã biết ở ngoài khối transaction bị lỗi và hiển thị thông báo phù hợp. Không biến mọi IntegrityError thành thông báo trùng email.

## 9. Test và checklist bàn giao

Ví dụ test cấu trúc dữ liệu không cần database, đặt trong `cart/tests.py` sau khi đã tạo form:

```python
from django.test import SimpleTestCase
from .forms import AddToCartForm


class AddToCartFormTests(SimpleTestCase):
    def test_quantity_is_positive_integer(self):
        for quantity in ["0", "-1", "1.5", "abc", ""]:
            with self.subTest(quantity=quantity):
                form = AddToCartForm({"variant_id": "12", "quantity": quantity})
                self.assertFalse(form.is_valid())
                self.assertIn("quantity", form.errors)

    def test_valid_data_is_converted(self):
        form = AddToCartForm({"variant_id": "12", "quantity": "2"})
        self.assertTrue(form.is_valid())
        self.assertEqual(form.cleaned_data["quantity"], 2)
```

Ngoài form test, mỗi module cần kiểm tra luồng liên quan:

- POST thiếu trường hoặc dữ liệu sai: giữ dữ liệu, thấy lỗi, không tạo bản ghi.
- POST hợp lệ: lưu đúng dữ liệu, redirect đúng trang, thấy thông báo.
- Giả mạo ID, giá, user hoặc status không vượt được kiểm tra backend.
- Hết hàng, đăng nhập hết hạn, xem/sửa dữ liệu người khác được xử lý đúng.
- Form có CSRF token; test client Django mặc định không cưỡng chế CSRF, dùng `Client(enforce_csrf_checks=True)` khi kiểm tra riêng cơ chế này.
- Checkout submit lặp và tranh chấp tồn kho được test ở lớp nghiệp vụ, không chỉ test Form.

Chạy `python manage.py test <app>`. Các ví dụ trên không thay thế test nghiệp vụ sau khi module được triển khai.
