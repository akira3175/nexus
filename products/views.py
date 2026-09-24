from django.db.models import Q
from django.shortcuts import get_object_or_404, render
from .models import Category, Product


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

    if selected_category:
        products = products.filter(category__slug=selected_category)

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
        Product,
        slug=slug,
        is_active=True,
        category__is_active=True,
    )
    variants = product.variants.filter(is_active=True).order_by("id")
    related_products = list(
        Product.objects.filter(
            is_active=True,
            category__is_active=True,
            category=product.category,
        )
        .exclude(pk=product.pk)
        .select_related("category")[:3]
    )

    return render(
        request,
        "products/detail.html",
        {
            "product": product,
            "variants": variants,
            "related_products": related_products,
        },
    )
