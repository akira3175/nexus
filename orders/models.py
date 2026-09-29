from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class Order(models.Model):
    STATUS_PENDING = "pending"
    STATUS_CONFIRMED = "confirmed"
    STATUS_SHIPPING = "shipping"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Chờ xác nhận"),
        (STATUS_CONFIRMED, "Đã xác nhận"),
        (STATUS_SHIPPING, "Đang giao"),
        (STATUS_COMPLETED, "Hoàn tất"),
        (STATUS_CANCELLED, "Đã hủy"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="orders",
    )
    receiver_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20)
    address = models.TextField()
    note = models.TextField(blank=True)
    shipping_fee = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        validators=[MinValueValidator(0)],
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        validators=[MinValueValidator(0)],
    )
    payment_method = models.CharField(max_length=20, default="cod")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(shipping_fee__gte=0),
                name="order_shipping_fee_gte_zero",
            ),
            models.CheckConstraint(
                condition=models.Q(total_amount__gte=0),
                name="order_total_amount_gte_zero",
            ),
        ]

    def __str__(self):
        return f"Đơn #{self.pk}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    variant = models.ForeignKey(
        "products.ProductVariant",
        on_delete=models.PROTECT,
        related_name="order_items",
    )
    product_name = models.CharField(max_length=180)
    size = models.CharField(max_length=30)
    color = models.CharField(max_length=80)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        validators=[MinValueValidator(1)],
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["order", "variant"], name="unique_order_variant"),
            models.CheckConstraint(
                condition=models.Q(quantity__gt=0),
                name="orderitem_quantity_gt_zero",
            ),
            models.CheckConstraint(
                condition=models.Q(unit_price__gt=0),
                name="orderitem_unit_price_gt_zero",
            ),
        ]

    @property
    def line_total(self):
        return self.unit_price * self.quantity
