from services.base_collector import BaseCollector
from models import GraphNode, GraphEdge


class S3Collector(BaseCollector):
    service_name = "s3"

    def collect(self):
        s3 = self.client()
        nodes: list[GraphNode] = []
        edges: list[GraphEdge] = []

        for bucket in s3.list_buckets().get("Buckets", []):
            name = bucket["BucketName"]
            nodes.append(GraphNode(
                id=f"arn:aws:s3:::{name}",
                label=name,
                service="s3",
                resource_type="Bucket",
                region="global",
                metadata={"creation_date": str(bucket.get("CreationDate", ""))},
            ))

            # Check for event notifications → Lambda/SQS/SNS
            try:
                notif = s3.get_bucket_notification_configuration(Bucket=name)
                for lc in notif.get("LambdaFunctionConfigurations", []):
                    edges.append(GraphEdge(
                        source=f"arn:aws:s3:::{name}",
                        target=lc["LambdaFunctionArn"],
                        label="notifies",
                    ))
                for qc in notif.get("QueueConfigurations", []):
                    edges.append(GraphEdge(
                        source=f"arn:aws:s3:::{name}",
                        target=qc["QueueArn"],
                        label="notifies",
                    ))
                for tc in notif.get("TopicConfigurations", []):
                    edges.append(GraphEdge(
                        source=f"arn:aws:s3:::{name}",
                        target=tc["TopicArn"],
                        label="notifies",
                    ))
            except Exception:
                pass

        return nodes, edges
