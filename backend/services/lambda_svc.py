from services.base_collector import BaseCollector
from models import GraphNode, GraphEdge


class LambdaCollector(BaseCollector):
    service_name = "lambda"

    def collect(self):
        lam = self.client()
        nodes: list[GraphNode] = []
        edges: list[GraphEdge] = []

        paginator = lam.get_paginator("list_functions")
        for page in paginator.paginate():
            for fn in page["Functions"]:
                arn = fn["FunctionArn"]
                nodes.append(GraphNode(
                    id=arn,
                    label=fn["FunctionName"],
                    service="lambda",
                    resource_type="Function",
                    region=self.region,
                    metadata={
                        "runtime": fn.get("Runtime"),
                        "memory": fn.get("MemorySize"),
                        "timeout": fn.get("Timeout"),
                        "handler": fn.get("Handler"),
                        "code_size": fn.get("CodeSize"),
                        "last_modified": fn.get("LastModified"),
                    },
                ))

                # VPC config
                vpc_cfg = fn.get("VpcConfig", {})
                if vpc_cfg.get("VpcId"):
                    edges.append(GraphEdge(source=vpc_cfg["VpcId"], target=arn, label="contains"))
                    for subnet in vpc_cfg.get("SubnetIds", []):
                        edges.append(GraphEdge(source=subnet, target=arn, label="hosts"))
                    for sg in vpc_cfg.get("SecurityGroupIds", []):
                        edges.append(GraphEdge(source=arn, target=sg, label="uses"))

                # Event source mappings
                try:
                    esms = lam.list_event_source_mappings(FunctionName=fn["FunctionName"])
                    for esm in esms.get("EventSourceMappings", []):
                        source_arn = esm.get("EventSourceArn", "")
                        if source_arn:
                            edges.append(GraphEdge(
                                source=source_arn,
                                target=arn,
                                label="triggers",
                            ))
                except Exception:
                    pass

        return nodes, edges
