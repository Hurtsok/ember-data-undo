import Ember from 'ember';
import layout from '../templates/components/undo-redo-record';

const { computed, get } = Ember;

export default Ember.Component.extend({
  layout: layout,
  tagName: 'li',
  items: Ember.A(),
  index: 0,
  defaultActionIconMap: {
    'resize':   'expand',
    'move':     'arrows',
    'text':     'font',
    'rotate':   'rotate-left',
    'update':   'pencil',
    'shape':    'pencil-square-o',
    'delete':   'remove',
    'create':   'plus'
  },
  actionIconMap: {},

  iconMap: computed('defaultActionIconMap', 'actionIconMap', function() {
    return Ember.merge(get(this, 'defaultActionIconMap'), get(this, 'actionIconMap'));
  }),

  actionVerb: computed('items.[]', function() {
    var verb = get(this, 'items.firstObject.actionText') || 'Update';
    return Ember.String.capitalize(verb);
  }),

  actionIcon: computed('items.[]', function() {
    var action = get(this, 'items.firstObject.actionTaken');
    var icon = 'pencil';
    var iconMap = get(this, 'iconMap');
    if(iconMap[action]) {
      icon = iconMap[action];
    }
    return icon;
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
