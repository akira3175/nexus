from django.contrib import messages
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.views.decorators.http import require_POST

from products.models import ProductVariant

from .forms import AddToCartForm, CartQuantityForm
from .services import cart_totals, get_cart_items, get_session_cart, save_cart


def _variant_or_none(variant_id):
    return (
        ProductVariant.objects.select_related("product", "product__category")
        .filter(pk=variant_id)
        .first()
    )


def _can_buy(variant):
    return (
        variant
        and variant.is_active
        and variant.product.is_active
        and variant.product.category.is_active
    )


def _is_ajax(request):
    return request.headers.get("X-Requested-With") == "XMLHttpRequest"


def detail(request):
    return render(request, "cart/detail.html", cart_totals(get_cart_items(request)))


@require_POST
def add(request):
    form = AddToCartForm(request.POST)
    if not form.is_valid():
        messages.error(request, "Vui lòng chọn size, màu và số lượng hợp lệ.")
        return redirect("products:list")

    variant = _variant_or_none(form.cleaned_data["variant_id"])
    if not _can_buy(variant):
        messages.error(request, "Sản phẩm không còn bán.")
        return redirect("products:list")

    cart = get_session_cart(request)
    key = str(variant.pk)
    new_quantity = cart.get(key, 0) + form.cleaned_data["quantity"]
    if new_quantity > variant.stock:
        messages.error(request, "Số lượng vượt quá tồn kho.")
        return redirect(variant.product.get_absolute_url())

    cart[key] = new_quantity
    save_cart(request, cart)
    messages.success(request, "Đã thêm vào giỏ hàng.")
    return redirect(variant.product.get_absolute_url())


@require_POST
def update(request, variant_id):
    form = CartQuantityForm(request.POST)
    if not form.is_valid():
        messages.error(request, "Số lượng không hợp lệ.")
        if _is_ajax(request):
            return JsonResponse({"ok": False}, status=400)
        return redirect("cart:detail")

    variant = _variant_or_none(variant_id)
    if not _can_buy(variant):
        messages.error(request, "Sản phẩm không còn bán.")
        if _is_ajax(request):
            return JsonResponse({"ok": False}, status=400)
        return redirect("cart:detail")

    quantity = form.cleaned_data["quantity"]
    if quantity > variant.stock:
        messages.error(request, "Số lượng vượt quá tồn kho.")
        if _is_ajax(request):
            return JsonResponse({"ok": False}, status=400)
        return redirect("cart:detail")

    cart = get_session_cart(request)
    cart[str(variant.pk)] = quantity
    save_cart(request, cart)
    if _is_ajax(request):
        return JsonResponse({"ok": True})
    return redirect("cart:detail")


@require_POST
def remove(request, variant_id):
    cart = get_session_cart(request)
    cart.pop(str(variant_id), None)
    save_cart(request, cart)
    messages.success(request, "Đã xóa sản phẩm khỏi giỏ.")
    return redirect("cart:detail")
