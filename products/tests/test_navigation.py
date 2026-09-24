from django.test import TestCase
from django.urls import reverse

from products.models import Category, Product


class ProductNavigationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        category = Category.objects.create(name="Suit", slug="suits")
        cls.product = Product.objects.create(
            category=category,
            name="Bộ suit Navy Roma",
            slug="navy-suit",
            description="Suit navy cấu trúc nhẹ",
            material="Wool blend",
            fit="Regular tailored",
            care_instructions="Giặt khô",
            price=8_900_000,
        )

    def test_home_links_to_catalog_without_static_html_routes(self):
        response = self.client.get(reverse("core:home"))

        self.assertContains(response, reverse("products:list"))
        self.assertNotContains(response, '.html"')

    def test_product_pages_mark_collection_navigation_active(self):
        for url in [reverse("products:list"), self.product.get_absolute_url()]:
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertContains(
                    response,
                    f'href="{reverse("products:list")}" class="nav-link active"',
                    html=False,
                )
                self.assertNotContains(response, '.html"')
