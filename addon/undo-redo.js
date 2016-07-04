import Ember from 'ember';
const { on, get, set, isPresent, isEmpty } = Ember;

export default Ember.Mixin.create({
  isUndoing: false,
  isRedoing: false,
  undoStackLimit: 10,
  redoStack: Ember.A([]),
  undoStack: Ember.A([]),

  _initialUndoState: null,
  _undo_setup: on('ready', function() {
    this._updateInitialUndoState(-1);
  }),

  _updateInitialUndoState(idx) {
    if(!idx) {
      idx = parseInt(get(this, '_initialUndoState.index'));
    }

    set(this, '_initialUndoState', {
      index: idx + 1,
      snapshot: this._internalModel.createSnapshot()
    });
  },

  checkpoint(models) {
    var actionType = 'update';

    if(!models) {
      models = Ember.A([this]);
    }

    if(isEmpty(models.length)) {
      models = Ember.A([models]);
    }

    if(models.length) {
      var changedItems = Ember.A();
      models.forEach(function(item) {
        var changedAttrs = item.changedAttributes();

        if(get(item, 'isNew')) {
          var initStateIndex = get(item, '_initialUndoState.index');
          if(!initStateIndex || initStateIndex === 0) {
            actionType = 'create';
          }

          var attrs = get(this, '_initialUndoState.snapshot._attributes');
          if(Ember.isPresent(attrs)) {
            Object.keys(attrs).forEach(function(k) {
              var value = attrs[k];
              changedAttrs[k][0] = value;
            });
          }

          this._updateInitialUndoState();
        }
        else if(get(item, 'isDeleted')) {
          actionType = 'delete';
        }

        var isCreateDelete = Ember.A(['create', 'delete']).contains(actionType);
        if(isCreateDelete) {
          changedAttrs = item.toJSON();
          item.eachRelationship(function(name, descriptor) {
            if(descriptor.kind === 'belongsTo') {
              changedAttrs[descriptor.key] = item.get(descriptor.key);
            }
          });
        }

        if(Object.keys(changedAttrs).length) {
          var changes = {
            id: item.get('id'),
            type: item.get('constructor.modelName'),
            descriptor: item.get('undoDescriptor'),
            action: actionType,
            attributes: {},
            snapshot: item._internalModel.createSnapshot()
          };

          let lastUndo = this.get('undoStack.firstObject');
          if(actionType === 'update' && Ember.isPresent(lastUndo) && lastUndo.length === 1) {
            var lastUndoObject = lastUndo[0];
            var lastSnapshotAttributes = lastUndoObject.snapshot._attributes;
            var objectKeys = Object.keys(changedAttrs);

            for(var i = 0; i < objectKeys.length; i++) {
              var k = objectKeys[i];
              var currentVal = changedAttrs[k];
              var lastVal = lastSnapshotAttributes[k];
              if(Array.isArray(currentVal)) {
                currentVal = currentVal[1];
              }
              if(Array.isArray(lastVal)) {
                lastVal = lastVal[1];
              }

              if(currentVal === lastVal) {
                delete changedAttrs[k];
              }
              else if(Ember.isPresent(lastVal)) {
                if(Array.isArray(changedAttrs[k])) {
                  changedAttrs[k][0] = lastVal;
                }
              }
            }
          }

          if(Object.keys(changedAttrs).length) {
            var changeAction = this.undoActionTaken(changedAttrs, actionType);
            changes.attributes = changedAttrs;
            changes.actionTaken = changeAction.key;
            changes.actionText = changeAction.text;
            changedItems.pushObject(changes);
          }
        }
      }.bind(this));

      if(changedItems.length) {
        var undo = this.get('undoStack').slice(0);
        undo.unshift(changedItems);
        this.set('undoStack', Ember.A(undo));

        var currentCount = this.get('undoStack.length');
        var limit = this.get('undoStackLimit');
        if(currentCount > limit) {
          this.get('undoStack').popObject();
        }

        /* Clear redo settings if something new happened */
        this.get('redoStack').clear();
      }
    }
  },

  undoActionTaken(changedAttrs, type) {
    var text = Ember.String.capitalize(type);
    if(type === 'update') {
      let changedAttrsString = Object.keys(changedAttrs).join(', ');
      text += ' (' + changedAttrsString + ')';
    }

    return {
      key: type,
      text: text
    };
  },

  undo(index) {
    if(this.get('isUndoing') === false) {
      this.set('isUndoing', true);
      return this._popHistoryStack(index, 'undoStack');
    }
    return this._emptyPromise();
  },

  redo(index) {
    if(this.get('isRedoing') === false) {
      this.set('isRedoing', true);
      return this._popHistoryStack(index, 'redoStack');
    }
    return this._emptyPromise();
  },

  _popHistoryStack(toIndex, key) {
    if(!key) {
      key = 'undoStack';
    }
    var lastActionChanges = this.get(key + '.firstObject');
    if(isPresent(lastActionChanges)) {
      var promise = this._revertActionChanges(lastActionChanges, key, toIndex);
      return promise.then((hash) => {
        var idx = hash.toIndex;
        var key = hash.replaceType;
        var restockKey = (key === 'undoStack') ? 'redoStack' : 'undoStack';
        var restockStack = this.get(restockKey);
        restockStack = restockStack.slice(0);
        restockStack.unshift(lastActionChanges);
        this.set(restockKey, Ember.A(restockStack));
        this.get(key).removeObject(lastActionChanges);

        if(idx > 0) {
          idx--;
          return this._popHistoryStack(idx, key);
        }
        else {
          this.set('isUndoing', false);
          this.set('isRedoing', false);
          return this._emptyPromise();
        }
      }.bind(this));
    }
    else {
      this.set('isUndoing', false);
      this.set('isRedoing', false);
      return this._emptyPromise();
    }
  },

  _revertActionChanges(lastActionChanges, key, toIndex) {
    if(!key) {
      key = 'undoStack';
    }
    return this._resetObjectAttributes(lastActionChanges, 0, key, toIndex);
  },

  _resetObjectAttributes(historyItems, position, replaceType, toIndex) {
    var historyItem = null;
    if(historyItems && historyItems.length) {
      historyItem = historyItems.objectAt(position);
    }

    var promise = this._emptyPromise();

    if(historyItem) {
      var id = historyItem.id;
      var type = historyItem.type;
      var action = historyItem.action;
      var attributes = historyItem.attributes;
      var item = this.get('store').peekAll(type).findBy('id', id);
      // CREATES || DELETES
      if(action === 'create' || action === 'delete') {
        promise = this._addOrRemoveHistoryItem(item, historyItem, action, replaceType);
      }
      // UPDATES
      else {
        if(Ember.isPresent(item)) {
          var numKey = (replaceType === 'redoStack') ? 1 : 0;
          var attrs = {};

          for(var k in attributes) {
            var value = attributes[k][numKey];
            attrs[k] = value;
            item.set(k, value);
          }
        }
      }
    }

    var items = historyItems;
    return promise.then(() => {
      position++;
      if(position < items.length) {
        return this._resetObjectAttributes(items, position, replaceType, toIndex);
      }
      return {
        replaceType: replaceType,
        items: items,
        toIndex: toIndex
      };
    }.bind(this));
  },

  _addOrRemoveHistoryItem(item, historyItem, action, key) {
    if(!key) {
      key = 'undoStack';
    }
    if(!action) {
      action = 'update';
    }
    
    var id = historyItem.id;
    var promise = this._emptyPromise();
    var record = null;

    if(isEmpty(id) && action === 'create') {
      record = historyItem.snapshot.record;
      id = get(record, 'id');
      item = record;
    }

    if((action === 'create' && key === 'redoStack') || (action === 'delete' && key === 'undoStack')) {
      record = this.get('store').peekRecord('dog', id);

      if(isPresent(record)) {
        record.transitionTo('loaded.saved');
      }
      else {
        this._updateInitialUndoState();
        historyItem.snapshot._internalModel.rollbackAttributes();
        record = historyItem.snapshot._internalModel.record;
        record.transitionTo('loaded.created.uncommitted');

        var attrs = historyItem.snapshot._attributes;
        var attrKeys = Object.keys(attrs);
        for(var i = 0; i < attrKeys.length; i++) {
          var k = attrKeys[i];
          var value = attrs[k];
          record.set(k, value);
        }

        if(isPresent(get(record, 'id'))) {
          record.save();
        }
      }
    }
    else {
      if(isPresent(item)) {
        if(item.get('isNew')) {
          item.deleteRecord();
        }
        else {
          item.transitionTo('loaded.saved');
          promise = item.destroyRecord();
        }
      }
    }
    return promise;
  },

  _emptyPromise() {
    return new Ember.RSVP.Promise((resolve, reject) => {
      resolve(false);
      reject(false);
    });
  }
});
