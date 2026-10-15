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
                self.assertEqual(list(response.context["products"]), [expected])

    def test_category_filter_uses_active_category_slug(self):
        response = self.client.get(reverse("products:list"), {"category": "shirts"})

        self.assertEqual(list(response.context["products"]), [self.ivory_shirt])
        self.assertEqual(response.context["selected_category"], "shirts")

    def test_unknown_category_returns_no_products(self):
        response = self.client.get(reverse("products:list"), {"category": "unknown"})

        self.assertEqual(len(response.context["products"]), 0)
        self.assertEqual(response.context["selected_category"], "unknown")

    def test_price_sorting(self):
        ascending = self.client.get(reverse("products:list"), {"sort": "price-asc"})
        descending = self.client.get(reverse("products:list"), {"sort": "price-desc"})

        self.assertEqual(
            list(ascending.context["products"]),
            [self.ivory_shirt, self.navy_suit],
        )
        self.assertEqual(
            list(descending.context["products"]),
            [self.navy_suit, self.ivory_shirt],
        )

    def test_invalid_sort_uses_featured(self):
        response = self.client.get(reverse("products:list"), {"sort": "drop-table"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context["sort"], "featured")

    def test_empty_search_has_clear_message(self):
        response = self.client.get(reverse("products:list"), {"q": "không tồn tại"})

        self.assertContains(response, "Không tìm thấy sản phẩm phù hợp.")

    def test_pagination_returns_twelve_products_per_page(self):
        for index in range(11):
            Product.objects.create(
                category=self.suits,
                name=f"Suit pagination {index}",
                slug=f"suit-pagination-{index}",
                description="Sản phẩm kiểm tra phân trang",
                material="Wool",
                fit="Regular",
                care_instructions="Giặt khô",
                price=3_000_000 + index,
            )

        first_page = self.client.get(reverse("products:list"))
        second_page = self.client.get(reverse("products:list"), {"page": 2})

        self.assertEqual(first_page.context["page_obj"].number, 1)
        self.assertEqual(len(first_page.context["products"]), 12)
        self.assertEqual(second_page.context["page_obj"].number, 2)
        self.assertEqual(len(second_page.context["products"]), 1)
        self.assertContains(second_page, 'aria-current="page">2')

    def test_invalid_page_numbers_fall_back_to_valid_pages(self):
        for index in range(12):
            Product.objects.create(
                category=self.suits,
                name=f"Suit page fallback {index}",
                slug=f"suit-page-fallback-{index}",
                description="Sản phẩm kiểm tra phân trang",
                material="Wool",
                fit="Regular",
                care_instructions="Giặt khô",
                price=3_000_000 + index,
            )

        invalid_page = self.client.get(reverse("products:list"), {"page": "abc"})
        out_of_range_page = self.client.get(reverse("products:list"), {"page": 99})

        self.assertEqual(invalid_page.context["page_obj"].number, 1)
        self.assertEqual(out_of_range_page.context["page_obj"].number, 2)

    def test_pagination_links_preserve_active_filters(self):
        for index in range(12):
            Product.objects.create(
                category=self.suits,
                name=f"Suit filtered page {index}",
                slug=f"suit-filtered-page-{index}",
                description="Sản phẩm kiểm tra phân trang",
                material="Wool",
                fit="Regular",
                care_instructions="Giặt khô",
                price=3_000_000 + index,
            )

        response = self.client.get(
            reverse("products:list"),
            {
                "q": "Suit",
                "category": "suits",
                "sort": "price-asc",
                "page": 2,
            },
        )

        self.assertEqual(response.context["pagination_query"], "q=Suit&category=suits&sort=price-asc")
        self.assertContains(
            response,
            "?page=1&amp;q=Suit&amp;category=suits&amp;sort=price-asc",
        )
