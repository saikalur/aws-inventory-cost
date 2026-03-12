from services.base_collector import BaseCollector
from models import GraphNode, GraphEdge


class EKSCollector(BaseCollector):
    service_name = "eks"

    def collect(self):
        eks = self.client()
        nodes: list[GraphNode] = []
        edges: list[GraphEdge] = []

        cluster_names = []
        paginator = eks.get_paginator("list_clusters")
        for page in paginator.paginate():
            cluster_names.extend(page["clusters"])

        for name in cluster_names:
            try:
                desc = eks.describe_cluster(name=name)["cluster"]
                arn = desc["arn"]
                nodes.append(GraphNode(
                    id=arn,
                    label=name,
                    service="eks",
                    resource_type="Cluster",
                    region=self.region,
                    metadata={
                        "status": desc.get("status"),
                        "version": desc.get("version"),
                        "platform_version": desc.get("platformVersion"),
                        "endpoint": desc.get("endpoint"),
                        "vpc_id": desc.get("resourcesVpcConfig", {}).get("vpcId"),
                    },
                ))

                vpc_id = desc.get("resourcesVpcConfig", {}).get("vpcId")
                if vpc_id:
                    edges.append(GraphEdge(source=vpc_id, target=arn, label="contains"))
                for subnet in desc.get("resourcesVpcConfig", {}).get("subnetIds", []):
                    edges.append(GraphEdge(source=subnet, target=arn, label="hosts"))
                for sg in desc.get("resourcesVpcConfig", {}).get("securityGroupIds", []):
                    edges.append(GraphEdge(source=arn, target=sg, label="uses"))

                # Node groups
                try:
                    ng_names = eks.list_nodegroups(clusterName=name)["nodegroups"]
                    for ng_name in ng_names:
                        ng = eks.describe_nodegroup(clusterName=name, nodegroupName=ng_name)["nodegroup"]
                        ng_arn = ng["nodegroupArn"]
                        nodes.append(GraphNode(
                            id=ng_arn,
                            label=ng_name,
                            service="eks",
                            resource_type="NodeGroup",
                            region=self.region,
                            metadata={
                                "status": ng.get("status"),
                                "instance_types": ng.get("instanceTypes"),
                                "desired_size": ng.get("scalingConfig", {}).get("desiredSize"),
                            },
                        ))
                        edges.append(GraphEdge(source=arn, target=ng_arn, label="contains"))
                except Exception:
                    pass
            except Exception:
                pass

        return nodes, edges
