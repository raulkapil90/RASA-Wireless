import os, subprocess

try:
    output = subprocess.check_output('netstat -ano | findstr :8000', shell=True).decode()
    for line in output.splitlines():
        if 'LISTENING' in line:
            parts = line.strip().split()
            pid = parts[-1]
            print(f"Killing {pid}")
            os.system(f"taskkill /F /PID {pid}")
except Exception as e:
    print("Error or nothing to kill:", e)
