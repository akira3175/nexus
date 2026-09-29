from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_http_methods

from cart.services import cart_totals, get_cart_items, save_cart

from .forms import CheckoutForm
from .models import Order
from .services import CheckoutError, create_order_from_cart


@login_required
@require_http_methods(["GET", "POST"])
def checkout(request):
    items = get_cart_items(request)
    totals = cart_totals(items)
    if not items:
        messages.error(request, "Giỏ hàng trống.")
        return redirect("cart:detail")

    form = CheckoutForm(request.POST if request.method == "POST" else None)
    if request.method == "POST" and form.is_valid():
        try:
            order = create_order_from_cart(
                user=request.user,
                cart=request.session.get("cart", {}),
                recipient=form.cleaned_data,
            )
        except CheckoutError as error:
            form.add_error(None, str(error))
        else:
            save_cart(request, {})
            messages.success(request, "Đặt hàng thành công.")
            return redirect("orders:invoice", pk=order.pk)

    context = {**totals, "form": form}
    return render(request, "orders/checkout.html", context)


@login_required
def order_list(request):
    orders = Order.objects.filter(user=request.user).prefetch_related("items")
    return render(request, "orders/list.html", {"orders": orders})


@login_required
def invoice(request, pk):
    order = get_object_or_404(
        Order.objects.prefetch_related("items"),
        pk=pk,
        user=request.user,
    )
    return render(
        request,
        "orders/invoice.html",
        {"order": order, "order_items": order.items.all()},
    )
