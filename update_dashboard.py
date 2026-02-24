import re

filepath = 'WishlyMobile/src/screens/tabs/DashboardScreen.tsx'
with open(filepath, 'r') as f:
    content = f.read()

if 'expo-router' in content:
    print("Found expo-router")
    content = content.replace("import { useRouter } from 'expo-router';", "import { useNavigation } from '@react-navigation/native';")
    content = content.replace("const router = useRouter();", "const navigation = useNavigation<any>();")
    content = content.replace("router.push('/wishlist/create')", "navigation.navigate('WishlistCreate')")
    content = content.replace("router.push('/notifications')", "navigation.navigate('Notifications')")
    content = content.replace("router.push('/(tabs)/profile')", "navigation.navigate('Profile')")

    # Dynamic
    content = re.sub(r"router\.push\(\)", r"navigation.navigate('WishlistDetail', { id: \1 })", content)

    with open(filepath, 'w') as f:
        f.write(content)
    print("Updated")
else:
    print("expo-router not found")
