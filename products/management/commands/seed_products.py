import shutil
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from products.models import Category, Product, ProductVariant


CATEGORIES = [
    ("suits", "Suit", "Suit nam có cấu trúc cân đối cho công việc và sự kiện."),
    ("blazers", "Blazer", "Blazer có thể phối độc lập trong tủ đồ nam."),
    ("shirts", "Sơ mi", "Sơ mi nền tảng cho trang phục công sở và smart casual."),
    ("trousers", "Quần", "Quần may đo chú trọng tỷ lệ và độ rũ."),
]

PRODUCTS = [
    {
        "slug": "navy-suit",
        "category": "suits",
        "name": "Bộ suit Navy Roma",
        "description": "Bộ suit hai mảnh màu navy với cấu trúc nhẹ, phom regular tailored và bề mặt vải lì. Thiết kế ưu tiên tỷ lệ gọn gàng và khả năng phối đồ linh hoạt.",
        "material": "Wool blend",
        "fit": "Regular tailored",
        "care": "Giặt khô và luôn đọc nhãn chăm sóc trên sản phẩm.",
        "price": 8_900_000,
        "image": "navy-suit.png",
        "color": "Navy",
        "variants": [("46", 4), ("48", 6), ("50", 5), ("52", 2), ("54", 0)],
    },
    {
        "slug": "ivory-shirt",
        "category": "shirts",
        "name": "Sơ mi Ivory Firenze",
        "description": "Mẫu sơ mi nền tảng cho tủ đồ nam, được thiết kế với cổ spread vừa phải và thân áo gọn. Sắc ivory dịu hơn trắng quang học, phù hợp cả trang phục công sở lẫn smart casual.",
        "material": "Cotton",
        "fit": "Tailored fit",
        "care": "Giặt máy nhẹ theo hướng dẫn trên nhãn sản phẩm.",
        "price": 1_650_000,
        "image": "ivory-shirt.png",
        "color": "Ivory",
        "variants": [("S", 8), ("M", 10), ("L", 8), ("XL", 5), ("XXL", 3)],
    },
    {
        "slug": "charcoal-trousers",
        "category": "trousers",
        "name": "Quần ly đôi Milano",
        "description": "Quần charcoal cạp cao vừa với hai ly xuôi, ống thẳng và phần gấu sạch. Tỷ lệ được thiết kế để mặc cùng blazer hoặc sơ mi độc lập.",
        "material": "Wool blend",
        "fit": "Straight fit",
        "care": "Giặt khô và treo trên móc quần phù hợp.",
        "price": 2_450_000,
        "image": "charcoal-trousers.png",
        "color": "Charcoal",
        "variants": [(str(size), 5) for size in range(29, 37)],
    },
    {
        "slug": "tobacco-blazer",
        "category": "blazers",
        "name": "Blazer Linen Siena",
        "description": "Blazer linen một lớp với vai tự nhiên, ve notch và túi đắp. Tông tobacco ấm phù hợp quần ivory, denim sẫm hoặc quần charcoal.",
        "material": "Linen blend",
        "fit": "Relaxed tailored",
        "care": "Giặt khô và treo trên móc có bản vai phù hợp.",
        "price": 4_950_000,
        "image": "tobacco-blazer.png",
        "color": "Tobacco",
        "variants": [("46", 3), ("48", 5), ("50", 4), ("52", 3), ("54", 1)],
    },
]


class Command(BaseCommand):
    help = "Tạo lại catalog demo Nexus từ tài nguyên có sẵn trong dự án."

    @transaction.atomic
    def handle(self, *args, **options):
        categories = {}
        for slug, name, description in CATEGORIES:
            category, _ = Category.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "description": description,
                    "is_active": True,
                },
            )
            categories[slug] = category

        media_directory = Path(settings.MEDIA_ROOT) / "products"
        media_directory.mkdir(parents=True, exist_ok=True)
        source_directory = Path(settings.BASE_DIR) / "static" / "assets" / "images" / "menswear"

        for data in PRODUCTS:
            source_image = source_directory / data["image"]
            target_image = media_directory / data["image"]
            if not target_image.exists():
                shutil.copy2(source_image, target_image)

            product, _ = Product.objects.update_or_create(
                slug=data["slug"],
                defaults={
                    "category": categories[data["category"]],
                    "name": data["name"],
                    "description": data["description"],
                    "material": data["material"],
                    "fit": data["fit"],
                    "care_instructions": data["care"],
                    "price": data["price"],
                    "image": f"products/{data['image']}",
                    "is_active": True,
                },
            )

            expected_skus = set()
            for size, stock in data["variants"]:
                sku = f"{data['slug'].upper()}-{size}"
                expected_skus.add(sku)
                ProductVariant.objects.update_or_create(
                    sku=sku,
                    defaults={
                        "product": product,
                        "size": size,
                        "color": data["color"],
                        "stock": stock,
                        "is_active": True,
                    },
                )

            product.variants.exclude(sku__in=expected_skus).update(is_active=False)

        self.stdout.write(self.style.SUCCESS("Đã tạo 4 sản phẩm demo và các biến thể Nexus."))
