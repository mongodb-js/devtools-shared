/* eslint-disable no-console */
import fetch from 'node-fetch';
import type { Severity, VulnerabilityInfo } from './vulnerability';
import { hasExpiredPolicy } from './vulnerability';
import { isIgnored } from './vulnerability';

const formatDueDate = (date: Date): string => {
  const yy = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  return `${yy}-${MM}-${dd}`;
};

async function createJiraTicket(
  jiraBaseUrl: string,
  auth: {
    token: string;
  },
  issue: {
    project: string;
    summary: string;
    description: string;
    components: string[];
    labels: string[];
    priority: string;
    issueType: string;
    dueDate: Date;
  }
): Promise<void> {
  jiraBaseUrl = jiraBaseUrl.replace(/\/$/, '');
  const issueApiUrl = `${jiraBaseUrl}/rest/api/2/issue/`;

  const headers = {
    Authorization: `Bearer ${auth.token}`,
    Accept: 'application/json',
  };

  const jqlQuery = new URLSearchParams({
    jql: `project="${issue.project}" AND issuetype="${issue.issueType}" AND resolution=Unresolved AND summary~"${issue.summary}"`,
  }).toString();

  const searchApiUrl = `${jiraBaseUrl}/rest/api/2/search?${jqlQuery}`;

  const exists = await fetch(searchApiUrl, {
    method: 'GET',
    headers: {
      ...headers,
    },
  }).then(async (res) =>
    res.ok
      ? (await res.json()).total > 0
      : Promise.reject(
          new Error(`HTTP error: ${res.status}. ${await res.text()}`)
        )
  );

  if (exists) {
    console.info(
      `The ${issue.issueType} ticket ${issue.project} - ${issue.summary}, already exists.`
    );
    return;
  }

  const response = await fetch(issueApiUrl, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        project: {
          key: issue.project,
        },
        summary: issue.summary,
        description: issue.description,
        issuetype: {
          name: issue.issueType,
        },
        components: issue.components.length
          ? issue.components.map((c: string) => ({ name: c }))
          : undefined,
        labels: issue.labels.length ? issue.labels : undefined,
        priority: {
          name: issue.priority,
        },
        duedate: formatDueDate(issue.dueDate),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}. ${await response.text()}`);
  }

  const key: string = (await response.json())?.key;
  console.info('Created issue:', `${jiraBaseUrl}/browse/${key}`);
}

const JIRA_ISSUE_TYPE = 'Build Failure';

function severityToJiraPriority(severity: Severity) {
  if (severity === 'high') {
    return 'Critical - P2';
  }

  if (severity === 'medium') {
    return 'Major - P3';
  }

  if (severity === 'low') {
    return 'Minor - P4';
  }

  // critical | unknown
  return 'Blocker - P1';
}

function severityToDueDate(severity: Severity) {
  const triageSlaDays = 2;
  const resolutionSlaDays =
    severity === 'high'
      ? 5
      : severity === 'medium'
      ? 6 /* weeks */ * 7
      : severity === 'low'
      ? 12 /* weeks */ * 7
      : // severity === 'critical' || severity === 'unknown'
        1;

  return new Date(
    new Date().getTime() +
      triageSlaDays +
      resolutionSlaDays * 24 * 60 * 60 * 1000
  );
}

const formatOrigins = (origins: string[]) => {
  let text = origins
    .slice(0, 10)
    .map((o) => `# {{${o}}}`)
    .join('\n');

  const remaining = origins.slice(10).length;

  if (remaining) {
    text =
      text +
      `\n# and other ${remaining} vulnerable ${
        remaining === 1 ? 'path' : 'paths'
      }.`;
  }

  return text;
};

export const buildJiraDescription = (
  vulnerability: VulnerabilityInfo
): string => {
  return (
    `h4. Vulnerability Details

- *Affected Package*: ${vulnerability.packageName}
- *Affected Version*: ${vulnerability.packageVersion}
- *Fixed In*: ${
      vulnerability.fixedIn?.length ? vulnerability.fixedIn.join(', ') : 'N/A'
    }
- *Severity*: ${vulnerability.severity}
- *Cvss score*: ${vulnerability.score ?? '-'}

h4. Vulnerability Description

{panel:title=${vulnerability.title}}
${vulnerability.description}
{panel}

h4. Vulnerable Paths

${formatOrigins(vulnerability.origins)}

h4. Links

${vulnerability.urls.map((l) => `- [${l.title}|${l.url}]`).join('\n')}
` +
    (process.env.JIRA_VULNERABILITY_BUILD_INFO
      ? `
h4. Build Info

${process.env.JIRA_VULNERABILITY_BUILD_INFO}
`
      : '')
  );
};

export async function createVulnerabilityTickets(
  vulnerabilities: VulnerabilityInfo[]
): Promise<void> {
  if (
    !process.env.JIRA_BASE_URL ||
    !process.env.JIRA_API_TOKEN ||
    !process.env.JIRA_PROJECT
  ) {
    const missingEnv = ['JIRA_BASE_URL', 'JIRA_API_TOKEN', 'JIRA_PROJECT']
      .filter((k) => !process.env[k])
      .join(', ');

    throw new Error(
      `Missing required variables to create Jira tickets: ${missingEnv}`
    );
  }

  for (const vulnerability of vulnerabilities) {
    if (isIgnored(vulnerability)) {
      return;
    }

    await createJiraTicket(
      process.env.JIRA_BASE_URL,
      {
        token: process.env.JIRA_API_TOKEN,
      },
      {
        project: process.env.JIRA_PROJECT,
        summary: `Vulnerability ${vulnerability.id} found on ${
          vulnerability.packageName
        }@${vulnerability.packageVersion}${
          hasExpiredPolicy(vulnerability) ? ' (Policy Expired)' : ''
        }`,
        description: buildJiraDescription(vulnerability),
        components: ['Vulnerability Management'],
        labels: [],
        priority: severityToJiraPriority(vulnerability.severity),
        issueType: JIRA_ISSUE_TYPE,
        dueDate: severityToDueDate(vulnerability.severity),
      }
    );
  }
}
