from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase
from django.urls import reverse

from products.models import Category, Product, ProductVariant

from .forms import AddToCartForm

User = get_user_model()


class AddToCartFormTests(SimpleTestCase):
    def test_quantity_is_positive_integer(self):
        for quantity in ["0", "-1", "1.5", "abc", ""]:
            with self.subTest(quantity=quantity):
                form = AddToCartForm({"variant_id": "12", "quantity": quantity})
                self.assertFalse(form.is_valid())
                self.assertIn("quantity", form.errors)

    def test_valid_data_is_converted(self):
        form = AddToCartForm({"variant_id": "12", "quantity": "2"})
        self.assertTrue(form.is_valid())
        self.assertEqual(form.cleaned_data["quantity"], 2)


class CartViewTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        category = Category.objects.create(name="Suit", slug="suits")
        cls.product = Product.objects.create(
            category=category,
            name="Bộ suit Navy Roma",
            slug="navy-suit",
            description="Suit navy",
            material="Wool",
            fit="Regular",
            care_instructions="Giặt khô",
            price=8_900_000,
        )
        cls.variant = ProductVariant.objects.create(
            product=cls.product,
            sku="NAVY-48",
            size="48",
            color="Navy",
            stock=4,
        )

    def test_add_to_cart_and_show_on_detail(self):
        response = self.client.post(
            reverse("cart:add"),
            {"variant_id": self.variant.pk, "quantity": 2},
        )
        self.assertRedirects(response, self.product.get_absolute_url())
        self.assertEqual(self.client.session["cart"], {str(self.variant.pk): 2})

        page = self.client.get(reverse("cart:detail"))
        self.assertContains(page, self.product.name)
        self.assertContains(page, "48")
        self.assertContains(page, "cart-continue-btn")
        self.assertNotContains(page, "Cập nhật")

    def test_ajax_update_changes_quantity(self):
        self.client.post(
            reverse("cart:add"),
            {"variant_id": self.variant.pk, "quantity": 1},
        )
        response = self.client.post(
            reverse("cart:update", args=[self.variant.pk]),
            {"quantity": 3},
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.session["cart"], {str(self.variant.pk): 3})

    def test_cannot_add_more_than_stock(self):
        self.client.post(
            reverse("cart:add"),
            {"variant_id": self.variant.pk, "quantity": 5},
        )
        self.assertNotIn("cart", self.client.session)
