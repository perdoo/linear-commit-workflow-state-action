import * as core from "@actions/core";
import { LinearClient } from "@linear/sdk";
import * as github from "@actions/github";
import { isNil } from "lodash-es";

const extractPullRequestNumber = (message) => {
  const matches = message.match(/^.*\(#(\d+)\)$/);
  return !isNil(matches) ? matches[1] : null;
};

const getLinearIssueNumbers = async (octokit, prNumber) => {
  core.info(
    `Searching for Linear issues linked to the pull request #${prNumber}.`
  );

  const { repository } = github.context.payload;

  const { data: pullRequest } = await octokit.rest.pulls.get({
    repo: repository.name,
    owner: repository.owner.login,
    pull_number: prNumber,
  });

  let issueNumbers = [];

  // From the branch name
  const branchName = pullRequest.head.ref;
  let match = branchName.match(/^([a-z]+\-(\d+))\-/);

  if (!isNil(match)) {
    issueNumbers.push(parseInt(match[2]));
    core.info(`PR linked to Linear issue ${match[1].toUpperCase()}.`);
  }

  // From the PR body
  const body = pullRequest.body ?? "";
  const regexp = /Fixes ([a-z]+\-(\d+))|Resolves ([a-z]+\-(\d+))/gi;
  const matches = [...body.matchAll(regexp)];

  matches.forEach((match) => {
    const captureMatchId = (match[1] || match[3]).toUpperCase();
    const captureMatchNumber = match[2] || match[4];
    issueNumbers.push(parseInt(captureMatchNumber));

    core.info(`PR linked to Linear issue ${captureMatchId}.`);
  });

  return [...new Set(issueNumbers)]; // Remove duplicates
};

const moveIssues = async (issues, toStateId) => {
  const payload = { stateId: toStateId };
  for (let i = 0; i < issues.nodes.length; i++) {
    const issue = issues.nodes[i];
    const fromStateId = issue._state.id;
    await issue.update(payload);
    core.info(
      `Issue ${issue.identifier} moved from state ${fromStateId} to ${toStateId}.`
    );
  }
};

async function run() {
  const ghToken = core.getInput("ghToken");
  const linearToken = core.getInput("linearToken");
  const linearTeamId = core.getInput("linearTeamId");
  const toStateId = core.getInput("toStateId");
  const commitMessage = core.getInput("commitMessage");

  core.setSecret("ghToken");
  core.setSecret("linearToken");

  const octokit = github.getOctokit(ghToken);
  const linearClient = new LinearClient({ apiKey: linearToken });

  const prNumber = extractPullRequestNumber(commitMessage);

  if (!prNumber) {
    core.info("The commit message doesn't contain a pull request id.");
    return;
  }

  const linearIssueIds = await getLinearIssueNumbers(octokit, prNumber);

  if (!linearIssueIds.length) {
    core.info("PR isn't linked to any Linear issues.");
    return;
  }

  const linearIssues = await linearClient.issues({
    filter: {
      number: { in: linearIssueIds },
      team: { id: { eq: linearTeamId } },
    },
  });

  await moveIssues(linearIssues, toStateId);
}

run();
