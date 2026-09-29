from django import forms


class CheckoutForm(forms.Form):
    receiver_name = forms.CharField(label="Họ tên", max_length=150)
    phone = forms.CharField(label="Số điện thoại", max_length=20)
    address = forms.CharField(
        label="Địa chỉ",
        max_length=500,
        widget=forms.Textarea(attrs={"rows": 3}),
    )
    note = forms.CharField(
        label="Ghi chú",
        max_length=1000,
        required=False,
        widget=forms.Textarea(attrs={"rows": 3}),
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            field.widget.attrs["class"] = "form-control"

    def clean_receiver_name(self):
        name = " ".join(self.cleaned_data["receiver_name"].split())
        if len(name) < 2:
            raise forms.ValidationError("Vui lòng nhập tên người nhận từ 2 ký tự.")
        return name
