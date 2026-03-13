import boto3
from models import CostEntry, CostResponse


def get_costs(
    start_date: str,
    end_date: str,
    service: str | None = None,
    region: str | None = None,
    granularity: str = "DAILY",
    session: boto3.Session | None = None,
) -> CostResponse:
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

    if len(filter_parts) == 1:
        filters = filter_parts[0]
    elif len(filter_parts) > 1:
        filters = {"And": filter_parts}

    kwargs = {
        "TimePeriod": {"Start": start_date, "End": end_date},
        "Granularity": granularity,
        "Metrics": ["AmortizedCost"],
        "GroupBy": group_by,
    }
    if filters:
        kwargs["Filter"] = filters

    result = ce.get_cost_and_usage(**kwargs)

    entries: list[CostEntry] = []
    total = 0.0

    for period in result.get("ResultsByTime", []):
        date_str = period["TimePeriod"]["Start"]
        for group in period.get("Groups", []):
            keys = group["Keys"]
            amount = float(group["Metrics"]["AmortizedCost"]["Amount"])
            svc_name = keys[0] if len(keys) > 0 else ""
            rgn_name = keys[1] if len(keys) > 1 else ""
            total += amount
            entries.append(CostEntry(
                date=date_str,
                service=svc_name,
                region=rgn_name,
                amount=round(amount, 4),
            ))

    return CostResponse(entries=entries, total=round(total, 2))
