import Ember from 'ember';
import { moduleForModel, test } from 'ember-qunit';
const { run } = Ember;
var store = null;

moduleForModel('dog', 'Unit | Model | dog', {
  // Specify the other units that are required for this test.
  setup: function() {
    store = this.store();
  }
});

var saveModel = function(model) {
  model._internalModel.send('willCommit');
  model._internalModel._attributes = {};
  model._internalModel.send('didCommit');
};

test('create a new record - undo/redo stack', function(assert) {
  let dog = null;
  run(function() {
    dog = this.store().createRecord('dog', { id: 1, name: 'Penny', age: 7 });
    dog.checkpoint();
    this.store().push({
      data: {
        id: 1,
        type: 'dog',
        attributes: {
          name: 'Penny',
          age: 7
        }
      }
    });
    assert.equal(dog.get('undoStack').length, 1, 'push.1 undoStack length == 1');
    assert.equal(dog.get('redoStack').length, 0, 'push.1 redoStack length == 0');
    saveModel(dog);
  }.bind(this));

  run(() => {
    dog.set('name', 'Penny Marie');
    dog.checkpoint();
    saveModel(dog);
    assert.equal(dog.get('undoStack').length, 2, 'push.2 undoStack length == 2');
    assert.equal(dog.get('redoStack').length, 0, 'push.2 redoStack length == 0');
  });

  run(() => {
    dog.set('age', 9);
    dog.checkpoint();
    saveModel(dog);
    assert.equal(dog.get('undoStack').length, 3, 'push.3 undoStack length == 3');
    assert.equal(dog.get('redoStack').length, 0, 'push.3 redoStack length == 0');
  });

  run(() => {
    dog.undo().then(() => {
      assert.equal(dog.get('undoStack.length'), 2, 'undo.1 undoStack length == 2');
      assert.equal(dog.get('redoStack.length'), 1, 'undo.1 redoStack length == 1');
      assert.equal(dog.get('age'), 7, 'undo.1 age reverts');
      assert.equal(dog.get('name'), 'Penny Marie', 'undo.1 name stays the same');
    });
  });

  run(() => {
    dog.undo().then(() => {
      assert.equal(dog.get('undoStack.length'), 1, 'undo.2 undoStack length == 1');
      assert.equal(dog.get('redoStack.length'), 2, 'undo.2 redoStack length == 2');
      assert.equal(dog.get('age'), 7, 'undo.2 age remains the same');
      assert.equal(dog.get('name'), 'Penny', 'undo.2 name reverts');
    });
  });

  run(() => {
    dog.redo().then(() => {
      assert.equal(dog.get('undoStack.length'), 2, 'redo.2 undoStack length == 2');
      assert.equal(dog.get('redoStack.length'), 1, 'redo.2 redoStack length == 1');
      assert.equal(dog.get('age'), 7, 'redo.2 age remains the same');
      assert.equal(dog.get('name'), 'Penny Marie', 'redo.2 name reverts');
    });
  });

  run(() => {
    dog.redo().then(() => {
      assert.equal(dog.get('undoStack.length'), 3, 'redo.3 undoStack length == 3');
      assert.equal(dog.get('redoStack.length'), 0, 'redo.3 redoStack length == 0');
      assert.equal(dog.get('age'), 9, 'redo.3 age reverts');
      assert.equal(dog.get('name'), 'Penny Marie', 'redo.3 name stays the same');
    });
  });

  run(() => {
    dog.undo(1).then(() => {
      assert.equal(dog.get('undoStack.length'), 1, 'undo.4 undoStack length == 1');
      assert.equal(dog.get('redoStack.length'), 2, 'undo.4 redoStack length == 2');
    }.bind(this));
  }.bind(this));

  run(() => {
    dog.redo(1).then(() => {
      assert.equal(dog.get('undoStack.length'), 3, 'redo.4 undoStack length == 3');
      assert.equal(dog.get('redoStack.length'), 0, 'redo.4 redoStack length == 0');
    }.bind(this));
  }.bind(this));
});


test('changed attributes separated into two checkpoints', function(assert) {
  let dog2 = null;
  run(function() {
    dog2 = this.store().push({
      data: {
        id: 2,
        type: 'dog',
        attributes: {
          name: 'Doug',
          age: 9
        }
      }
    });
    dog2.checkpoint();
    assert.equal(dog2.get('undoStack').length, 0, 'push.1 undoStack length == 0');
    assert.equal(dog2.get('redoStack').length, 0, 'push.1 redoStack length == 0');
    saveModel(dog2);
  }.bind(this));

  run(() => {
    dog2.set('name', 'Doug Cook');
    dog2.checkpoint();
    assert.equal(dog2.get('undoStack').length, 1, 'push.2 undoStack length == 1');
    assert.equal(dog2.get('redoStack').length, 0, 'push.2 redoStack length == 0');
    assert.equal(dog2.get('age'), 9, 'age stays the same');
    assert.equal(dog2.get('name'), 'Doug Cook', 'name changes');
  });

  run(() => {
    dog2.set('age', 10);
    dog2.checkpoint();
    assert.equal(dog2.get('undoStack').length, 2, 'push.3 undoStack length == 2');
    assert.equal(dog2.get('redoStack').length, 0, 'push.3 redoStack length == 0');
    assert.equal(dog2.get('age'), 10, 'age changes');
    assert.equal(dog2.get('name'), 'Doug Cook', 'name changes');
  });

  run(() => {
    dog2.undo().then(() => {
      assert.equal(dog2.get('undoStack.length'), 1, 'undo.1 undoStack length == 1');
      assert.equal(dog2.get('redoStack.length'), 1, 'undo.1 redoStack length == 1');
      assert.equal(dog2.get('age'), 9, 'age changes');
      assert.equal(dog2.get('name'), 'Doug Cook', 'name doesnt change');
    });
  });
});
