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
        content = re.sub(r"const\s+\{(.+?)\}\s+=\s+useLocalSearchParams.*?(\(\))?;", r"const route = useRoute<any>();\n  const { \1 } = route.params || {};", content)
        content = re.sub(r"const\s+params\s+=\s+useLocalSearchParams.*?(\(\))?;", r"const route = useRoute<any>();\n  const params = route.params || {};", content)

        # Navigation calls
        content = content.replace("router.push('/wishlist/create')", "navigation.navigate('WishlistCreate')")
        content = content.replace("router.push('/notifications')", "navigation.navigate('Notifications')")
        content = content.replace("router.push('/settings/privacy')", "navigation.navigate('SettingsPrivacy')")
        content = content.replace("router.push('/(tabs)/profile')", "navigation.navigate('Profile')")
        content = content.replace("router.push('/(auth)/forgot-password')", "navigation.navigate('ForgotPassword')")
        content = content.replace("router.push('/(auth)/register')", "navigation.navigate('Register')")
        content = content.replace("router.push('/(auth)/login')", "navigation.navigate('Login')")
        content = content.replace("router.back()", "navigation.goBack()")
        content = content.replace("router.replace('/(tabs)')", "navigation.reset({ index: 0, routes: [{ name: 'Main' }] })")
        content = content.replace("router.replace('/')", "navigation.reset({ index: 0, routes: [{ name: 'Auth' }] })")

        try:
            content = re.sub(r"router\.push\(\)", r"navigation.navigate('WishlistDetail', { id: \g<1> })", content)
        except Exception as e:
            print(f"Regex error 1 in {filepath}: {e}")

        try:
            content = re.sub(r"router\.push\(\)", r"navigation.navigate('WishlistDetail', { id: \g<1> })", content)
        except Exception as e:
            print(f"Regex error 2 in {filepath}: {e}")

        try:
            content = re.sub(r"router\.push\(\)", r"navigation.navigate('ItemDetail', { id: \g<1> })", content)
        except Exception as e:
            print(f"Regex error 3 in {filepath}: {e}")

        try:
            content = re.sub(r"router\.push\(\)", r"navigation.navigate('FriendProfile', { username: \g<1> })", content)
        except Exception as e:
            print(f"Regex error 4 in {filepath}: {e}")

        # Fallback for manual fix
        if 'router.push' in content or 'useRouter' in content:
             print(f"Warning: {filepath} still contains router usage")

        if content != original_content:
            print(f"Migrating {filepath}")
            with open(filepath, 'w') as f:
                f.write(content)

    except Exception as e:
        print(f"Error migrating {filepath}: {e}")

def main():
    root_dir = 'WishlyMobile/src'
    print(f"Scanning {root_dir}")
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                replace_in_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
