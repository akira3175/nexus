from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from products.models import Category, Product, ProductVariant

from .models import Order

User = get_user_model()


class OrderFlowTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(username="buyer", password="pass12345")
        cls.other = User.objects.create_user(username="other", password="pass12345")
        category = Category.objects.create(name="Suit", slug="suits")
        product = Product.objects.create(
            category=category,
            name="Bộ suit Navy Roma",
            slug="navy-suit",
            description="Suit navy",
            material="Wool",
            fit="Regular",
            care_instructions="Giặt khô",
            price=100_000,
        )
        cls.variant = ProductVariant.objects.create(
            product=product,
            sku="NAVY-48",
            size="48",
            color="Navy",
            stock=3,
        )

    def test_checkout_requires_login(self):
        response = self.client.get(reverse("orders:checkout"))
        self.assertEqual(response.status_code, 302)
        self.assertIn("/accounts/login/", response.url)

    def test_create_order_clears_cart_and_reduces_stock(self):
        self.client.force_login(self.user)
        session = self.client.session
        session["cart"] = {str(self.variant.pk): 2}
        session.save()

        response = self.client.post(
            reverse("orders:checkout"),
            {
                "receiver_name": "Nguyen Van A",
                "phone": "0900000000",
                "address": "1 Nguyen Hue",
                "note": "",
            },
        )
        order = Order.objects.get(user=self.user)
        self.assertRedirects(response, reverse("orders:invoice", args=[order.pk]))
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 1)
        self.assertEqual(self.client.session.get("cart"), {})

        again = self.client.post(
            reverse("orders:checkout"),
            {
                "receiver_name": "Nguyen Van A",
                "phone": "0900000000",
                "address": "1 Nguyen Hue",
            },
        )
        self.assertEqual(Order.objects.filter(user=self.user).count(), 1)
        self.assertRedirects(again, reverse("cart:detail"))

    def test_invoice_is_owner_only(self):
        self.client.force_login(self.user)
        session = self.client.session
        session["cart"] = {str(self.variant.pk): 1}
        session.save()
        self.client.post(
            reverse("orders:checkout"),
            {
                "receiver_name": "Nguyen Van A",
                "phone": "0900000000",
                "address": "1 Nguyen Hue",
            },
        )
        order = Order.objects.get(user=self.user)

        self.client.force_login(self.other)
        response = self.client.get(reverse("orders:invoice", args=[order.pk]))
        self.assertEqual(response.status_code, 404)
