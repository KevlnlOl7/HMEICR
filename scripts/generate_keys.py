"""
Script to generate secure random keys for Flask app and E-Invoice encryption.
Run this script to generate new secret keys for your .env file.
"""
import secrets


def generate_key(length=32):
    """Generate a secure random hex key"""
    return secrets.token_hex(length)


def main():
    print("=" * 60)
    print("HMEICR Security Key Generator")
    print("=" * 60)
    print()
    print("Copy and paste these keys into your .env file:")
    print()
    print("# Flask Secret Key (for session signing)")
    print(f"secret_key=\"{generate_key(32)}\"")
    print()
    print("# E-Invoice Encryption Key (for encrypting passwords)")
    print(f"EINVOICE_SECRET_KEY=\"{generate_key(32)}\"")
    print()
    print("=" * 60)
    print("⚠️ IMPORTANT:")
    print("  - Never commit these keys to version control")
    print("  - Store them securely in your .env file")
    print("  - Rotate keys periodically")
    print("=" * 60)


if __name__ == "__main__":
    main()
