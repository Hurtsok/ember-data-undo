import DS from 'ember-data';
import UndoRedo from 'ember-data-undo/undo-redo';

const { attr } = DS;

export default DS.Model.extend(UndoRedo, {
  name: attr('string'),
  age: attr('string')
});
