from django.test import TestCase
from django.urls import reverse

from products.models import Category, Product, ProductVariant


class ProductDetailTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.suits = Category.objects.create(name="Suit", slug="suits")
        cls.shirts = Category.objects.create(name="Sơ mi", slug="shirts")
        cls.product = Product.objects.create(
            category=cls.suits,
            name="Bộ suit Navy Roma",
            slug="navy-suit",
            description="Suit navy cấu trúc nhẹ",
            material="Wool blend",
            fit="Regular tailored",
            care_instructions="Giặt khô",
            price=8_900_000,
        )
        cls.available = ProductVariant.objects.create(
            product=cls.product,
            sku="NAVY-48",
            size="48",
            color="Navy",
            stock=4,
        )
        cls.out_of_stock = ProductVariant.objects.create(
            product=cls.product,
            sku="NAVY-50",
            size="50",
            color="Navy",
            stock=0,
        )
        cls.inactive_variant = ProductVariant.objects.create(
            product=cls.product,
            sku="NAVY-52",
            size="52",
            color="Navy",
            stock=3,
            is_active=False,
        )
        cls.same_category = Product.objects.create(
            category=cls.suits,
            name="Suit Charcoal",
            slug="charcoal-suit",
            description="Suit charcoal",
            material="Wool",
            fit="Regular",
            care_instructions="Giặt khô",
            price=7_500_000,
        )
        cls.other_category = Product.objects.create(
            category=cls.shirts,
            name="Sơ mi Ivory",
            slug="ivory-shirt",
            description="Sơ mi cotton",
            material="Cotton",
            fit="Tailored",
            care_instructions="Giặt nhẹ",
            price=1_650_000,
        )

    def test_detail_contains_only_active_variants(self):
        response = self.client.get(self.product.get_absolute_url())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context["variants"], [self.available, self.out_of_stock])
        self.assertContains(response, "48 · Navy")
        self.assertContains(response, "50 · Navy")
        self.assertNotContains(response, "52 · Navy")

    def test_out_of_stock_variant_is_disabled(self):
        response = self.client.get(self.product.get_absolute_url())

        self.assertContains(
            response,
            f'<option value="{self.out_of_stock.id}" data-stock="0" disabled>',
            html=False,
        )

    def test_inactive_product_returns_404(self):
        self.product.is_active = False
        self.product.save(update_fields=["is_active"])

        response = self.client.get(reverse("products:detail", args=[self.product.slug]))

        self.assertEqual(response.status_code, 404)

    def test_product_in_inactive_category_returns_404(self):
        self.suits.is_active = False
        self.suits.save(update_fields=["is_active"])

        response = self.client.get(reverse("products:detail", args=[self.product.slug]))

        self.assertEqual(response.status_code, 404)

    def test_related_products_prefer_same_category_and_exclude_current(self):
        response = self.client.get(self.product.get_absolute_url())
        related = response.context["related_products"]

        self.assertEqual(related[0], self.same_category)
        self.assertIn(self.other_category, related)
        self.assertNotIn(self.product, related)

    def test_selection_uses_variant_id_and_quantity_contract(self):
        response = self.client.get(self.product.get_absolute_url())

        self.assertContains(response, 'name="variant_id"')
        self.assertContains(response, 'name="quantity"')
