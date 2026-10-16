import json

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_POST, require_http_methods

from products.models import ProductVariant

from .forms import CheckoutForm
from .models import Order
from .services import CheckoutError, create_order_from_cart


# Hiển thị trang giỏ hàng; dữ liệu giỏ được lưu phía trình duyệt.
def cart_view(request):
    return render(request, "orders/cart.html")


# Xử lý yêu cầu thêm sản phẩm dự phòng và đưa người dùng về trang phù hợp.
@require_POST
def add_to_cart(request):
    """Fallback for browsers with JavaScript disabled; cart data is client-side."""
    try:
        variant_id = int(request.POST.get("variant_id", ""))
    except (TypeError, ValueError, OverflowError):
        variant_id = 0

    variant = ProductVariant.objects.select_related("product").filter(pk=variant_id).first()
    if variant:
        messages.error(request, "Bật JavaScript để thêm sản phẩm vào giỏ hàng.")
        return redirect(variant.product.get_absolute_url())
    messages.error(request, "Vui lòng chọn một biến thể sản phẩm.")
    return redirect("products:list")


# Hiển thị trang thanh toán hoặc xác thực dữ liệu rồi tạo đơn hàng.
@login_required
@require_http_methods(["GET", "POST"])
def checkout(request):
    if request.method == "GET":
        return render(request, "orders/checkout.html", {"form": CheckoutForm()})

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse(
            {"status": "error", "message": "Dữ liệu gửi lên không hợp lệ."},
            status=400,
        )
    if not isinstance(data, dict):
        return JsonResponse(
            {"status": "error", "message": "Dữ liệu gửi lên không hợp lệ."},
            status=400,
        )

    form = CheckoutForm(data)
    if not form.is_valid():
        return JsonResponse(
            {
                "status": "error",
                "message": "Vui lòng kiểm tra lại thông tin người nhận.",
                "errors": form.errors.get_json_data(),
            },
            status=400,
        )

    try:
        order = create_order_from_cart(
            user=request.user,
            cart_items=data.get("items"),
            recipient=form.cleaned_data,
        )
    except CheckoutError as error:
        return JsonResponse({"status": "error", "message": str(error)}, status=400)

    return JsonResponse(
        {
            "status": "success",
            "message": "Đặt hàng thành công.",
            "redirect_url": reverse("orders:order_detail", args=[order.pk]),
        }
    )


# Hiển thị danh sách đơn hàng thuộc về người dùng đang đăng nhập.
@login_required
def my_orders(request):
    orders = (
        Order.objects.filter(user=request.user)
        .prefetch_related("items__variant__product")
        .order_by("-created_at", "-id")
    )
    return render(request, "orders/list.html", {"orders": orders})


# Hiển thị chi tiết một đơn hàng nếu đơn đó thuộc về người dùng hiện tại.
@login_required
def order_detail(request, order_id):
    order = get_object_or_404(
        Order.objects.prefetch_related("items__variant__product"),
        pk=order_id,
        user=request.user,
    )
    return render(
        request,
        "orders/invoice.html",
        {"order": order, "order_items": order.items.all()},
    )
