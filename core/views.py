from django.shortcuts import render

def home(request):
    context = {
        "page_title": "Nexus Menswear",
        "heading": "Khám phá bộ sưu tập trang phục nam",
    }
    return render(request, "core/home.html", context)

def contact(request):
    pass

def aboutus(request):
    return render(request, "core/aboutus.html")
