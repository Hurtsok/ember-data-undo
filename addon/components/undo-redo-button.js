import Ember from 'ember';
import layout from '../templates/components/undo-redo-button';

const { computed, get } = Ember;

export default Ember.Component.extend({
  layout: layout,
  classNames: ['btn-group', 'changes-button'],
  classNameBindings: ['disableButton:disable-option', 'type'],
  item: null,
  type: 'undo',

  stackItems: computed('type', 'item.undoStack.[]', 'item.redoStack.[]', function() {
    var items = null;
    let type = get(this, 'type');
    let item = get(this, 'item');

    if(Ember.isPresent(item)) {
      if(type === 'undo') {
        items = get(this, 'item.undoStack');
      }
      else if(type === 'redo') {
        items = get(this, 'item.redoStack');
      }
    }

    return items || Ember.A([]);
  }),

  hasOneItem: computed('item.undoStack.[]', 'item.redoStack.[]', function() {
    var count = get(this, 'stackItems.length');
    return count && count === 1;
  }),

  disableButton: computed('item.undoStack.[]', 'item.redoStack.[]', function() {
    return !get(this, 'stackItems.length');
  }),

  isUndo: computed('type', function() {
    return get(this, 'type') === 'undo';
  }),

  actions: {
    revert: function(index) {
      var item = get(this, 'item');
      if(Ember.isPresent(item)) {
        if(get(this, 'isUndo')) {
          item.undo(index);
        }
        else {
          item.redo(index);
        }
      }
    }
  }
});
