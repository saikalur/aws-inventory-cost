from services.base_collector import BaseCollector
from models import GraphNode, GraphEdge


class ECSCollector(BaseCollector):
    service_name = "ecs"

    def collect(self):
        ecs = self.client()
        nodes: list[GraphNode] = []
        edges: list[GraphEdge] = []

        cluster_arns = []
        paginator = ecs.get_paginator("list_clusters")
        for page in paginator.paginate():
            cluster_arns.extend(page["clusterArns"])

        if not cluster_arns:
            return nodes, edges

        clusters = ecs.describe_clusters(clusters=cluster_arns, include=["STATISTICS"])
        for c in clusters["clusters"]:
            carn = c["clusterArn"]
            nodes.append(GraphNode(
                id=carn,
                label=c["clusterName"],
                service="ecs",
                resource_type="Cluster",
                region=self.region,
                metadata={
                    "status": c.get("status"),
                    "running_tasks": c.get("runningTasksCount"),
                    "active_services": c.get("activeServicesCount"),
                    "registered_instances": c.get("registeredContainerInstancesCount"),
                },
            ))

            # Services
            try:
                svc_paginator = ecs.get_paginator("list_services")
                svc_arns = []
                for page in svc_paginator.paginate(cluster=carn):
                    svc_arns.extend(page["serviceArns"])

                if svc_arns:
                    # describe_services takes max 10 at a time
                    for i in range(0, len(svc_arns), 10):
                        batch = svc_arns[i:i + 10]
                        svcs = ecs.describe_services(cluster=carn, services=batch)
                        for svc in svcs["services"]:
                            sarn = svc["serviceArn"]
                            nodes.append(GraphNode(
                                id=sarn,
                                label=svc["serviceName"],
                                service="ecs",
                                resource_type="Service",
                                region=self.region,
                                metadata={
                                    "status": svc.get("status"),
                                    "desired_count": svc.get("desiredCount"),
                                    "running_count": svc.get("runningCount"),
                                    "launch_type": svc.get("launchType"),
                                },
                            ))
                            edges.append(GraphEdge(source=carn, target=sarn, label="contains"))

                            # ELB target groups
                            for lb in svc.get("loadBalancers", []):
                                tg_arn = lb.get("targetGroupArn")
                                if tg_arn:
                                    edges.append(GraphEdge(source=sarn, target=tg_arn, label="registered_with"))

                            # Network config → VPC
                            net = svc.get("networkConfiguration", {}).get("awsvpcConfiguration", {})
                            for subnet in net.get("subnets", []):
                                edges.append(GraphEdge(source=subnet, target=sarn, label="hosts"))
                            for sg in net.get("securityGroups", []):
                                edges.append(GraphEdge(source=sarn, target=sg, label="uses"))
            except Exception:
                pass

        return nodes, edges
