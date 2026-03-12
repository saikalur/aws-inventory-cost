from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import date, timedelta
import boto3
from models import InventoryResponse, CostResponse, ConfigResponse, AccountResponse
from config import get_configured_regions, get_configured_services, get_aws_profiles
from services.inventory import collect_inventory
from services.costs import get_costs

app = FastAPI(title="AWS Inventory & Cost Reporter")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _session(profile: str | None) -> boto3.Session:
    return boto3.Session(profile_name=profile) if profile else boto3.Session()


@app.get("/api/profiles")
def profiles():
    return {"profiles": get_aws_profiles()}


@app.get("/api/account", response_model=AccountResponse)
def account(profile: str = Query(default=None)):
    session = _session(profile)
    sts = session.client("sts")
    identity = sts.get_caller_identity()
    account_id = identity["Account"]
    try:
        org = session.client("organizations")
        details = org.describe_account(AccountId=account_id)
        account_name = details["Account"]["Name"]
    except Exception:
        account_name = account_id
    return AccountResponse(account_id=account_id, account_name=account_name)


@app.get("/api/inventory", response_model=InventoryResponse)
def inventory(profile: str = Query(default=None)):
    session = _session(profile)
    regions = get_configured_regions(session)
    services = get_configured_services()
    nodes, links = collect_inventory(regions, services, session)
    return InventoryResponse(nodes=nodes, links=links)


@app.get("/api/costs", response_model=CostResponse)
def costs(
    profile: str = Query(default=None),
    start_date: str = Query(default=None),
    end_date: str = Query(default=None),
    service: str = Query(default=None),
    region: str = Query(default=None),
    granularity: str = Query(default="DAILY"),
):
    if not start_date:
        start_date = (date.today() - timedelta(days=30)).isoformat()
    if not end_date:
        end_date = date.today().isoformat()
    return get_costs(start_date, end_date, service, region, granularity, _session(profile))


@app.get("/api/config", response_model=ConfigResponse)
def config(profile: str = Query(default=None)):
    return ConfigResponse(
        regions=get_configured_regions(_session(profile)),
        services=get_configured_services(),
    )
