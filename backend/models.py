from pydantic import BaseModel
from typing import Any


class GraphNode(BaseModel):
    id: str
    label: str
    service: str
    resource_type: str
    region: str
    metadata: dict[str, Any] = {}


class GraphEdge(BaseModel):
    source: str
    target: str
    label: str = ""


class InventoryResponse(BaseModel):
    nodes: list[GraphNode]
    links: list[GraphEdge]


class CostEntry(BaseModel):
    date: str
    service: str
    region: str
    amount: float
    currency: str = "USD"


class CostResponse(BaseModel):
    entries: list[CostEntry]
    total: float
    currency: str = "USD"


class ConfigResponse(BaseModel):
    regions: list[str]
    services: list[str]


class AccountResponse(BaseModel):
    account_id: str
    account_name: str
