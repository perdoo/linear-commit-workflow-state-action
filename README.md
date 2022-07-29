# Linear Commit Workflow Status Action

Move Linear issues to a workflow state based on a commit message.

## Inputs

### `ghToken`

_Required._ GitHub API key.

### `linearToken`

_Required._ Linear API key.

### `linearTeamId`

_Required._ Linear Team ID for where your issues are located.

### `toStateId`

_Required._ Move to state id.

### `commitMessage`

_Required._ Commit message.

## Example usage

```yaml
uses: perdoo/linear-commit-workflow-state-action@v0.2.0
with:
  ghToken: ${{ }}
  linearToken: ${{ secrets.LINEAR_API_KEY }}
  linearTeamId: 12345
  toStateId: 67890
  commitMessage: ?
```
