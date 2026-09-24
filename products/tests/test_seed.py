import tempfile
from pathlib import Path

from django.core.management import call_command
from django.test import TestCase, override_settings

from products.models import Category, Product, ProductVariant


class SeedProductsCommandTests(TestCase):
    def test_command_is_repeatable_and_copies_catalog_images(self):
        with tempfile.TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                call_command("seed_products", verbosity=0)
                call_command("seed_products", verbosity=0)

                self.assertEqual(Category.objects.count(), 4)
                self.assertEqual(Product.objects.count(), 4)
                self.assertEqual(ProductVariant.objects.count(), 23)
                self.assertEqual(ProductVariant.objects.filter(stock=0).count(), 1)
                self.assertTrue(
                    (Path(media_root) / "products" / "navy-suit.png").is_file()
                )
