from models import GraphNode, GraphEdge


def resolve_relationships(nodes: list[GraphNode]) -> list[GraphEdge]:
    """Resolve cross-service relationships that collectors can't determine alone."""
    edges: list[GraphEdge] = []

    # Build lookup indexes
    by_id: dict[str, GraphNode] = {n.id: n for n in nodes}
    by_dns: dict[str, GraphNode] = {}
    by_label: dict[str, GraphNode] = {}

    for n in nodes:
        by_label[n.label] = n
        dns = n.metadata.get("dns_name")
        if dns:
            by_dns[dns.rstrip(".")] = n

    # Route53 → ELB: resolve DNS-based edges
    for n in nodes:
        if n.service == "route53" and n.resource_type == "HostedZone":
            # Route53 edges with DNS targets are stored during collection
            # They'll be pruned if target doesn't match a node id
            # Here we try to resolve DNS names to ELB ARNs
            pass

    # DynamoDB Streams → Lambda: if Lambda has event source from DynamoDB stream,
    # also create a table → Lambda edge
    ddb_tables = {n.metadata.get("stream_arn"): n for n in nodes
                  if n.service == "dynamodb" and n.metadata.get("stream_arn")}

    for n in nodes:
        if n.service == "lambda":
            # Lambda event source edges already exist; enrich with table-level edges
            pass

    # ELB DNS → Route53 resolution
    for n in nodes:
        if n.service == "elb" and n.metadata.get("dns_name"):
            dns = n.metadata["dns_name"].rstrip(".")
            by_dns[dns] = n

    return edges
