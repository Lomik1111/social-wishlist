import os

def replace_in_file(filepath):
    try:
        with open(filepath, 'r') as f:
            content = f.read()

        if 'expo-linear-gradient' in content:
            new_content = content.replace("import { LinearGradient } from 'expo-linear-gradient';", "import LinearGradient from 'react-native-linear-gradient';")

            if content != new_content:
                print(f"Replacing in {filepath}")
                with open(filepath, 'w') as f:
                    f.write(new_content)
    except Exception as e:
        print(f"Error reading {filepath}: {e}")

def main():
    root_dir = 'WishlyMobile/src'
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                replace_in_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
