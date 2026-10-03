from django.contrib import admin, messages
from django.db import transaction
from django.utils.html import format_html

from products.models import ProductVariant

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    fields = ("product_name", "size", "color", "quantity", "unit_price", "item_total")
    readonly_fields = fields

    # Định dạng thành tiền của một dòng sản phẩm để hiển thị trong trang quản trị.
    @admin.display(description="Thành tiền")
    def item_total(self, obj):
        return format_html("{:,.0f} ₫", obj.line_total)

    # Không cho quản trị viên thêm dòng sản phẩm trực tiếp từ đơn hàng.
    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "receiver_name",
        "phone",
        "formatted_total",
        "status",
        "created_at",
    )
    list_filter = ("status", "created_at")
    search_fields = ("id", "user__username", "receiver_name", "phone", "address")
    readonly_fields = ("user", "shipping_fee", "total_amount", "payment_method", "created_at", "updated_at")
    fieldsets = (
        ("Đơn hàng", {"fields": ("user", "status", "payment_method", "shipping_fee", "total_amount", "created_at", "updated_at")}),
        ("Giao hàng", {"fields": ("receiver_name", "phone", "address", "note")}),
    )
    inlines = (OrderItemInline,)
    date_hierarchy = "created_at"
    actions = ("mark_as_confirmed", "mark_as_shipping", "mark_as_completed", "mark_as_cancelled")

    # Định dạng tổng tiền của đơn hàng trong danh sách quản trị.
    @admin.display(description="Tổng tiền", ordering="total_amount")
    def formatted_total(self, obj):
        return format_html("{:,.0f} ₫", obj.total_amount)

    # Chuyển các đơn đang chờ sang trạng thái đã xác nhận.
    @admin.action(description="Xác nhận đơn đang chờ")
    def mark_as_confirmed(self, request, queryset):
        count = queryset.filter(status=Order.STATUS_PENDING).update(
            status=Order.STATUS_CONFIRMED
        )
        self.message_user(request, f"Đã xác nhận {count} đơn hàng.", messages.SUCCESS)

    # Chuyển các đơn đã xác nhận sang trạng thái đang giao.
    @admin.action(description="Chuyển đơn đã xác nhận sang đang giao")
    def mark_as_shipping(self, request, queryset):
        count = queryset.filter(status=Order.STATUS_CONFIRMED).update(
            status=Order.STATUS_SHIPPING
        )
        self.message_user(request, f"Đã chuyển {count} đơn sang đang giao.", messages.SUCCESS)

    # Đánh dấu hoàn tất các đơn đang được giao.
    @admin.action(description="Hoàn tất đơn đang giao")
    def mark_as_completed(self, request, queryset):
        count = queryset.filter(status=Order.STATUS_SHIPPING).update(
            status=Order.STATUS_COMPLETED
        )
        self.message_user(request, f"Đã hoàn tất {count} đơn hàng.", messages.SUCCESS)

    # Hủy đơn đủ điều kiện và cộng lại số lượng sản phẩm vào kho trong cùng giao dịch.
    @admin.action(description="Hủy đơn chờ xác nhận / đã xác nhận và hoàn kho")
    def mark_as_cancelled(self, request, queryset):
        cancelled_count = 0
        with transaction.atomic():
            orders = queryset.select_for_update().filter(
                status__in=(Order.STATUS_PENDING, Order.STATUS_CONFIRMED)
            ).order_by("pk")
            for order in orders:
                for item in order.items.order_by("variant_id"):
                    variant = ProductVariant.objects.select_for_update().get(
                        pk=item.variant_id
                    )
                    variant.stock += item.quantity
                    variant.save(update_fields=("stock",))
                order.status = Order.STATUS_CANCELLED
                order.save(update_fields=("status", "updated_at"))
                cancelled_count += 1
        self.message_user(
            request,
            f"Đã hủy {cancelled_count} đơn hàng và hoàn kho.",
            messages.SUCCESS,
        )

    # Không cho tạo đơn hàng thủ công trong trang quản trị.
    def has_add_permission(self, request):
        return False

    # Không cho xóa đơn hàng để giữ lại lịch sử giao dịch.
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ("order", "product_name", "size", "color", "quantity", "unit_price", "line_total")
    list_filter = ("order__status", "order__created_at")
    search_fields = ("order__id", "product_name", "variant__sku")
    readonly_fields = ("order", "variant", "product_name", "size", "color", "quantity", "unit_price")

    # Định dạng thành tiền của sản phẩm trong danh sách quản trị.
    @admin.display(description="Thành tiền")
    def line_total(self, obj):
        return format_html("{:,.0f} ₫", obj.line_total)

    # Không cho tạo dòng sản phẩm đơn hàng thủ công.
    def has_add_permission(self, request):
        return False

    # Không cho xóa dòng sản phẩm để bảo toàn chi tiết đơn đã đặt.
    def has_delete_permission(self, request, obj=None):
        return False
