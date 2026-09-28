"""Write only the local Supabase URL and publishable key to development env files."""

import subprocess
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read_status() -> dict[str, str]:
    result = subprocess.run(
        ["bunx", "supabase@2.118.0", "status", "--output", "env"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    values: dict[str, str] = {}
    for line in result.stdout.splitlines():
        name, separator, value = line.partition("=")
        if separator:
            values[name.strip()] = value.strip().strip('"')
    return values


def update_env(path: Path, template: Path, replacements: dict[str, str]) -> None:
    source = path if path.exists() else template
    lines = source.read_text(encoding="utf-8").splitlines()
    found: set[str] = set()
    output: list[str] = []

    for line in lines:
        name, separator, _ = line.partition("=")
        if separator and name in replacements:
            output.append(f"{name}={replacements[name]}")
            found.add(name)
        else:
            output.append(line)

    output.extend(
        f"{name}={value}" for name, value in replacements.items() if name not in found
    )
    path.write_text("\n".join(output).rstrip() + "\n", encoding="utf-8")


def main() -> None:
    status = read_status()
    publishable_key = status.get("PUBLISHABLE_KEY") or status.get(
        "SUPABASE_PUBLISHABLE_KEY"
    )
    if not publishable_key:
        raise SystemExit(
            "Local Supabase publishable key not found; start Supabase first."
        )

    with (ROOT / "supabase" / "config.toml").open("rb") as file:
        api_port = tomllib.load(file)["api"]["port"]
    api_url = f"http://127.0.0.1:{api_port}"

    update_env(
        ROOT / ".env",
        ROOT / ".env.example",
        {"SUPABASE_URL": api_url, "SUPABASE_PUBLISHABLE_KEY": publishable_key},
    )
    update_env(
        ROOT / "web" / ".env.local",
        ROOT / "web" / ".env.example",
        {
            "NEXT_PUBLIC_SUPABASE_URL": api_url,
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": publishable_key,
        },
    )
    print("Updated local backend and frontend Supabase configuration.")


if __name__ == "__main__":
    main()
