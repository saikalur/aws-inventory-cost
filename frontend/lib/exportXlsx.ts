import ExcelJS from "exceljs";
import type { CostEntry, GraphNode } from "./types";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD9E1F2" }, // light blue-grey
};

const BOLD: Partial<ExcelJS.Font> = { bold: true };

async function download(wb: ExcelJS.Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function writeInfoBlock(
  ws: ExcelJS.Worksheet,
  accountName: string,
  subtitle: string
) {
  const generated = new Date().toLocaleString();
  const infoRows = [
    ["AWS Inventory & Cost Reporter"],
    [`Account: ${accountName}`],
    [subtitle],
    [`Generated: ${generated}`],
    [],
  ];
  for (const data of infoRows) {
    const row = ws.addRow(data);
    if (data.length > 0) {
      row.getCell(1).font = { bold: true, size: 11 };
    }
  }
}

function writeColumnHeaders(ws: ExcelJS.Worksheet, keys: string[]) {
  const row = ws.addRow(keys);
  row.eachCell((cell) => {
    cell.font = BOLD;
    cell.fill = HEADER_FILL;
  });
  row.commit();
}

function setColumnWidths(ws: ExcelJS.Worksheet, keys: string[], rows: Record<string, unknown>[]) {
  ws.columns = keys.map((key) => ({
    width: Math.max(
      key.length + 2,
      ...rows.map((r) => String(r[key] ?? "").length),
      12
    ),
  }));
}

async function buildSheet(
  wb: ExcelJS.Workbook,
  sheetName: string,
  rows: Record<string, unknown>[],
  accountName: string,
  subtitle: string
) {
  const ws = wb.addWorksheet(sheetName);
  writeInfoBlock(ws, accountName, subtitle);

  if (rows.length === 0) {
    ws.addRow(["No data"]);
    return;
  }

  const keys = Object.keys(rows[0]);
  setColumnWidths(ws, keys, rows);
  writeColumnHeaders(ws, keys);

  for (const row of rows) {
    ws.addRow(keys.map((k) => row[k]));
  }
}

export async function exportCosts(
  entries: CostEntry[],
  filters: { service?: string; region?: string; startDate?: string; endDate?: string },
  accountName: string
) {
  const subtitle = [
    filters.startDate && filters.endDate ? `Period: ${filters.startDate} – ${filters.endDate}` : "",
    filters.service ? `Service: ${filters.service}` : "",
    filters.region ? `Region: ${filters.region}` : "",
  ].filter(Boolean).join("  |  ") || "All services, all regions";

  // Summary: aggregate by service + region
  const summaryMap = new Map<string, { Service: string; Region: string; "Total Cost (USD)": number }>();
  for (const e of entries) {
    const key = `${e.service}||${e.region}`;
    const existing = summaryMap.get(key);
    if (existing) {
      existing["Total Cost (USD)"] = +(existing["Total Cost (USD)"] + e.amount).toFixed(4);
    } else {
      summaryMap.set(key, { Service: e.service, Region: e.region, "Total Cost (USD)": e.amount });
    }
  }
  const summaryRows = [...summaryMap.values()].sort((a, b) => b["Total Cost (USD)"] - a["Total Cost (USD)"]);

  const detailRows = entries.map((e) => ({
    Date: e.date,
    Service: e.service,
    Region: e.region,
    "Amount (USD)": e.amount,
    Currency: e.currency,
  }));

  const wb = new ExcelJS.Workbook();
  wb.creator = "AWS Inventory & Cost Reporter";
  await buildSheet(wb, "Summary", summaryRows, accountName, subtitle);
  await buildSheet(wb, "Daily Detail", detailRows, accountName, subtitle);

  const parts = ["aws-costs"];
  if (filters.startDate) parts.push(filters.startDate);
  if (filters.endDate) parts.push(filters.endDate);
  if (filters.service) parts.push(filters.service.replace(/\s+/g, "-"));
  if (filters.region) parts.push(filters.region);
  await download(wb, `${parts.join("_")}.xlsx`);
}

export async function exportResources(nodes: GraphNode[], region: string, accountName: string) {
  const subtitle = region !== "all" ? `Region: ${region}` : "All regions";

  const metaKeys = new Set<string>();
  for (const n of nodes) {
    Object.keys(n.metadata).forEach((k) => metaKeys.add(k));
  }

  const rows = nodes.map((n) => {
    const base: Record<string, unknown> = {
      ID: n.id,
      Name: n.label,
      Service: n.service,
      "Resource Type": n.resource_type,
      Region: n.region,
    };
    for (const k of metaKeys) {
      const v = n.metadata[k];
      base[k.replace(/_/g, " ")] = v != null ? String(v) : "";
    }
    return base;
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "AWS Inventory & Cost Reporter";
  await buildSheet(wb, "Resources", rows, accountName, subtitle);

  const suffix = region !== "all" ? `_${region}` : "";
  await download(wb, `aws-resources${suffix}.xlsx`);
}
