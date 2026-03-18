import os
from pathlib import Path
from dotenv import load_dotenv
import boto3

# Load .env from project root
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

ALL_SERVICES = [
    "ec2", "rds", "s3", "lambda", "vpc", "route53",
    "elb", "ecs", "eks", "dynamodb", "sns", "sqs",
]

GLOBAL_SERVICES = {"s3", "route53"}


def get_all_regions(session: boto3.Session | None = None ) -> list[str]:
    s = session or boto3.Session()
    client = s.client("ec2", region_name="us-east-1")
    return [r["RegionName"] for r in client.describe_regions()["Regions"]]


def get_configured_regions(session: boto3.Session | None = None ) -> list[str]:
    raw = os.getenv("REGIONS", "ALL").strip()
    if raw.upper() == "ALL":
        return get_all_regions(session)
    return [r.strip() for r in raw.split(",") if r.strip()]


def get_aws_profiles() -> list[str]:
    profiles = ["default"]
    config_path = Path.home() / ".aws" / "config"
    if config_path.exists():
        import configparser
        cp = configparser.ConfigParser()
        cp.read(config_path)
        for section in cp.sections():
            name = section.removeprefix("profile ").strip()
            if name and name != "default":
                profiles.append(name)
    return profiles


def get_configured_services() -> list[str]:
    raw = os.getenv("SERVICES", "ALL").strip()
    if raw.upper() == "ALL":
        return list(ALL_SERVICES)
    return [s.strip().lower() for s in raw.split(",") if s.strip()]
