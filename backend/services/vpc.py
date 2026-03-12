from services.base_collector import BaseCollector
from models import GraphNode, GraphEdge


def _name_tag(tags: list[dict] | None) -> str:
    for t in tags or []:
        if t["Key"] == "Name":
            return t["Value"]
    return ""


class VPCCollector(BaseCollector):
    service_name = "ec2"

    def collect(self):
        ec2 = self.client()
        nodes: list[GraphNode] = []
        edges: list[GraphEdge] = []

        # VPCs
        for v in ec2.describe_vpcs()["Vpcs"]:
            vid = v["VpcId"]
            nodes.append(GraphNode(
                id=vid,
                label=_name_tag(v.get("Tags")) or vid,
                service="vpc",
                resource_type="VPC",
                region=self.region,
                metadata={"cidr": v.get("CidrBlock"), "state": v.get("State")},
            ))

        # Subnets
        for s in ec2.describe_subnets()["Subnets"]:
            sid = s["SubnetId"]
            nodes.append(GraphNode(
                id=sid,
                label=_name_tag(s.get("Tags")) or sid,
                service="vpc",
                resource_type="Subnet",
                region=self.region,
                metadata={
                    "cidr": s.get("CidrBlock"),
                    "az": s.get("AvailabilityZone"),
                    "vpc_id": s["VpcId"],
                },
            ))
            edges.append(GraphEdge(source=s["VpcId"], target=sid, label="contains"))

        # Security Groups
        for sg in ec2.describe_security_groups()["SecurityGroups"]:
            sgid = sg["GroupId"]
            nodes.append(GraphNode(
                id=sgid,
                label=sg.get("GroupName", sgid),
                service="vpc",
                resource_type="SecurityGroup",
                region=self.region,
                metadata={"description": sg.get("Description"), "vpc_id": sg.get("VpcId")},
            ))
            if sg.get("VpcId"):
                edges.append(GraphEdge(source=sg["VpcId"], target=sgid, label="contains"))

        # Internet Gateways
        for igw in ec2.describe_internet_gateways()["InternetGateways"]:
            igw_id = igw["InternetGatewayId"]
            nodes.append(GraphNode(
                id=igw_id,
                label=_name_tag(igw.get("Tags")) or igw_id,
                service="vpc",
                resource_type="InternetGateway",
                region=self.region,
                metadata={},
            ))
            for att in igw.get("Attachments", []):
                edges.append(GraphEdge(source=att["VpcId"], target=igw_id, label="attached"))

        # NAT Gateways
        for nat in ec2.describe_nat_gateways(
            Filter=[{"Name": "state", "Values": ["available"]}]
        )["NatGateways"]:
            nid = nat["NatGatewayId"]
            nodes.append(GraphNode(
                id=nid,
                label=_name_tag(nat.get("Tags")) or nid,
                service="vpc",
                resource_type="NATGateway",
                region=self.region,
                metadata={"subnet_id": nat.get("SubnetId"), "vpc_id": nat.get("VpcId")},
            ))
            if nat.get("VpcId"):
                edges.append(GraphEdge(source=nat["VpcId"], target=nid, label="contains"))
            if nat.get("SubnetId"):
                edges.append(GraphEdge(source=nat["SubnetId"], target=nid, label="hosts"))

        return nodes, edges
