"""Create the ignored SeaweedFS credentials file from the local .env."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / ".env"
OUTPUT_FILE = ROOT / "storage" / "s3.json"


def main() -> None:
    values = {}
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")

    access_key = values.get("S3_ACCESS_KEY_ID")
    secret_key = values.get("S3_SECRET_ACCESS_KEY")
    if not access_key or not secret_key:
        raise ValueError("Set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY in .env")
    config = {
        "identities": [
            {
                "name": "local-english-coach",
                "credentials": [{"accessKey": access_key, "secretKey": secret_key}],
                "actions": ["Admin", "Read", "Write", "List", "Tagging"],
            }
        ]
    }
    OUTPUT_FILE.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT_FILE} from the ignored .env")


if __name__ == "__main__":
    main()
