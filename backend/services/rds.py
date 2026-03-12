from services.base_collector import BaseCollector
from models import GraphNode, GraphEdge


class RDSCollector(BaseCollector):
    service_name = "rds"

    def collect(self):
        rds = self.client()
        nodes: list[GraphNode] = []
        edges: list[GraphEdge] = []

        paginator = rds.get_paginator("describe_db_instances")
        for page in paginator.paginate():
            for db in page["DBInstances"]:
                dbid = db["DBInstanceIdentifier"]
                arn = db["DBInstanceArn"]
                nodes.append(GraphNode(
                    id=arn,
                    label=dbid,
                    service="rds",
                    resource_type="DBInstance",
                    region=self.region,
                    metadata={
                        "engine": db.get("Engine"),
                        "engine_version": db.get("EngineVersion"),
                        "instance_class": db.get("DBInstanceClass"),
                        "status": db.get("DBInstanceStatus"),
                        "multi_az": db.get("MultiAZ"),
                        "storage_gb": db.get("AllocatedStorage"),
                        "vpc_id": db.get("DBSubnetGroup", {}).get("VpcId"),
                    },
                ))
                vpc_id = db.get("DBSubnetGroup", {}).get("VpcId")
                if vpc_id:
                    edges.append(GraphEdge(source=vpc_id, target=arn, label="contains"))
                for sg in db.get("VpcSecurityGroups", []):
                    edges.append(GraphEdge(source=arn, target=sg["VpcSecurityGroupId"], label="uses"))

        # RDS Clusters (Aurora)
        try:
            for cluster in rds.describe_db_clusters()["DBClusters"]:
                cid = cluster["DBClusterIdentifier"]
                carn = cluster["DBClusterArn"]
                nodes.append(GraphNode(
                    id=carn,
                    label=cid,
                    service="rds",
                    resource_type="DBCluster",
                    region=self.region,
                    metadata={
                        "engine": cluster.get("Engine"),
                        "status": cluster.get("Status"),
                    },
                ))
                for member in cluster.get("DBClusterMembers", []):
                    member_id = member["DBInstanceIdentifier"]
                    # Edge will be resolved by relationship resolver using identifier
                    edges.append(GraphEdge(source=carn, target=member_id, label="member"))
        except Exception:
            pass

        return nodes, edges
