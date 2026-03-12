import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from models import GraphNode, GraphEdge
from config import GLOBAL_SERVICES
from services.ec2 import EC2Collector
from services.vpc import VPCCollector
from services.rds import RDSCollector
from services.s3 import S3Collector
from services.lambda_svc import LambdaCollector
from services.route53 import Route53Collector
from services.elb import ELBCollector
from services.ecs import ECSCollector
from services.eks import EKSCollector
from services.dynamodb import DynamoDBCollector
from services.sns import SNSCollector
from services.sqs import SQSCollector
from services.relationships import resolve_relationships

log = logging.getLogger(__name__)

COLLECTOR_MAP: dict[str, type] = {
    "ec2": EC2Collector,
    "vpc": VPCCollector,
    "rds": RDSCollector,
    "s3": S3Collector,
    "lambda": LambdaCollector,
    "route53": Route53Collector,
    "elb": ELBCollector,
    "ecs": ECSCollector,
    "eks": EKSCollector,
    "dynamodb": DynamoDBCollector,
    "sns": SNSCollector,
    "sqs": SQSCollector,
}


import boto3 as _boto3


def _run_collector(cls: type, region: str, session):
    try:
        return cls(region, session).collect()
    except Exception as e:
        log.warning("Collector %s in %s failed: %s", cls.__name__, region, e)
        return [], []


def collect_inventory(
    regions: list[str], services: list[str], session=None
) -> tuple[list[GraphNode], list[GraphEdge]]:
    session = session or _boto3.Session()
    tasks = []
    for svc in services:
        cls = COLLECTOR_MAP.get(svc)
        if not cls:
            continue
        if svc in GLOBAL_SERVICES:
            tasks.append((cls, "us-east-1"))
        else:
            for region in regions:
                tasks.append((cls, region))

    all_nodes: list[GraphNode] = []
    all_edges: list[GraphEdge] = []

    with ThreadPoolExecutor(max_workers=20) as pool:
        futures = {pool.submit(_run_collector, cls, r, session): (cls, r) for cls, r in tasks}
        for fut in as_completed(futures):
            nodes, edges = fut.result()
            all_nodes.extend(nodes)
            all_edges.extend(edges)

    # Dedup nodes by id
    seen = {}
    unique_nodes = []
    for n in all_nodes:
        if n.id not in seen:
            seen[n.id] = True
            unique_nodes.append(n)

    # Resolve cross-service relationships
    extra_edges = resolve_relationships(unique_nodes)
    all_edges.extend(extra_edges)

    # Prune dangling edges
    node_ids = {n.id for n in unique_nodes}
    valid_edges = [e for e in all_edges if e.source in node_ids and e.target in node_ids]

    # Dedup edges
    edge_set = set()
    unique_edges = []
    for e in valid_edges:
        key = (e.source, e.target, e.label)
        if key not in edge_set:
            edge_set.add(key)
            unique_edges.append(e)

    return unique_nodes, unique_edges
