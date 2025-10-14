// selection.js
const SelectionModule = (function() {
  let selected = new Set();
  const dispatcher = d3.dispatch('change');

  function set(ids) {
    const next = new Set(ids || []);
    // Only fire change if something actually changed
    const changed = next.size !== selected.size || [...next].some(x => !selected.has(x));
    selected = next;
    if (changed) dispatcher.call('change', null, get());
  }

  function clear() {
    if (selected.size) { selected.clear(); dispatcher.call('change', null, get()); }
  }

  function get() { return { ids: new Set(selected) }; }
  function has() { return selected.size > 0; }
  function on(type, cb) { dispatcher.on(type, cb); }

  return { set, clear, get, has, on };
})();
window.SelectionModule = SelectionModule;
