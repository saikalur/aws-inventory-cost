from services.base_collector import BaseCollector
from models import GraphNode, GraphEdge


class SQSCollector(BaseCollector):
    service_name = "sqs"

    def collect(self):
        sqs = self.client()
        nodes: list[GraphNode] = []
        edges: list[GraphEdge] = []

        paginator = sqs.get_paginator("list_queues")
        for page in paginator.paginate():
            for url in page.get("QueueUrls", []):
                try:
                    attrs = sqs.get_queue_attributes(
                        QueueUrl=url,
                        AttributeNames=["All"],
                    )["Attributes"]
                    arn = attrs["QueueArn"]
                    name = arn.split(":")[-1]
                    nodes.append(GraphNode(
                        id=arn,
                        label=name,
                        service="sqs",
                        resource_type="Queue",
                        region=self.region,
                        metadata={
                            "messages_available": attrs.get("ApproximateNumberOfMessages"),
                            "messages_in_flight": attrs.get("ApproximateNumberOfMessagesNotVisible"),
                            "fifo": name.endswith(".fifo"),
                        },
                    ))

                    # Dead-letter queue relationship
                    redrive = attrs.get("RedrivePolicy")
                    if redrive:
                        import json
                        policy = json.loads(redrive)
                        dlq_arn = policy.get("deadLetterTargetArn")
                        if dlq_arn:
                            edges.append(GraphEdge(source=arn, target=dlq_arn, label="dead_letter"))
                except Exception:
                    pass

        return nodes, edges
