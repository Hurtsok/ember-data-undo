import Ember from 'ember';
import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';
const { run } = Ember;

let store;
moduleForComponent('undo-redo-button', 'Integration | Component | undo redo button', {
  integration: true,
  beforeEach() {
    this.inject.service('store');
    store = this.get('store');
  }
});

test('it adds stack items to list / removes items when button is clicked', function(assert) {
  run(() => {
    store.push({
      data: {
        id: 1,
        type: 'dog',
        attributes: {
          name: 'Penny',
          age: 7
        }
      }
    });
  });

  this.dog = store.peekRecord('dog', 1);

  this.render(hbs`{{undo-redo-button item=dog type="undo"}}`);

  run(() => {
    this.dog.set('age', 30);
    this.dog.checkpoint();
  });

  assert.equal(this.$('.list-items li').length, 1);

  run(() => {
    this.dog.set('age', 31);
    this.dog.checkpoint();
  });

  assert.equal(this.$('.list-items li').length, 2);

  this.$('button.btn-action').click();
  assert.equal(this.$('.list-items li').length, 1);

  this.$('button.btn-action').click();
  assert.equal(this.$('.list-items li').length, 0);
});
