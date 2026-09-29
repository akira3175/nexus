def cart_count(request):
    cart = request.session.get("cart") or {}
    if not isinstance(cart, dict):
        return {"cart_count": 0}
    total = 0
    for quantity in cart.values():
        try:
            value = int(quantity)
        except (TypeError, ValueError):
            continue
        if value > 0:
            total += value
    return {"cart_count": total}
