export interface GraphNode {
  id: string;
  label: string;
  service: string;
  resource_type: string;
  region: string;
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

export interface InventoryResponse {
  nodes: GraphNode[];
  links: GraphEdge[];
}

export interface CostEntry {
  date: string;
  service: string;
  region: string;
  amount: number;
  currency: string;
}

export interface CostResponse {
  entries: CostEntry[];
  total: number;
  currency: string;
}

export interface ConfigResponse {
  regions: string[];
  services: string[];
}
