from django import forms


class AddToCartForm(forms.Form):
    variant_id = forms.IntegerField(
        min_value=1,
        widget=forms.HiddenInput(),
        error_messages={
            "required": "Vui lòng chọn size và màu.",
            "invalid": "Lựa chọn sản phẩm không hợp lệ.",
            "min_value": "Lựa chọn sản phẩm không hợp lệ.",
        },
    )
    quantity = forms.IntegerField(
        label="Số lượng",
        min_value=1,
        widget=forms.NumberInput(attrs={"min": 1}),
        error_messages={
            "required": "Vui lòng nhập số lượng.",
            "invalid": "Số lượng phải là số nguyên.",
            "min_value": "Số lượng phải từ 1 trở lên.",
        },
    )


class CartQuantityForm(forms.Form):
    quantity = forms.IntegerField(
        min_value=1,
        error_messages={
            "required": "Vui lòng nhập số lượng.",
            "invalid": "Số lượng phải là số nguyên.",
            "min_value": "Số lượng phải từ 1 trở lên.",
        },
    )
