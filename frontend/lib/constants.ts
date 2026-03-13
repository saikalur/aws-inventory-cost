export const SERVICE_COLORS: Record<string, string> = {
  ec2: "#f97316",
  rds: "#3b82f6",
  s3: "#22c55e",
  lambda: "#f59e0b",
  vpc: "#8b5cf6",
  route53: "#06b6d4",
  elb: "#ec4899",
  ecs: "#14b8a6",
  eks: "#6366f1",
  dynamodb: "#ef4444",
  sns: "#a855f7",
  sqs: "#eab308",
};

export const SERVICE_LABELS: Record<string, string> = {
  ec2: "EC2",
  rds: "RDS",
  s3: "S3",
  lambda: "Lambda",
  vpc: "VPC",
  route53: "Route 53",
  elb: "ELB",
  ecs: "ECS",
  eks: "EKS",
  dynamodb: "DynamoDB",
  sns: "SNS",
  sqs: "SQS",
};

// Adjustment categories — Tax, Marketplace, Discounts, Credits
// Each entry: { label, keywords (case-insensitive), color }
export const ADJUSTMENT_CATEGORIES = [
  {
    key: "tax",
    label: "Tax",
    keywords: ["tax"],
    color: "#f97316",        // orange
  },
  {
    key: "marketplace",
    label: "AWS Marketplace",
    keywords: ["marketplace"],
    color: "#a855f7",        // purple
  },
  {
    key: "discount",
    label: "Discounts",
    keywords: ["savings plan", "enterprise discount", "bundled discount", "edp discount", "discount"],
    color: "#22c55e",        // green
  },
  {
    key: "credit",
    label: "Credits",
    keywords: ["credit", "refund"],
    color: "#06b6d4",        // cyan
  },
] as const;

export type AdjustmentKey = typeof ADJUSTMENT_CATEGORIES[number]["key"];

// Keywords to match Cost Explorer full service names against our short service keys
export const SERVICE_COST_KEYWORDS: Record<string, string[]> = {
  ec2: ["EC2", "Elastic Compute Cloud"],
  rds: ["RDS", "Relational Database"],
  s3: ["S3", "Simple Storage"],
  lambda: ["Lambda"],
  vpc: ["VPC", "Virtual Private Cloud"],
  route53: ["Route 53"],
  elb: ["Elastic Load Balancing", "ELB"],
  ecs: ["Elastic Container Service", "ECS"],
  eks: ["Elastic Kubernetes", "EKS"],
  dynamodb: ["DynamoDB"],
  sns: ["Simple Notification", "SNS"],
  sqs: ["Simple Queue", "SQS"],
};

// Node sizes by resource type importance
export const NODE_SIZES: Record<string, number> = {
  VPC: 10,
  Cluster: 8,
  Subnet: 4,
  SecurityGroup: 3,
  Instance: 6,
  DBInstance: 6,
  DBCluster: 7,
  Bucket: 6,
  Function: 5,
  HostedZone: 6,
  ApplicationLoadBalancer: 7,
  NetworkLoadBalancer: 7,
  ClassicLoadBalancer: 7,
  TargetGroup: 4,
  Service: 5,
  NodeGroup: 5,
  Table: 6,
  Topic: 5,
  Queue: 5,
  Route53Group: 9,
  InternetGateway: 4,
  NATGateway: 4,
};
