from services.base_collector import BaseCollector
from models import GraphNode, GraphEdge


class Route53Collector(BaseCollector):
    service_name = "route53"

    def collect(self):
        r53 = self.client()
        nodes: list[GraphNode] = []
        edges: list[GraphEdge] = []

        paginator = r53.get_paginator("list_hosted_zones")
        for page in paginator.paginate():
            for zone in page["HostedZones"]:
                zid = zone["Id"].split("/")[-1]
                nodes.append(GraphNode(
                    id=zid,
                    label=zone["Name"].rstrip("."),
                    service="route53",
                    resource_type="HostedZone",
                    region="global",
                    metadata={
                        "record_count": zone.get("ResourceRecordSetCount"),
                        "private": zone.get("Config", {}).get("PrivateZone", False),
                    },
                ))

                # Check for alias records pointing to ELBs
                try:
                    rrs_paginator = r53.get_paginator("list_resource_record_sets")
                    for rrs_page in rrs_paginator.paginate(HostedZoneId=zid):
                        for rr in rrs_page["ResourceRecordSets"]:
                            alias = rr.get("AliasTarget", {})
                            dns = alias.get("DNSName", "")
                            if "elb" in dns.lower() or "elasticloadbalancing" in dns.lower():
                                # Store DNS name in metadata for relationship resolution
                                edges.append(GraphEdge(
                                    source=zid,
                                    target=dns.rstrip("."),
                                    label="routes_to",
                                ))
                except Exception:
                    pass

        return nodes, edges
