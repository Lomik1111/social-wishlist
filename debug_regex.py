import re
try:
    s = "router.push(`/wishlist/${id}`)"
    p = r"router\.push\(`\/wishlist\/$\{(.+?)\}`\)"
    r = r"navigation.navigate('WishlistDetail', { id: \1 })"
    print(re.sub(p, r, s))
except Exception as e:
    print(e)
