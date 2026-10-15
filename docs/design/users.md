# GigTask — Users and Design

## Who uses GigTask

### 1. Client (a business or person posting gigs)
- **Goal:** get a small physical job done (repair, delivery, installation) by a nearby freelancer and pay safely through escrow.
- **Wants to:**
  - find an available freelancer near the job site,
  - fund a gig and see the money leave their escrow balance,
  - check the history of every debit and credit on their wallet.
- **Worries about:** paying more than they have, paying twice, not knowing where money went.
- **Screens:** Nearby Workers → Fund a Gig → Audit Trail, plus Browse.

### 2. Freelancer
- **Goal:** take on one job at a time and build a good reputation.
- **Wants to:**
  - start and finish contracts assigned to them (`FUNDED → IN_PROGRESS → COMPLETED`),
  - see their ratings, skill tags and portfolio.
- **Worries about:** being double-booked. The partial unique index allows only one `IN_PROGRESS` contract per freelancer.
- **Screens:** Contracts → Contract detail, Reviews & Portfolios.

### 3. Platform admin / analyst
- **Goal:** keep the marketplace healthy.
- **Wants to:**
  - see revenue trends (7-day moving average),
  - rank the top-earning freelancers,
  - refresh the earnings summary on demand,
  - watch overall review quality and popular skills.
- **Screens:** Analytics, Reviews & Portfolios, Browse.

Real login is not required, so an **actor switcher** (top-right dropdown) chooses which client you are acting as.

## Screen list

| # | Tab | Main user | Workflow |
|---|---|---|---|
| 1 | Clients / Freelancers / Contracts (Browse) | all | — |
| 1b | Contract detail with Start / Finish buttons | Freelancer | Partial unique index demo |
| 2 | Fund a Gig | Client | Workflow 1 (`fund_gig`) |
| 3 | Audit Trail | Client | Trigger + `wallet_audit_logs` |
| 4 | Analytics | Admin | Workflow 2 + materialized view |
| 5 | Nearby Workers (map) | Client | Workflow 3 (`$geoNear`) |
| 6 | Reviews & Portfolios | Admin / Freelancer | Workflow 4 (`$facet`) + Portfolios |

## Look and feel

| Element | Choice |
|---|---|
| Primary colour | `#0369a1` blue for headings, card top borders and button text |
| Buttons | `#e0f2fe` light-blue background, blue text; disabled while a request runs |
| Page / cards | `#f0f2f5` background, white cards, 8 px corners, 4 px blue top border on each module |
| Status badges | One colour per contract status, used on every screen |
| CREDIT / DEBIT | Green / red |
| Font | Segoe UI (system font) |

### Reusable pieces
- **Card** (`.card`): every list item, panel and chart sits in one.
- **Tab button** (`.nav-btn`): the navigation bar.
- **Status badge** (`getStatusBadge`): FUNDED / IN_PROGRESS / COMPLETED.
- **State helpers**: `showLoading`, `showEmpty`, `showError` (with Retry), used by every list.
- **Spinner** (`.spinner`).

### States every screen handles
- **Loading:** spinner with "Loading data…".
- **Empty:** a one-line message, e.g. "No contracts found. Try a different search."
- **Error:** message with the reason and a **Retry** button.

### Phone layout
The tab bar and card rows use `flex-wrap`, so on a narrow screen the tabs wrap onto several lines and the map, charts and lists stack in one column.

Wireframes for all screens are in `wireframes.html` (open in a browser) and as one PNG per screen.
