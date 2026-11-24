# Jora agent profiles

Jora is the presentation name of the Local OpenHands `default` profile. Its
stored name, UUID, revision, configuration and existing conversation references
are preserved. ACP and Cloud profiles keep their existing names. New users use
the server-seeded active default; existing active selections are never changed
by preset initialization.

The Local profile picker and settings library also offer three initial presets:

| Stored name       | Display name    | Tools                                                          | Public skills                               |
| ----------------- | --------------- | -------------------------------------------------------------- | ------------------------------------------- |
| `Jora-Developer`  | Jora Developer  | terminal, file_editor, glob, grep, task_tracker when available | qa-changes, security                        |
| `Jora-Reviewer`   | Jora Reviewer   | terminal, glob, grep                                           | code-review, security                       |
| `Jora-Documenter` | Jora Documenter | file_editor, glob, grep                                        | technical-writing, evidence-based-citations |

Names use hyphens because profile identifiers cannot contain spaces. Renaming a
preset removes its presentation alias. The original default remains the general
purpose agent; its existing persona and settings are not rewritten.

## Initialization and ownership

`initializeJoraAgentPresets` is the only writer of
`misc_settings.jora_agent_presets.handled`. This uses the existing opaque,
deep-merged settings contract, with no new Agent Server endpoint. The profile
query starts initialization independently after an LLM profile with a model is
available. Successful initialization refreshes the profile list. Existing agents
remain usable during failures, and initialization retries on a later mount or
reload. A missing LLM continues through the existing setup flow.

Initialization requires the server's `profile_persona_v1` capability and usable
terminal, file_editor, glob and grep tools. It references the configured active
LLM profile, falling back to the first saved profile, without reading or copying
LLM credentials. Public skills are selected from the bundled catalog. User and
project skills retain the server's existing discovery behavior.

Each expert starts with empty MCP, Secret and integration allow-lists, and no
model router. A role is recorded as handled after its create or namesake skip.
Handled roles are never rewritten or recreated, even if deleted or renamed.
Failures before completion leave that role eligible for a later retry; already
completed roles remain handled. No code activates a profile during this process.

Clients capture the Local backend connection before awaiting network operations.
In-process calls share a promise; Web Locks also serialize tabs on the same
origin. The profile list is refreshed before each save to preserve observed
namesakes. Agent Server exposes an upsert, so a separate client creating the same
name between the list and save is not protected atomically. A server-side
create-if-absent operation is needed to close that race across devices/origins.

## Permissions and backend limits

Reviewer has terminal access so it can inspect git diffs and file contents.
Removing file_editor does **not** make it read-only: shell commands can write.
Documenter's file editor is not restricted to documentation directories. Their
personas define workflows, not security boundaries. Neither profile is advertised
as read-only or as enforcing directory permissions.

Canvas also supplies client tools during OpenHands conversation creation,
including child-conversation launch and secret requests. Workspace-readable
credentials, project tools and explicit later authorization are separate from
the initial saved-secret allow-list. Strict read-only or document-directory
isolation requires Agent Server enforcement across every tool and execution
channel, including Shell, MCP and client tools.

Cloud does not currently apply all of these profile fields. It therefore skips
automatic Jora expert provisioning and keeps its existing Profile experience.
The default `Jora` profile now receives main-agent delegation instructions at
conversation start. It can use the existing `launch_child_conversation` client
tool with `subagent_type` set to `developer`, `reviewer`, or `documenter`.
Canvas resolves that role to the saved profile's stable UUID and revision before
launching the local child, and the child is linked to the parent conversation.
Generic child launches remain compatible and do not receive the Jora main-agent
instructions.

Cloud children launched from a local parent do not yet support these local
specialist profile identities and return an explicit capability error rather
than silently using a different agent.

## Remaining delegation contract

The existing child-conversation tool starts an independent task and reports the
launch outcome back to Jora. Agent Server and its typed client still need a
formal expert invocation contract for effective permissions, execution
lifecycle, cancellation, timeout, retry and a structured result channel back to
the parent. The task must carry the exact diff/commit/workspace snapshot being
reviewed. A default worktree does not contain the parent's in-progress
modifications, so Canvas does not claim that Reviewer saw uncommitted parent
changes unless the selected workspace semantics guarantee it.

Canvas shows linked child names and server-reported execution status in the
conversation header. It does not show a child as completed merely because it
was launched, and it does not provide a cancel control until the Agent Server
exposes a real cancellation contract.
