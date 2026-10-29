# Step 3: Run

> Not implemented yet.

Run the demo task with the skill inside a throwaway container, and keep only the result.

- **Reads:** `plan.json`, `skill/`, `inputs/`.
- **Writes:** `run.json` (`assets/run.schema.json`), result files in `result/`, the agent's log in `run.log`.

## What to do

1. Set up (code): a fresh container with the agent, the skill and the inputs.
2. Do it (AI, in the container): the agent does the task from `plan.json`, with a 10-minute limit.
3. Collect (code): copy out only the result files into `result/`.
4. Check (code): run every check in `plan.json` `done`. Any failed check fails the step.

## Safety

The skill is a stranger's code. It runs only in the throwaway container. The container holds only the AI key. Storage and database keys never enter it.

## Done when

`run.json` is valid and every check in `plan.json` passed.
