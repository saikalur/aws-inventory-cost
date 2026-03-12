from abc import ABC, abstractmethod
import boto3
from models import GraphNode, GraphEdge


class BaseCollector(ABC):
    service_name: str = ""

    def __init__(self, region: str, session: boto3.Session | None = None):
        self.region = region
        self.session = session or boto3.Session()

    def client(self, service: str | None = None):
        return self.session.client(service or self.service_name, region_name=self.region)

    @abstractmethod
    def collect(self) -> tuple[list[GraphNode], list[GraphEdge]]:
        ...
