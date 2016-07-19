import Ember from 'ember';
const { on, get, set, isPresent, isEmpty } = Ember;

export default Ember.Mixin.create({
  /**
  If this property is `true` the record is in the `undoing` state. A
  record enters this state when attempting to revert back to a previous state.
  The action could involve a series of promises (creates/deletes/updates) to
  be fulfilled in order to be complete. Once complete, this property will be `false`
  @property isUndoing
  @type {Boolean}
  @readOnly
  */
  isUndoing: false,

  /**
  If this property is `true` the record is in the `redoing` state. A
  record enters this state when attempting to revert back to a newer state.
  The action could involve a series of promises (creates/deletes/updates) to
  be fulfilled in order to be complete. Once complete, this property will be `false`
  @property isRedoing
  @type {Boolean}
  @readOnly
  */
  isRedoing: false,

  /**
  Undo/Redo stack limit can be assigned. A stack limit is the count of undos/redos
  that can be assigned. If over the limit in the stack, the stack will remove older
  copies of the changes. This property defaults to a limit of `10`
  @property undoStackLimit
  @type {Integer}
  @public
  */
  undoStackLimit: 10,

  /**
  Contains an array of changes for the object.
  @property undoStack
  @type {Array}
  @public
  */
  undoStack: Ember.A([]),

  /**
  Contains an array of changes for the object.
  @property redoStack
  @type {Array}
  @public
  */
  redoStack: Ember.A([]),

  /**
  Contains the initial snapshot state of the object. This initial snapshot changes
  when an object has not been saved (still in `isNew` state) but has been changed
  through calling `checkpoint`.
  @property _initialUndoState
  @type {Object}
  @private
  */
  _initialUndoState: null,

  /**
  Initially set the state when the object loads.
  @type {Event}
  @event
  */
  _undo_setup: on('ready', function() {
    this._updateInitialUndoState(-1);
  }),

  /**
  Records the initial state of the object and increments the times it has been set.
  @private
  */
  _updateInitialUndoState(idx) {
    if(!idx) {
      idx = parseInt(get(this, '_initialUndoState.index'));
    }

    set(this, '_initialUndoState', {
      index: idx + 1,
      snapshot: this._internalModel.createSnapshot()
    });
  },

  /**
  Record the current state of the object. Pushes the current state changes
  to the `undoStack`.
  @param {Object, Array} models
  @public
  */
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
          if(isPresent(attrs)) {
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
              changedAttrs[descriptor.key] = get(item, descriptor.key);
            }
          });
        }

        if(Object.keys(changedAttrs).length) {
          var changes = {
            id: get(item, 'id'),
            type: get(item, 'constructor.modelName'),
            descriptor: get(item, 'undoDescriptor'),
            action: actionType,
            attributes: {},
            snapshot: item._internalModel.createSnapshot()
          };

          let lastUndo = get(this, 'undoStack.firstObject');
          if(actionType === 'update' && isPresent(lastUndo) && lastUndo.length === 1) {
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
              else if(isPresent(lastVal)) {
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
        var undo = get(this, 'undoStack').slice(0);
        undo.unshift(changedItems);
        set(this, 'undoStack', Ember.A(undo));

        var currentCount = get(this, 'undoStack.length');
        var limit = get(this, 'undoStackLimit');
        if(currentCount > limit) {
          get(this, 'undoStack').popObject();
        }

        /* Clear redo settings if something new happened */
        get(this, 'redoStack').clear();
      }
    }
  },

  /**
  Determines the text that happens in the action.

  For instance, if you have a model with a width and height. You notice the only changed
  attributes are width/height, then you can better describe that action here as a 'resize'.

  Or, if you have a model with an transparency. You notice the only changed
  attributes are transparency, then you can better describe that action here as a 'opacity'.

  @param {Object} changedAttrs
  @param {String} type
  @public
  */
  undoActionTaken(changedAttrs, type) {
    var text = Ember.String.capitalize(type);
    if(type === 'update') {
      let changedAttrsString = Object.keys(changedAttrs).join(', ');
      text += ` (${changedAttrsString})`;
    }

    return {
      key: type,
      text: text
    };
  },

  /**
  Apply changes in the `undoStack`. When index is passed as an argument, apply the
  changes found at the index passed in. The default index is 0.
  @param {Integer} index, default: 0
  @return {Promise}
  @public
  */
  undo(index) {
    if(get(this, 'isUndoing') === false) {
      set(this, 'isUndoing', true);
      return this._popHistoryStack(index, 'undoStack');
    }
    return this._emptyPromise();
  },

  /**
  Apply changes in the `redoStack`. When index is passed as an argument, apply the
  changes found at the index passed in. The default index is 0.
  @param {Integer} index, default: 0
  @return {Promise}
  @public
  */
  redo(index) {
    if(get(this, 'isRedoing') === false) {
      set(this, 'isRedoing', true);
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
        var restockStack = get(this, restockKey);
        restockStack = restockStack.slice(0);
        restockStack.unshift(lastActionChanges);
        set(this, restockKey, Ember.A(restockStack));
        get(this, key).removeObject(lastActionChanges);

        if(idx > 0) {
          idx--;
          return this._popHistoryStack(idx, key);
        }
        else {
          set(this, 'isUndoing', false);
          set(this, 'isRedoing', false);
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
        if(isPresent(item)) {
          var numKey = (replaceType === 'redoStack') ? 1 : 0;
          var attrs = {};

          for(var k in attributes) {
            var value = attributes[k][numKey];
            attrs[k] = value;
            set(item, k, value);
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
    var type = historyItem.type;
    var promise = this._emptyPromise();
    var record = null;

    if(isEmpty(id) && action === 'create') {
      record = historyItem.snapshot.record;
      id = get(record, 'id');
      item = record;
    }

    if((action === 'create' && key === 'redoStack') || (action === 'delete' && key === 'undoStack')) {
      record = this.get('store').peekRecord(type, id);

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
          set(record, k, value);
        }

        if(isPresent(get(record, 'id'))) {
          record.save();
        }
      }
    }
    else {
      if(isPresent(item)) {
        item.transitionTo('loaded.saved');
        if(get(item, 'isNew')) {
          item.deleteRecord();
        }
        else {
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
