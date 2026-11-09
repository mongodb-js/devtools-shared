---
name: Start Compass with DevTools
description: Launch a Compass development build with Chromium remote debugging enabled and attach the chrome-devtools MCP server, so the agent can inspect the renderer, read console errors and take screenshots. Use when debugging Compass UI or Electron behavior.
---

# Start Compass with DevTools

Two ways to get DevTools into Compass. Use the built-in one when a human is
inspecting; use the MCP attach when the agent needs to drive or observe the
renderer.

## Option A: built-in DevTools (no MCP)

Settings → General → Enable DevTools → Save, then toggle DevTools with `⌘⌥I`
(macOS), `Ctrl+Shift+I` (Windows/Linux), or View → Toggle DevTools. Good for
manual inspection; the agent cannot drive it.

## Option B: attach chrome-devtools-mcp (Electron renderer)

1. Start Compass from its repository with Chromium remote debugging enabled.
   Electron accepts Chromium switches, and Compass forwards `ELECTRON_EXTRA_ARGS`:

   ```sh
   ELECTRON_EXTRA_ARGS="--remote-debugging-port=9222" npm start
   ```

   Check the Compass development guide if the flag has changed — `9222` is an
   example port, not a guaranteed default.

2. Verify the endpoint answers before configuring anything:

   ```sh
   curl -s http://127.0.0.1:9222/json/version
   ```

   A JSON payload with `Browser` means the MCP server can attach. Compass must
   already be running whenever the tools are used.

3. The `chrome-devtools` MCP server is registered by the devtools plugin. To
   point it at Compass, either override the plugin option or register a
   dedicated entry (keep the generic one untouched so the agent can still launch
   its own throwaway Chrome):

   ```jsonc
   {
     "options": {
       "chromeDevtoolsServerCommand": [
         "npx",
         "-y",
         "chrome-devtools-mcp@1",
         "--browser-url",
         "http://127.0.0.1:9222",
       ],
     },
   }
   ```

   or:

   ```sh
   opencode mcp add chrome-devtools-compass --global -- \
     npx -y chrome-devtools-mcp@1 --browser-url http://127.0.0.1:9222
   opencode mcp list
   ```

4. From then on the agent can reload the page, read console messages, inspect
   network requests and take screenshots against the running Compass.

## Option C: Electron main process

The renderer attach above does not expose the main process. To debug it, forward
`--inspect` or `--inspect-brk` instead and attach from `chrome://inspect`:

```sh
ELECTRON_EXTRA_ARGS="--inspect=9229" npm start
```

## Cautions

- Attaching to an existing session inherits everything in it: logged-in
  accounts, cookies, local storage. Only attach sessions the agent may see.
- Chrome proper (136+) requires `--user-data-dir` alongside
  `--remote-debugging-port`; Electron apps use their own user data directory,
  so this does not automatically apply, but expect similar restrictions if
  Chromium tightens it.
- A stale `--browser-url` entry fails every browser tool with "Could not connect
  to Chrome". That is expected when Compass is not running with debugging
  enabled; use the generic entry in that case.
- Compass must be started by the developer, not by the agent: it is an Electron
  desktop app, not a headless browser.

## Done means

- `curl -s http://127.0.0.1:9222/json/version` returns a `Browser` payload.
- `opencode mcp list` shows the Compass entry as connected.
- A trivial browser tool (navigate or screenshot) succeeds against Compass.
