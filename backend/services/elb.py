from services.base_collector import BaseCollector
from models import GraphNode, GraphEdge


class ELBCollector(BaseCollector):
    service_name = "elbv2"

    def collect(self):
        elb = self.client()
        nodes: list[GraphNode] = []
        edges: list[GraphEdge] = []

        # ALB / NLB (v2)
        paginator = elb.get_paginator("describe_load_balancers")
        for page in paginator.paginate():
            for lb in page["LoadBalancers"]:
                arn = lb["LoadBalancerArn"]
                nodes.append(GraphNode(
                    id=arn,
                    label=lb["LoadBalancerName"],
                    service="elb",
                    resource_type=lb.get("Type", "application").title() + "LoadBalancer",
                    region=self.region,
                    metadata={
                        "dns_name": lb.get("DNSName"),
                        "scheme": lb.get("Scheme"),
                        "type": lb.get("Type"),
                        "state": lb.get("State", {}).get("Code"),
                        "vpc_id": lb.get("VpcId"),
                    },
                ))
                if lb.get("VpcId"):
                    edges.append(GraphEdge(source=lb["VpcId"], target=arn, label="contains"))
                for az in lb.get("AvailabilityZones", []):
                    if az.get("SubnetId"):
                        edges.append(GraphEdge(source=az["SubnetId"], target=arn, label="hosts"))
                for sg in lb.get("SecurityGroups", []):
                    edges.append(GraphEdge(source=arn, target=sg, label="uses"))

                # Target groups and their targets
                try:
                    tgs = elb.describe_target_groups(LoadBalancerArn=arn)
                    for tg in tgs["TargetGroups"]:
                        tg_arn = tg["TargetGroupArn"]
                        nodes.append(GraphNode(
                            id=tg_arn,
                            label=tg["TargetGroupName"],
                            service="elb",
                            resource_type="TargetGroup",
                            region=self.region,
                            metadata={
                                "protocol": tg.get("Protocol"),
                                "port": tg.get("Port"),
                                "target_type": tg.get("TargetType"),
                            },
                        ))
                        edges.append(GraphEdge(source=arn, target=tg_arn, label="routes_to"))

                        # Get registered targets
                        try:
                            health = elb.describe_target_health(TargetGroupArn=tg_arn)
                            for th in health["TargetHealthDescriptions"]:
                                tid = th["Target"]["Id"]
                                edges.append(GraphEdge(source=tg_arn, target=tid, label="targets"))
                        except Exception:
                            pass
                except Exception:
                    pass

        # Classic ELBs
        try:
            classic = self.client("elb")
            for lb in classic.describe_load_balancers()["LoadBalancerDescriptions"]:
                name = lb["LoadBalancerName"]
                # Use a synthetic ARN for classic ELBs
                arn = f"arn:aws:elasticloadbalancing:{self.region}:classic:{name}"
                nodes.append(GraphNode(
                    id=arn,
                    label=name,
                    service="elb",
                    resource_type="ClassicLoadBalancer",
                    region=self.region,
                    metadata={
                        "dns_name": lb.get("DNSName"),
                        "scheme": lb.get("Scheme"),
                        "vpc_id": lb.get("VPCId"),
                    },
                ))
                if lb.get("VPCId"):
                    edges.append(GraphEdge(source=lb["VPCId"], target=arn, label="contains"))
                for iid in lb.get("Instances", []):
                    edges.append(GraphEdge(source=arn, target=iid["InstanceId"], label="targets"))
                for sg in lb.get("SecurityGroups", []):
                    edges.append(GraphEdge(source=arn, target=sg, label="uses"))
        except Exception:
            pass

        return nodes, edges
