import Ember from 'ember';

export default Ember.Mixin.create({
  isUndoing: false,
  isRedoing: false,
  undoStackLimit: 10,
  redoStack: Ember.A([]),
  undoStack: Ember.A([]),

  checkpoint(models) {
    var actionType = 'update';

    if(!models) {
      models = Ember.A([this]);
    }

    if(Ember.isEmpty(models.length)) {
      models = Ember.A([models]);
    }

    if(models.length) {
      var changedItems = Ember.A();
      models.forEach(function(item) {
        if(item.get('isNew')) {
          actionType = 'create';
        }
        else if(item.get('isDeleted')) {
          actionType = 'delete';
        }

        var changedAttrs = item.changedAttributes();
        var isCreateDelete = Ember.A(['create', 'delete']).contains(actionType);
        if(isCreateDelete) {
          changedAttrs = item.toJSON();
          item.eachRelationship(function(name, descriptor) {
            if(descriptor.kind === 'belongsTo') {
              changedAttrs[descriptor.key] = item.get(descriptor.key);
            }
          });
        }

        var changeAction = this.getChangeAction(changedAttrs, actionType);
        var actionTaken = changeAction.key;
        var actionText = changeAction.text;

        if(Object.keys(changedAttrs).length) {
          var changes = {
            id: item.get('id'),
            type: item.get('constructor.modelName'),
            descriptor: item.get('undoDescriptor'),
            action: actionType,
            actionTaken: actionTaken,
            actionText: actionText,
            attributes: {}
          };

          var lastUndo = this.get('undoStack.firstObject');
          if(actionType === 'update' && Ember.isPresent(lastUndo) && lastUndo.length === 1) {
            var lastUndoObject = lastUndo[0];
            var lastObjectAttributes = lastUndoObject.attributes;
            Object.keys(changedAttrs).forEach(function(k) {
              var currentVal = changedAttrs[k];
              var lastVal = lastObjectAttributes[k];
              if(Array.isArray(currentVal)) {
                currentVal = currentVal[1];
              }
              if(Array.isArray(lastVal)) {
                lastVal = lastVal[1];
              }

              if(currentVal === lastVal) {
                delete changedAttrs[k];
              }
            });
          }

          changes['attributes'] = changedAttrs;
          changedItems.pushObject(changes);
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
        // this.set('redoStack', Ember.A([]));
      }
    }
  },

  getChangeAction(/* changedAttrs, type */) {
    return {
      key: 'update',
      text: 'Update'
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
    if(Ember.isPresent(lastActionChanges)) {
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

          this.get('store').push({
            data: {
              type: type,
              id: id,
              attributes: attrs
            }
          });

          // item._internalModel.send('willCommit');
          // item._internalModel._attributes = {};
          // item._internalModel.send('didCommit');
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
    var type = historyItem.type;
    var attributes = historyItem.attributes;
    var promise = this._emptyPromise();

    if((action === 'create' && key === 'redoStack') || (action === 'delete' && key === 'undoStack')) {
      attributes.id = id;
      var record = this.get('store').peekRecord('dog', id);
      if(Ember.isPresent(record)) {
        record.transitionTo('loaded.saved');
      }
      else {
        record = this.get('store').createRecord(type, attributes);
        promise = record.save();
      }
    }
    else {
      if(Ember.isPresent(item)) {
        item.transitionTo('loaded.saved');
        promise = item.destroyRecord();
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
