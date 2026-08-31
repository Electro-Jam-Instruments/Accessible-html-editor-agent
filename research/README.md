# Research — provenance

Scratch, kept honestly labelled. These are the spikes that established (or overturned)
the method claims the docs make. Do not tidy them; provenance that has been polished is
worth less.

| Directory | What it settled |
|---|---|
| [`atspi/`](atspi/) | AT-SPI2 events can be captured **headless with no X server at all** ([`atspi/FINDINGS.md`](atspi/FINDINGS.md)) — overturning this project's own earlier recommendation. Also the B1/B2 measurements: what AT-SPI actually carries for editable lists and blockquotes. Raw logs in [`atspi/logs/`](atspi/logs/). |
| [`cdp/`](cdp/) | The four CDP findings behind [`../docs/observing-chromium.md`](../docs/observing-chromium.md): the subscription trap, the 250 ms `nodesUpdated` throttle, the erased event type, and what live-region and text-change events are observable externally. |
| [`chrome-automation/`](chrome-automation/) | A **negative** result, kept because it saves the next person a day: `chrome.automation` is gated even with the allowlist flag; an extension cannot be the observation channel. |
