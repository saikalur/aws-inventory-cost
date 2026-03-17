from datetime import date, timedelta

import boto3
from models import CostEntry, CostResponse

VALID_METRICS = {
    "AmortizedCost",
    "NetAmortizedCost",
    "UnblendedCost",
    "NetUnblendedCost",
    "BlendedCost",
}


def _make_end_date_exclusive(end_date: str) -> str:
    """AWS Cost Explorer End date is exclusive — add one day so the
    user-selected end date is included in the results."""
    d = date.fromisoformat(end_date)
    return (d + timedelta(days=1)).isoformat()


def get_linked_accounts(
    session: boto3.Session | None = None,
) -> list[dict[str, str]]:
    """Return linked accounts visible in Cost Explorer for the last 30 days."""
    s = session or boto3.Session()
    ce = s.client("ce", region_name="us-east-1")
    today = date.today()
    result = ce.get_dimension_values(
        TimePeriod={
            "Start": (today - timedelta(days=30)).isoformat(),
            "End": today.isoformat(),
        },
        Dimension="LINKED_ACCOUNT",
    )
    return [
        {"id": dv["Value"], "name": dv.get("Attributes", {}).get("description", dv["Value"])}
        for dv in result.get("DimensionValues", [])
    ]


def get_costs(
    start_date: str,
    end_date: str,
    service: str | None = None,
    region: str | None = None,
    granularity: str = "DAILY",
    session: boto3.Session | None = None,
    metric: str = "NetAmortizedCost",
    linked_account: str | None = None,
) -> CostResponse:
    if metric not in VALID_METRICS:
        metric = "NetAmortizedCost"

    s = session or boto3.Session()
    ce = s.client("ce", region_name="us-east-1")

    group_by = [
        {"Type": "DIMENSION", "Key": "SERVICE"},
        {"Type": "DIMENSION", "Key": "REGION"},
    ]

    filters = None
    filter_parts = []
    if service:
        filter_parts.append({
            "Dimensions": {"Key": "SERVICE", "Values": [service]}
        })
    if region:
        filter_parts.append({
            "Dimensions": {"Key": "REGION", "Values": [region]}
        })
    if linked_account:
        filter_parts.append({
            "Dimensions": {"Key": "LINKED_ACCOUNT", "Values": [linked_account]}
        })

    if len(filter_parts) == 1:
        filters = filter_parts[0]
    elif len(filter_parts) > 1:
        filters = {"And": filter_parts}

    kwargs = {
        "TimePeriod": {"Start": start_date, "End": _make_end_date_exclusive(end_date)},
        "Granularity": granularity,
        "Metrics": [metric],
        "GroupBy": group_by,
    }
    if filters:
        kwargs["Filter"] = filters

    entries: list[CostEntry] = []
    total = 0.0

    # Paginate through all results
    while True:
        result = ce.get_cost_and_usage(**kwargs)

        for period in result.get("ResultsByTime", []):
            date_str = period["TimePeriod"]["Start"]
            for group in period.get("Groups", []):
                keys = group["Keys"]
                amount = float(group["Metrics"][metric]["Amount"])
                svc_name = keys[0] if len(keys) > 0 else ""
                rgn_name = keys[1] if len(keys) > 1 else ""
                total += amount
                entries.append(CostEntry(
                    date=date_str,
                    service=svc_name,
                    region=rgn_name,
                    amount=amount,
                ))

        token = result.get("NextPageToken")
        if not token:
            break
        kwargs["NextPageToken"] = token

    return CostResponse(entries=entries, total=round(total, 2))
