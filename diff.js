module.exports = function(older, newer, valueField) {
  return {
    removed: Object.keys(older).filter(key => !newer[key]).map(key => older[key]),
    added: Object.keys(newer).filter(key => !older[key]).map(key => newer[key]),
    changed: valueField
      ? Object.keys(newer).filter(key => {
          var old = older[key];
          return old && old[valueField] != newer[key][valueField];
        }).map(key => newer[key])
      : undefined
  };
};
