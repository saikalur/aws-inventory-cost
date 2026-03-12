from services.base_collector import BaseCollector
from models import GraphNode, GraphEdge


def _name_tag(tags: list[dict] | None) -> str:
    for t in tags or []:
        if t["Key"] == "Name":
            return t["Value"]
    return ""


class EC2Collector(BaseCollector):
    service_name = "ec2"

    def collect(self):
        ec2 = self.client()
        nodes: list[GraphNode] = []
        edges: list[GraphEdge] = []

        paginator = ec2.get_paginator("describe_instances")
        for page in paginator.paginate():
            for res in page["Reservations"]:
                for inst in res["Instances"]:
                    iid = inst["InstanceId"]
                    nodes.append(GraphNode(
                        id=iid,
                        label=_name_tag(inst.get("Tags")) or iid,
                        service="ec2",
                        resource_type="Instance",
                        region=self.region,
                        metadata={
                            "instance_type": inst.get("InstanceType"),
                            "state": inst["State"]["Name"],
                            "private_ip": inst.get("PrivateIpAddress"),
                            "public_ip": inst.get("PublicIpAddress"),
                            "vpc_id": inst.get("VpcId"),
                            "subnet_id": inst.get("SubnetId"),
                        },
                    ))
                    if inst.get("VpcId"):
                        edges.append(GraphEdge(source=inst["VpcId"], target=iid, label="contains"))
                    if inst.get("SubnetId"):
                        edges.append(GraphEdge(source=inst["SubnetId"], target=iid, label="hosts"))
                    for sg in inst.get("SecurityGroups", []):
                        edges.append(GraphEdge(source=iid, target=sg["GroupId"], label="uses"))

        return nodes, edges
