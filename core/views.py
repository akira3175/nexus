from django.shortcuts import render

def home(request):
    context = {
        "page_title": "Nexus - Đồng hồ chính hãng",
        "heading": "Khám phá bộ sưu tập đồng hồ",
    }
    return render(request, "core/home.html", context)

def contact(request):
    pass

def aboutus(request):
    pass