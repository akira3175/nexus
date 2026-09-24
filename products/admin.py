from django.contrib import admin
from django.db.models import Sum

from .models import Category, Product, ProductVariant


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active")
    list_filter = ("is_active",)
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "description")


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 0
    fields = ("sku", "size", "color", "stock", "is_active")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "price", "total_stock", "is_active")
    list_filter = ("category", "is_active")
    list_select_related = ("category",)
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "slug", "material", "variants__sku")
    inlines = (ProductVariantInline,)

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_total_stock=Sum("variants__stock"))

    @admin.display(description="Tồn kho", ordering="_total_stock")
    def total_stock(self, product):
        return product._total_stock or 0


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ("sku", "product", "size", "color", "stock", "is_active")
    list_filter = ("is_active", "color", "product__category")
    list_select_related = ("product", "product__category")
    search_fields = ("sku", "product__name", "size", "color")
