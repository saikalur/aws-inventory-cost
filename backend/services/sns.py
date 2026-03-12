from services.base_collector import BaseCollector
from models import GraphNode, GraphEdge


class SNSCollector(BaseCollector):
    service_name = "sns"

    def collect(self):
        sns = self.client()
        nodes: list[GraphNode] = []
        edges: list[GraphEdge] = []

        paginator = sns.get_paginator("list_topics")
        for page in paginator.paginate():
            for topic in page["Topics"]:
                arn = topic["TopicArn"]
                name = arn.split(":")[-1]
                nodes.append(GraphNode(
                    id=arn,
                    label=name,
                    service="sns",
                    resource_type="Topic",
                    region=self.region,
                    metadata={},
                ))

                # Get subscriptions for this topic
                try:
                    sub_paginator = sns.get_paginator("list_subscriptions_by_topic")
                    for sub_page in sub_paginator.paginate(TopicArn=arn):
                        for sub in sub_page["Subscriptions"]:
                            endpoint = sub.get("Endpoint", "")
                            protocol = sub.get("Protocol", "")
                            if protocol == "lambda" and endpoint:
                                edges.append(GraphEdge(source=arn, target=endpoint, label="triggers"))
                            elif protocol == "sqs" and endpoint:
                                edges.append(GraphEdge(source=arn, target=endpoint, label="sends_to"))
                except Exception:
                    pass

        return nodes, edges
