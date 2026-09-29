from django.db import transaction

from cart.services import SHIPPING_FEE
from products.models import ProductVariant

from .models import Order, OrderItem


class CheckoutError(Exception):
    pass


@transaction.atomic
def create_order_from_cart(user, cart, recipient):
    cart = cart or {}
    if not cart:
        raise CheckoutError("Giỏ hàng trống.")

    ids = sorted(int(key) for key in cart)
    variants = (
        ProductVariant.objects.select_related("product", "product__category")
        .select_for_update()
        .filter(pk__in=ids)
    )
    by_id = {variant.pk: variant for variant in variants}

    items_data = []
    subtotal = 0
    for variant_id in ids:
        quantity = int(cart[str(variant_id)])
        variant = by_id.get(variant_id)
        product = getattr(variant, "product", None)
        if (
            not variant
            or not variant.is_active
            or not product.is_active
            or not product.category.is_active
        ):
            raise CheckoutError("Có sản phẩm không còn bán.")
        if quantity < 1 or quantity > variant.stock:
            raise CheckoutError("Không đủ tồn kho.")
        price = product.price
        items_data.append((variant, quantity, price))
        subtotal += price * quantity
        variant.stock -= quantity
        variant.save(update_fields=["stock"])

    order = Order.objects.create(
        user=user,
        receiver_name=recipient["receiver_name"],
        phone=recipient["phone"],
        address=recipient["address"],
        note=recipient.get("note") or "",
        shipping_fee=SHIPPING_FEE,
        total_amount=subtotal + SHIPPING_FEE,
        payment_method="cod",
        status=Order.STATUS_PENDING,
    )
    for variant, quantity, price in items_data:
        OrderItem.objects.create(
            order=order,
            variant=variant,
            product_name=variant.product.name,
            size=variant.size,
            color=variant.color,
            quantity=quantity,
            unit_price=price,
        )
    return order
