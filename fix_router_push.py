import os
import re

def replace_push_wishlist(match):
    return f"navigation.navigate('WishlistDetail', {{ id: {match.group(1)} }})"

def replace_push_item(match):
    return f"navigation.navigate('ItemDetail', {{ id: {match.group(1)} }})"

def replace_push_friend(match):
    return f"navigation.navigate('FriendProfile', {{ username: {match.group(1)} }})"

def replace_in_file(filepath):
    try:
        with open(filepath, 'r') as f:
            content = f.read()

        original_content = content

        # router.push(`/wishlist/${featured.id}`) -> navigation.navigate('WishlistDetail', { id: featured.id })
        content = re.sub(r"router\.push\(\)", replace_push_wishlist, content)
        content = re.sub(r"router\.push\(\)", replace_push_wishlist, content)
        content = re.sub(r"router\.push\(\)", replace_push_item, content)
        content = re.sub(r"router\.push\(\)", replace_push_friend, content)

        # Dependency arrays [router] -> [navigation]
        content = content.replace("[router]", "[navigation]")
        content = content.replace("[router,", "[navigation,")
        content = content.replace(", router]", ", navigation]")

        if content != original_content:
            print(f"Fixing {filepath}")
            with open(filepath, 'w') as f:
                f.write(content)

    except Exception as e:
        print(f"Error fixing {filepath}: {e}")

def main():
    root_dir = 'WishlyMobile/src'
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                replace_in_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
