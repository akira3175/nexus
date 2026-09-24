from django.test import SimpleTestCase

from products.templatetags.product_tags import vnd


class ProductTemplateTagTests(SimpleTestCase):
    def test_vnd_formats_without_decimal_places(self):
        self.assertEqual(vnd("8900000"), "8.900.000 ₫")

    def test_vnd_returns_empty_string_for_invalid_value(self):
        self.assertEqual(vnd("không hợp lệ"), "")
