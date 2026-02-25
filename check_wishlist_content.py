import os
import re

filepath = 'WishlyMobile/src/screens/WishlistDetailScreen.tsx'

with open(filepath, 'r') as f:
    content = f.read()

if 'expo-router' in content:
    print(f"Found expo-router in {filepath}")
    # Print a snippet
    start = content.find('expo-router')
    print(f"Snippet: {content[start-20:start+40]}")

    # Try replacement
    new_content = content.replace("import { useRouter, useLocalSearchParams } from 'expo-router';", "import { useNavigation, useRoute } from '@react-navigation/native';")
    if new_content != content:
        print("Replacement success in memory")
    else:
        print("Replacement failed in memory - string mismatch")

    # Check regex
    match = re.search(r"import\s+\{\s*useRouter,\s*useLocalSearchParams\s*\}\s+from\s+'expo-router';", content)
    if match:
         print(f"Regex match: {match.group(0)}")
    else:
         print("Regex no match")
