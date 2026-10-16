from decimal import Decimal

from django.db import transaction

from products.models import ProductVariant

from .models import Order, OrderItem

SHIPPING_FEE = Decimal("0")


class CheckoutError(Exception):
    """A cart item is invalid or no longer available."""


# Kiểm tra giỏ, khóa và trừ tồn kho, rồi tạo đơn cùng các dòng sản phẩm.
@transaction.atomic
def create_order_from_cart(user, cart_items, recipient):
    quantities = {}
    if not isinstance(cart_items, list) or not cart_items:
        raise CheckoutError("Giỏ hàng trống.")

    for item in cart_items:
        if not isinstance(item, dict):
            raise CheckoutError("Thông tin giỏ hàng không hợp lệ.")
        try:
            variant_id = int(item.get("variant_id", 0))
            quantity = int(item.get("quantity", 0))
        except (TypeError, ValueError, OverflowError):
            raise CheckoutError("Thông tin giỏ hàng không hợp lệ.") from None
        if variant_id < 1 or quantity < 1:
            raise CheckoutError("Số lượng sản phẩm không hợp lệ.")
        quantities[variant_id] = quantities.get(variant_id, 0) + quantity

    variant_ids = sorted(quantities)
    variants = list(
        ProductVariant.objects.select_related("product", "product__category")
        .select_for_update()
        .filter(pk__in=variant_ids)
        .order_by("pk")
    )
    if len(variants) != len(variant_ids):
        raise CheckoutError("Có sản phẩm trong giỏ không còn tồn tại.")

    items = []
    subtotal = Decimal("0")
    for variant in variants:
        quantity = quantities[variant.pk]
        if (
            not variant.is_active
            or not variant.product.is_active
            or not variant.product.category.is_active
        ):
            raise CheckoutError(f"{variant.product.name} hiện không còn được bán.")
        if quantity > variant.stock:
            raise CheckoutError(
                f"{variant.product.name} ({variant.size} · {variant.color}) "
                f"chỉ còn {variant.stock} sản phẩm."
            )
        price = variant.product.price
        subtotal += price * quantity
        items.append((variant, quantity, price))

    order = Order.objects.create(
        user=user,
        receiver_name=recipient["receiver_name"],
        phone=recipient["phone"],
        address=recipient["address"],
        note=recipient.get("note", ""),
        shipping_fee=SHIPPING_FEE,
        total_amount=subtotal + SHIPPING_FEE,
        payment_method="cod",
        status=Order.STATUS_PENDING,
    )

    for variant, quantity, price in items:
        OrderItem.objects.create(
            order=order,
            variant=variant,
            product_name=variant.product.name,
            size=variant.size,
            color=variant.color,
            quantity=quantity,
            unit_price=price,
        )
        variant.stock -= quantity
        variant.save(update_fields=["stock"])

    return order
