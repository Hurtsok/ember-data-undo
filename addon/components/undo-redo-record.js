import Ember from 'ember';
import layout from '../templates/components/undo-redo-record';

const { computed, get } = Ember;

export default Ember.Component.extend({
  layout: layout,
  tagName: 'li',
  items: Ember.A(),
  index: 0,

  actionVerb: computed('items.[]', function() {
    var verb = get(this, 'items.firstObject.actionText') || 'Update';
    return Ember.String.capitalize(verb);
  }),

  itemName: computed('items.[]', function() {
    var items = get(this, 'items');
    var count = items.length;
    var name = get(items, 'firstObject.type');
    var descriptor = get(items, 'firstObject.descriptor');
    if(Ember.isPresent(descriptor)) {
      name = descriptor;
    }
    if(count > 1) {
      name = 'objects';
    }
    return name;
  }),

  actions: {
    revertToIndex: function() {
      this.sendAction('revertToIndex', get(this, 'index'));
    }
  }
});
