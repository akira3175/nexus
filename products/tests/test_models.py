from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase

from products.models import Category, Product, ProductVariant


class ProductModelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.category = Category.objects.create(name="Suit", slug="suits")

    def make_product(self, **overrides):
        values = {
            "category": self.category,
            "name": "Bộ suit Navy Roma",
            "slug": "navy-suit",
            "description": "Suit navy cấu trúc nhẹ",
            "material": "Wool blend",
            "fit": "Regular tailored",
            "care_instructions": "Giặt khô",
            "price": 8_900_000,
        }
        values.update(overrides)
        return Product(**values)

    def test_price_must_be_positive(self):
        for price in [0, -1]:
            with self.subTest(price=price):
                product = self.make_product(price=price)
                with self.assertRaises(ValidationError):
                    product.full_clean()

    def test_variant_sku_is_unique(self):
        product = self.make_product()
        product.save()
        ProductVariant.objects.create(
            product=product,
            sku="NAVY-48",
            size="48",
            color="Navy",
            stock=3,
        )

        with self.assertRaises(IntegrityError), transaction.atomic():
            ProductVariant.objects.create(
                product=product,
                sku="NAVY-48",
                size="50",
                color="Navy",
                stock=2,
            )

    def test_product_size_color_combination_is_unique(self):
        product = self.make_product()
        product.save()
        ProductVariant.objects.create(
            product=product,
            sku="NAVY-48-A",
            size="48",
            color="Navy",
            stock=3,
        )

        with self.assertRaises(IntegrityError), transaction.atomic():
            ProductVariant.objects.create(
                product=product,
                sku="NAVY-48-B",
                size="48",
                color="Navy",
                stock=2,
            )

    def test_stock_cannot_be_negative(self):
        product = self.make_product()
        product.save()
        variant = ProductVariant(
            product=product,
            sku="NAVY-48",
            size="48",
            color="Navy",
            stock=-1,
        )

        with self.assertRaises(ValidationError):
            variant.full_clean()
