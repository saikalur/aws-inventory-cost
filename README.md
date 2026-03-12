# AWS Inventory & Cost Reporter

A local web application that visualises your AWS resources as an interactive force-directed graph and presents cost data from AWS Cost Explorer — all scoped to the AWS profile you choose at runtime.

![Stack](https://img.shields.io/badge/backend-FastAPI%20%2B%20boto3-009688?style=flat-square) ![Stack](https://img.shields.io/badge/frontend-Next.js%2014-black?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [AWS Setup](#aws-setup)
4. [Running the App](#running-the-app)
5. [User Manual](#user-manual)
6. [Environment Variables](#environment-variables)

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Python | **3.11** | 3.12+ may work; 3.14 does **not** (pydantic-core lacks wheels) |
| Node.js | 18 + | LTS recommended |
| npm | 9 + | Bundled with Node.js |
| AWS CLI / credentials | any | Needs `~/.aws/config` and `~/.aws/credentials` |

### Install Python 3.11 (macOS)

```bash
brew install python@3.11
```

Verify:

```bash
python3.11 --version   # Python 3.11.x
```

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/saikalur/aws-inventory-cost.git
cd aws-inventory-cost
```

### 2. Backend — Python virtual environment

```bash
python3.11 -m venv backend/venv
source backend/venv/bin/activate
pip install -r backend/requirements.txt
```

> **Windows:** replace `source backend/venv/bin/activate` with `backend\venv\Scripts\activate`

### 3. Frontend — Node dependencies

```bash
cd frontend
npm install
cd ..
```

---

## AWS Setup

The app reads your existing AWS profiles from `~/.aws/config` and `~/.aws/credentials`. No extra configuration file is needed inside the project.

### Minimum IAM permissions

The IAM user or role used by each profile needs **read-only** access to the services you want to inventory, plus Cost Explorer:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*",
        "rds:Describe*",
        "s3:ListAllMyBuckets",
        "s3:GetBucketLocation",
        "lambda:ListFunctions",
        "elasticloadbalancing:Describe*",
        "ecs:List*", "ecs:Describe*",
        "eks:List*", "eks:Describe*",
        "dynamodb:ListTables", "dynamodb:DescribeTable",
        "sns:ListTopics",
        "sqs:ListQueues",
        "route53:ListHostedZones", "route53:ListResourceRecordSets",
        "ce:GetCostAndUsage",
        "sts:GetCallerIdentity",
        "organizations:DescribeAccount"
      ],
      "Resource": "*"
    }
  ]
}
```

> `organizations:DescribeAccount` is optional — it is used to display the friendly account name. If it is not available the account ID is shown instead.

### Example `~/.aws/config`

```ini
[default]
region = us-east-1

[profile production]
region = us-east-1

[profile staging]
region = us-west-2
```

### Example `~/.aws/credentials`

```ini
[default]
aws_access_key_id     = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[production]
aws_access_key_id     = AKIAI44QH8DHBEXAMPLE
aws_secret_access_key = je7MtGbClwBF/2Tk4FqwIxMkNhQhsHEXAMPLEKEY
```

---

## Running the App

Open **two terminal windows**.

### Terminal 1 — Backend

```bash
source backend/venv/bin/activate
cd backend
uvicorn main:app --reload --port 8000
```

The API is now available at `http://localhost:8000`.
Interactive API docs: `http://localhost:8000/docs`

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## User Manual

### Layout Overview

```
┌──────────────────────────────────────────────────┐
│  AWS Inventory & Cost Reporter — Account Name  [Profile ▾] │  ← Header
├──────────────────────────────────────────────────┤
│  [Resource Graph]  [Cost Dashboard]              │  ← Tab bar
├──────────────────────────────────────────────────┤
│                                                  │
│              Main content area                   │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

### Profile Selector

The **Profile** dropdown in the top-right corner lists every profile found in `~/.aws/config`.

- Selecting a profile re-fetches all data (inventory, costs, account name) using that profile's credentials and region.
- The account name next to the title updates to reflect the selected account.

---

### Resource Graph tab

#### Region Filter

A **Region** dropdown sits in the top-left of the graph canvas.

| Selection | Behaviour |
|---|---|
| All regions | Every discovered resource is shown |
| Specific region | Only resources in that region are shown, plus global services (S3, Route 53) |

Only regions that contain at least one non-VPC resource appear in the list (default VPCs exist in every region and are excluded from the filter list to avoid noise).

#### Route 53 Grouping

When multiple hosted zones are present, they are automatically collapsed into a single **"Route 53 (N zones)"** node to reduce clutter. Clicking it shows all zone names in the popup.

#### Interacting with the Graph

| Action | Result |
|---|---|
| **Click a node** | Opens an info popup with resource details and 30-day service cost |
| **Click background** | Closes popup and clears highlight |
| **Scroll / pinch** | Zoom in / out |
| **Drag canvas** | Pan |
| **Drag a node** | Pin the node in place |

#### Node Popup

Each popup shows:

- Service name and colour indicator
- Resource name and type
- Region
- **30-day service cost** (fetched live from Cost Explorer)
- All resource metadata (CIDR, state, AZ, etc.)
- Resource ID at the bottom

#### Export Resources

Click **Export XLSX** (next to the region dropdown) to download the currently visible resources as a spreadsheet.

The file contains:
- A header block with account name, region filter, and generation timestamp
- One row per visible resource with all metadata columns expanded

Filename format: `aws-resources_<region>.xlsx`

#### Legend

The colour legend in the bottom-left maps each dot colour to an AWS service.

---

### Cost Dashboard tab

#### Filters

| Filter | Description |
|---|---|
| Start / End date | Date range for cost data (default: last 30 days) |
| Granularity | Daily or Monthly aggregation |
| Service | Filter to a specific AWS service |
| Region | Filter to a specific region |

#### Charts

- **Cost Over Time** — bar chart of daily or monthly spend
- **Cost by Service** — pie chart of spend distribution

#### Top Costs Table

Shows the top 15 service + region combinations by total spend in the selected period.

#### Export Costs

Click **Export XLSX** (top-right of the dashboard) to download the current cost data.

The file contains two sheets:
- **Summary** — aggregated by service + region, sorted by total cost descending
- **Daily Detail** — one row per data point

Both sheets include a header block with account name, active filters, and generation timestamp.

Filename format: `aws-costs_<start>_<end>[_service][_region].xlsx`

---

## Environment Variables

Create a `backend/.env` file to restrict which regions and services are scanned (useful for large accounts):

```ini
# Comma-separated list of regions, or ALL (default)
REGIONS=us-east-1,us-west-2

# Comma-separated list of services, or ALL (default)
# Available: ec2, rds, s3, lambda, vpc, route53, elb, ecs, eks, dynamodb, sns, sqs
SERVICES=ec2,rds,s3,lambda
```

If the file does not exist or a variable is not set, all regions and all services are scanned.
