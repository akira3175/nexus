from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = (
        "variant",
        "product_name",
        "size",
        "color",
        "quantity",
        "unit_price",
    )


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "total_amount", "created_at")
    list_filter = ("status",)
    inlines = [OrderItemInline]
    readonly_fields = (
        "user",
        "receiver_name",
        "phone",
        "address",
        "note",
        "shipping_fee",
        "total_amount",
        "payment_method",
        "created_at",
        "updated_at",
    )
