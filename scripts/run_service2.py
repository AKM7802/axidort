import logging

from app.services.digest_service import run_digest


def main() -> None:
    logging.basicConfig(level=logging.INFO)

    sent = run_digest()
    print(f"sent {sent} lead-digest emails")


if __name__ == "__main__":
    main()
