from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import date, timedelta
from pydantic import BaseModel
import boto3
from botocore.exceptions import ClientError, NoCredentialsError, CredentialRetrievalError
from models import InventoryResponse, CostResponse, ConfigResponse, AccountResponse
from config import get_configured_regions, get_configured_services, get_aws_profiles
from services.inventory import collect_inventory
from services.costs import get_costs, get_linked_accounts

app = FastAPI(title="AWS Inventory & Cost Reporter")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for temporary credentials keyed by profile name
_temp_credentials: dict[str, dict[str, str]] = {}

CREDENTIAL_ERROR_CODES = {
    "ExpiredToken", "ExpiredTokenException", "RequestExpired",
    "InvalidClientTokenId", "UnrecognizedClientException",
    "InvalidIdentityToken", "AccessDeniedException",
}


class CredentialsPayload(BaseModel):
    profile: str = ""
    aws_access_key_id: str
    aws_secret_access_key: str
    aws_session_token: str = ""


@app.exception_handler(ClientError)
async def handle_client_error(request: Request, exc: ClientError):
    code = exc.response.get("Error", {}).get("Code", "")
    if code in CREDENTIAL_ERROR_CODES:
        return JSONResponse(
            status_code=401,
            content={"detail": "AWS credentials expired or invalid", "code": "CREDENTIALS_EXPIRED"},
        )
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
    )


@app.exception_handler(NoCredentialsError)
async def handle_no_credentials(request: Request, exc: NoCredentialsError):
    return JSONResponse(
        status_code=401,
        content={"detail": "No AWS credentials configured", "code": "CREDENTIALS_EXPIRED"},
    )


@app.exception_handler(CredentialRetrievalError)
async def handle_credential_retrieval(request: Request, exc: CredentialRetrievalError):
    return JSONResponse(
        status_code=401,
        content={"detail": "Failed to retrieve AWS credentials", "code": "CREDENTIALS_EXPIRED"},
    )


def _session(profile: str | None) -> boto3.Session:
    key = profile or ""
    if key in _temp_credentials:
        creds = _temp_credentials[key]
        kwargs: dict = {
            "aws_access_key_id": creds["aws_access_key_id"],
            "aws_secret_access_key": creds["aws_secret_access_key"],
        }
        if creds.get("aws_session_token"):
            kwargs["aws_session_token"] = creds["aws_session_token"]
        if profile:
            kwargs["profile_name"] = profile
        return boto3.Session(**kwargs)
    return boto3.Session(profile_name=profile) if profile else boto3.Session()


@app.get("/api/profiles")
def profiles():
    return {"profiles": get_aws_profiles()}


@app.post("/api/credentials")
def set_credentials(payload: CredentialsPayload):
    _temp_credentials[payload.profile] = {
        "aws_access_key_id": payload.aws_access_key_id,
        "aws_secret_access_key": payload.aws_secret_access_key,
        "aws_session_token": payload.aws_session_token,
    }
    # Verify the credentials work
    session = _session(payload.profile or None)
    sts = session.client("sts")
    identity = sts.get_caller_identity()
    return {"status": "ok", "account_id": identity["Account"]}


@app.delete("/api/credentials")
def clear_credentials(profile: str = Query(default="")):
    _temp_credentials.pop(profile, None)
    return {"status": "ok"}


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


def _assume_role_session(base_session: boto3.Session, account_id: str) -> boto3.Session:
    """Assume OrganizationAccountAccessRole in a linked account."""
    sts = base_session.client("sts")
    role_arn = f"arn:aws:iam::{account_id}:role/OrganizationAccountAccessRole"
    resp = sts.assume_role(RoleArn=role_arn, RoleSessionName="inventory-reporter")
    creds = resp["Credentials"]
    return boto3.Session(
        aws_access_key_id=creds["AccessKeyId"],
        aws_secret_access_key=creds["SecretAccessKey"],
        aws_session_token=creds["SessionToken"],
    )


@app.get("/api/inventory", response_model=InventoryResponse)
def inventory(
    profile: str = Query(default=None),
    linked_account: str = Query(default=None),
):
    session = _session(profile)
    if linked_account:
        session = _assume_role_session(session, linked_account)
    regions = get_configured_regions(session)
    services = get_configured_services()
    nodes, links = collect_inventory(regions, services, session)
    return InventoryResponse(nodes=nodes, links=links)


@app.get("/api/linked-accounts")
def linked_accounts(profile: str = Query(default=None)):
    accounts = get_linked_accounts(_session(profile))
    return {"accounts": accounts}


@app.get("/api/costs", response_model=CostResponse)
def costs(
    profile: str = Query(default=None),
    start_date: str = Query(default=None),
    end_date: str = Query(default=None),
    service: str = Query(default=None),
    region: str = Query(default=None),
    granularity: str = Query(default="DAILY"),
    metric: str = Query(default="NetAmortizedCost"),
    linked_account: str = Query(default=None),
):
    if not start_date:
        start_date = (date.today() - timedelta(days=30)).isoformat()
    if not end_date:
        end_date = date.today().isoformat()
    return get_costs(start_date, end_date, service, region, granularity, _session(profile), metric, linked_account)


@app.get("/api/config", response_model=ConfigResponse)
def config(profile: str = Query(default=None)):
    return ConfigResponse(
        regions=get_configured_regions(_session(profile)),
        services=get_configured_services(),
    )
