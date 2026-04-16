---
name: Dependabot remediation agent
description: Fetches open Dependabot alerts for the agent to process this run; the agent opens a fix PR or a triage issue linking to those alerts, then assigns svc-devtoolsbot on each alert it processed.
engine: copilot
on:
  schedule: daily
  workflow_dispatch: {}
timeout-minutes: 45
permissions:
  contents: read
  issues: read
  pull-requests: read
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
  get-dependabot-alerts:
    description: >-
      Returns open Dependabot alerts for this repository for the current run as a JSON object
      with a `dependabot_alerts` array (may be empty).
    timeout: 120
    run: |
      set -euo pipefail
      # Avoid --argjson for huge API payloads (ARG_MAX / "argument list too long").
      dep_file="${RUNNER_TEMP}/get-dependabot-alerts-dep.json"
      gh api -H "X-GitHub-Api-Version: 2026-03-10" "repos/${GITHUB_REPOSITORY}/dependabot/alerts?state=open" --paginate >"$dep_file"
      jq -n \
        --slurpfile dep "$dep_file" \
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

      def unassigned:
        ((.assignees // []) | length) == 0;

      ( $dep[0] | map(select(unassigned)) ) as $dun |
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

      { dependabot_alerts: $dep_sel }
      JQ
      rm -f "$dep_file"
    env:
      GH_TOKEN: "${{ secrets.GH_AW_SECURITY_ADVISORY_PAT }}"
safe-outputs:
  create-pull-request:
    title-prefix: "[agent] "
    labels:
      - security
    draft: true
    max: 1
    auto-close-issue: false
    # Dependabot and supply-chain fixes routinely touch manifests; default protected-files would block those patches.
    protected-files: allowed
  create-issue:
    title-prefix: "[agent-triage] "
    labels:
      - security
    max: 1
    expires: false
  jobs:
    assign-bot-to-security-alert:
      description: >-
        Set assignees to svc-devtoolsbot on one or more Dependabot alerts (claims them for this automation).
        Pass every alert number in a single call — the workflow allows only one assign output item per run.
      runs-on: ubuntu-latest
      output: Assignee update applied on Dependabot alert(s).
      permissions:
        contents: read
      inputs:
        alert_numbers:
          description: >-
            JSON array of Dependabot alert numbers to assign, e.g. [12,34,56] (from get-dependabot-alerts).
            Include all alerts you are dequeuing in this one array.
          required: true
          type: string
      steps:
        - name: Assign svc-devtoolsbot on Dependabot alert
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
              while IFS= read -r num; do
                [[ -z "${num}" || "${num}" == "null" ]] && continue
                echo "Assigning ${ALERT_QUEUE_BOT} on dependabot alert ${num}"
                if ! echo "${body}" | gh api --method PATCH \
                  -H "X-GitHub-Api-Version: 2026-03-10" \
                  "repos/${GITHUB_REPOSITORY}/dependabot/alerts/${num}" --input -; then
                  echo "::error::PATCH failed for dependabot alert ${num}" >&2
                  failed=1
                fi
              done < <(jq -r '. as $i |
                ( if ($i.alert_numbers != null) then
                    ($i.alert_numbers | if type == "array" then . elif type == "string" then (try fromjson catch []) else [] end)
                  elif ($i.alert_number != null) then [$i.alert_number]
                  else [] end ) | .[] | tostring' <<<"${item}")
            done < <(jq -c '.items[]? | select(.type == "assign_bot_to_security_alert")' "${out}")
            if [[ "${failed}" -ne 0 ]]; then
              exit 1
            fi
strict: true
---

# Security remediation agent

You work on **mongodb-js/devtools-shared**. You **do** analyze the security findings returned by **`get-dependabot-alerts`** for this run, then either **implement** changes and **`create_pull_request`**, or—when you cannot determine a safe in-repo fix—emit **`create_issue`** documenting your findings and **linking to every alert** you were asked to process (use each alert’s **`html_url`** from the payload).

You **do not** dismiss alerts.

## Your task

1. **Fetch alerts** — Call `get-dependabot-alerts`. You receive a JSON object with a **`dependabot_alerts`** array (may be empty). Treat this as the **work queue for this run** and base your analysis only on that array.

2. **If `dependabot_alerts` is empty** — Emit **`noop`** with a brief message and stop.

3. **Scope** — The workflow allows **`max: 1`** pull request per run. Prefer **one coherent change** that addresses everything you can from the returned alerts when a single remediation applies; when it does not, use **`create_issue`** to cover the rest and link every alert you triaged.

4. **Implement the fix** — Edit the repo as needed and follow existing project conventions. For **npm-style supply-chain fixes** (this monorepo uses `package.json` / lockfiles under the repo root and in `packages/*`):

   - **Prefer manifest-first remediation:** bump or change the **direct** dependency in the **`package.json` that actually declares it** (repository root or the relevant workspace package). Let the lockfile (`package-lock.json`, etc.) update as a consequence of that manifest change. **Do not** treat “only editing the lockfile to pin a transitive” as the default approach when a `package.json` range can be updated instead.
   - If a major version bump of the direct dependency is required, evaluate the impact of the upgrade. If the upgrade is simple and does not require a lot of changes, do it, otherwise emit a `create_issue` and link to the alert.
   - **Use `overrides` / resolutions only as a fallback:** add an **`overrides`** (npm) or equivalent **only when** the maintainer of the **direct** dependency has **not** shipped a release that resolves the vulnerable **transitive** on a supported range, so there is no reasonable manifest bump that clears the advisory. When you use overrides, say so in the PR body (which direct dependency is stuck, which advisory it blocks, and what you verified).

5. **Outcome (choose one when the batch is non-empty)**
   - **Fix:** If you implemented a change, emit **`create_pull_request`** with title that follows conventional commit format (e.g. `chore(deps): bump xyz to v1.2.3`) and body that summarize changes and cite alert numbers, CVE/GHSA or rule ids from the payload.
   - **No fix:** If you cannot determine an appropriate in-repo remediation, emit **`create_issue`** (one issue for this run) with a clear title and body that: summarizes your analysis, states what is blocked or uncertain, and includes a **markdown list of links** to each alert’s **`html_url`** (and key ids). Do **not** use **`noop`** for “could not fix” cases.

6. **Dequeue alerts (always when the batch is non-empty)** — After **`create_pull_request`** or **`create_issue`**, emit **`assign_bot_to_security_alert` exactly once** with **`alert_numbers`** set to a **JSON array** of every Dependabot **`number`** you processed from `dependabot_alerts` (e.g. `[12,34,56]`). The workflow only accepts **one** assign output per run; a single array is how you assign the bot on multiple alerts.
