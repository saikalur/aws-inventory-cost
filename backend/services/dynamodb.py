from services.base_collector import BaseCollector
from models import GraphNode, GraphEdge


class DynamoDBCollector(BaseCollector):
    service_name = "dynamodb"

    def collect(self):
        ddb = self.client()
        nodes: list[GraphNode] = []
        edges: list[GraphEdge] = []

        paginator = ddb.get_paginator("list_tables")
        for page in paginator.paginate():
            for table_name in page["TableNames"]:
                try:
                    desc = ddb.describe_table(TableName=table_name)["Table"]
                    arn = desc["TableArn"]
                    nodes.append(GraphNode(
                        id=arn,
                        label=table_name,
                        service="dynamodb",
                        resource_type="Table",
                        region=self.region,
                        metadata={
                            "status": desc.get("TableStatus"),
                            "item_count": desc.get("ItemCount"),
                            "size_bytes": desc.get("TableSizeBytes"),
                            "billing_mode": desc.get("BillingModeSummary", {}).get("BillingMode", "PROVISIONED"),
                        },
                    ))

                    # DynamoDB Streams → Lambda triggers are captured by Lambda's event source mappings
                    # But we note stream ARN for relationship resolution
                    stream_spec = desc.get("StreamSpecification", {})
                    if stream_spec.get("StreamEnabled"):
                        stream_arn = desc.get("LatestStreamArn")
                        if stream_arn:
                            nodes[-1].metadata["stream_arn"] = stream_arn
                except Exception:
                    pass

        return nodes, edges
