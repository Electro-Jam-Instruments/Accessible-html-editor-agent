console.log('AXREC: service worker start; automation=' + (typeof chrome.automation));
if (chrome.automation && chrome.automation.getDesktop) {
  chrome.automation.getDesktop(function (desktop) {
    console.log('AXREC: getDesktop ok, role=' + (desktop && desktop.role));
    const EVENTS = ['focus','focusChanged','checkedStateChanged','expandedChanged',
      'liveRegionChanged','liveRegionCreated','liveRegionNodeChanged','nameChanged',
      'textSelectionChanged','documentSelectionChanged','valueInTextFieldChanged',
      'enabledChanged','childrenChanged','activedescendantchanged','ariaAttributeChangedDeprecated'];
    for (const e of EVENTS) {
      try {
        desktop.addEventListener(e, function (ev) {
          const t = ev.target || {};
          console.log('AXEVENT ' + JSON.stringify({
            type: ev.type, role: t.role, name: t.name, value: t.value,
            state: t.state ? Object.keys(t.state) : undefined
          }));
        }, true);
      } catch (err) { console.log('AXREC: listener failed for ' + e + ': ' + err); }
    }
    console.log('AXREC: listeners registered');
  });
} else {
  console.log('AXREC: chrome.automation UNAVAILABLE');
}
