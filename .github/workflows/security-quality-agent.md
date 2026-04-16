---
name: Security remediation agent
description: Fetches security alerts for the agent to process this run; the agent opens a fix PR or a triage issue linking to those alerts, then assigns svc-devtoolsbot on each alert it processed.
engine: copilot
on:
  schedule: daily
  workflow_dispatch: {}
timeout-minutes: 45
permissions:
  contents: read
  issues: read
  pull-requests: read
  security-events: read
network:
  allowed:
    - threat-detection
    - github
tools:
  github:
    allowed-repos:
      - mongodb-js/devtools-shared
    min-integrity: unapproved
mcp-scripts:
  list-github-security-items:
    description: >-
      Returns open security alerts for this repository for the current run: a JSON object with
      `dependabot_alerts` and `code_scanning_alerts` arrays (each may be empty).
    timeout: 120
    run: |
      set -euo pipefail
      dependabot_raw="$(gh api -H "X-GitHub-Api-Version: 2026-03-10" "repos/${GITHUB_REPOSITORY}/dependabot/alerts?state=open" --paginate)"
      code_scanning_raw="$(gh api -H "X-GitHub-Api-Version: 2026-03-10" "repos/${GITHUB_REPOSITORY}/code-scanning/alerts?state=open" --paginate)"
      jq -n \
        --argjson dep "$dependabot_raw" \
        --argjson cs "$code_scanning_raw" \
        -f /dev/stdin <<'JQ'
      def sev_rank($s):
        ($s // "" | ascii_downcase)
        | if . == "critical" then 4
          elif . == "high" then 3
          elif . == "medium" then 2
          elif . == "low" then 1
          else 0 end;

      def dependabot_score:
        sev_rank(.security_vulnerability.severity // .security_advisory.severity // "");

      def code_scanning_score:
        if (.security_severity_level != null) and (.security_severity_level != "") then
          sev_rank(.security_severity_level)
        else
          (.severity // "none" | ascii_downcase)
          | if . == "error" then 3 elif . == "warning" then 2 elif . == "note" then 1 else 0 end
        end;

      def unassigned:
        ((.assignees // []) | length) == 0;

      ( $dep | map(select(unassigned)) ) as $dun |
      ( $dun
        | sort_by((.dependency.package.name // "unknown"))
        | group_by((.dependency.package.name // "unknown"))
        | map({
            pkg: (.[0].dependency.package.name // "unknown"),
            alerts: .,
            maxSev: (map(dependabot_score) | max),
            maxNum: (map(.number) | max)
          })
        | sort_by([- .maxSev, - .maxNum])
        | if length > 0 then .[0].alerts else [] end
      ) as $dep_sel |

      ( $cs | map(select(unassigned)) ) as $csun |
      ( $csun
        | map(. + {_score: code_scanning_score, _num: .number})
        | sort_by([- ._score, - ._num])
        | if length > 0 then [.[0] | del(._score, ._num)] else [] end
      ) as $cs_pick |

      if ($dep_sel | length) > 0 then
        { dependabot_alerts: $dep_sel, code_scanning_alerts: [] }
      else
        { dependabot_alerts: [], code_scanning_alerts: $cs_pick }
      end
      JQ
    env:
      GH_TOKEN: "${{ secrets.GH_AW_SECURITY_ADVISORY_PAT }}"
safe-outputs:
  create-pull-request:
    title-prefix: "[security] "
    labels:
      - security
    draft: true
    max: 1
    auto-close-issue: false
    # Dependabot and supply-chain fixes routinely touch manifests; default protected-files would block those patches.
    protected-files: allowed
  create-issue:
    title-prefix: "[security-triage] "
    labels:
      - security
    max: 1
    expires: false
  jobs:
    assign-bot-to-security-alert:
      description: Set assignees to svc-devtoolsbot on a Dependabot or code scanning alert (claims the alert for this automation).
      runs-on: ubuntu-latest
      output: Assignee update applied on security alert.
      permissions:
        contents: read
        security-events: write
      inputs:
        alert_kind:
          description: dependabot or code_scanning (which API to call).
          required: true
          type: choice
          options:
            - dependabot
            - code_scanning
        alert_number:
          description: Alert number from list-github-security-items.
          required: true
          type: string
      steps:
        - name: Assign svc-devtoolsbot on security alert
          env:
            ALERT_QUEUE_BOT: svc-devtoolsbot
            GH_TOKEN: "${{ secrets.GH_AW_SECURITY_ADVISORY_PAT }}"
          run: |
            set -euo pipefail
            out="${GH_AW_AGENT_OUTPUT:-}"
            if [[ -z "${out}" || ! -f "${out}" ]]; then
              echo "No GH_AW_AGENT_OUTPUT or file missing"
              exit 0
            fi
            failed=0
            body="$(jq -nc --arg u "${ALERT_QUEUE_BOT}" '{assignees: [$u]}')"
            while IFS= read -r item; do
              kind=$(jq -r '.alert_kind' <<<"${item}")
              num=$(jq -r '.alert_number' <<<"${item}")
              case "${kind}" in
                dependabot) segment="dependabot" ;;
                code_scanning) segment="code-scanning" ;;
                *)
                  echo "::error::Unknown alert_kind: ${kind}" >&2
                  failed=1
                  continue
                  ;;
              esac
              echo "Assigning ${ALERT_QUEUE_BOT} on ${segment} alert ${num}"
              if ! echo "${body}" | gh api --method PATCH \
                -H "X-GitHub-Api-Version: 2026-03-10" \
                "repos/${GITHUB_REPOSITORY}/${segment}/alerts/${num}" --input -; then
                echo "::error::PATCH failed for ${kind} alert ${num}" >&2
                failed=1
              fi
            done < <(jq -c '.items[]? | select(.type == "assign_bot_to_security_alert")' "${out}")
            if [[ "${failed}" -ne 0 ]]; then
              exit 1
            fi
strict: true
---

# Security remediation agent

You work on **mongodb-js/devtools-shared**. You **do** analyze the security findings returned by **`list-github-security-items`** for this run, then either **implement** changes and **`create_pull_request`**, or—when you cannot determine a safe in-repo fix—emit **`create_issue`** documenting your findings and **linking to every alert** you were asked to process (use each alert’s **`html_url`** from the payload).

You **do not** dismiss alerts.

## Your task

1. **Fetch alerts** — Call `list-github-security-items`. You receive a JSON object with **`dependabot_alerts`** and **`code_scanning_alerts`** (arrays; either may be empty). Treat this as the **work queue for this run** and base your analysis only on what those arrays contain.

2. **If both arrays are empty** — Emit **`noop`** with a brief message and stop.

3. **Scope** — The workflow allows **`max: 1`** pull request per run. Prefer **one coherent change** that addresses everything you can from the returned alerts when a single remediation applies; when it does not, use **`create_issue`** to cover the rest and link every alert you triaged.

4. **Implement the fix** — Edit the repo as needed and follow existing project conventions. For **npm-style supply-chain fixes** (this monorepo uses `package.json` / lockfiles under the repo root and in `packages/*`):

   - **Prefer manifest-first remediation:** bump or change the **direct** dependency in the **`package.json` that actually declares it** (repository root or the relevant workspace package). Let the lockfile (`package-lock.json`, etc.) update as a consequence of that manifest change. **Do not** treat “only editing the lockfile to pin a transitive” as the default approach when a `package.json` range can be updated instead.

   - **Use `overrides` / resolutions only as a fallback:** add an **`overrides`** (npm) or equivalent **only when** the maintainer of the **direct** dependency has **not** shipped a release that resolves the vulnerable **transitive** on a supported range, so there is no reasonable manifest bump that clears the advisory. When you use overrides, say so in the PR body (which direct dependency is stuck, which advisory it blocks, and what you verified).

5. **Outcome (choose one when the batch is non-empty)**
   - **Fix:** If you implemented a change, emit **`create_pull_request`** with title and body that summarize changes and cite alert numbers, CVE/GHSA or rule ids from the payload.
   - **No fix:** If you cannot determine an appropriate in-repo remediation, emit **`create_issue`** (one issue for this run) with a clear title and body that: summarizes your analysis, states what is blocked or uncertain, and includes a **markdown list of links** to each alert’s **`html_url`** (and key ids). Do **not** use **`noop`** for “could not fix” cases.

6. **Dequeue alerts (always when the batch is non-empty)** — For **each** alert in `dependabot_alerts` and for **each** alert in `code_scanning_alerts`, emit **`assign_bot_to_security_alert`** with matching **`alert_kind`** (`dependabot` vs `code_scanning`) and **`alert_number`**. Do this after **`create_pull_request`** or after **`create_issue`** so the workflow does not keep surfacing the same alerts run after run.
