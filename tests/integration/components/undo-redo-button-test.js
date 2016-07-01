import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('undo-redo-button', 'Integration | Component | undo redo button', {
  integration: true
});

test('it renders', function(assert) {
  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(hbs`{{undo-redo-button}}`);

  assert.equal(this.$('button').length, 2);

  // Template block usage:
  this.render(hbs`
    {{#undo-redo-button}}
      template block text
    {{/undo-redo-button}}
  `);

  // assert.equal(this.$().text().trim(), 'template block text');
});
