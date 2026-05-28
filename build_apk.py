"""
APK build script - copies Python app into Android project and builds.
Requires: Android Studio + Java JDK installed.
Usage: python build_apk.py
"""
import os
import shutil
import subprocess
import sys

BASE = os.path.dirname(__file__)
ANDROID = os.path.join(BASE, "android")
PYTHON_DEST = os.path.join(ANDROID, "app", "src", "main", "python")
STATIC_DEST = os.path.join(PYTHON_DEST, "static")
TEMPLATES_DEST = os.path.join(PYTHON_DEST, "templates")

PY_FILES = ["run.py", "models.py", "ai_parser.py", "crypto_utils.py"]


def copy_files():
    print("[1/3] Copying Python files to Android project...")
    os.makedirs(PYTHON_DEST, exist_ok=True)

    for f in PY_FILES:
        shutil.copy2(os.path.join(BASE, f), os.path.join(PYTHON_DEST, f))
        print(f"  [OK] {f}")

    if os.path.exists(TEMPLATES_DEST):
        shutil.rmtree(TEMPLATES_DEST)
    shutil.copytree(os.path.join(BASE, "templates"), TEMPLATES_DEST)
    print("  [OK] templates/")

    if os.path.exists(STATIC_DEST):
        shutil.rmtree(STATIC_DEST)
    shutil.copytree(os.path.join(BASE, "static"), STATIC_DEST)
    print("  [OK] static/")

    shutil.copy2(
        os.path.join(BASE, "requirements.txt"),
        os.path.join(PYTHON_DEST, "requirements.txt"),
    )
    print("  [OK] requirements.txt")
    print("  Done.")


def build_apk():
    print("\n[2/3] Building APK...")
    gradlew = os.path.join(ANDROID, "gradlew.bat")

    if not os.path.exists(gradlew):
        print("\n  gradlew not found. You need Android Studio to build.")
        print("  Open android/ folder with Android Studio, then:")
        print("  Build -> Build Bundle(s) / APK(s) -> Build APK(s)")
        return False

    result = subprocess.run(
        [gradlew, "assembleRelease"],
        cwd=ANDROID,
        shell=True,
    )

    if result.returncode == 0:
        apk_path = os.path.join(
            ANDROID, "app", "build", "outputs", "apk", "release",
            "app-release.apk",
        )
        if os.path.exists(apk_path):
            dest = os.path.join(BASE, "AI_bookkeeping.apk")
            shutil.copy2(apk_path, dest)
            print(f"\n[3/3] APK generated: {dest}")
            return True

    print("\n  Build failed. See errors above.")
    return False


if __name__ == "__main__":
    print("=" * 50)
    print("AI Bookkeeping APK Builder")
    print("=" * 50)
    copy_files()
    if not build_apk():
        print("\nManual build steps:")
        print("  1. Open android/ with Android Studio")
        print("  2. Wait for Gradle sync")
        print("  3. Build -> Build Bundle(s) / APK(s) -> Build APK(s)")
        print("  4. APK at: android/app/build/outputs/apk/release/")
