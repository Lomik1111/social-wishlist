import os
import re

def replace_in_file(filepath):
    try:
        with open(filepath, 'r') as f:
            content = f.read()

        original_content = content

        # Imports
        content = re.sub(r"import\s+\{\s*useRouter\s*\}\s+from\s+'expo-router';", "import { useNavigation } from '@react-navigation/native';", content)
        content = re.sub(r"import\s+\{\s*useRouter,\s*useLocalSearchParams\s*\}\s+from\s+'expo-router';", "import { useNavigation, useRoute } from '@react-navigation/native';", content)
        content = re.sub(r"import\s+\{\s*useLocalSearchParams\s*\}\s+from\s+'expo-router';", "import { useRoute } from '@react-navigation/native';", content)

        # Hooks
        content = re.sub(r"const\s+router\s+=\s+useRouter\(\);", "const navigation = useNavigation<any>();", content)

        # Local Search Params
        if 'useLocalSearchParams' in original_content:
             content = re.sub(r"const\s+\{(.+?)\}\s+=\s+useLocalSearchParams.*?(\(\))?;", r"const route = useRoute<any>();\n  const { \1 } = route.params || {};", content)
             content = re.sub(r"const\s+params\s+=\s+useLocalSearchParams.*?(\(\))?;", r"const route = useRoute<any>();\n  const params = route.params || {};", content)

        # Navigation calls
        # router.push('/wishlist/create') -> navigation.navigate('WishlistCreate')
        content = content.replace("router.push('/wishlist/create')", "navigation.navigate('WishlistCreate')")

        # router.push('/notifications')
        content = content.replace("router.push('/notifications')", "navigation.navigate('Notifications')")

        # router.push('/settings/privacy')
        content = content.replace("router.push('/settings/privacy')", "navigation.navigate('SettingsPrivacy')")

        # router.push('/(tabs)/profile') -> navigation.navigate('Profile')
        content = content.replace("router.push('/(tabs)/profile')", "navigation.navigate('Profile')")

        # Auth
        content = content.replace("router.push('/(auth)/forgot-password')", "navigation.navigate('ForgotPassword')")
        content = content.replace("router.push('/(auth)/register')", "navigation.navigate('Register')")
        content = content.replace("router.push('/(auth)/login')", "navigation.navigate('Login')")


        # router.back()
        content = content.replace("router.back()", "navigation.goBack()")

        # router.replace('/(tabs)')
        content = content.replace("router.replace('/(tabs)')", "navigation.reset({ index: 0, routes: [{ name: 'Main' }] })")

        # router.replace('/')
        content = content.replace("router.replace('/')", "navigation.reset({ index: 0, routes: [{ name: 'Auth' }] })")


        # Dynamic routes
        # router.push(`/wishlist/${featured.id}`)
        content = re.sub(r"router\.push\(\)", r"navigation.navigate('WishlistDetail', { id: \1 })", content)
        content = re.sub(r"router\.push\(\)", r"navigation.navigate('WishlistDetail', { id: \1 })", content)

        # router.push(`/item/${id}`)
        content = re.sub(r"router\.push\(\)", r"navigation.navigate('ItemDetail', { id: \1 })", content)

        # router.push(`/friend/${username}`)
        content = re.sub(r"router\.push\(\)", r"navigation.navigate('FriendProfile', { username: \1 })", content)

        if content != original_content:
            print(f"Migrating {filepath}")
            with open(filepath, 'w') as f:
                f.write(content)

    except Exception as e:
        print(f"Error migrating {filepath}: {e}")

def main():
    root_dir = 'WishlyMobile/src'
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                replace_in_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
