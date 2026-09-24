from django.db.models import Prefetch, Q
from django.shortcuts import get_object_or_404, render

from .models import Category, Product, ProductVariant


SORT_OPTIONS = {
    "featured": ("-created_at", "-id"),
    "price-asc": ("price", "id"),
    "price-desc": ("-price", "id"),
}


def product_list(request):
    query = request.GET.get("q", "").strip()[:100]
    selected_category = request.GET.get("category", "").strip()
    sort = request.GET.get("sort", "featured")
    if sort not in SORT_OPTIONS:
        sort = "featured"

    categories = Category.objects.filter(is_active=True)
    products = Product.objects.filter(
        is_active=True,
        category__is_active=True,
    ).select_related("category")

    if query:
        products = products.filter(
            Q(name__icontains=query)
            | Q(description__icontains=query)
            | Q(material__icontains=query)
            | Q(fit__icontains=query)
        )

    if selected_category and categories.filter(slug=selected_category).exists():
        products = products.filter(category__slug=selected_category)
    else:
        selected_category = ""

    products = products.order_by(*SORT_OPTIONS[sort])

    return render(
        request,
        "products/list.html",
        {
            "products": products,
            "categories": categories,
            "q": query,
            "selected_category": selected_category,
            "sort": sort,
        },
    )


def product_detail(request, slug):
    product = get_object_or_404(
        Product.objects.select_related("category").prefetch_related(
            Prefetch(
                "variants",
                queryset=ProductVariant.objects.filter(is_active=True).order_by("id"),
                to_attr="active_variants",
            )
        ),
        slug=slug,
        is_active=True,
        category__is_active=True,
    )
    related_products = list(
        Product.objects.filter(
            is_active=True,
            category__is_active=True,
            category=product.category,
        )
        .exclude(pk=product.pk)
        .select_related("category")[:3]
    )
    if len(related_products) < 3:
        excluded_ids = [product.pk, *(item.pk for item in related_products)]
        related_products.extend(
            Product.objects.filter(is_active=True, category__is_active=True)
            .exclude(pk__in=excluded_ids)
            .select_related("category")[: 3 - len(related_products)]
        )

    return render(
        request,
        "products/detail.html",
        {
            "product": product,
            "variants": product.active_variants,
            "related_products": related_products,
        },
    )
