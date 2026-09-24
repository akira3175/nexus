from django.test import TestCase
from django.urls import reverse

from products.models import Category, Product


class ProductListTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.suits = Category.objects.create(name="Suit", slug="suits")
        cls.shirts = Category.objects.create(name="Sơ mi", slug="shirts")
        cls.navy_suit = Product.objects.create(
            category=cls.suits,
            name="Bộ suit Navy Roma",
            slug="navy-suit",
            description="Suit navy cấu trúc nhẹ",
            material="Wool blend",
            fit="Regular tailored",
            care_instructions="Giặt khô",
            price=8_900_000,
        )
        cls.ivory_shirt = Product.objects.create(
            category=cls.shirts,
            name="Sơ mi Ivory Firenze",
            slug="ivory-shirt",
            description="Sơ mi cổ spread",
            material="Cotton",
            fit="Tailored fit",
            care_instructions="Giặt máy nhẹ",
            price=1_650_000,
        )
        Product.objects.create(
            category=cls.suits,
            name="Sản phẩm ẩn",
            slug="hidden-product",
            description="Không hiển thị",
            material="Wool",
            fit="Regular",
            care_instructions="Giặt khô",
            price=2_000_000,
            is_active=False,
        )

    def test_list_only_contains_active_products(self):
        response = self.client.get(reverse("products:list"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.navy_suit.name)
        self.assertContains(response, self.ivory_shirt.name)
        self.assertNotContains(response, "Sản phẩm ẩn")

    def test_search_matches_name_material_and_fit(self):
        for query, expected in [
            ("Navy", self.navy_suit),
            ("Cotton", self.ivory_shirt),
            ("Regular", self.navy_suit),
        ]:
            with self.subTest(query=query):
                response = self.client.get(reverse("products:list"), {"q": query})
                self.assertQuerySetEqual(response.context["products"], [expected])

    def test_category_filter_uses_active_category_slug(self):
        response = self.client.get(reverse("products:list"), {"category": "shirts"})

        self.assertQuerySetEqual(response.context["products"], [self.ivory_shirt])
        self.assertEqual(response.context["selected_category"], "shirts")

    def test_invalid_category_falls_back_to_all_products(self):
        response = self.client.get(reverse("products:list"), {"category": "unknown"})

        self.assertEqual(len(response.context["products"]), 2)
        self.assertEqual(response.context["selected_category"], "")

    def test_price_sorting(self):
        ascending = self.client.get(reverse("products:list"), {"sort": "price-asc"})
        descending = self.client.get(reverse("products:list"), {"sort": "price-desc"})

        self.assertQuerySetEqual(
            ascending.context["products"],
            [self.ivory_shirt, self.navy_suit],
        )
        self.assertQuerySetEqual(
            descending.context["products"],
            [self.navy_suit, self.ivory_shirt],
        )

    def test_invalid_sort_uses_featured(self):
        response = self.client.get(reverse("products:list"), {"sort": "drop-table"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context["sort"], "featured")

    def test_empty_search_has_clear_message(self):
        response = self.client.get(reverse("products:list"), {"q": "không tồn tại"})

        self.assertContains(response, "Không tìm thấy sản phẩm phù hợp.")
