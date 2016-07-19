import Ember from 'ember';
import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('undo-redo-record', 'Integration | Component | undo redo record', {
  integration: true
});

test('it renders 1 list record', function(assert) {
  this.items = Ember.A([
    {
      id: 1,
      type: 'dog',
      descriptor: 'dog',
      action: 'update',
      actionText: 'Update',
      actionTaken: 'update'
    }
  ]);

  this.render(hbs`{{undo-redo-record items=items index=1}}`);
  assert.equal(this.$('li:first span:first').text().trim(), 'Update');
  assert.equal(this.$('li:first span:last').text().trim(), '1 dog');
});

test('it renders 2 list records', function(assert) {
  this.items = Ember.A([
    {
      id: 1,
      type: 'dog',
      descriptor: 'dog',
      action: 'update',
      actionText: 'Update',
      actionTaken: 'update'
    },
    {
      id: 2,
      type: 'cat',
      descriptor: 'cat',
      action: 'update',
      actionText: 'Update',
      actionTaken: 'update'
    }
  ]);

  this.render(hbs`{{undo-redo-record items=items index=1}}`);
  assert.equal(this.$('li:first span:first').text().trim(), 'Update');
  assert.equal(this.$('li:first span:last').text().trim(), '2 items');
});

test('it renders 1 list record w/descriptor and actionText', function(assert) {
  this.items = Ember.A([
    {
      id: 1,
      type: 'dog',
      descriptor: 'poodle',
      action: 'update',
      actionText: 'Update (age, name)',
      actionTaken: 'update'
    }
  ]);

  this.render(hbs`{{undo-redo-record items=items index=1}}`);
  assert.equal(this.$('li:first span:first').text().trim(), 'Update (age, name)');
  assert.equal(this.$('li:first span:last').text().trim(), '1 poodle');
});
