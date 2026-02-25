import sys
import subprocess

def main():
    cmd = sys.argv[1:]
    with open('output.txt', 'w') as f:
        subprocess.run(cmd, stdout=f, stderr=f)

if __name__ == "__main__":
    main()
