from decimal import Decimal

from django.contrib import messages

from products.models import ProductVariant

SHIPPING_FEE = Decimal("0")


def get_session_cart(request):
    raw = request.session.get("cart", {})
    if not isinstance(raw, dict):
        return {}
    cart = {}
    for key, value in raw.items():
        try:
            variant_id, quantity = int(key), int(value)
        except (TypeError, ValueError):
            continue
        if variant_id > 0 and quantity > 0:
            cart[str(variant_id)] = quantity
    return cart


def save_cart(request, cart):
    request.session["cart"] = cart


def get_cart_items(request):
    cart = get_session_cart(request)
    variants = ProductVariant.objects.select_related("product").filter(
        pk__in=list(cart),
        is_active=True,
        product__is_active=True,
    )
    by_id = {str(variant.pk): variant for variant in variants}
    if set(cart) - set(by_id):
        messages.warning(request, "Một số sản phẩm trong giỏ không còn bán.")
    cleaned = {key: cart[key] for key in by_id}
    save_cart(request, cleaned)
    return [
        {
            "variant": variant,
            "product": variant.product,
            "quantity": cleaned[key],
            "unit_price": variant.product.price,
            "line_total": variant.product.price * cleaned[key],
            "in_stock": variant.stock >= cleaned[key],
        }
        for key, variant in by_id.items()
    ]


def cart_totals(items):
    subtotal = sum((row["line_total"] for row in items), Decimal("0"))
    return {
        "cart_items": items,
        "subtotal": subtotal,
        "shipping_fee": SHIPPING_FEE,
        "total": subtotal + SHIPPING_FEE,
    }
